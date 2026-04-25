"""
엑셀 시트를 TB_* 테이블에 적재합니다.

- 기본: TB_METADATA_FIELD_MAP, TB_USER, TB_USER_AUTH 는 삭제하지 않습니다.
- `--replace-users`: 위 사용자·권한 테이블까지 비우고 USER 시트로 다시 채웁니다.

실행 예 (워크스페이스 루트, PYTHONPATH=프로젝트 루트):

  python backend/scripts/import_unimate_excel.py "경로/Data.xlsx"
  python backend/scripts/import_unimate_excel.py "경로/Data.xlsx" "경로/uni_mate.db" --replace-users
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

import pandas as pd

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = BACKEND_ROOT / "data" / "uni_mate.db"
EXCEL_DEFAULT = Path(
    r"e:\sangyun\200 AI기획(20251223~20260514)\프로젝트진행\70 프로세스 설계\가상데이터 생성\Uni-Mate Data 20260424.xlsx"
)


def _ts(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    if isinstance(v, pd.Timestamp):
        return v.isoformat(sep=" ", timespec="seconds")
    s = str(v).strip()
    return s or None


def _num(v, as_int: bool = False):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    try:
        x = float(v)
        if as_int:
            return int(round(x))
        return x
    except (TypeError, ValueError):
        return None


def _text(v) -> str | None:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return None
    s = str(v).strip()
    return s or None


def _admission_year_from_row(r: pd.Series) -> int | None:
    for key in ("univ_admission_year", "admission_year"):
        if key not in r.index:
            continue
        y = _num(r.get(key), as_int=True)
        if y is not None:
            return y
    return None


def _admission_type_label(r: pd.Series) -> str:
    return _text(r.get("admission_type")) or _text(r.get("admission_name")) or "수시"


def _fix_sequence(conn: sqlite3.Connection, table: str, pk: str) -> None:
    row = conn.execute(f"SELECT MAX({pk}) AS m FROM {table}").fetchone()
    if row is None or row["m"] is None:
        return
    seq = int(row["m"])
    conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
    conn.execute("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)", (table, seq))


def _build_ext_to_uid_from_db(conn: sqlite3.Connection, users: pd.DataFrame) -> dict[str, int]:
    """USER 시트의 user_id(외부키)를 기존 TB_USER_AUTH.login_id 또는 TB_USER.email 로 매핑합니다."""
    ext_to_uid: dict[str, int] = {}
    for _, r in users.iterrows():
        ext = str(r["user_id"]).strip()
        row = conn.execute("SELECT user_id FROM TB_USER_AUTH WHERE login_id = ?", (ext,)).fetchone()
        if row is not None:
            ext_to_uid[ext] = int(row["user_id"])
            continue
        email = _text(r.get("email"))
        if email:
            row = conn.execute(
                """
                SELECT a.user_id
                FROM TB_USER_AUTH a
                JOIN TB_USER u ON u.user_id = a.user_id
                WHERE lower(u.email) = lower(?)
                LIMIT 1
                """,
                (email,),
            ).fetchone()
            if row is not None:
                ext_to_uid[ext] = int(row["user_id"])
                continue
            row = conn.execute(
                "SELECT user_id FROM TB_USER WHERE lower(email) = lower(?) LIMIT 1",
                (email,),
            ).fetchone()
            if row is not None:
                ext_to_uid[ext] = int(row["user_id"])
                continue
        raise RuntimeError(
            f"USER 시트의 user_id={ext!r} 에 해당하는 TB_USER_AUTH.login_id 또는 이메일이 DB에 없습니다. "
            "로그인 계정을 먼저 만들거나 --replace-users 로 전체 재적재하세요."
        )
    return ext_to_uid


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Uni-Mate 엑셀 → SQLite 적재")
    parser.add_argument("excel", nargs="?", default=str(EXCEL_DEFAULT), help="엑셀 파일 경로")
    parser.add_argument("db", nargs="?", default=str(DEFAULT_DB), help="SQLite DB 경로")
    parser.add_argument(
        "--replace-users",
        action="store_true",
        help="TB_USER / TB_USER_AUTH 까지 삭제 후 USER 시트로 재생성 (기본은 유지)",
    )
    args = parser.parse_args(argv)

    excel_path = Path(args.excel)
    db_path = Path(args.db)
    preserve_users = not args.replace_users

    if not excel_path.is_file():
        print(f"Excel not found: {excel_path}", file=sys.stderr)
        return 1

    db_path.parent.mkdir(parents=True, exist_ok=True)

    if str(WORKSPACE_ROOT) not in sys.path:
        sys.path.insert(0, str(WORKSPACE_ROOT))
    from backend.app.services.onboarding_score_store import OnboardingScoreStore  # noqa: E402

    OnboardingScoreStore(db_path=str(db_path))

    xl = pd.ExcelFile(excel_path, engine="openpyxl")

    def sheet(name: str) -> pd.DataFrame:
        return pd.read_excel(xl, sheet_name=name)

    delete_tables = [
        "TB_NOTIFICATION",
        "TB_CONSULTING_SESSION",
        "TB_RECOMMENDATION",
        "TB_AI_ANALYSIS",
        "TB_APPLICATION_LIST",
        "TB_STUDENT_RECORD",
        "TB_CSAT_SCORE",
        "TB_ACADEMIC_SCORE",
        "TB_STUDENT_PROFILE",
        "TB_ADMISSION_CUTOFF",
        "TB_ADMISSION_TYPE",
        "TB_DEPARTMENT",
        "TB_UNIVERSITY",
    ]
    if not preserve_users:
        delete_tables.extend(["TB_USER_AUTH", "TB_USER"])

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = OFF")
        for tbl in delete_tables:
            conn.execute(f"DELETE FROM {tbl}")
        conn.execute("PRAGMA foreign_keys = ON")

        u = sheet("UNIVERSITY")
        for _, r in u.iterrows():
            conn.execute(
                """
                INSERT INTO TB_UNIVERSITY (univ_id, univ_code, univ_name, univ_type, region, homepage_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                """,
                (
                    int(r["univ_id"]),
                    _text(r["univ_code"]),
                    _text(r["univ_name"]),
                    _text(r["univ_type"]) or "사립",
                    _text(r["region"]) or "미상",
                    _text(r["homepage_url"]),
                    _ts(r.get("created_at")),
                ),
            )

        d = sheet("DEPARTMENT")
        seen_dept_key: set[tuple[int, str]] = set()
        for _, r in d.iterrows():
            uid = int(r["univ_id"])
            base = _text(r["dept_name"]) or "미입력"
            dept_name = base
            if (uid, dept_name) in seen_dept_key:
                dept_name = f"{base} ({int(r['dept_id'])})"
            seen_dept_key.add((uid, dept_name))
            conn.execute(
                """
                INSERT INTO TB_DEPARTMENT (dept_id, univ_id, dept_name, college_name, major_field, dept_type)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["dept_id"]),
                    uid,
                    dept_name,
                    _text(r.get("college_name")),
                    _text(r.get("major_field")),
                    _text(r.get("dept_type")),
                ),
            )

        at = sheet("ADMISSION_TYPE")
        for _, r in at.iterrows():
            yr = _admission_year_from_row(r)
            if yr is None:
                raise RuntimeError(f"ADMISSION_TYPE 행 admission_id={r.get('admission_id')}: 입학연도 컬럼이 없습니다.")
            conn.execute(
                """
                INSERT INTO TB_ADMISSION_TYPE
                (admission_id, dept_id, admission_year, admission_type, admission_method, recruit_cnt, doc_ratio, interview_ratio, csat_required)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["admission_id"]),
                    int(r["dept_id"]),
                    yr,
                    _admission_type_label(r),
                    _text(r.get("admission_method")),
                    _num(r.get("recruit_cnt"), as_int=True),
                    _num(r.get("doc_ratio")),
                    _num(r.get("interview_ratio")),
                    int(_num(r.get("csat_required")) or 0),
                ),
            )

        ac = sheet("ADMISSION_CUTOFF")
        for _, r in ac.iterrows():
            conn.execute(
                """
                INSERT INTO TB_ADMISSION_CUTOFF
                (cutoff_id, admission_id, cutoff_year, cutoff_50, cutoff_70, cutoff_80, competition_ratio)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["cutoff_id"]),
                    int(r["admission_id"]),
                    int(r["cutoff_year"]),
                    _num(r.get("cutoff_50")),
                    _num(r.get("cutoff_70")),
                    _num(r.get("cutoff_80")),
                    _num(r.get("competition_ratio")),
                ),
            )

        users = sheet("USER")
        ext_to_uid: dict[str, int]
        if preserve_users:
            ext_to_uid = _build_ext_to_uid_from_db(conn, users)
        else:
            ext_to_uid = {}
            for _, r in users.iterrows():
                ext = str(r["user_id"]).strip()
                conn.execute(
                    """
                    INSERT INTO TB_USER (email, password_hash, user_type, phone, created_at, last_login_at, is_active)
                    VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)
                    """,
                    (
                        _text(r["email"]),
                        "excel-import",
                        _text(r.get("user_type")) or "학생",
                        _text(r.get("phone")),
                        _ts(r.get("created_at")),
                        _ts(r.get("last_login_at")),
                        int(r.get("is_active", 1) or 0),
                    ),
                )
                uid_row = conn.execute("SELECT user_id FROM TB_USER WHERE email = ?", (_text(r["email"]),)).fetchone()
                if uid_row is None:
                    raise RuntimeError(f"user insert failed for {ext}")
                ext_to_uid[ext] = int(uid_row["user_id"])
                conn.execute(
                    """
                    INSERT INTO TB_USER_AUTH (user_id, login_id, password_hash, role)
                    VALUES (?, ?, NULL, '사용자')
                    """,
                    (int(uid_row["user_id"]), ext),
                )

        sp = sheet("STUDENT_PROFILE")
        for _, r in sp.iterrows():
            ext_u = str(r["user_id"]).strip()
            uid = ext_to_uid.get(ext_u)
            if uid is None:
                raise RuntimeError(f"unknown user key {ext_u}")
            grade_num = _num(r.get("grade"), as_int=True)
            grade_label = f"고{grade_num}" if grade_num is not None else None
            region = _text(r.get("residence_sido")) or _text(r.get("school_sido"))
            district = " ".join(
                x
                for x in (_text(r.get("residence_sigungu")), _text(r.get("residence_dong")))
                if x
            ) or _text(r.get("school_sigungu"))
            conn.execute(
                """
                INSERT INTO TB_STUDENT_PROFILE
                (student_id, user_id, student_name, school_name, grade, target_major, admission_year, created_at, region, district, track, grade_label)
                VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?, ?, ?)
                """,
                (
                    int(r["student_id"]),
                    uid,
                    _text(r["student_name"]) or "학생",
                    _text(r.get("school_name")),
                    grade_num,
                    _text(r.get("target_major")),
                    _num(r.get("admission_year"), as_int=True),
                    _ts(r.get("created_at")),
                    region,
                    district,
                    "",
                    grade_label,
                ),
            )

        asc = sheet("ACADEMIC_SCORE")
        for _, r in asc.iterrows():
            sy = _num(r.get("school_year"), as_int=True) or 1
            sem = _num(r.get("semester"), as_int=True) or 1
            ep = _text(r.get("exam_period")) or ""
            semester_label = f"{sy}-{sem}-{ep}".strip("-")
            g = r.get("grade")
            grade_int = None
            if g is not None and not (isinstance(g, float) and pd.isna(g)):
                try:
                    gf = float(g)
                    grade_int = int(gf) if abs(gf - round(gf)) < 1e-9 else None
                except (TypeError, ValueError):
                    grade_int = None
            conn.execute(
                """
                INSERT INTO TB_ACADEMIC_SCORE
                (score_id, student_id, semester, subject_name, subject_cat, raw_score, grade, credit_hours, z_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["score_id"]),
                    int(r["student_id"]),
                    semester_label,
                    _text(r.get("subject_name")) or "미입력",
                    _text(r.get("subject_cat")),
                    _num(r.get("raw_score")),
                    grade_int,
                    _num(r.get("credit_hours")),
                    _num(r.get("z_score")),
                ),
            )

        cs = sheet("CSAT_SCORE")
        for _, r in cs.iterrows():
            csat_id = _num(r.get("csat_id"), as_int=True)
            student_id = _num(r.get("student_id"), as_int=True)
            if csat_id is None or student_id is None:
                # 엑셀 하단의 공백/요약 행은 건너뜁니다.
                continue
            exam_type = " ".join(
                x for x in (_text(r.get("exam_type")), _text(r.get("inquiry_type"))) if x
            )
            conn.execute(
                """
                INSERT INTO TB_CSAT_SCORE
                (csat_id, student_id, exam_year, exam_type, korean_grade, math_grade, english_grade, science_grade, total_score, percentile)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    csat_id,
                    student_id,
                    _num(r.get("exam_year"), as_int=True),
                    exam_type or None,
                    _num(r.get("korean_grade"), as_int=True),
                    _num(r.get("math_grade"), as_int=True),
                    _num(r.get("english_grade"), as_int=True),
                    _num(r.get("inquiry_grade"), as_int=True),
                    _num(r.get("total_score")),
                    _num(r.get("percentile")),
                ),
            )

        sr = sheet("STUDENT_RECORD")
        for _, r in sr.iterrows():
            conn.execute(
                """
                INSERT INTO TB_STUDENT_RECORD
                (record_id, student_id, record_type, subject_name, content_body, academic_year, semester)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["record_id"]),
                    int(r["student_id"]),
                    _text(r.get("record_type")),
                    _text(r.get("subject_name")),
                    _text(r.get("content_body")),
                    _num(r.get("academic_year"), as_int=True),
                    _num(r.get("semester"), as_int=True),
                ),
            )

        al = sheet("APPLICATION_LIST")
        for _, r in al.iterrows():
            pr = _num(r.get("priority_rank"), as_int=True)
            if pr is None:
                pr = _num(r.get("priority_no"), as_int=True)
            conn.execute(
                """
                INSERT INTO TB_APPLICATION_LIST
                (application_id, student_id, admission_id, strategy_type, status, priority_no, note)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["application_id"]),
                    int(r["student_id"]),
                    int(r["admission_id"]),
                    _text(r.get("strategy_type")) or "적정",
                    _text(r.get("status")) or "active",
                    pr,
                    _text(r.get("analysis_note")),
                ),
            )

        aa = sheet("AI_ANALYSIS")
        for _, r in aa.iterrows():
            extra = []
            if _text(r.get("record_strength")):
                extra.append(f"기록강점: {_text(r.get('record_strength'))}")
            fc = _num(r.get("fit_keyword_count"), as_int=True)
            if fc is not None:
                extra.append(f"키워드일치: {fc}")
            summary = _text(r.get("analysis_summary")) or ""
            if extra:
                summary = summary + ("\n" if summary else "") + " | ".join(extra)
            conn.execute(
                """
                INSERT INTO TB_AI_ANALYSIS
                (analysis_id, student_id, analysis_type, pass_prob, score_gap, model_version, summary_text, analyzed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                """,
                (
                    int(r["analysis_id"]),
                    int(r["student_id"]),
                    _text(r.get("analysis_type")),
                    _num(r.get("pass_prob")),
                    _num(r.get("score_gap")),
                    _text(r.get("analysis_version")) or "v1.0",
                    summary or None,
                    _ts(r.get("created_at")),
                ),
            )

        rec = sheet("RECOMMENDATION")
        for _, r in rec.iterrows():
            reason = _text(r.get("reason_summary")) or ""
            pr = _num(r.get("priority_rank"), as_int=True)
            if pr is not None:
                reason = (f"[우선순위 {pr}] " + reason).strip()
            conn.execute(
                """
                INSERT INTO TB_RECOMMENDATION
                (rec_id, student_id, admission_id, rec_score, strategy_type, reason_text, created_at)
                VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                """,
                (
                    int(r["rec_id"]),
                    int(r["student_id"]),
                    int(r["admission_id"]),
                    _num(r.get("rec_score")),
                    _text(r.get("strategy_type")),
                    reason or None,
                    _ts(r.get("created_at")),
                ),
            )

        csess = sheet("CONSULTING_SESSION")
        for _, r in csess.iterrows():
            cid = r.get("consultant_id")
            cid_int = None
            if cid is not None and not (isinstance(cid, float) and pd.isna(cid)):
                s = str(cid).strip()
                if s.isdigit():
                    cid_int = int(s)
            conn.execute(
                """
                INSERT INTO TB_CONSULTING_SESSION
                (session_id, student_id, consultant_id, session_date, status, session_type, note)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["session_id"]),
                    int(r["student_id"]),
                    cid_int,
                    _ts(r.get("session_date")),
                    _text(r.get("status")),
                    _text(r.get("session_type")),
                    _text(r.get("memo")),
                ),
            )

        noti = sheet("NOTIFICATION")
        for _, r in noti.iterrows():
            ext_u = str(r["user_id"]).strip()
            uid = ext_to_uid.get(ext_u)
            if uid is None:
                raise RuntimeError(f"notification unknown user {ext_u}")
            conn.execute(
                """
                INSERT INTO TB_NOTIFICATION
                (noti_id, user_id, noti_type, title, body, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                """,
                (
                    int(r["noti_id"]),
                    uid,
                    _text(r.get("noti_type")),
                    _text(r.get("title")),
                    _text(r.get("message_body")),
                    int(r.get("is_read", 0) or 0),
                    _ts(r.get("created_at")),
                ),
            )

        sequence_tables: list[tuple[str, str]] = [
            ("TB_UNIVERSITY", "univ_id"),
            ("TB_DEPARTMENT", "dept_id"),
            ("TB_ADMISSION_TYPE", "admission_id"),
            ("TB_ADMISSION_CUTOFF", "cutoff_id"),
            ("TB_STUDENT_PROFILE", "student_id"),
            ("TB_ACADEMIC_SCORE", "score_id"),
            ("TB_CSAT_SCORE", "csat_id"),
            ("TB_STUDENT_RECORD", "record_id"),
            ("TB_APPLICATION_LIST", "application_id"),
            ("TB_AI_ANALYSIS", "analysis_id"),
            ("TB_RECOMMENDATION", "rec_id"),
            ("TB_CONSULTING_SESSION", "session_id"),
            ("TB_NOTIFICATION", "noti_id"),
        ]
        if not preserve_users:
            sequence_tables.insert(4, ("TB_USER", "user_id"))

        for tbl, pk in sequence_tables:
            _fix_sequence(conn, tbl, pk)

        conn.commit()

    mode = "preserve-users+meta" if preserve_users else "full-reimport"
    print(f"OK ({mode}): {excel_path} -> {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
