from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pandas as pd

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.app.services.onboarding_score_store import DEFAULT_DB_PATH, OnboardingScoreStore

DEFAULT_EXCEL_PATH = Path(
    r"E:/sangyun/200 AI기획(20251223~20260514)/프로젝트진행/70 프로세스 설계/메타정보.xlsx"
)


def normalize_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    return str(value).strip()


def main(argv: list[str] | None = None) -> int:
    args = argv or sys.argv[1:]
    excel_path = Path(args[0]) if args else DEFAULT_EXCEL_PATH
    db_path = Path(args[1]) if len(args) > 1 else DEFAULT_DB_PATH

    if not excel_path.is_file():
        raise FileNotFoundError(f"Excel not found: {excel_path}")

    # Ensure schema/tables exist
    OnboardingScoreStore(db_path=db_path)

    frame = pd.read_excel(excel_path, sheet_name=0)
    if frame.shape[1] < 4:
        raise RuntimeError("메타정보 파일은 최소 4개 컬럼(테이블영문/한글, 필드영문/한글)이 필요합니다.")

    # 컬럼명 인코딩 깨짐 가능성을 감안해, 컬럼명 대신 위치 기반으로 읽는다.
    tuples: list[tuple[str, str, str, str, str]] = []
    for row in frame.itertuples(index=False):
        table_name_en = normalize_text(row[0])
        table_name_ko = normalize_text(row[1])
        field_name_en = normalize_text(row[2])
        field_name_ko = normalize_text(row[3])
        if not table_name_en or not field_name_en:
            continue
        tuples.append((table_name_en, table_name_ko, field_name_en, field_name_ko, str(excel_path)))

    with sqlite3.connect(db_path) as connection:
        cursor = connection.cursor()
        cursor.execute("DELETE FROM TB_METADATA_FIELD_MAP")
        cursor.executemany(
            """
            INSERT INTO TB_METADATA_FIELD_MAP
                (table_name_en, table_name_ko, field_name_en, field_name_ko, source_file)
            VALUES (?, ?, ?, ?, ?)
            """,
            tuples,
        )
        connection.commit()

        count = cursor.execute("SELECT COUNT(*) FROM TB_METADATA_FIELD_MAP").fetchone()[0]
        sample = cursor.execute(
            """
            SELECT table_name_en, table_name_ko, field_name_en, field_name_ko
            FROM TB_METADATA_FIELD_MAP
            ORDER BY table_name_en, field_name_en
            LIMIT 10
            """
        ).fetchall()

    print(
        json.dumps(
            {
                "inserted_rows": len(tuples),
                "table_count": count,
                "sample": [
                    {
                        "table_name_en": row[0],
                        "table_name_ko": row[1],
                        "field_name_en": row[2],
                        "field_name_ko": row[3],
                    }
                    for row in sample
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
