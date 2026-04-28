from __future__ import annotations

import re
import sqlite3
from pathlib import Path

import pandas as pd


WORKSPACE = Path(__file__).resolve().parents[2]
DB_PATH = WORKSPACE / "backend" / "data" / "uni_mate.db"
SEARCH_ROOT = Path(r"e:\sangyun")
PATTERN = "*ADMISSION_TYPE_CUTOFF*.xlsx"


def _text(value):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s or None


def _num(value, as_int: bool = False):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    try:
        x = float(value)
        return int(round(x)) if as_int else x
    except Exception:
        return None


def _num_int_fallback(value):
    parsed = _num(value, as_int=True)
    if parsed is not None:
        return parsed
    s = _text(value)
    if not s:
        return None
    m = re.search(r"\d+", s)
    return int(m.group(0)) if m else None


def _find_excel() -> Path:
    matches = sorted(SEARCH_ROOT.rglob(PATTERN), key=lambda p: p.stat().st_mtime, reverse=True)
    if not matches:
        raise FileNotFoundError(f"Excel not found with pattern: {PATTERN}")
    return matches[0]


def main() -> int:
    excel_path = _find_excel()
    xl = pd.ExcelFile(excel_path, engine="openpyxl")

    def sheet(name: str) -> pd.DataFrame:
        return pd.read_excel(xl, sheet_name=name)

    counts: dict[str, int] = {}

    with sqlite3.connect(DB_PATH) as connection:
        cursor = connection.cursor()

        inserted = 0
        for _, row in sheet("UNIVERSITY").iterrows():
            univ_id = _num_int_fallback(row.get("univ_id"))
            if univ_id is None:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO TB_UNIVERSITY
                (univ_id, univ_code, univ_name, univ_type, region, homepage_url, created_at)
                VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
                """,
                (
                    univ_id,
                    _text(row.get("univ_code")),
                    _text(row.get("univ_name")),
                    _text(row.get("univ_type")) or "사립",
                    _text(row.get("region")) or "미상",
                    _text(row.get("homepage_url")),
                    _text(row.get("created_at")),
                ),
            )
            inserted += cursor.rowcount
        counts["TB_UNIVERSITY"] = inserted

        inserted = 0
        for _, row in sheet("DEPARTMENT").iterrows():
            dept_id = _num_int_fallback(row.get("dept_id"))
            univ_id = _num_int_fallback(row.get("univ_id"))
            if dept_id is None or univ_id is None:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO TB_DEPARTMENT
                (dept_id, univ_id, dept_name, college_name, major_field, dept_type)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    dept_id,
                    univ_id,
                    _text(row.get("dept_name")) or "미입력",
                    _text(row.get("college_name")),
                    _text(row.get("major_field")),
                    _text(row.get("dept_type")),
                ),
            )
            inserted += cursor.rowcount
        counts["TB_DEPARTMENT"] = inserted

        inserted = 0
        for _, row in sheet("ADMISSION_TYPE").iterrows():
            admission_id = _num_int_fallback(row.get("admission_id"))
            dept_id = _num_int_fallback(row.get("dept_id"))
            admission_year = _num_int_fallback(row.get("univ_admission_year"))
            if admission_id is None or dept_id is None:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO TB_ADMISSION_TYPE
                (admission_id, dept_id, admission_year, admission_type, admission_method, recruit_cnt,
                 doc_ratio, interview_ratio, csat_required, univ_admission_year, admission_name,
                 evaluation_focus, key_traits, source_doc)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    admission_id,
                    dept_id,
                    admission_year if admission_year is not None else 0,
                    _text(row.get("admission_type")) or "수시",
                    _text(row.get("admission_method")),
                    _num_int_fallback(row.get("recruit_cnt")),
                    _num(row.get("doc_ratio")),
                    _num(row.get("interview_ratio")),
                    int(_num_int_fallback(row.get("csat_required")) or 0),
                    admission_year,
                    _text(row.get("admission_name")),
                    _text(row.get("evaluation_focus")),
                    _text(row.get("key_traits")),
                    _text(row.get("source_doc")),
                ),
            )
            inserted += cursor.rowcount
        counts["TB_ADMISSION_TYPE"] = inserted

        inserted = 0
        for _, row in sheet("ADMISSION_CUTOFF").iterrows():
            cutoff_id = _num_int_fallback(row.get("cutoff_id"))
            admission_id = _num_int_fallback(row.get("admission_id"))
            cutoff_year = _num_int_fallback(row.get("cutoff_year"))
            if cutoff_id is None or admission_id is None or cutoff_year is None:
                continue
            cursor.execute(
                """
                INSERT OR IGNORE INTO TB_ADMISSION_CUTOFF
                (cutoff_id, admission_id, cutoff_year, cutoff_50, cutoff_70, cutoff_80, competition_ratio,
                 avg_grade, record_importance, three_grade_possible, support_notes, grade_policy_note,
                 source_doc, best_grade, worst_grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cutoff_id,
                    admission_id,
                    cutoff_year,
                    _num(row.get("cutoff_50")),
                    _num(row.get("cutoff_70")),
                    _num(row.get("cutoff_80")),
                    _num(row.get("competition_ratio")),
                    _num(row.get("avg_grade")),
                    _text(row.get("record_importance")),
                    _num_int_fallback(row.get("three_grade_possible")),
                    _text(row.get("support_notes")),
                    _text(row.get("grade_policy_note")),
                    _text(row.get("source_doc")),
                    _num(row.get("best_grade")),
                    _num(row.get("worst_grade")),
                ),
            )
            inserted += cursor.rowcount
        counts["TB_ADMISSION_CUTOFF"] = inserted

        for table, pk in [
            ("TB_UNIVERSITY", "univ_id"),
            ("TB_DEPARTMENT", "dept_id"),
            ("TB_ADMISSION_TYPE", "admission_id"),
            ("TB_ADMISSION_CUTOFF", "cutoff_id"),
        ]:
            max_id = cursor.execute(f"SELECT COALESCE(MAX({pk}), 0) FROM {table}").fetchone()[0]
            cursor.execute("DELETE FROM sqlite_sequence WHERE name = ?", (table,))
            cursor.execute("INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)", (table, int(max_id)))

        connection.commit()

    print(f"APPEND_DONE: {excel_path}")
    for table, count in counts.items():
        print(f"{table}: inserted={count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
