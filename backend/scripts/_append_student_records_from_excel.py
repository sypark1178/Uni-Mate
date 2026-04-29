import math
import sqlite3
import sys
from pathlib import Path

import pandas as pd


def _is_nan(v) -> bool:
    return isinstance(v, float) and math.isnan(v)


def to_school_year(v):
    if v is None or _is_nan(v):
        return None
    try:
        n = int(float(v))
    except Exception:
        return None
    if 1 <= n <= 3:
        return n
    if 2026 <= n <= 2036:
        return max(1, min(3, n - 2025))
    if 2020 <= n <= 2022:
        return max(1, min(3, n - 2019))
    return None


def to_semester(v):
    if v is None or _is_nan(v):
        return 1
    try:
        n = int(float(v))
    except Exception:
        return 1
    return 2 if n == 2 else 1


def normalize_record_type(raw: str) -> str:
    rec = (raw or "").strip()
    # 엑셀/DB에 따라 명칭이 다를 수 있으므로(예: 자율활동) 프론트 슬롯과 대응시킵니다.
    if rec == "자율활동":
        return "행동특성"
    return rec or "세특"


def normalize_content_block(text: str) -> str:
    # 동일 문장이 여러 행으로 반복될 때 dedupe 하기 위한 정규화
    # - 개행/공백 차이를 제거
    return " ".join((text or "").split())

def split_content_into_paragraphs(text: str) -> list[str]:
    # 엑셀의 '기록내용'은 대개 빈 줄(두 개 이상 개행)로 문단이 분리됩니다.
    # 문단 단위 dedupe가 필요한 케이스(같은 문장이 여러 문단으로 반복) 대응.
    normalized = (text or "").replace("\r\n", "\n").replace("\r", "\n")
    return [p.strip() for p in normalized.split("\n\n") if p and p.strip()]


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python _append_student_records_from_excel.py <xlsx_path>")

    xlsx_path = Path(sys.argv[1])
    db_path = Path("backend/data/uni_mate.db")

    target_login_ids = ["KMJ11", "KMJ12", "KMJ13", "KMJ14"]

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # target student_id
    rows = cur.execute(
        """
        SELECT a.login_id, sp.student_id
        FROM TB_USER_AUTH a
        JOIN TB_STUDENT_PROFILE sp ON sp.user_id = a.user_id
        WHERE a.login_id IN (?,?,?,?)
        ORDER BY a.login_id
        """,
        tuple(target_login_ids),
    ).fetchall()
    target_sids = [int(r["student_id"]) for r in rows]
    print("target_sids", target_sids)

    xls = pd.ExcelFile(xlsx_path)
    if "STUDENT_RECORD" not in xls.sheet_names:
        raise RuntimeError(f"STUDENT_RECORD sheet not found. sheets={xls.sheet_names}")

    df = pd.read_excel(xlsx_path, sheet_name="STUDENT_RECORD")
    if df.shape[1] < 7:
        raise RuntimeError(f"Unexpected STUDENT_RECORD columns: {list(df.columns)}")

    cols = list(df.columns)
    rec_id_col = cols[0]
    student_id_col = cols[1]
    record_type_col = cols[2]
    subject_name_col = cols[3]
    content_col = cols[4]
    year_col = cols[5]
    semester_col = cols[6]

    df = df[df[student_id_col].isin(target_sids)].copy()
    print("filtered_rows", len(df))

    # Merge by (student_id, record_type, school_year, semester)
    # key -> {min_record_id, subject_name, parts[], seen_blocks:set}
    merged = {}
    for _, r in df.iterrows():
        sid = int(r[student_id_col])
        rec_type_raw = r[record_type_col]
        rec_type = "" if _is_nan(rec_type_raw) else str(rec_type_raw)
        rec_type = normalize_record_type(rec_type)
        sy = to_school_year(r[year_col])
        if sy is None:
            continue
        sem = to_semester(r[semester_col])

        rec_id = None
        rec_id_raw = r[rec_id_col]
        if not _is_nan(rec_id_raw):
            try:
                rec_id = int(float(rec_id_raw))
            except Exception:
                rec_id = None

        subj_raw = r[subject_name_col]
        subj_name = None if _is_nan(subj_raw) else str(subj_raw).strip() or None

        content_raw = r[content_col]
        content_text = "" if _is_nan(content_raw) else str(content_raw).strip()
        if not content_text:
            continue

        key = (sid, rec_type, sy, sem)
        if key not in merged:
            merged[key] = {
                "min_record_id": rec_id,
                "subject_name": subj_name,
                "parts": [],
                "seen_blocks": set(),
            }
            for para in split_content_into_paragraphs(content_text):
                np = normalize_content_block(para)
                merged[key]["parts"].append(para)
                merged[key]["seen_blocks"].add(np)
        else:
            v = merged[key]
            if v["min_record_id"] is None and rec_id is not None:
                v["min_record_id"] = rec_id
            elif v["min_record_id"] is not None and rec_id is not None:
                v["min_record_id"] = min(v["min_record_id"], rec_id)

            if v["subject_name"] is None and subj_name is not None:
                v["subject_name"] = subj_name
            if "seen_blocks" not in v:
                v["seen_blocks"] = set()
            for para in split_content_into_paragraphs(content_text):
                nb = normalize_content_block(para)
                if nb in v["seen_blocks"]:
                    continue
                v["parts"].append(para)
                v["seen_blocks"].add(nb)

    print("merged_slots", len(merged))

    # Pre-check: record_id conflicts with other students (rare but possible)
    conflict = 0
    record_ids = [v["min_record_id"] for v in merged.values() if v["min_record_id"] is not None]
    if record_ids:
        for i in range(0, len(record_ids), 500):
            chunk = record_ids[i : i + 500]
            qmarks = ",".join(["?"] * len(chunk))
            s_qmarks = ",".join(["?"] * len(target_sids))
            cnt_row = cur.execute(
                f"""
                SELECT COUNT(*) AS cnt
                FROM TB_STUDENT_RECORD
                WHERE record_id IN ({qmarks})
                  AND student_id NOT IN ({s_qmarks})
                """,
                tuple(chunk) + tuple(target_sids),
            ).fetchone()
            conflict += int(cnt_row["cnt"])
    print("record_id_conflict_with_other_students", conflict)

    with con:
        for (sid, rec_type, sy, sem), v in merged.items():
            subject_name = v["subject_name"]
            content_body = "\n\n".join([p for p in v["parts"] if p]).strip()

            # 슬롯 중복 제거(업서트 방식)
            cur.execute(
                """
                DELETE FROM TB_STUDENT_RECORD
                WHERE student_id = ?
                  AND record_type = ?
                  AND school_year = ?
                  AND semester = ?
                """,
                (sid, rec_type, sy, sem),
            )

            if v["min_record_id"] is not None and conflict == 0:
                cur.execute(
                    """
                    INSERT INTO TB_STUDENT_RECORD
                        (record_id, student_id, record_type, subject_name, content_body, school_year, semester)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (int(v["min_record_id"]), sid, rec_type, subject_name, content_body, sy, sem),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO TB_STUDENT_RECORD
                        (student_id, record_type, subject_name, content_body, school_year, semester)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (sid, rec_type, subject_name, content_body, sy, sem),
                )

    # Summary
    for sid in target_sids:
        cnt = cur.execute("SELECT COUNT(*) FROM TB_STUDENT_RECORD WHERE student_id=? AND record_type!='snapshot'", (sid,)).fetchone()[0]
        print("sid", sid, "rows", cnt)

    con.close()


if __name__ == "__main__":
    main()

