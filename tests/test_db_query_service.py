import sqlite3
import tempfile
import unittest
from pathlib import Path

from backend.app.services.db_query_service import DatabaseQueryService


class DatabaseQueryServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "query-test.db"
        with sqlite3.connect(self.db_path) as connection:
          connection.execute(
              """
              CREATE TABLE sample_students (
                  student_id INTEGER PRIMARY KEY,
                  student_name TEXT NOT NULL,
                  grade INTEGER
              )
              """
          )
          connection.executemany(
              "INSERT INTO sample_students (student_name, grade) VALUES (?, ?)",
              [("Kim", 1), ("Lee", 2)],
          )
        self.service = DatabaseQueryService(self.db_path)

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_list_tables_returns_user_tables(self) -> None:
        result = self.service.list_tables()

        self.assertTrue(result["ok"])
        self.assertEqual(result["source"], "sqlite")
        self.assertEqual(result["dbPath"], str(self.db_path))
        self.assertEqual(result["tables"][0]["name"], "sample_students")
        self.assertEqual(result["tables"][0]["rowCount"], 2)

    def test_run_query_returns_rows_and_columns(self) -> None:
        result = self.service.run_query(
            "SELECT student_id, student_name, grade FROM sample_students ORDER BY student_id",
            max_rows=10,
        )

        self.assertTrue(result["ok"])
        self.assertEqual(result["columns"], ["student_id", "student_name", "grade"])
        self.assertEqual(result["rowCount"], 2)
        self.assertFalse(result["truncated"])
        self.assertEqual(result["rows"][0]["student_name"], "Kim")
        self.assertEqual(result["rows"][1]["grade"], 2)

    def test_run_query_rejects_mutating_sql(self) -> None:
        with self.assertRaises(ValueError):
            self.service.run_query("DELETE FROM sample_students")

    def test_run_query_rejects_multiple_statements(self) -> None:
        with self.assertRaises(ValueError):
            self.service.run_query("SELECT 1; SELECT 2")
