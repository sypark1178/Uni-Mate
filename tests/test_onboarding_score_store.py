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

    def test_schema_contains_all_erd_tables(self) -> None:
        expected_tables = {
            "TB_UNIVERSITY",
            "TB_DEPARTMENT",
            "TB_ADMISSION_TYPE",
            "TB_ADMISSION_CUTOFF",
            "TB_USER",
            "TB_STUDENT_PROFILE",
            "TB_ACADEMIC_SCORE",
            "TB_CSAT_SCORE",
            "TB_STUDENT_RECORD",
            "TB_APPLICATION_LIST",
            "TB_AI_ANALYSIS",
            "TB_RECOMMENDATION",
            "TB_CONSULTING_SESSION",
            "TB_NOTIFICATION",
        }
        with self.store._connect() as connection:  # noqa: SLF001 - test-only schema assertion
            rows = connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
        actual_tables = {row["name"] for row in rows}
        self.assertTrue(expected_tables.issubset(actual_tables))

    def test_profile_goals_and_analysis_round_trip(self) -> None:
        profile_payload = {
            "name": "홍길동",
            "gradeLabel": "고2",
            "region": "서울",
            "district": "강남구",
            "schoolName": "대치고등학교",
            "track": "인문",
            "targetYear": 2027,
            "hasRequiredInfo": True,
            "hasScores": True,
        }
        goals_payload = [
            {"university": "서강대", "major": "경영학부"},
            {"university": "한양대", "major": "경영학부"},
            {"university": "중앙대", "major": "경영학부"},
        ]
        analysis_payload = {"source": "goals", "completedAt": "2026-04-22T00:00:00Z"}

        self.store.save_profile(profile_payload, user_key="student-2")
        self.store.save_goals(goals_payload, user_key="student-2")
        self.store.save_analysis_result(analysis_payload, user_key="student-2")

        loaded_profile = self.store.get_profile(user_key="student-2")
        loaded_goals = self.store.get_goals(user_key="student-2")
        loaded_analysis = self.store.get_analysis_result(user_key="student-2")

        self.assertEqual(loaded_profile["data"]["name"], "홍길동")
        self.assertEqual(len(loaded_goals["data"]), 3)
        self.assertEqual(loaded_analysis["data"]["source"], "goals")


if __name__ == "__main__":
    unittest.main()
