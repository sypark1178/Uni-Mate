from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.app.services.db_query_service import DatabaseQueryService


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read-only SQLite query helper.")
    parser.add_argument("command", choices=("tables", "query"))
    parser.add_argument("--db-path", dest="db_path", default=None)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    service = DatabaseQueryService(db_path=Path(args.db_path) if args.db_path else None)

    try:
        if args.command == "tables":
            result = service.list_tables()
        else:
            payload = json.load(sys.stdin)
            result = service.run_query(
                str(payload.get("sql") or ""),
                int(payload.get("maxRows") or 100),
            )
    except ValueError as error:
        result = {"ok": False, "source": "sqlite", "error": str(error)}
    except Exception as error:  # pragma: no cover - defensive CLI wrapper
        result = {"ok": False, "source": "sqlite", "error": str(error)}

    json.dump(result, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
