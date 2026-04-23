"""Export every TB_* table from uni_mate.db to CSV + _TABLES_META.txt."""
from __future__ import annotations

import csv
import sqlite3
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
DB = BACKEND / "data" / "uni_mate.db"
OUT = BACKEND / "data" / "full_table_export"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'TB_%' ORDER BY name"
    )
    tables = [r[0] for r in cur.fetchall()]
    meta: list[str] = []
    for t in tables:
        info = cur.execute(f"PRAGMA table_info({t})").fetchall()
        col_names = [c[1] for c in info]
        n = cur.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        meta.append(f"## {t}  rows={n}")
        meta.append("columns: " + ", ".join(col_names))
        path = OUT / f"{t}.csv"
        rows = cur.execute(f"SELECT * FROM {t}").fetchall()
        with path.open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.writer(f)
            w.writerow(col_names)
            for row in rows:
                w.writerow([row[c] for c in col_names])
        meta.append(f"csv: {path}")
        meta.append("")
    (OUT / "_TABLES_META.txt").write_text("\n".join(meta), encoding="utf-8")

    schema_lines: list[str] = []
    for t in tables:
        schema_lines.append(f"### {t}")
        for _cid, name, ctype, notnull, _dflt, pk in cur.execute(f"PRAGMA table_info({t})").fetchall():
            pkmark = " PK" if pk else ""
            nn = " NOT NULL" if notnull else ""
            schema_lines.append(f"  - {name}: {ctype}{nn}{pkmark}")
        schema_lines.append("")
    (OUT / "_SCHEMA_FIELDS.txt").write_text("\n".join(schema_lines), encoding="utf-8")

    conn.close()
    print((OUT / "_TABLES_META.txt").read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
