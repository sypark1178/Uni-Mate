from __future__ import annotations

import sqlite3
import time
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "uni_mate.db"
ALLOWED_QUERY_PREFIXES = ("select", "with", "pragma", "explain")
DEFAULT_MAX_ROWS = 100
HARD_MAX_ROWS = 200
MAX_SQL_LENGTH = 10000


def _quote_identifier(identifier: str) -> str:
    return f'"{identifier.replace(chr(34), chr(34) * 2)}"'


def _serialize_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return f"<blob {len(value)} bytes>"
    if isinstance(value, memoryview):
        return f"<blob {len(value)} bytes>"
    return value


class DatabaseQueryService:
    def __init__(self, db_path: str | Path | None = None) -> None:
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.execute("PRAGMA query_only = ON")
        return connection

    def list_tables(self) -> dict[str, Any]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT name, type
                FROM sqlite_master
                WHERE type IN ('table', 'view')
                  AND name NOT LIKE 'sqlite_%'
                ORDER BY type ASC, name ASC
                """
            ).fetchall()

            tables: list[dict[str, Any]] = []
            for name, row_type in rows:
                row_count: int | None = None
                if row_type == "table":
                    count_sql = f"SELECT COUNT(*) FROM {_quote_identifier(str(name))}"
                    row_count = int(connection.execute(count_sql).fetchone()[0])
                tables.append(
                    {
                        "name": str(name),
                        "type": str(row_type),
                        "rowCount": row_count,
                    }
                )

        return {
            "ok": True,
            "source": "sqlite",
            "dbPath": str(self.db_path),
            "tables": tables,
        }

    def run_query(self, sql: str, max_rows: int = DEFAULT_MAX_ROWS) -> dict[str, Any]:
        normalized_sql = self._validate_query(sql)
        safe_max_rows = max(1, min(int(max_rows), HARD_MAX_ROWS))

        started_at = time.perf_counter()
        with self._connect() as connection:
            cursor = connection.execute(normalized_sql)
            column_names = [description[0] for description in cursor.description or []]
            raw_rows = cursor.fetchmany(safe_max_rows + 1)
            truncated = len(raw_rows) > safe_max_rows
            visible_rows = raw_rows[:safe_max_rows]
            rows = [
                {column_names[index]: _serialize_value(value) for index, value in enumerate(raw_row)}
                for raw_row in visible_rows
            ]

        elapsed_ms = round((time.perf_counter() - started_at) * 1000, 2)
        return {
            "ok": True,
            "source": "sqlite",
            "dbPath": str(self.db_path),
            "sql": normalized_sql,
            "columns": column_names,
            "rows": rows,
            "rowCount": len(rows),
            "truncated": truncated,
            "maxRows": safe_max_rows,
            "elapsedMs": elapsed_ms,
        }

    def _validate_query(self, sql: str) -> str:
        normalized = str(sql or "").strip()
        if not normalized:
            raise ValueError("SQL query is empty.")
        if len(normalized) > MAX_SQL_LENGTH:
            raise ValueError(f"SQL query is too long. Limit is {MAX_SQL_LENGTH} characters.")

        candidate = normalized[:-1].strip() if normalized.endswith(";") else normalized
        if ";" in candidate:
            raise ValueError("Only a single SQL statement is allowed.")

        first_token = candidate.split(None, 1)[0].lower() if candidate else ""
        if first_token not in ALLOWED_QUERY_PREFIXES:
            allowed = ", ".join(token.upper() for token in ALLOWED_QUERY_PREFIXES)
            raise ValueError(f"Only read-only {allowed} queries are allowed.")

        return candidate
