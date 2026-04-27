import sqlite3

import pandas as pd

EXCEL_PATH = r"E:/sangyun/200 AI기획(20251223~20260514)/프로젝트진행/70 프로세스 설계/Uni-Mate Data_모의고사 20260427.xlsx"
DB_PATH = r"C:/project/Uni-Mate/backend/data/uni_mate.db"
SHEET_NAME = "CSAT_SCORE"


def nv(value):
    return None if pd.isna(value) else value


df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME)

schema_columns = [
    ("csat_id", "INTEGER PRIMARY KEY"),
    ("student_id", "INTEGER NOT NULL"),
    ("school_year", "INTEGER"),
    ("exam_year", "INTEGER"),
    ("exam_type", "TEXT"),
    ("exam_month", "INTEGER"),
    ("inquiry_type", "TEXT"),
    ("korean_grade", "INTEGER"),
    ("math_grade", "INTEGER"),
    ("english_grade", "INTEGER"),
    ("social_grade", "INTEGER"),
    ("life_and_ethics", "INTEGER"),
    ("ethics_and_thought", "INTEGER"),
    ("korean_geography", "INTEGER"),
    ("world_geography", "INTEGER"),
    ("east_asian_history", "INTEGER"),
    ("world_history", "INTEGER"),
    ("economics", "INTEGER"),
    ("politics_and_law", "INTEGER"),
    ("society_and_culture", "INTEGER"),
    ("science_grade", "INTEGER"),
    ("physics_1", "INTEGER"),
    ("chemistry_1", "INTEGER"),
    ("earth_science_1", "INTEGER"),
    ("life_science_1", "INTEGER"),
    ("physics_2", "INTEGER"),
    ("chemistry_2", "INTEGER"),
    ("earth_science_2", "INTEGER"),
    ("life_science_2", "INTEGER"),
    ("language2_grade", "INTEGER"),
    ("german_1", "INTEGER"),
    ("french_1", "INTEGER"),
    ("spanish_1", "INTEGER"),
    ("chinese_1", "INTEGER"),
    ("japanese_1", "INTEGER"),
    ("russian_1", "INTEGER"),
    ("vietnamese_1", "INTEGER"),
    ("arabic_1", "INTEGER"),
    ("classical_chinese_1", "INTEGER"),
    ("total_score", "REAL"),
    ("percentile", "REAL"),
]

column_names = [name for name, _ in schema_columns]
insert_sql = (
    "INSERT INTO TB_CSAT_SCORE (" + ", ".join(column_names) + ") VALUES (" + ", ".join(["?"] * len(column_names)) + ")"
)

with sqlite3.connect(DB_PATH, timeout=5) as conn:
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout = 5000")
    cur.execute("PRAGMA foreign_keys = OFF")

    # backup current table snapshot (if exists)
    cur.execute("DROP TABLE IF EXISTS TB_CSAT_SCORE_BAK_20260427_RECREATE")
    cur.execute("CREATE TABLE TB_CSAT_SCORE_BAK_20260427_RECREATE AS SELECT * FROM TB_CSAT_SCORE")

    # drop and recreate
    cur.execute("DROP TABLE IF EXISTS TB_CSAT_SCORE")
    create_sql = (
        "CREATE TABLE TB_CSAT_SCORE ("
        + ", ".join([f"{name} {dtype}" for name, dtype in schema_columns])
        + ", FOREIGN KEY (student_id) REFERENCES TB_STUDENT_PROFILE(student_id)"
        + ")"
    )
    cur.execute(create_sql)

    rows = [tuple(nv(row.get(col)) for col in column_names) for _, row in df.iterrows()]
    cur.executemany(insert_sql, rows)
    conn.commit()

    cur.execute("PRAGMA foreign_keys = ON")

    table_count = cur.execute("SELECT COUNT(1) FROM TB_CSAT_SCORE").fetchone()[0]
    sample = cur.execute(
        """
        SELECT csat_id, student_id, school_year, exam_year, exam_type, exam_month, inquiry_type, total_score, percentile
        FROM TB_CSAT_SCORE
        ORDER BY csat_id
        LIMIT 5
        """
    ).fetchall()
    cols = [r[1] for r in cur.execute("PRAGMA table_info(TB_CSAT_SCORE)").fetchall()]

print("excel_rows", len(df))
print("inserted_rows", len(rows))
print("table_count", table_count)
print("column_count", len(cols))
print("columns", cols)
print("sample", sample)
