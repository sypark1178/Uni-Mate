"""
Load unimate_test_dataset.xlsx into SQLite schema used by OnboardingScoreStore.
Run from repo root: python backend/scripts/import_unimate_excel.py
"""
from __future__ import annotations

import sqlite3
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# backend/app/services -> parents[2] == backend
BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = BACKEND_ROOT / "data" / "uni_mate.db"
EXCEL_DEFAULT = Path(
    r"e:\sangyun\200 AI기획(20251223~20260514)\프로젝트진행\70 프로세스 설계\가상데이터 생성\unimate_test_dataset.xlsx"
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


def _fix_sequence(conn: sqlite3.Connection, table: str, pk: str) -> None:
    row = conn.execute(f"SELECT MAX({pk}) AS m FROM {table}").fetchone()
    if row is None or row["m"] is None:
        return
    seq = int(row["m"])
    conn.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
    conn.execute("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)", (table, seq))


def main() -> int:
    excel_path = Path(sys.argv[1]) if len(sys.argv) > 1 else EXCEL_DEFAULT
    db_path = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_DB
    if not excel_path.is_file():
        print(f"Excel not found: {excel_path}", file=sys.stderr)
        return 1

    db_path.parent.mkdir(parents=True, exist_ok=True)

    # Ensure schema exists
    sys.path.insert(0, str(BACKEND_ROOT))
    from app.services.onboarding_score_store import OnboardingScoreStore  # noqa: E402

    OnboardingScoreStore(db_path=str(db_path))

    xl = pd.ExcelFile(excel_path, engine="openpyxl")

    def sheet(name: str) -> pd.DataFrame:
        return pd.read_excel(xl, sheet_name=name)

    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = OFF")
        for tbl in (
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
            "TB_USER",
            "TB_UNIVERSITY",
        ):
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
            conn.execute(
                """
                INSERT INTO TB_ADMISSION_TYPE
                (admission_id, dept_id, admission_year, admission_type, admission_method, recruit_cnt, doc_ratio, interview_ratio, csat_required)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(r["admission_id"]),
                    int(r["dept_id"]),
                    int(r["admission_year"]),
                    _text(r["admission_type"]) or "수시",
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
        ext_to_uid: dict[str, int] = {}
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
                    # 스키마는 INTEGER 등급용 — 소수 평점(예: 4.1)은 오해 소지가 있어 NULL 처리
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
                    int(r["csat_id"]),
                    int(r["student_id"]),
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
                    _num(r.get("priority_rank"), as_int=True),
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
                    _text(r.get("reason_summary")),
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

        for tbl, pk in (
            ("TB_UNIVERSITY", "univ_id"),
            ("TB_DEPARTMENT", "dept_id"),
            ("TB_ADMISSION_TYPE", "admission_id"),
            ("TB_ADMISSION_CUTOFF", "cutoff_id"),
            ("TB_USER", "user_id"),
            ("TB_STUDENT_PROFILE", "student_id"),
            ("TB_ACADEMIC_SCORE", "score_id"),
            ("TB_CSAT_SCORE", "csat_id"),
            ("TB_STUDENT_RECORD", "record_id"),
            ("TB_APPLICATION_LIST", "application_id"),
            ("TB_AI_ANALYSIS", "analysis_id"),
            ("TB_RECOMMENDATION", "rec_id"),
            ("TB_CONSULTING_SESSION", "session_id"),
            ("TB_NOTIFICATION", "noti_id"),
        ):
            _fix_sequence(conn, tbl, pk)

        conn.commit()

    print(f"OK: imported {excel_path} -> {db_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
