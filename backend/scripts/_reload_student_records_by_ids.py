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


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python _reload_student_records_by_ids.py <xlsx_path> [comma_separated_student_ids]")

    xlsx_path = Path(sys.argv[1])
    db_path = Path("backend/data/uni_mate.db")
    if len(sys.argv) >= 3 and str(sys.argv[2]).strip():
        target_ids = [int(token.strip()) for token in str(sys.argv[2]).split(",") if token.strip()]
    else:
        target_ids = [101, 102, 103, 104]

    xls = pd.ExcelFile(xlsx_path)
    if "STUDENT_RECORD" not in xls.sheet_names:
        raise RuntimeError(f"STUDENT_RECORD sheet not found: {xls.sheet_names}")

    df = pd.read_excel(xlsx_path, sheet_name="STUDENT_RECORD")
    cols = list(df.columns)
    if len(cols) < 7:
        raise RuntimeError(f"Unexpected STUDENT_RECORD columns: {cols}")

    rec_id_col = cols[0]
    student_id_col = cols[1]
    record_type_col = cols[2]
    subject_name_col = cols[3]
    content_col = cols[4]
    year_col = cols[5]
    semester_col = cols[6]

    df = df[df[student_id_col].isin(target_ids)].copy()
    print("excel_filtered_rows", len(df))

    con = sqlite3.connect(db_path)
    con.row_factory = sqlite3.Row
    cur = con.cursor()

    # record_id 충돌 확인 (대상 student_id 외와 충돌 시 PK 없이 insert)
    rec_ids = []
    for _, r in df.iterrows():
        v = r[rec_id_col]
        if not _is_nan(v):
            try:
                rec_ids.append(int(float(v)))
            except Exception:
                pass
    rec_ids = sorted(set(rec_ids))
    conflict = 0
    if rec_ids:
        for i in range(0, len(rec_ids), 500):
            chunk = rec_ids[i : i + 500]
            qmarks = ",".join(["?"] * len(chunk))
            s_qmarks = ",".join(["?"] * len(target_ids))
            row = cur.execute(
                f"""
                SELECT COUNT(*) AS cnt
                FROM TB_STUDENT_RECORD
                WHERE record_id IN ({qmarks})
                  AND student_id NOT IN ({s_qmarks})
                """,
                tuple(chunk) + tuple(target_ids),
            ).fetchone()
            conflict += int(row["cnt"])
    print("record_id_conflict", conflict)

    inserted = 0
    with con:
        cur.execute(
            "DELETE FROM TB_STUDENT_RECORD WHERE student_id IN (?,?,?,?)",
            tuple(target_ids),
        )

        for _, r in df.iterrows():
            sid = int(r[student_id_col])
            rec_type = "" if _is_nan(r[record_type_col]) else str(r[record_type_col]).strip()
            rec_type = rec_type or "세특"
            subj = None if _is_nan(r[subject_name_col]) else str(r[subject_name_col]).strip() or None
            content = "" if _is_nan(r[content_col]) else str(r[content_col]).strip()
            sy = to_school_year(r[year_col])
            sem = to_semester(r[semester_col])

            rec_id = None
            if not _is_nan(r[rec_id_col]):
                try:
                    rec_id = int(float(r[rec_id_col]))
                except Exception:
                    rec_id = None

            if rec_id is not None and conflict == 0:
                cur.execute(
                    """
                    INSERT INTO TB_STUDENT_RECORD
                        (record_id, student_id, record_type, subject_name, content_body, school_year, semester)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (rec_id, sid, rec_type, subj, content, sy, sem),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO TB_STUDENT_RECORD
                        (student_id, record_type, subject_name, content_body, school_year, semester)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (sid, rec_type, subj, content, sy, sem),
                )
            inserted += 1

    print("inserted_rows", inserted)
    for sid in target_ids:
        cnt = cur.execute(
            "SELECT COUNT(*) FROM TB_STUDENT_RECORD WHERE student_id=?",
            (sid,),
        ).fetchone()[0]
        print("sid", sid, "rows", cnt)

    kmj12 = cur.execute(
        """
        SELECT sp.student_id
        FROM TB_USER_AUTH a
        JOIN TB_STUDENT_PROFILE sp ON sp.user_id = a.user_id
        WHERE a.login_id = ?
        LIMIT 1
        """,
        ("KMJ12",),
    ).fetchone()
    if kmj12:
        kmj12_sid = int(kmj12["student_id"])
        kmj12_cnt = cur.execute(
            """
            SELECT COUNT(*)
            FROM TB_STUDENT_RECORD
            WHERE student_id = ?
              AND school_year = 2
              AND semester = 1
              AND record_type != 'snapshot'
            """,
            (kmj12_sid,),
        ).fetchone()[0]
        print("KMJ12(student_id=%d) school_year=2 semester=1 count=%d" % (kmj12_sid, kmj12_cnt))

    con.close()


if __name__ == "__main__":
    main()

