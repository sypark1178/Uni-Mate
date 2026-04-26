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
        self.assertIn("settingsDisplay", loaded)
        self.assertEqual(loaded["settingsDisplay"]["schoolGradeAverage"], "-")
        self.assertEqual(loaded["settingsDisplay"]["latestMockFourGradeAverage"], "-")

    def test_settings_display_uses_academic_grade_and_latest_csat_grades(self) -> None:
        self.store.save_snapshot(self.payload, user_key="student-3")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                "SELECT student_id FROM TB_STUDENT_PROFILE sp JOIN TB_USER u ON u.user_id = sp.user_id "
                "WHERE lower(u.email) = ?",
                ("student-3@local.uni-mate",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute(
                """
                INSERT INTO TB_ACADEMIC_SCORE
                    (student_id, semester, subject_name, subject_cat, raw_score, grade, credit_hours, z_score)
                VALUES (?, '2-1-midterm', '국어', '내신', NULL, 2, NULL, NULL),
                       (?, '2-1-midterm', '수학', '내신', NULL, 3, NULL, NULL)
                """,
                (sid, sid),
            )
            connection.execute(
                """
                INSERT INTO TB_CSAT_SCORE
                    (student_id, exam_year, exam_type, korean_grade, math_grade, english_grade, science_grade, total_score, percentile)
                VALUES (?, 2026, '6월 모의', 2, 3, 2, 4, NULL, NULL)
                """,
                (sid,),
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="student-3")
        self.assertEqual(loaded["settingsDisplay"]["schoolGradeAverage"], "2.50")
        self.assertEqual(loaded["settingsDisplay"]["latestMockFourGradeAverage"], "2.75")

    def test_settings_display_uses_weighted_academic_average_by_major_group(self) -> None:
        profile_payload = {
            "name": "가중평균회원",
            "gradeLabel": "고2",
            "region": "서울",
            "district": "강남구",
            "schoolName": "테스트고",
            "track": "인문",
            "targetYear": 2027,
        }
        self.store.save_profile(profile_payload, user_key="weighted-business")
        self.store.save_goals([{"university": "테스트대", "major": "경영학과"}], user_key="weighted-business")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = 'weighted-business'
                """
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute("DELETE FROM TB_ACADEMIC_SCORE WHERE student_id = ?", (sid,))
            connection.executemany(
                """
                INSERT INTO TB_ACADEMIC_SCORE
                    (student_id, school_year, semester, exam_period, subject_name, subject_cat, grade, credit_hours)
                VALUES (?, ?, ?, ?, ?, '내신', ?, ?)
                """,
                [
                    (sid, 1, "1", "중간", "국어", 2, 2),
                    (sid, 1, "2", "기말", "국어", 4, 1),
                    (sid, 1, "1", "중간", "영어", 3, 2),
                    (sid, 1, "1", "중간", "수학", 2, 2),
                    (sid, 1, "1", "중간", "사탐", 1, 1),
                    (sid, 1, "2", "기말", "사탐", 3, 3),
                    (sid, 1, "1", "중간", "과탐", 5, 4),
                ],
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="weighted-business")
        self.assertEqual(loaded["settingsDisplay"]["schoolGradeAverage"], "2.54")

        self.store.save_goals([{"university": "테스트대", "major": "컴퓨터공학과"}], user_key="weighted-business")
        loaded_engineering = self.store.get_snapshot(user_key="weighted-business")
        self.assertEqual(loaded_engineering["settingsDisplay"]["schoolGradeAverage"], "3.17")

    def test_settings_display_uses_latest_mock_group_by_exam_year_and_month(self) -> None:
        self.store.save_snapshot(self.payload, user_key="mock-latest")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                "SELECT student_id FROM TB_STUDENT_PROFILE sp JOIN TB_USER_AUTH a ON a.user_id = sp.user_id "
                "WHERE a.login_id = ?",
                ("mock-latest",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute("DELETE FROM TB_CSAT_SCORE WHERE student_id = ?", (sid,))
            connection.executemany(
                """
                INSERT INTO TB_CSAT_SCORE
                    (student_id, exam_year, exam_month, inquiry_type, korean_grade, math_grade, english_grade, social_grade, science_grade)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (sid, 2025, 9, "사회탐구", 1, 1, 1, 1, None),
                    (sid, 2026, 6, "사회탐구", 2, 3, 4, 5, None),
                    (sid, 2026, 9, "과학탐구", 3, 4, 2, None, 1),
                ],
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="mock-latest")
        self.assertEqual(loaded["settingsDisplay"]["latestMockFourGradeAverage"], "2.50")

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
            "profileImageUrl": "data:image/png;base64,abc123",
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
        self.assertEqual(loaded_profile["data"]["profileImageUrl"], "data:image/png;base64,abc123")
        self.assertEqual(len(loaded_goals["data"]), 3)
        self.assertEqual(loaded_analysis["data"]["source"], "goals")

    def test_member_save_updates_last_login_and_guest_temp_keeps_24h(self) -> None:
        profile_payload = {
            "name": "테스터",
            "gradeLabel": "고2",
            "region": "서울",
            "district": "강남구",
            "schoolName": "테스트고",
            "track": "인문",
            "targetYear": 2027,
            "profileImageUrl": "",
            "hasRequiredInfo": True,
            "hasScores": True,
        }
        self.store.save_profile(profile_payload, user_key="member-a")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT u.last_login_at
                FROM TB_USER u
                JOIN TB_USER_AUTH a ON a.user_id = u.user_id
                WHERE lower(a.login_id) = 'member-a'
                LIMIT 1
                """
            ).fetchone()
        self.assertIsNotNone(row)
        self.assertTrue(bool(row["last_login_at"]))

        temp_payload = {
            "contactType": "email",
            "contactId": "guest@example.com",
            "snapshot": {"profile": {"name": "게스트"}},
        }
        saved = self.store.save_guest_temp(temp_payload)
        fetched = self.store.get_guest_temp({"contactType": "email", "contactId": "guest@example.com"})
        self.assertTrue(saved["ok"])
        self.assertTrue(fetched["ok"])
        self.assertIsNotNone(fetched["data"])
        self.assertIn("expiresAt", fetched["data"])

    def test_try_login_uses_user_table_auth_and_updates_last_login(self) -> None:
        self.store.save_profile(
            {
                "name": "로그인회원",
                "gradeLabel": "고2",
                "region": "서울",
                "district": "강남구",
                "schoolName": "테스트고",
                "track": "인문",
                "targetYear": 2027,
            },
            user_key="member-login",
        )
        with self.store._connect() as connection:  # noqa: SLF001
            connection.execute(
                """
                UPDATE TB_USER
                SET last_login_at = NULL
                WHERE user_id = (
                    SELECT user_id FROM TB_USER_AUTH WHERE login_id = 'member-login'
                )
                """
            )
            connection.commit()

        result = self.store.try_login("member-login", "")

        self.assertTrue(result["ok"])
        self.assertEqual(result["data"]["userId"], "member-login")
        self.assertEqual(result["data"]["name"], "로그인회원")
        self.assertEqual(result["data"]["role"], "사용자")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT u.last_login_at
                FROM TB_USER u
                JOIN TB_USER_AUTH a ON a.user_id = u.user_id
                WHERE a.login_id = 'member-login'
                """
            ).fetchone()
        self.assertIsNotNone(row)
        self.assertTrue(bool(row["last_login_at"]))

    def test_profile_image_save_survives_profile_update_without_image(self) -> None:
        saved_image = self.store.save_profile_image(
            {"profileImageUrl": "data:image/png;base64,saved-avatar"},
            user_key="avatar-user",
        )
        self.assertTrue(saved_image["ok"])

        self.store.save_profile(
            {
                "name": "아바타회원",
                "gradeLabel": "고2",
                "region": "서울",
                "district": "강남구",
                "schoolName": "테스트고",
                "track": "인문",
                "targetYear": 2027,
                "profileImageUrl": "",
            },
            user_key="avatar-user",
        )

        loaded = self.store.get_profile(user_key="avatar-user")
        self.assertEqual(loaded["data"]["profileImageUrl"], "data:image/png;base64,saved-avatar")


if __name__ == "__main__":
    unittest.main()
