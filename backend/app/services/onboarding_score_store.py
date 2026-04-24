from __future__ import annotations

import json
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "uni_mate.db"


def build_payload_summary(payload: dict[str, Any]) -> dict[str, int]:
    return {
        "schoolRecordCount": len(payload.get("schoolRecords", [])),
        "mockExamCount": len(payload.get("mockExams", [])),
        "studentRecordCount": len(payload.get("studentRecords", [])),
        "uploadCount": len(payload.get("uploads", [])),
    }


def compute_settings_display_from_tables(connection: sqlite3.Connection, student_id: int) -> dict[str, str]:
    """설정 화면용 점수:
    - 내신: 최신 시점(학년>학기>중간/기말)에서 국/영/수/사탐/과탐 평균
    - 모의: 최신 1건에서 국/영/수 + inquiry_type에 따른 탐구(사탐/과탐) 평균
    """

    def _to_float(value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(int(value))
        except (TypeError, ValueError):
            return None

    def _normalize_academic_subject(subject_name: Any) -> str | None:
        normalized = str(subject_name or "").strip().replace(" ", "")
        if not normalized:
            return None
        if "국어" in normalized:
            return "국어"
        if "영어" in normalized:
            return "영어"
        if "수학" in normalized:
            return "수학"
        if "사탐" in normalized or "사회탐구" in normalized:
            return "사탐"
        if "과탐" in normalized or "과학탐구" in normalized:
            return "과탐"
        return None

    def _exam_period_rank(exam_period: Any) -> int:
        period = str(exam_period or "").strip()
        if "기말" in period or "final" in period.lower():
            return 2
        if "중간" in period or "mid" in period.lower():
            return 1
        return 0

    school_grade = "-"
    latest_period = connection.execute(
        """
        SELECT school_year, semester, exam_period
        FROM TB_ACADEMIC_SCORE
        WHERE student_id = ? AND grade IS NOT NULL
        ORDER BY
            COALESCE(school_year, 0) DESC,
            COALESCE(CAST(semester AS INTEGER), 0) DESC,
            CASE
                WHEN lower(coalesce(exam_period, '')) LIKE '%기말%' OR lower(coalesce(exam_period, '')) LIKE '%final%' THEN 2
                WHEN lower(coalesce(exam_period, '')) LIKE '%중간%' OR lower(coalesce(exam_period, '')) LIKE '%mid%' THEN 1
                ELSE 0
            END DESC,
            score_id DESC
        LIMIT 1
        """,
        (student_id,),
    ).fetchone()

    if latest_period is not None:
        period_rows = connection.execute(
            """
            SELECT subject_name, grade
            FROM TB_ACADEMIC_SCORE
            WHERE student_id = ?
              AND COALESCE(school_year, 0) = COALESCE(?, 0)
              AND COALESCE(CAST(semester AS INTEGER), 0) = COALESCE(CAST(? AS INTEGER), 0)
              AND COALESCE(exam_period, '') = COALESCE(?, '')
              AND grade IS NOT NULL
            ORDER BY score_id ASC
            """,
            (student_id, latest_period["school_year"], latest_period["semester"], latest_period["exam_period"]),
        ).fetchall()

        by_subject: dict[str, list[float]] = {"국어": [], "영어": [], "수학": [], "사탐": [], "과탐": []}
        for row in period_rows:
            key = _normalize_academic_subject(row["subject_name"])
            val = _to_float(row["grade"])
            if key is None or val is None:
                continue
            by_subject[key].append(val)

        values: list[float] = []
        for key in ["국어", "영어", "수학", "사탐", "과탐"]:
            items = by_subject[key]
            if not items:
                continue
            values.append(sum(items) / len(items))

        if values:
            school_grade = f"{sum(values) / len(values):.2f}"

    mock_avg = "-"
    latest_mock = connection.execute(
        """
        SELECT
            school_year, exam_year, exam_month, inquiry_type,
            korean_grade, english_grade, math_grade, social_grade, science_grade
        FROM TB_CSAT_SCORE
        WHERE student_id = ?
        ORDER BY
            COALESCE(school_year, 0) DESC,
            COALESCE(exam_year, 0) DESC,
            COALESCE(exam_month, 0) DESC,
            csat_id DESC
        LIMIT 1
        """,
        (student_id,),
    ).fetchone()

    if latest_mock is not None:
        inquiry_type = str(latest_mock["inquiry_type"] or "").strip()
        inquiry_grade = latest_mock["social_grade"] if inquiry_type == "사회탐구" else latest_mock["science_grade"]
        if inquiry_grade is None:
            inquiry_grade = latest_mock["social_grade"] if latest_mock["social_grade"] is not None else latest_mock["science_grade"]

        nums = [
            _to_float(latest_mock["korean_grade"]),
            _to_float(latest_mock["english_grade"]),
            _to_float(latest_mock["math_grade"]),
            _to_float(inquiry_grade),
        ]
        vals = [v for v in nums if v is not None]
        if vals:
            mock_avg = f"{sum(vals) / len(vals):.2f}"

    return {"schoolGradeAverage": school_grade, "latestMockFourGradeAverage": mock_avg}


class OnboardingScoreStore:
    def __init__(self, db_path: str | Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _ensure_schema(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                PRAGMA foreign_keys = ON;

                CREATE TABLE IF NOT EXISTS TB_UNIVERSITY (
                    univ_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    univ_code TEXT NOT NULL UNIQUE,
                    univ_name TEXT NOT NULL UNIQUE,
                    univ_type TEXT NOT NULL DEFAULT '사립',
                    region TEXT NOT NULL DEFAULT '미상',
                    homepage_url TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS TB_DEPARTMENT (
                    dept_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    univ_id INTEGER NOT NULL,
                    dept_name TEXT NOT NULL,
                    college_name TEXT,
                    major_field TEXT,
                    dept_type TEXT,
                    UNIQUE(univ_id, dept_name),
                    FOREIGN KEY (univ_id) REFERENCES TB_UNIVERSITY(univ_id)
                );

                CREATE TABLE IF NOT EXISTS TB_ADMISSION_TYPE (
                    admission_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dept_id INTEGER NOT NULL,
                    admission_year INTEGER NOT NULL,
                    admission_type TEXT NOT NULL DEFAULT '수시',
                    admission_method TEXT,
                    recruit_cnt INTEGER,
                    doc_ratio REAL,
                    interview_ratio REAL,
                    csat_required INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (dept_id) REFERENCES TB_DEPARTMENT(dept_id)
                );

                CREATE TABLE IF NOT EXISTS TB_ADMISSION_CUTOFF (
                    cutoff_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admission_id INTEGER NOT NULL,
                    cutoff_year INTEGER NOT NULL,
                    cutoff_50 REAL,
                    cutoff_70 REAL,
                    cutoff_80 REAL,
                    competition_ratio REAL,
                    FOREIGN KEY (admission_id) REFERENCES TB_ADMISSION_TYPE(admission_id)
                );

                CREATE TABLE IF NOT EXISTS TB_USER (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    email TEXT NOT NULL UNIQUE,
                    password_hash TEXT NOT NULL,
                    user_type TEXT NOT NULL DEFAULT '학생',
                    phone TEXT,
                    profile_image_url TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_login_at TEXT,
                    is_active INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS TB_USER_AUTH (
                    auth_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    login_id TEXT NOT NULL UNIQUE,
                    password_hash TEXT,
                    role TEXT NOT NULL DEFAULT '사용자',
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES TB_USER(user_id)
                );

                CREATE TABLE IF NOT EXISTS TB_STUDENT_PROFILE (
                    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    student_name TEXT NOT NULL,
                    school_name TEXT,
                    grade INTEGER,
                    target_major TEXT,
                    admission_year INTEGER,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    region TEXT,
                    district TEXT,
                    track TEXT,
                    grade_label TEXT,
                    UNIQUE(user_id),
                    FOREIGN KEY (user_id) REFERENCES TB_USER(user_id)
                );

                CREATE TABLE IF NOT EXISTS TB_ACADEMIC_SCORE (
                    score_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    school_year INTEGER,
                    semester TEXT NOT NULL,
                    exam_period TEXT,
                    subject_name TEXT NOT NULL,
                    subject_cat TEXT,
                    raw_score REAL,
                    grade INTEGER,
                    credit_hours REAL,
                    z_score REAL,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)
                );

                CREATE TABLE IF NOT EXISTS TB_CSAT_SCORE (
                    csat_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    exam_year INTEGER,
                    exam_type TEXT,
                    korean_grade INTEGER,
                    math_grade INTEGER,
                    english_grade INTEGER,
                    science_grade INTEGER,
                    total_score REAL,
                    percentile REAL,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)
                );

                CREATE TABLE IF NOT EXISTS TB_STUDENT_RECORD (
                    record_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    record_type TEXT,
                    subject_name TEXT,
                    content_body TEXT,
                    academic_year INTEGER,
                    semester INTEGER,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)
                );

                CREATE TABLE IF NOT EXISTS TB_APPLICATION_LIST (
                    application_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    admission_id INTEGER NOT NULL,
                    strategy_type TEXT NOT NULL DEFAULT '적정',
                    status TEXT NOT NULL DEFAULT 'active',
                    priority_no INTEGER,
                    note TEXT,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id),
                    FOREIGN KEY (admission_id) REFERENCES TB_ADMISSION_TYPE(admission_id)
                );

                CREATE TABLE IF NOT EXISTS TB_AI_ANALYSIS (
                    analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    analysis_type TEXT,
                    pass_prob REAL,
                    score_gap REAL,
                    model_version TEXT,
                    summary_text TEXT,
                    analyzed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)
                );

                CREATE TABLE IF NOT EXISTS TB_RECOMMENDATION (
                    rec_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    admission_id INTEGER NOT NULL,
                    rec_score REAL,
                    strategy_type TEXT,
                    reason_text TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id),
                    FOREIGN KEY (admission_id) REFERENCES TB_ADMISSION_TYPE(admission_id)
                );

                CREATE TABLE IF NOT EXISTS TB_CONSULTING_SESSION (
                    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_id INTEGER NOT NULL,
                    consultant_id INTEGER,
                    session_date TEXT,
                    status TEXT,
                    session_type TEXT,
                    note TEXT,
                    FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)
                );

                CREATE TABLE IF NOT EXISTS TB_NOTIFICATION (
                    noti_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    noti_type TEXT,
                    title TEXT,
                    body TEXT,
                    is_read INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES TB_USER(user_id)
                );

                CREATE TABLE IF NOT EXISTS TB_METADATA_FIELD_MAP (
                    meta_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    table_name_en TEXT NOT NULL,
                    table_name_ko TEXT,
                    field_name_en TEXT NOT NULL,
                    field_name_ko TEXT,
                    table_description TEXT,
                    field_description TEXT,
                    source_file TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(table_name_en, field_name_en)
                );
                """
            )
            self._ensure_user_columns(connection)
            self._ensure_student_profile_mapping_columns(connection)
            self._ensure_academic_columns(connection)
            self._ensure_csat_columns(connection)
            self._ensure_metadata_field_map_columns(connection)
            connection.execute(
                """
                INSERT INTO TB_USER (email, password_hash, user_type, is_active)
                VALUES ('admin@unimate.local', 'admin', '관리자', 1)
                ON CONFLICT(email) DO NOTHING
                """
            )
            connection.execute(
                """
                INSERT INTO TB_USER_AUTH (user_id, login_id, password_hash, role)
                SELECT
                    u.user_id,
                    CASE
                        WHEN trim(coalesce(u.password_hash, '')) <> '' THEN trim(u.password_hash)
                        ELSE printf('user-%d', u.user_id)
                    END,
                    NULL,
                    CASE WHEN lower(u.email) = 'admin@unimate.local' THEN '관리자' ELSE '사용자' END
                FROM TB_USER u
                WHERE NOT EXISTS (
                    SELECT 1 FROM TB_USER_AUTH a WHERE a.user_id = u.user_id
                )
                """
            )
            connection.execute(
                """
                INSERT INTO TB_USER_AUTH (user_id, login_id, password_hash, role)
                SELECT user_id, 'admin', NULL, '관리자'
                FROM TB_USER
                WHERE lower(email) = 'admin@unimate.local'
                ON CONFLICT(user_id) DO UPDATE
                SET login_id = excluded.login_id,
                    password_hash = NULL,
                    role = excluded.role,
                    updated_at = CURRENT_TIMESTAMP
                """
            )

    def _ensure_metadata_field_map_columns(self, connection: sqlite3.Connection) -> None:
        """기존 DB에 TB_METADATA_FIELD_MAP 설명 컬럼이 없으면 추가합니다."""
        rows = connection.execute("PRAGMA table_info(TB_METADATA_FIELD_MAP)").fetchall()
        col_names = {str(r[1]) for r in rows}
        if "table_description" not in col_names:
            connection.execute("ALTER TABLE TB_METADATA_FIELD_MAP ADD COLUMN table_description TEXT")
        if "field_description" not in col_names:
            connection.execute("ALTER TABLE TB_METADATA_FIELD_MAP ADD COLUMN field_description TEXT")

    def _ensure_user_columns(self, connection: sqlite3.Connection) -> None:
        """기존 DB에 TB_USER 프로필 이미지 컬럼이 없으면 추가합니다."""
        rows = connection.execute("PRAGMA table_info(TB_USER)").fetchall()
        col_names = {str(r[1]) for r in rows}
        if "profile_image_url" not in col_names:
            connection.execute("ALTER TABLE TB_USER ADD COLUMN profile_image_url TEXT")

    def _ensure_student_profile_mapping_columns(self, connection: sqlite3.Connection) -> None:
        """기본정보 매핑 전용 컬럼(현재학년/거주시군구/거주읍면동) 보장."""
        rows = connection.execute("PRAGMA table_info(TB_STUDENT_PROFILE)").fetchall()
        col_names = {str(r[1]) for r in rows}
        if "current_grade" not in col_names:
            connection.execute("ALTER TABLE TB_STUDENT_PROFILE ADD COLUMN current_grade TEXT")
        if "residence_city_county" not in col_names:
            connection.execute("ALTER TABLE TB_STUDENT_PROFILE ADD COLUMN residence_city_county TEXT")
        if "residence_town" not in col_names:
            connection.execute("ALTER TABLE TB_STUDENT_PROFILE ADD COLUMN residence_town TEXT")

    def _ensure_academic_columns(self, connection: sqlite3.Connection) -> None:
        """기존 DB의 TB_ACADEMIC_SCORE에 학년/시험구분 컬럼이 없으면 추가합니다."""
        rows = connection.execute("PRAGMA table_info(TB_ACADEMIC_SCORE)").fetchall()
        col_names = {str(r[1]) for r in rows}
        if "school_year" not in col_names:
            connection.execute("ALTER TABLE TB_ACADEMIC_SCORE ADD COLUMN school_year INTEGER")
        if "exam_period" not in col_names:
            connection.execute("ALTER TABLE TB_ACADEMIC_SCORE ADD COLUMN exam_period TEXT")

    def _ensure_csat_columns(self, connection: sqlite3.Connection) -> None:
        """기존 DB의 TB_CSAT_SCORE에 탐구 컬럼이 없으면 추가합니다."""
        rows = connection.execute("PRAGMA table_info(TB_CSAT_SCORE)").fetchall()
        col_names = {str(r[1]) for r in rows}
        if "inquiry_type" not in col_names:
            connection.execute("ALTER TABLE TB_CSAT_SCORE ADD COLUMN inquiry_type TEXT")
        if "social_grade" not in col_names:
            connection.execute("ALTER TABLE TB_CSAT_SCORE ADD COLUMN social_grade INTEGER")

    @staticmethod
    def _safe_int(value: Any) -> int | None:
        if value in (None, ""):
            return None
        try:
            return int(str(value).strip())
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _mock_exam_type_from_term(term: str) -> str:
        normalized = str(term or "").strip().lower()
        if normalized.startswith("mock-csat-"):
            month = normalized.replace("mock-csat-", "")
            return f"대학수학능력시험 {month}월"
        if normalized.startswith("mock-nat-"):
            month = normalized.replace("mock-nat-", "")
            return f"전국연합학력평가 {month}월"
        mapping = {
            "march": "전국연합학력평가 3월",
            "june": "전국연합학력평가 6월",
            "september": "전국연합학력평가 9월",
            "august-csat": "대학수학능력시험 9월",
        }
        return mapping.get(normalized, str(term or "모의고사"))

    @staticmethod
    def _mock_term_from_exam_type(exam_type: str) -> str:
        normalized = str(exam_type or "").strip().lower()
        is_csat = "대학수학능력시험" in normalized or "수능" in normalized or "csat" in normalized
        month = "3"
        month_match = re.search(r"(3|4|6|7|9|10|11)", normalized)
        if month_match:
            month = month_match.group(1)
        if is_csat:
            if month not in {"6", "9"}:
                month = "6"
            return f"mock-csat-{month}"
        if month not in {"3", "4", "6", "7", "9", "10", "11"}:
            month = "3"
        return f"mock-nat-{month}"

    @staticmethod
    def _mock_subjects_from_row(row: sqlite3.Row) -> list[dict[str, Any]]:
        inquiry_type_raw = str(row["inquiry_type"] or "").strip()
        inquiry_type = "과탐" if inquiry_type_raw == "과탐" else "사탐"
        inquiry_grade = row["social_grade"] if row["social_grade"] is not None else row["science_grade"]
        return [
            {"subject": "국어", "score": "" if row["korean_grade"] is None else str(int(row["korean_grade"])), "isCustom": False},
            {"subject": "수학", "score": "" if row["math_grade"] is None else str(int(row["math_grade"])), "isCustom": False},
            {"subject": "영어", "score": "" if row["english_grade"] is None else str(int(row["english_grade"])), "isCustom": False},
            {"subject": "사탐", "score": "" if inquiry_type != "사탐" or inquiry_grade is None else str(int(inquiry_grade)), "isCustom": False},
            {"subject": "과탐", "score": "" if inquiry_type != "과탐" or inquiry_grade is None else str(int(inquiry_grade)), "isCustom": False},
        ]

    @staticmethod
    def _school_semester_parts_from_term(term: str) -> tuple[int | None, str | None]:
        normalized = str(term or "").strip().lower()
        if normalized == "1-midterm":
            return 1, "중간"
        if normalized == "1-final":
            return 1, "기말"
        if normalized == "2-midterm":
            return 2, "중간"
        if normalized == "2-final":
            return 2, "기말"
        return None, None

    @staticmethod
    def _school_term_from_semester_parts(semester_no: int | None, exam_period: str | None) -> str:
        period = str(exam_period or "").strip().lower()
        if semester_no == 1 and ("중간" in period or "mid" in period):
            return "1-midterm"
        if semester_no == 1 and ("기말" in period or "final" in period):
            return "1-final"
        if semester_no == 2 and ("중간" in period or "mid" in period):
            return "2-midterm"
        if semester_no == 2 and ("기말" in period or "final" in period):
            return "2-final"
        return "1-midterm"

    @staticmethod
    def _parse_academic_semester_label(label: str) -> tuple[int | None, int | None, str | None]:
        raw = str(label or "").strip()
        if not raw:
            return None, None, None
        compact = raw.replace(" ", "")

        if "-" in compact:
            parts = compact.split("-")
            if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit():
                year_val = int(parts[0])
                semester_no = int(parts[1])
                return year_val, semester_no, parts[2]

        nums = re.findall(r"\d+", compact)
        if len(nums) >= 2:
            year_val = int(nums[0])
            semester_no = int(nums[1])
            period = "중간" if ("중간" in compact or "mid" in compact.lower()) else "기말" if ("기말" in compact or "final" in compact.lower()) else None
            return year_val, semester_no, period

        return None, None, None

    @staticmethod
    def _normalize_school_subject_name(subject_name: str) -> str | None:
        normalized = str(subject_name or "").strip().replace(" ", "")
        if not normalized:
            return None
        if "국어" in normalized:
            return "국어"
        if "영어" in normalized:
            return "영어"
        if "수학" in normalized:
            return "수학"
        if "사탐" in normalized or "사회탐구" in normalized:
            return "사탐"
        if "과탐" in normalized or "과학탐구" in normalized:
            return "과탐"
        return None

    def _resolve_user_id(self, connection: sqlite3.Connection, user_key: str) -> int | None:
        normalized = str(user_key or "").strip()
        if not normalized:
            return None
        lowered = normalized.lower()
        email_candidate = lowered if "@" in lowered else f"{lowered}@local.uni-mate"
        row = connection.execute(
            """
            SELECT u.user_id
            FROM TB_USER u
            LEFT JOIN TB_USER_AUTH a ON a.user_id = u.user_id
            WHERE lower(coalesce(a.login_id, '')) = ?
               OR lower(u.email) = ?
            LIMIT 1
            """,
            (lowered, email_candidate),
        ).fetchone()
        if row is None:
            return None
        return int(row["user_id"])

    def _touch_user_log_at(self, connection: sqlite3.Connection, user_id: int) -> None:
        """저장 활동 시점(last_login_at) 갱신."""
        connection.execute(
            """
            UPDATE TB_USER
            SET last_login_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
            """,
            (user_id,),
        )

    def _ensure_user_and_student(self, connection: sqlite3.Connection, user_key: str) -> tuple[int, int]:
        user_id = self._resolve_user_id(connection, user_key)
        if user_id is None:
            email = f"{user_key}@local.uni-mate"
            connection.execute(
                """
                INSERT INTO TB_USER (email, password_hash, user_type, is_active)
                VALUES (?, ?, '학생', 1)
                ON CONFLICT(email) DO NOTHING
                """,
                (email, "local-only"),
            )
            user_row = connection.execute("SELECT user_id FROM TB_USER WHERE email = ?", (email,)).fetchone()
            if user_row is None:
                raise RuntimeError("failed to resolve user")
            user_id = int(user_row["user_id"])
        connection.execute(
            """
            INSERT INTO TB_USER_AUTH (user_id, login_id, password_hash, role)
            VALUES (?, ?, NULL, '사용자')
            ON CONFLICT(user_id) DO UPDATE
            SET updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, str(user_key or "").strip() or f"user-{user_id}"),
        )

        connection.execute(
            """
            INSERT INTO TB_STUDENT_PROFILE (user_id, student_name, school_name, grade, target_major, admission_year)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO NOTHING
            """,
            (user_id, "학생", "", None, "", None),
        )
        student_row = connection.execute(
            "SELECT student_id FROM TB_STUDENT_PROFILE WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        if student_row is None:
            raise RuntimeError("failed to resolve student")
        return user_id, int(student_row["student_id"])

    def _infer_period(self, record: dict[str, Any]) -> tuple[int | None, int | None]:
        year_raw = str(record.get("year") or "")
        term_raw = str(record.get("term") or "")
        year = int(year_raw) if year_raw.isdigit() else None
        semester = 1 if term_raw.startswith("1-") else 2 if term_raw.startswith("2-") else None
        return year, semester

    def _upsert_score_payload(self, connection: sqlite3.Connection, student_id: int, payload: dict[str, Any]) -> None:
        connection.execute("DELETE FROM TB_ACADEMIC_SCORE WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM TB_CSAT_SCORE WHERE student_id = ?", (student_id,))
        connection.execute("DELETE FROM TB_STUDENT_RECORD WHERE student_id = ?", (student_id,))

        school_records = payload.get("schoolRecords", [])
        for record in school_records:
            year, _ = self._infer_period(record)
            semester_no, exam_period = self._school_semester_parts_from_term(str(record.get("term") or ""))
            if semester_no is None or exam_period is None:
                semester_no = 1
                exam_period = "중간"
            subjects = record.get("subjects", [])
            for subject in subjects:
                subject_name = str(subject.get("subject") or "미입력")
                grade_val = self._safe_int(subject.get("score"))
                subject_cat = "탐구" if subject_name in {"사탐", "과탐"} else "내신"
                connection.execute(
                    """
                    INSERT INTO TB_ACADEMIC_SCORE
                        (student_id, school_year, semester, exam_period, subject_name, subject_cat, raw_score, grade, credit_hours, z_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        student_id,
                        year,
                        str(semester_no),
                        exam_period,
                        subject_name,
                        subject_cat,
                        None,
                        grade_val,
                        None,
                        None,
                    ),
                )
            # 내신 평균은 TB_ACADEMIC_SCORE 매핑 범위를 벗어나므로 TB_CSAT_SCORE에 별도 저장하지 않음.

        mock_records = payload.get("mockExams", [])
        for record in mock_records:
            year, _ = self._infer_period(record)
            overall = record.get("overallAverage")
            try:
                total = float(overall) if overall not in (None, "") else None
            except (TypeError, ValueError):
                total = None
            subjects = record.get("subjects", []) or []
            subject_map = {str(s.get("subject") or "").strip(): s for s in subjects if isinstance(s, dict)}
            korean_grade = self._safe_int(subject_map.get("국어", {}).get("score"))
            math_grade = self._safe_int(subject_map.get("수학", {}).get("score"))
            english_grade = self._safe_int(subject_map.get("영어", {}).get("score"))
            social_grade = self._safe_int(subject_map.get("사탐", {}).get("score"))
            science_grade = self._safe_int(subject_map.get("과탐", {}).get("score"))
            inquiry_type = "과탐" if science_grade is not None else "사탐"
            inquiry_grade = science_grade if inquiry_type == "과탐" else social_grade
            if inquiry_grade is None:
                inquiry_grade = social_grade if social_grade is not None else science_grade
            connection.execute(
                """
                INSERT INTO TB_CSAT_SCORE (
                    student_id,
                    school_year,
                    exam_year,
                    exam_type,
                    exam_month,
                    korean_grade,
                    math_grade,
                    english_grade,
                    science_grade,
                    inquiry_type,
                    social_grade,
                    total_score
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student_id,
                    year,
                    year,
                    self._mock_exam_type_from_term(str(record.get("term") or "")),
                    self._safe_int(str(record.get("term") or "").split("-")[-1]),
                    korean_grade,
                    math_grade,
                    english_grade,
                    inquiry_grade,
                    inquiry_type,
                    inquiry_grade,
                    total,
                ),
            )

        student_records = payload.get("studentRecords", [])
        for record in student_records:
            year, semester_no = self._infer_period(record)
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD (student_id, record_type, subject_name, content_body, academic_year, semester)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    student_id,
                    "활동",
                    str(record.get("title") or "활동기록"),
                    str(record.get("description") or ""),
                    2026 + (year or 1),
                    semester_no,
                ),
            )

    def _resolve_goal_admission(self, connection: sqlite3.Connection, university: str, major: str, year: int) -> int:
        univ_code = f"U{abs(hash(university)) % 10_000_000:07d}"
        connection.execute(
            """
            INSERT INTO TB_UNIVERSITY (univ_code, univ_name, univ_type, region)
            VALUES (?, ?, '사립', '미상')
            ON CONFLICT(univ_name) DO NOTHING
            """,
            (univ_code, university),
        )
        univ_row = connection.execute("SELECT univ_id FROM TB_UNIVERSITY WHERE univ_name = ?", (university,)).fetchone()
        if univ_row is None:
            raise RuntimeError("failed to resolve university")
        univ_id = int(univ_row["univ_id"])

        connection.execute(
            """
            INSERT INTO TB_DEPARTMENT (univ_id, dept_name, college_name, major_field, dept_type)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(univ_id, dept_name) DO NOTHING
            """,
            (univ_id, major, "", "", ""),
        )
        dept_row = connection.execute(
            "SELECT dept_id FROM TB_DEPARTMENT WHERE univ_id = ? AND dept_name = ?",
            (univ_id, major),
        ).fetchone()
        if dept_row is None:
            raise RuntimeError("failed to resolve department")
        dept_id = int(dept_row["dept_id"])

        admission_row = connection.execute(
            """
            SELECT admission_id
            FROM TB_ADMISSION_TYPE
            WHERE dept_id = ? AND admission_year = ? AND admission_type = '수시'
            """,
            (dept_id, year),
        ).fetchone()
        if admission_row is not None:
            return int(admission_row["admission_id"])

        cursor = connection.execute(
            """
            INSERT INTO TB_ADMISSION_TYPE
                (dept_id, admission_year, admission_type, admission_method, recruit_cnt, doc_ratio, interview_ratio, csat_required)
            VALUES (?, ?, '수시', '학생부교과', 0, 100.0, 0.0, 0)
            """,
            (dept_id, year),
        )
        return int(cursor.lastrowid)

    def save_snapshot(self, payload: dict[str, Any], user_key: str = "local-user") -> dict[str, Any]:
        saved_at = datetime.now(timezone.utc).isoformat()
        summary = build_payload_summary(payload)

        with self._connect() as connection:
            user_id, student_id = self._ensure_user_and_student(connection, user_key)
            self._touch_user_log_at(connection, user_id)
            self._upsert_score_payload(connection, student_id, payload)
            connection.execute(
                """
                INSERT INTO TB_NOTIFICATION (user_id, noti_type, title, body, is_read)
                VALUES (?, 'analysis', '성적 데이터가 저장되었습니다', ?, 0)
                """,
                (
                    user_id,
                    f"내신 {summary['schoolRecordCount']}건, 모의고사 {summary['mockExamCount']}건이 반영되었습니다.",
                ),
            )
            connection.execute(
                """
                INSERT INTO TB_AI_ANALYSIS (student_id, analysis_type, pass_prob, score_gap, model_version, summary_text, analyzed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student_id,
                    "score_snapshot",
                    None,
                    None,
                    "v1.0",
                    f"score snapshot saved at {saved_at}",
                    saved_at,
                ),
            )
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD (student_id, record_type, subject_name, content_body, academic_year, semester)
                VALUES (?, 'snapshot', 'onboarding-json', ?, NULL, NULL)
                """,
                (student_id, json.dumps(payload, ensure_ascii=False)),
            )

        return {
            "ok": True,
            "source": "sqlite",
            "savedAt": saved_at,
            "summary": summary,
            "data": payload,
        }

    def get_snapshot(self, user_key: str = "local-user") -> dict[str, Any]:
        with self._connect() as connection:
            user_id = self._resolve_user_id(connection, user_key)
            if user_id is None:
                return {"ok": True, "source": "sqlite", "data": None}
            student_row = connection.execute(
                "SELECT student_id FROM TB_STUDENT_PROFILE WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if student_row is None:
                return {"ok": True, "source": "sqlite", "data": None}
            student_id = int(student_row["student_id"])
            settings_display = compute_settings_display_from_tables(connection, student_id)
            row = connection.execute(
                """
                SELECT
                    content_body,
                    rowid
                FROM TB_STUDENT_RECORD
                WHERE student_id = ? AND record_type = 'snapshot' AND subject_name = 'onboarding-json'
                ORDER BY rowid DESC
                LIMIT 1
                """,
                (student_id,),
            ).fetchone()
            mock_rows = connection.execute(
                """
                SELECT
                    school_year,
                    exam_year,
                    exam_type,
                    korean_grade,
                    math_grade,
                    english_grade,
                    science_grade,
                    inquiry_type,
                    social_grade,
                    total_score
                FROM TB_CSAT_SCORE
                WHERE student_id = ?
                  AND (
                    lower(coalesce(exam_type, '')) IN ('3월', '6월', '9월', '수능', 'march', 'june', 'september', 'august-csat')
                    OR lower(coalesce(exam_type, '')) LIKE '%대학수학능력시험%'
                    OR lower(coalesce(exam_type, '')) LIKE '%전국연합학력평가%'
                    OR lower(coalesce(exam_type, '')) LIKE '%csat%'
                  )
                ORDER BY csat_id ASC
                """,
                (student_id,),
            ).fetchall()
            school_rows = connection.execute(
                """
                SELECT school_year, semester, exam_period, subject_name, grade
                FROM TB_ACADEMIC_SCORE
                WHERE student_id = ?
                ORDER BY score_id ASC
                """,
                (student_id,),
            ).fetchall()

        payload: dict[str, Any]
        if row is None:
            payload = {"schoolRecords": [], "mockExams": [], "studentRecords": [], "uploads": []}
        else:
            payload = json.loads(row["content_body"])
        if mock_rows:
            mock_exams: list[dict[str, Any]] = []
            for index, mrow in enumerate(mock_rows):
                year_val = self._safe_int(mrow["school_year"])
                if year_val is None:
                    year_val = self._safe_int(mrow["exam_year"])
                grade_year = "1"
                if year_val in (1, 2, 3):
                    grade_year = str(year_val)
                term = self._mock_term_from_exam_type(str(mrow["exam_type"] or ""))
                subjects = self._mock_subjects_from_row(mrow)
                mock_exams.append(
                    {
                        "id": f"{grade_year}-{term}-{index}",
                        "year": grade_year,
                        "term": term,
                        "subjects": subjects,
                        "overallAverage": "" if mrow["total_score"] is None else f"{float(mrow['total_score']):.2f}",
                        "updatedAt": datetime.now(timezone.utc).isoformat(),
                    }
                )
            payload["mockExams"] = mock_exams

        if school_rows:
            grouped: dict[tuple[str, str], dict[str, Any]] = {}
            for index, srow in enumerate(school_rows):
                year_val = self._safe_int(srow["school_year"])
                semester_no = self._safe_int(srow["semester"])
                exam_period = str(srow["exam_period"] or "").strip()
                if year_val is None or semester_no is None or not exam_period:
                    parsed_year, parsed_semester, parsed_period = self._parse_academic_semester_label(str(srow["semester"] or ""))
                    if year_val is None:
                        year_val = parsed_year
                    if semester_no is None:
                        semester_no = parsed_semester
                    if not exam_period:
                        exam_period = parsed_period or ""
                grade_year = "1"
                if year_val in (1, 2, 3):
                    grade_year = str(year_val)
                term = self._school_term_from_semester_parts(semester_no, exam_period)
                key = (grade_year, term)
                if key not in grouped:
                    grouped[key] = {
                        "id": f"{grade_year}-{term}-{index}",
                        "year": grade_year,
                        "term": term,
                        "subjects": [
                            {"subject": "국어", "score": "", "isCustom": False},
                            {"subject": "수학", "score": "", "isCustom": False},
                            {"subject": "영어", "score": "", "isCustom": False},
                            {"subject": "사탐", "score": "", "isCustom": False},
                            {"subject": "과탐", "score": "", "isCustom": False},
                        ],
                        "overallAverage": "",
                        "updatedAt": datetime.now(timezone.utc).isoformat(),
                    }
                subject_name = self._normalize_school_subject_name(str(srow["subject_name"] or ""))
                if subject_name is None:
                    continue
                grade_val = self._safe_int(srow["grade"])
                if grade_val is None:
                    continue
                for entry in grouped[key]["subjects"]:
                    if entry["subject"] == subject_name:
                        entry["score"] = str(grade_val)
                        break
            payload["schoolRecords"] = list(grouped.values())
        summary = build_payload_summary(payload)
        return {
            "ok": True,
            "source": "sqlite",
            "savedAt": datetime.now(timezone.utc).isoformat(),
            "summary": summary,
            "data": payload if (row is not None or mock_rows or school_rows) else None,
            "settingsDisplay": settings_display,
        }

    def save_profile(self, payload: dict[str, Any], user_key: str = "local-user") -> dict[str, Any]:
        saved_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            user_id, student_id = self._ensure_user_and_student(connection, user_key)
            self._touch_user_log_at(connection, user_id)
            grade_label = str(payload.get("gradeLabel") or "")
            grade_num = int(grade_label[1]) if grade_label.startswith("고") and len(grade_label) > 1 and grade_label[1].isdigit() else None
            connection.execute(
                """
                UPDATE TB_STUDENT_PROFILE
                SET student_name = ?,
                    school_name = ?,
                    grade = ?,
                    current_grade = ?,
                    admission_year = ?,
                    residence_city_county = ?,
                    residence_town = ?,
                    region = ?,
                    district = ?,
                    track = ?,
                    grade_label = ?
                WHERE student_id = ?
                """,
                (
                    str(payload.get("name") or "학생"),
                    str(payload.get("schoolName") or ""),
                    grade_num,
                    grade_label,
                    payload.get("targetYear"),
                    str(payload.get("region") or ""),
                    str(payload.get("district") or ""),
                    str(payload.get("region") or ""),
                    str(payload.get("district") or ""),
                    str(payload.get("track") or ""),
                    grade_label,
                    student_id,
                ),
            )
            connection.execute(
                """
                UPDATE TB_USER
                SET profile_image_url = ?
                WHERE user_id = ?
                """,
                (str(payload.get("profileImageUrl") or ""), user_id),
            )
        return {"ok": True, "source": "sqlite", "savedAt": saved_at, "data": payload}

    def get_profile(self, user_key: str = "local-user") -> dict[str, Any]:
        with self._connect() as connection:
            user_id = self._resolve_user_id(connection, user_key)
            if user_id is None:
                return {"ok": True, "source": "sqlite", "data": None}
            row = connection.execute(
                """
                SELECT
                    sp.student_name,
                    sp.school_name,
                    sp.current_grade,
                    sp.grade_label,
                    sp.residence_city_county,
                    sp.residence_town,
                    sp.region,
                    sp.district,
                    sp.track,
                    sp.admission_year,
                    u.profile_image_url
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER u ON u.user_id = sp.user_id
                WHERE sp.user_id = ?
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return {"ok": True, "source": "sqlite", "data": None}
        return {
            "ok": True,
            "source": "sqlite",
            "data": {
                "name": row["student_name"] or "",
                "schoolName": row["school_name"] or "",
                "gradeLabel": row["current_grade"] or row["grade_label"] or "고2",
                "region": row["residence_city_county"] or row["region"] or "서울",
                "district": row["residence_town"] or row["district"] or "강남구",
                "track": row["track"] or "인문",
                "targetYear": row["admission_year"] or 2027,
                "profileImageUrl": row["profile_image_url"] or "",
                "hasRequiredInfo": True,
                "hasScores": True,
            },
        }

    def save_goals(self, payload: list[dict[str, Any]], user_key: str = "local-user") -> dict[str, Any]:
        saved_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            user_id, student_id = self._ensure_user_and_student(connection, user_key)
            self._touch_user_log_at(connection, user_id)
            connection.execute("DELETE FROM TB_APPLICATION_LIST WHERE student_id = ?", (student_id,))
            connection.execute("DELETE FROM TB_RECOMMENDATION WHERE student_id = ?", (student_id,))
            for index, goal in enumerate(payload[:3]):
                university = str(goal.get("university") or "").strip()
                major = str(goal.get("major") or "").strip()
                if not university or not major:
                    continue
                admission_id = self._resolve_goal_admission(connection, university, major, datetime.now(timezone.utc).year)
                strategy = "도전" if index == 0 else "적정" if index == 1 else "안정"
                connection.execute(
                    """
                    INSERT INTO TB_APPLICATION_LIST (student_id, admission_id, strategy_type, status, priority_no, note)
                    VALUES (?, ?, ?, 'active', ?, ?)
                    """,
                    (student_id, admission_id, strategy, index + 1, f"{index + 1}순위 목표"),
                )
                connection.execute(
                    """
                    INSERT INTO TB_RECOMMENDATION (student_id, admission_id, rec_score, strategy_type, reason_text)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (student_id, admission_id, 80 - index * 7, strategy, "목표 기반 추천"),
                )
        return {"ok": True, "source": "sqlite", "savedAt": saved_at, "data": payload}

    def get_goals(self, user_key: str = "local-user") -> dict[str, Any]:
        with self._connect() as connection:
            user_id = self._resolve_user_id(connection, user_key)
            if user_id is None:
                return {"ok": True, "source": "sqlite", "data": []}
            rows = connection.execute(
                """
                SELECT u.univ_name, d.dept_name
                FROM TB_APPLICATION_LIST a
                JOIN TB_STUDENT_PROFILE sp ON sp.student_id = a.student_id
                JOIN TB_ADMISSION_TYPE atp ON atp.admission_id = a.admission_id
                JOIN TB_DEPARTMENT d ON d.dept_id = atp.dept_id
                JOIN TB_UNIVERSITY u ON u.univ_id = d.univ_id
                WHERE sp.user_id = ?
                ORDER BY a.priority_no ASC, a.application_id ASC
                LIMIT 3
                """,
                (user_id,),
            ).fetchall()
        data = [{"university": row["univ_name"], "major": row["dept_name"]} for row in rows]
        return {"ok": True, "source": "sqlite", "data": data}

    def try_login(self, login_id: str, password: str) -> dict[str, Any]:
        """SQLite TB_USER + TB_USER_AUTH 기반 로그인. 로컬스토리지 전용 가입과 별도."""
        lid = str(login_id or "").strip()
        pwd = str(password or "").strip()
        if not lid:
            return {"ok": False, "error": "아이디를 입력해 주세요."}

        lowered = lid.lower()
        skip_user_password_markers = {"", "excel-import", "local-only"}

        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT u.user_id, u.email, u.password_hash AS user_password,
                       a.login_id, a.password_hash AS auth_password,
                       trim(coalesce(sp.student_name, '')) AS student_name
                FROM TB_USER u
                INNER JOIN TB_USER_AUTH a ON a.user_id = u.user_id
                LEFT JOIN TB_STUDENT_PROFILE sp ON sp.user_id = u.user_id
                WHERE lower(trim(a.login_id)) = ?
                   OR lower(trim(u.email)) = ?
                LIMIT 1
                """,
                (lowered, lowered),
            ).fetchone()

        if row is None:
            return {"ok": False, "error": "등록된 회원을 찾지 못했습니다."}

        auth_pwd = str(row["auth_password"] or "").strip()
        user_pwd = str(row["user_password"] or "").strip()
        login_key_norm = str(row["login_id"] or "").strip().lower()

        if auth_pwd:
            if pwd != auth_pwd:
                return {"ok": False, "error": "비밀번호가 일치하지 않습니다."}
        elif user_pwd.lower() in skip_user_password_markers:
            if pwd != "":
                return {"ok": False, "error": "비밀번호가 일치하지 않습니다."}
        elif user_pwd and (
            user_pwd.lower() == lowered
            or (login_key_norm and user_pwd.lower() == login_key_norm)
        ):
            # 레거시/테스트: TB_USER.password_hash가 로그인 아이디와 동일하면 비밀번호 미설정으로 간주(아이디·이메일 로그인 공통)
            if pwd not in ("", user_pwd):
                return {"ok": False, "error": "비밀번호가 일치하지 않습니다."}
        else:
            if pwd != user_pwd:
                return {"ok": False, "error": "비밀번호가 일치하지 않습니다."}

        login_key = str(row["login_id"] or "").strip() or lid
        name = str(row["student_name"] or "").strip() or login_key
        email = str(row["email"] or "").strip().lower()
        if not email:
            email = f"{login_key.lower()}@local.uni-mate"

        return {
            "ok": True,
            "source": "sqlite",
            "data": {"userId": login_key, "name": name, "email": email},
        }

    def save_analysis_result(self, payload: dict[str, Any], user_key: str = "local-user") -> dict[str, Any]:
        saved_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            user_id, student_id = self._ensure_user_and_student(connection, user_key)
            self._touch_user_log_at(connection, user_id)
            connection.execute(
                """
                INSERT INTO TB_AI_ANALYSIS (student_id, analysis_type, pass_prob, score_gap, model_version, summary_text, analyzed_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    student_id,
                    str(payload.get("source") or "analysis"),
                    None,
                    None,
                    "v1.0",
                    f"analysis completed at {payload.get('completedAt') or saved_at}",
                    payload.get("completedAt") or saved_at,
                ),
            )
            connection.execute(
                """
                INSERT INTO TB_NOTIFICATION (user_id, noti_type, title, body, is_read)
                VALUES (?, 'analysis', 'AI 분석이 완료되었습니다', ?, 0)
                """,
                (user_id, str(payload.get("source") or "analysis")),
            )
        return {"ok": True, "source": "sqlite", "savedAt": saved_at, "data": payload}

    def save_guest_temp(self, payload: dict[str, Any], user_key: str = "guest-temp") -> dict[str, Any]:
        """비회원 저장: 연락 식별자 기준 24시간 임시 보관."""
        saved_at_dt = datetime.now(timezone.utc)
        expires_at_dt = saved_at_dt + timedelta(hours=24)
        saved_at = saved_at_dt.isoformat()
        expires_at = expires_at_dt.isoformat()

        contact_type = str(payload.get("contactType") or "").strip()
        contact_id = str(payload.get("contactId") or "").strip().lower()
        if contact_type not in {"email", "kakao"} or not contact_id:
            return {"ok": False, "source": "sqlite", "error": "연락 식별자(email/kakao)를 입력해 주세요."}

        temp_user_key = f"guest:{contact_type}:{contact_id}"
        with self._connect() as connection:
            user_id, student_id = self._ensure_user_and_student(connection, temp_user_key)
            self._touch_user_log_at(connection, user_id)
            body = {
                "savedAt": saved_at,
                "expiresAt": expires_at,
                "contactType": contact_type,
                "contactId": contact_id,
                "snapshot": payload.get("snapshot") or {},
            }
            connection.execute(
                """
                DELETE FROM TB_STUDENT_RECORD
                WHERE student_id = ? AND record_type = 'guest-temp' AND subject_name = ?
                """,
                (student_id, f"{contact_type}:{contact_id}"),
            )
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD (student_id, record_type, subject_name, content_body, academic_year, semester)
                VALUES (?, 'guest-temp', ?, ?, NULL, NULL)
                """,
                (student_id, f"{contact_type}:{contact_id}", json.dumps(body, ensure_ascii=False)),
            )

        return {
            "ok": True,
            "source": "sqlite",
            "savedAt": saved_at,
            "expiresAt": expires_at,
            "data": {"contactType": contact_type, "contactId": contact_id},
        }

    def get_guest_temp(self, payload: dict[str, Any], user_key: str = "guest-temp") -> dict[str, Any]:
        contact_type = str(payload.get("contactType") or "").strip()
        contact_id = str(payload.get("contactId") or "").strip().lower()
        if contact_type not in {"email", "kakao"} or not contact_id:
            return {"ok": False, "source": "sqlite", "error": "연락 식별자(email/kakao)를 입력해 주세요."}

        temp_user_key = f"guest:{contact_type}:{contact_id}"
        with self._connect() as connection:
            user_id = self._resolve_user_id(connection, temp_user_key)
            if user_id is None:
                return {"ok": True, "source": "sqlite", "data": None}
            student_row = connection.execute(
                "SELECT student_id FROM TB_STUDENT_PROFILE WHERE user_id = ?",
                (user_id,),
            ).fetchone()
            if student_row is None:
                return {"ok": True, "source": "sqlite", "data": None}
            student_id = int(student_row["student_id"])
            row = connection.execute(
                """
                SELECT record_id, content_body
                FROM TB_STUDENT_RECORD
                WHERE student_id = ? AND record_type = 'guest-temp' AND subject_name = ?
                ORDER BY record_id DESC
                LIMIT 1
                """,
                (student_id, f"{contact_type}:{contact_id}"),
            ).fetchone()
            if row is None:
                return {"ok": True, "source": "sqlite", "data": None}
            data = json.loads(str(row["content_body"] or "{}"))
            expires_at = str(data.get("expiresAt") or "")
            try:
                expires_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            except ValueError:
                expires_dt = datetime.now(timezone.utc) - timedelta(seconds=1)
            if expires_dt <= datetime.now(timezone.utc):
                connection.execute(
                    "DELETE FROM TB_STUDENT_RECORD WHERE record_id = ?",
                    (int(row["record_id"]),),
                )
                return {"ok": True, "source": "sqlite", "data": None, "expired": True}
            return {"ok": True, "source": "sqlite", "data": data}

    def get_analysis_result(self, user_key: str = "local-user") -> dict[str, Any]:
        with self._connect() as connection:
            user_id = self._resolve_user_id(connection, user_key)
            if user_id is None:
                return {"ok": True, "source": "sqlite", "data": None}
            row = connection.execute(
                """
                SELECT aa.analysis_type, aa.analyzed_at
                FROM TB_AI_ANALYSIS aa
                JOIN TB_STUDENT_PROFILE sp ON sp.student_id = aa.student_id
                WHERE sp.user_id = ?
                ORDER BY aa.analysis_id DESC
                LIMIT 1
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return {"ok": True, "source": "sqlite", "data": None}
        return {
            "ok": True,
            "source": "sqlite",
            "data": {"source": row["analysis_type"], "completedAt": row["analyzed_at"]},
        }
