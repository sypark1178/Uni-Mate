import json
import tempfile
import unittest
from pathlib import Path

from backend.app.services.onboarding_score_store import OnboardingScoreStore, build_payload_summary


class OnboardingScoreStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "uni_mate.db"
        self.store = OnboardingScoreStore(db_path=self.db_path)
        self.payload = {
            "schoolRecords": [{"id": "1-1-midterm"}],
            "mockExams": [{"id": "1-1-midterm"}],
            "studentRecords": [{"id": "1-1-midterm", "title": "club"}],
            "uploads": [{"id": "upload-1"}],
            "activeTab": "studentRecord",
            "selectedYear": "2",
            "selectedTerm": "1-final",
            "updatedAt": "2026-04-20T10:00:00Z",
        }

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_build_payload_summary_counts_records(self) -> None:
        summary = build_payload_summary(self.payload)
        self.assertEqual(summary["schoolRecordCount"], 1)
        self.assertEqual(summary["mockExamCount"], 1)
        self.assertEqual(summary["studentRecordCount"], 1)
        self.assertEqual(summary["uploadCount"], 1)

    def test_save_and_load_snapshot_round_trip(self) -> None:
        saved = self.store.save_snapshot(self.payload, user_key="student-1")
        loaded = self.store.get_snapshot(user_key="student-1")

        self.assertTrue(saved["ok"])
        self.assertEqual(saved["source"], "sqlite")
        self.assertEqual(loaded["data"], self.payload)
        self.assertEqual(loaded["summary"]["uploadCount"], 1)

    def test_save_snapshot_overwrites_same_user_key(self) -> None:
        self.store.save_snapshot(self.payload, user_key="student-1")
        next_payload = json.loads(json.dumps(self.payload))
        next_payload["uploads"].append({"id": "upload-2"})

        self.store.save_snapshot(next_payload, user_key="student-1")
        loaded = self.store.get_snapshot(user_key="student-1")

        self.assertEqual(loaded["summary"]["uploadCount"], 2)
        self.assertEqual(len(loaded["data"]["uploads"]), 2)


if __name__ == "__main__":
    unittest.main()
