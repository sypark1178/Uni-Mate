"""
Bulk-update TB_APPLICATION_LIST (+ TB_RECOMMENDATION) for all students.

Sets 1st/2nd/3rd 지망 to Kyung Hee / Sogang / Soongsil business programs
using canonical TB_UNIVERSITY + TB_DEPARTMENT rows (경영학과 / 경영학부).
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "data" / "uni_mate.db"

# Canonical names from TB_UNIVERSITY / TB_DEPARTMENT in seeded DB
GOALS: list[tuple[str, str, str, int]] = [
    ("경희대학교", "경영학과", "도전", 1),
    ("서강대학교", "경영학부", "적정", 2),
    ("숭실대학교", "경영학부", "안정", 3),
]


def resolve_admission(
    conn: sqlite3.Connection, univ_name: str, dept_name: str, year: int
) -> int:
    row = conn.execute(
        """
        SELECT a.admission_id
        FROM TB_ADMISSION_TYPE a
        JOIN TB_DEPARTMENT d ON d.dept_id = a.dept_id
        JOIN TB_UNIVERSITY u ON u.univ_id = d.univ_id
        WHERE u.univ_name = ? AND d.dept_name = ?
          AND a.admission_year = ? AND a.admission_type = '수시'
        LIMIT 1
        """,
        (univ_name, dept_name, year),
    ).fetchone()
    if row is None:
        raise RuntimeError(
            f"admission 없음: {univ_name} / {dept_name} / {year} 수시 — TB_ADMISSION_TYPE 확인"
        )
    return int(row["admission_id"])


def main() -> None:
    year = datetime.now(timezone.utc).year
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    admissions = [(resolve_admission(conn, u, d, year), strat, prio, u, d) for u, d, strat, prio in GOALS]

    student_ids = [int(r["student_id"]) for r in conn.execute("SELECT student_id FROM TB_STUDENT_PROFILE")]
    deleted_app = deleted_rec = inserted_app = inserted_rec = 0

    for sid in student_ids:
        deleted_app += conn.execute(
            "DELETE FROM TB_APPLICATION_LIST WHERE student_id = ?", (sid,)
        ).rowcount
        deleted_rec += conn.execute(
            "DELETE FROM TB_RECOMMENDATION WHERE student_id = ?", (sid,)
        ).rowcount
        for admission_id, strategy, prio, univ, dept in admissions:
            conn.execute(
                """
                INSERT INTO TB_APPLICATION_LIST
                    (student_id, admission_id, strategy_type, status, priority_no, note)
                VALUES (?, ?, ?, 'active', ?, ?)
                """,
                (sid, admission_id, strategy, prio, f"{prio}순위 목표 ({univ} {dept})"),
            )
            inserted_app += 1
            conn.execute(
                """
                INSERT INTO TB_RECOMMENDATION
                    (student_id, admission_id, rec_score, strategy_type, reason_text)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    sid,
                    admission_id,
                    80 - (prio - 1) * 7,
                    strategy,
                    "전체 학생 목표 통일 업데이트",
                ),
            )
            inserted_rec += 1

    conn.commit()
    conn.close()

    print(f"students: {len(student_ids)}")
    print(f"삭제 TB_APPLICATION_LIST rowcount 합: {deleted_app}")
    print(f"삭제 TB_RECOMMENDATION rowcount 합: {deleted_rec}")
    print(f"삽입 TB_APPLICATION_LIST: {inserted_app}")
    print(f"삽입 TB_RECOMMENDATION: {inserted_rec}")
    for adm_id, strat, prio, u, d in admissions:
        print(f"  {prio}순위 admission_id={adm_id} ({u} / {d}) strategy={strat}")


if __name__ == "__main__":
    main()
