from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
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
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS onboarding_score_snapshots (
                    user_key TEXT PRIMARY KEY,
                    payload_json TEXT NOT NULL,
                    active_tab TEXT,
                    selected_year TEXT,
                    selected_term TEXT,
                    updated_at TEXT,
                    saved_at TEXT NOT NULL,
                    school_record_count INTEGER NOT NULL DEFAULT 0,
                    mock_exam_count INTEGER NOT NULL DEFAULT 0,
                    student_record_count INTEGER NOT NULL DEFAULT 0,
                    upload_count INTEGER NOT NULL DEFAULT 0
                )
                """
            )

    def save_snapshot(self, payload: dict[str, Any], user_key: str = "local-user") -> dict[str, Any]:
        saved_at = datetime.now(timezone.utc).isoformat()
        summary = build_payload_summary(payload)

        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO onboarding_score_snapshots (
                    user_key,
                    payload_json,
                    active_tab,
                    selected_year,
                    selected_term,
                    updated_at,
                    saved_at,
                    school_record_count,
                    mock_exam_count,
                    student_record_count,
                    upload_count
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_key) DO UPDATE SET
                    payload_json = excluded.payload_json,
                    active_tab = excluded.active_tab,
                    selected_year = excluded.selected_year,
                    selected_term = excluded.selected_term,
                    updated_at = excluded.updated_at,
                    saved_at = excluded.saved_at,
                    school_record_count = excluded.school_record_count,
                    mock_exam_count = excluded.mock_exam_count,
                    student_record_count = excluded.student_record_count,
                    upload_count = excluded.upload_count
                """,
                (
                    user_key,
                    json.dumps(payload),
                    payload.get("activeTab"),
                    payload.get("selectedYear"),
                    payload.get("selectedTerm"),
                    payload.get("updatedAt"),
                    saved_at,
                    summary["schoolRecordCount"],
                    summary["mockExamCount"],
                    summary["studentRecordCount"],
                    summary["uploadCount"],
                ),
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
            row = connection.execute(
                """
                SELECT
                    payload_json,
                    active_tab,
                    selected_year,
                    selected_term,
                    updated_at,
                    saved_at,
                    school_record_count,
                    mock_exam_count,
                    student_record_count,
                    upload_count
                FROM onboarding_score_snapshots
                WHERE user_key = ?
                """,
                (user_key,),
            ).fetchone()

        if row is None:
            return {"ok": True, "source": "sqlite", "data": None}

        return {
            "ok": True,
            "source": "sqlite",
            "savedAt": row["saved_at"],
            "summary": {
                "schoolRecordCount": row["school_record_count"],
                "mockExamCount": row["mock_exam_count"],
                "studentRecordCount": row["student_record_count"],
                "uploadCount": row["upload_count"],
            },
            "data": json.loads(row["payload_json"]),
        }
