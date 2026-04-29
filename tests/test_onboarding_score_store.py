import json
import tempfile
import unittest
from pathlib import Path

from backend.app.services.onboarding_score_store import (
    MOCK_EXAM_TYPE_CSAT,
    OnboardingScoreStore,
    build_payload_summary,
)


class OnboardingScoreStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "uni_mate.db"
        self.store = OnboardingScoreStore(db_path=self.db_path)
        self.payload = {
            "schoolRecords": [{"id": "1-1-midterm"}],
            "mockExams": [{"id": "1-1-midterm"}],
            "studentRecords": [
                {
                    "id": "2026-1-세특",
                    "year": "1",
                    "term": "1-final",
                    "academicYear": 2026,
                    "semester": 1,
                    "recordType": "세특",
                    "title": "탐구 활동을 수행했습니다.",
                    "description": "탐구 활동을 수행했습니다. 후속 연구 계획을 정리했습니다.",
                    "files": [],
                    "updatedAt": "2026-04-20T10:00:00Z",
                }
            ],
            "uploads": [{"id": "upload-1"}],
            "activeTab": "studentRecord",
            "selectedYear": "2",
            "selectedTerm": "1-final",
            "selectedStudentAcademicYear": 2026,
            "selectedStudentSemester": 1,
            "selectedStudentRecordType": "세특",
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
        self.assertEqual(loaded["data"]["uploads"], self.payload["uploads"])
        loaded_student_record = loaded["data"]["studentRecords"][0]
        self.assertEqual(loaded_student_record["academicYear"], 2026)
        self.assertEqual(loaded_student_record["semester"], 1)
        self.assertEqual(loaded_student_record["recordType"], "세특")
        self.assertEqual(loaded_student_record["title"], "탐구 활동을 수행했습니다.")
        self.assertEqual(loaded_student_record["description"], "탐구 활동을 수행했습니다. 후속 연구 계획을 정리했습니다.")
        self.assertEqual(loaded["summary"]["uploadCount"], 1)
        self.assertIn("settingsDisplay", loaded)
        self.assertEqual(loaded["settingsDisplay"]["schoolGradeAverage"], "-")
        self.assertEqual(loaded["settingsDisplay"]["latestMockFourGradeAverage"], "-")

    def test_student_record_maps_to_student_record_table(self) -> None:
        self.store.save_snapshot(self.payload, user_key="student-record-map")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sr.record_type, sr.subject_name, sr.content_body, sr.school_year, sr.semester
                FROM TB_STUDENT_RECORD sr
                JOIN TB_STUDENT_PROFILE sp ON sp.student_id = sr.student_id
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                  AND sr.record_type != 'snapshot'
                LIMIT 1
                """,
                ("student-record-map",),
            ).fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(row["record_type"], "세특")
        self.assertIsNone(row["subject_name"])
        self.assertEqual(row["content_body"], "탐구 활동을 수행했습니다. 후속 연구 계획을 정리했습니다.")
        self.assertEqual(row["school_year"], 1)
        self.assertEqual(row["semester"], 1)

    def test_student_record_round_trip_preserves_record_id_and_subject_name(self) -> None:
        self.store.save_profile(
            {
                "name": "임도윤",
                "gradeLabel": "고1",
                "region": "서울",
                "district": "강남구",
                "schoolName": "테스트고",
                "track": "인문",
                "targetYear": 2027,
            },
            user_key="LDY01",
        )
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("LDY01",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD
                    (record_id, student_id, record_type, subject_name, content_body, school_year, semester)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (1, sid, "세특", "국어, 수학", "국어 세특: 기존 내용.", 1, 1),
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="LDY01")
        record = loaded["data"]["studentRecords"][0]
        self.assertEqual(record["recordId"], 1)
        self.assertEqual(record["subjectName"], "국어, 수학")
        self.assertEqual(record["description"], "국어 세특: 기존 내용.")

        next_payload = json.loads(json.dumps(self.payload))
        next_payload["studentRecords"] = [
            {
                **record,
                "description": "국어 세특: 수정 내용.",
            }
        ]
        self.store.save_snapshot(next_payload, user_key="LDY01")
        with self.store._connect() as connection:  # noqa: SLF001
            updated = connection.execute(
                "SELECT subject_name, content_body FROM TB_STUDENT_RECORD WHERE record_id = 1",
            ).fetchone()
        self.assertIsNotNone(updated)
        self.assertEqual(updated["subject_name"], "국어, 수학")
        self.assertEqual(updated["content_body"], "국어 세특: 수정 내용.")

    def test_save_snapshot_preserves_existing_student_records_when_payload_is_empty(self) -> None:
        self.store.save_profile(
            {
                "name": "김민지",
                "gradeLabel": "고1",
                "region": "제주",
                "district": "서귀포시",
                "schoolName": "테스트고",
                "track": "인문",
                "targetYear": 2027,
            },
            user_key="KMJ11",
        )
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("KMJ11",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD
                    (record_id, student_id, record_type, subject_name, content_body, school_year, semester)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (694, sid, "세특", "수학, 경제, 경영", "경제 세특: ESG경영 탐구.", 1, 1),
            )
            connection.commit()

        next_payload = json.loads(json.dumps(self.payload))
        next_payload["studentRecords"] = []
        self.store.save_snapshot(next_payload, user_key="KMJ11")
        loaded = self.store.get_snapshot(user_key="KMJ11")

        student_records = loaded["data"]["studentRecords"]
        self.assertTrue(any(record["recordType"] == "세특" and record["academicYear"] == 2026 for record in student_records))
        with self.store._connect() as connection:  # noqa: SLF001
            restored = connection.execute("SELECT content_body FROM TB_STUDENT_RECORD WHERE record_id = 694").fetchone()
        self.assertIsNotNone(restored)
        self.assertEqual(restored["content_body"], "경제 세특: ESG경영 탐구.")

    def test_save_snapshot_updates_same_record_key_without_creating_duplicates(self) -> None:
        self.store.save_snapshot(self.payload, user_key="key-upsert")
        next_payload = json.loads(json.dumps(self.payload))
        next_payload["studentRecords"] = [
            {
                "academicYear": 2026,
                "semester": 1,
                "recordType": "세특",
                "description": "세특 수정 내용",
            }
        ]
        self.store.save_snapshot(next_payload, user_key="key-upsert")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("key-upsert",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            count_row = connection.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM TB_STUDENT_RECORD
                WHERE student_id = ?
                  AND record_type = '세특'
                  AND school_year = 1
                  AND semester = 1
                """,
                (sid,),
            ).fetchone()
            self.assertIsNotNone(count_row)
            self.assertEqual(int(count_row["cnt"]), 1)

    def test_save_snapshot_keeps_other_users_student_records(self) -> None:
        self.store.save_snapshot(self.payload, user_key="user-a")
        self.store.save_snapshot(self.payload, user_key="user-b")
        with self.store._connect() as connection:  # noqa: SLF001
            rows = connection.execute(
                """
                SELECT a.login_id, sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id IN ('user-a', 'user-b')
                ORDER BY a.login_id
                """
            ).fetchall()
            self.assertEqual(len(rows), 2)
            sid_a = int(rows[0]["student_id"])
            sid_b = int(rows[1]["student_id"])
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD
                    (student_id, record_type, subject_name, content_body, school_year, semester)
                VALUES (?, '세특', '국어', 'A 사용자 세특', 1, 1)
                """,
                (sid_a,),
            )
            connection.execute(
                """
                INSERT INTO TB_STUDENT_RECORD
                    (student_id, record_type, subject_name, content_body, school_year, semester)
                VALUES (?, '세특', '국어', 'B 사용자 세특', 3, 2)
                """,
                (sid_b,),
            )
            connection.commit()

        next_payload = json.loads(json.dumps(self.payload))
        next_payload["studentRecords"] = [
            {"academicYear": 2026, "semester": 1, "recordType": "세특", "description": "A 사용자 세특 수정"}
        ]
        self.store.save_snapshot(next_payload, user_key="user-a")
        with self.store._connect() as connection:  # noqa: SLF001
            a_row = connection.execute(
                """
                SELECT content_body FROM TB_STUDENT_RECORD
                WHERE student_id = ? AND record_type = '세특' AND school_year = 1 AND semester = 1
                ORDER BY record_id ASC
                LIMIT 1
                """,
                (sid_a,),
            ).fetchone()
            b_row = connection.execute(
                """
                SELECT content_body FROM TB_STUDENT_RECORD
                WHERE student_id = ? AND record_type = '세특' AND school_year = 3 AND semester = 2
                ORDER BY record_id ASC
                LIMIT 1
                """,
                (sid_b,),
            ).fetchone()
        self.assertIsNotNone(a_row)
        self.assertIsNotNone(b_row)
        self.assertEqual(a_row["content_body"], "A 사용자 세특 수정")
        self.assertEqual(b_row["content_body"], "B 사용자 세특")

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

    def test_save_snapshot_maps_mock_exam_term_fields_into_csat_columns(self) -> None:
        payload = json.loads(json.dumps(self.payload))
        payload["mockExams"] = [
            {
                "id": "3-mock-csat-9",
                "year": "3",
                "term": "mock-csat-9",
                "subjects": [
                    {"subject": "국어", "score": "2.7", "isCustom": False},
                    {"subject": "수학", "score": "3", "isCustom": False},
                    {"subject": "영어", "score": "4", "isCustom": False},
                    {"subject": "사회탐구", "score": "4.5", "isCustom": False},
                ],
                "overallAverage": "3.55",
                "updatedAt": "2026-04-29T00:00:00Z",
            }
        ]

        self.store.save_snapshot(payload, user_key="mock-save-map")

        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT school_year, exam_type, exam_month, korean_grade, math_grade, english_grade, social_grade, total_score
                FROM TB_CSAT_SCORE cs
                JOIN TB_STUDENT_PROFILE sp ON sp.student_id = cs.student_id
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                LIMIT 1
                """,
                ("mock-save-map",),
            ).fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(row["school_year"], 3)
        self.assertEqual(row["exam_type"], "대학수학능력시험")
        self.assertEqual(row["exam_month"], 9)
        self.assertAlmostEqual(float(row["korean_grade"]), 2.7, places=2)
        self.assertAlmostEqual(float(row["math_grade"]), 3.0, places=2)
        self.assertAlmostEqual(float(row["english_grade"]), 4.0, places=2)
        self.assertAlmostEqual(float(row["social_grade"]), 4.5, places=2)
        self.assertAlmostEqual(float(row["total_score"]), 3.55, places=2)

    def test_get_snapshot_rebuilds_mock_exams_from_csat_columns(self) -> None:
        self.store.save_snapshot(self.payload, user_key="mock-load-map")
        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("mock-load-map",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])
            connection.execute("DELETE FROM TB_CSAT_SCORE WHERE student_id = ?", (sid,))
            connection.executemany(
                """
                INSERT INTO TB_CSAT_SCORE
                    (student_id, school_year, exam_year, exam_type, exam_month, inquiry_type, korean_grade, math_grade, english_grade, social_grade, science_grade, language2_grade, total_score)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (sid, 2, 2026, "전국연합학력평가 사회탐구", 3, "사회탐구", 2, 3, 4, 5, None, None, 3.5),
                    (sid, 3, 2026, "대학수학능력시험 사회탐구", 9, "사회탐구", 1.5, 2.5, 3.5, 4.5, None, None, 3.0),
                ],
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="mock-load-map")
        exams = loaded["data"]["mockExams"]
        self.assertEqual([(exam["year"], exam["term"]) for exam in exams], [("2", "mock-nat-3"), ("3", "mock-csat-9")])
        self.assertEqual(exams[0]["subjects"][0]["score"], "2")
        self.assertEqual(exams[0]["subjects"][1]["score"], "3")
        self.assertEqual(exams[0]["subjects"][2]["score"], "4")
        self.assertEqual(exams[0]["subjects"][3]["score"], "5")
        self.assertEqual(exams[1]["subjects"][0]["score"], "1.5")
        self.assertEqual(exams[1]["subjects"][1]["score"], "2.5")
        self.assertEqual(exams[1]["subjects"][2]["score"], "3.5")
        self.assertEqual(exams[1]["subjects"][3]["score"], "4.5")

    def test_get_snapshot_prefers_more_complete_backup_mock_rows_and_realigns_selection(self) -> None:
        payload = json.loads(json.dumps(self.payload))
        payload["activeTab"] = "mockExam"
        payload["selectedYear"] = "1"
        payload["selectedTerm"] = "mock-nat-3"
        self.store.save_snapshot(payload, user_key="mock-backup-source")

        with self.store._connect() as connection:  # noqa: SLF001
            row = connection.execute(
                """
                SELECT sp.student_id
                FROM TB_STUDENT_PROFILE sp
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("mock-backup-source",),
            ).fetchone()
            self.assertIsNotNone(row)
            sid = int(row["student_id"])

            connection.execute("DELETE FROM TB_CSAT_SCORE WHERE student_id = ?", (sid,))
            connection.execute(
                """
                INSERT INTO TB_CSAT_SCORE
                    (student_id, school_year, exam_year, exam_type, exam_month, inquiry_type, korean_grade, math_grade, english_grade, social_grade)
                VALUES (?, NULL, 2026, ?, NULL, '사회탐구', 4, 4, 4, 4)
                """,
                (sid, f"{MOCK_EXAM_TYPE_CSAT} 사회탐구"),
            )

            connection.execute("DROP TABLE IF EXISTS TB_CSAT_SCORE_BAK_20260427")
            connection.execute("CREATE TABLE TB_CSAT_SCORE_BAK_20260427 AS SELECT * FROM TB_CSAT_SCORE WHERE 0")
            connection.execute(
                """
                INSERT INTO TB_CSAT_SCORE_BAK_20260427
                    (student_id, school_year, exam_year, exam_type, exam_month, inquiry_type, korean_grade, math_grade, english_grade, social_grade)
                VALUES (?, 3, 2026, ?, 9, '사회탐구', 4, 4, 4, 4)
                """,
                (sid, MOCK_EXAM_TYPE_CSAT),
            )
            connection.commit()

        loaded = self.store.get_snapshot(user_key="mock-backup-source")
        exams = loaded["data"]["mockExams"]

        self.assertEqual([(exam["year"], exam["term"]) for exam in exams], [("3", "mock-csat-9")])
        self.assertEqual(loaded["data"]["selectedYear"], "3")
        self.assertEqual(loaded["data"]["selectedTerm"], "mock-csat-9")
        self.assertEqual(loaded["settingsDisplay"]["latestMockFourGradeAverage"], "4.00")

    def test_save_snapshot_clears_mock_exam_rows_when_payload_mock_exams_is_empty(self) -> None:
        payload = json.loads(json.dumps(self.payload))
        payload["mockExams"] = [
            {
                "id": "1-mock-nat-3",
                "year": "1",
                "term": "mock-nat-3",
                "subjects": [{"subject": "국어", "score": "3", "isCustom": False}],
                "overallAverage": "3.00",
                "updatedAt": "2026-04-29T00:00:00Z",
            }
        ]
        self.store.save_snapshot(payload, user_key="mock-clear")

        payload["mockExams"] = []
        self.store.save_snapshot(payload, user_key="mock-clear")

        with self.store._connect() as connection:  # noqa: SLF001
            count_row = connection.execute(
                """
                SELECT COUNT(*) AS cnt
                FROM TB_CSAT_SCORE cs
                JOIN TB_STUDENT_PROFILE sp ON sp.student_id = cs.student_id
                JOIN TB_USER_AUTH a ON a.user_id = sp.user_id
                WHERE a.login_id = ?
                """,
                ("mock-clear",),
            ).fetchone()

        self.assertIsNotNone(count_row)
        self.assertEqual(int(count_row["cnt"]), 0)

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
