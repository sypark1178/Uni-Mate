from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.app.services.onboarding_score_store import OnboardingScoreStore


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Persist onboarding score snapshots.")
    parser.add_argument("command", choices=("get", "save"))
    parser.add_argument("--db-path", dest="db_path", default=None)
    parser.add_argument("--user-key", dest="user_key", default="local-user")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    db_path = Path(args.db_path) if args.db_path else None
    store = OnboardingScoreStore(db_path=db_path)

    if args.command == "save":
        payload = json.load(sys.stdin)
        result = store.save_snapshot(payload, user_key=args.user_key)
    else:
        result = store.get_snapshot(user_key=args.user_key)

    json.dump(result, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
