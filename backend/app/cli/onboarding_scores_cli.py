from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from backend.app.services.onboarding_score_store import OnboardingScoreStore

DEFAULT_GUEST_TEMP_DB_PATH = WORKSPACE_ROOT / "backend" / "data" / "uni_mate_guest_temp.db"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Persist onboarding score snapshots.")
    parser.add_argument("command", choices=("get", "save", "login"))
    parser.add_argument(
        "--entity",
        dest="entity",
        choices=("scores", "profile", "goals", "analysis", "guest_temp"),
        default="scores",
    )
    parser.add_argument("--db-path", dest="db_path", default=None)
    parser.add_argument("--user-key", dest="user_key", default="local-user")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.db_path:
        db_path = Path(args.db_path)
    elif args.entity == "guest_temp":
        db_path = DEFAULT_GUEST_TEMP_DB_PATH
    else:
        db_path = None
    store = OnboardingScoreStore(db_path=db_path)

    if args.command == "login":
        payload = json.load(sys.stdin)
        result = store.try_login(str(payload.get("loginId") or ""), str(payload.get("password") or ""))
        json.dump(result, sys.stdout)
        sys.stdout.write("\n")
        return 0

    if args.command == "save":
        payload = json.load(sys.stdin)
        if args.entity == "profile":
            result = store.save_profile(payload, user_key=args.user_key)
        elif args.entity == "goals":
            result = store.save_goals(payload, user_key=args.user_key)
        elif args.entity == "analysis":
            result = store.save_analysis_result(payload, user_key=args.user_key)
        elif args.entity == "guest_temp":
            result = store.save_guest_temp(payload, user_key=args.user_key)
        else:
            result = store.save_snapshot(payload, user_key=args.user_key)
    else:
        if args.entity == "profile":
            result = store.get_profile(user_key=args.user_key)
        elif args.entity == "goals":
            result = store.get_goals(user_key=args.user_key)
        elif args.entity == "analysis":
            result = store.get_analysis_result(user_key=args.user_key)
        elif args.entity == "guest_temp":
            try:
                query = json.load(sys.stdin)
            except Exception:
                query = {}
            result = store.get_guest_temp(query, user_key=args.user_key)
        else:
            result = store.get_snapshot(user_key=args.user_key)

    json.dump(result, sys.stdout)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
