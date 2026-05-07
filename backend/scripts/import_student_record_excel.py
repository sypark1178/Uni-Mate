"""
Import STUDENT_RECORD Excel into TB_STUDENT_RECORD.

Expected sheet name: STUDENT_RECORD
Expected columns (Korean headers):
  - 학생생활기록부ID
  - 학생ID
  - 기록유형
  - 과목명
  - 기록내용
  - 학년도
  - 학기

The provided Excel may contain an extra first row with field-name strings
like 'record_id', 'student_id', ...; this script detects and drops it.
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any


def _to_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        # pandas uses nan (float) for missing values
        if v != v:  # NaN check
            return None
    except Exception:
        pass
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    return int(float(s))


def _to_str(v: Any) -> str | None:
    if v is None:
        return None
    try:
        if v != v:  # NaN
            return None
    except Exception:
        pass
    s = str(v)
    return None if s.strip() == "" or s.lower() == "nan" else s


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--excel", required=True, help="Path to 생활기록부.xlsx")
    ap.add_argument(
        "--db",
        default=str(Path(__file__).resolve().parents[1] / "data" / "uni_mate.db"),
        help="Path to uni_mate.db (default: backend/data/uni_mate.db)",
    )
    ap.add_argument("--sheet", default="STUDENT_RECORD")
    args = ap.parse_args()

    excel_path = Path(args.excel)
    if not excel_path.exists():
        raise SystemExit(f"Excel not found: {excel_path}")

    try:
        import pandas as pd  # type: ignore
    except Exception as e:
        raise SystemExit(
            "Missing dependency. Install with: python -m pip install pandas openpyxl"
        ) from e

    df = pd.read_excel(excel_path, sheet_name=args.sheet)

    expected = [
        "학생생활기록부ID",
        "학생ID",
        "기록유형",
        "과목명",
        "기록내용",
        "학년도",
        "학기",
    ]
    for c in expected:
        if c not in df.columns:
            raise SystemExit(f"Missing column: {c} (found: {list(df.columns)})")

    # Drop the extra header-like first row if present
    first = str(df.iloc[0]["학생생활기록부ID"]).strip()
    if first == "record_id":
        df = df.iloc[1:].copy()

    # NOTE: We intentionally do NOT import record_id from Excel.
    # Some Excel dumps may contain duplicate IDs; DB should assign a fresh PK.
    records: list[tuple[Any, ...]] = []
    for row in df.itertuples(index=False):
        sid = _to_int(getattr(row, "학생ID"))
        rtype = _to_str(getattr(row, "기록유형"))
        subj = _to_str(getattr(row, "과목명"))
        body = _to_str(getattr(row, "기록내용"))
        year = _to_int(getattr(row, "학년도"))
        sem = _to_int(getattr(row, "학기"))
        if sid is None:
            continue
        records.append((sid, rtype, subj, body, year, sem))

    db_path = Path(args.db)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    cur.execute("BEGIN")
    cur.execute("DELETE FROM TB_STUDENT_RECORD")
    cur.execute("DELETE FROM sqlite_sequence WHERE name='TB_STUDENT_RECORD'")
    cur.executemany(
        """
        INSERT INTO TB_STUDENT_RECORD
          (student_id, record_type, subject_name, content_body, school_year, semester)
        VALUES
          (?, ?, ?, ?, ?, ?)
        """,
        records,
    )
    conn.commit()

    n = cur.execute("SELECT COUNT(*) FROM TB_STUDENT_RECORD").fetchone()[0]
    minmax = cur.execute("SELECT MIN(record_id), MAX(record_id) FROM TB_STUDENT_RECORD").fetchone()
    conn.close()

    print(f"inserted_rows={n}")
    print(f"record_id_minmax={minmax}")


if __name__ == "__main__":
    main()

