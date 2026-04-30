import sqlite3

import pandas as pd

EXCEL_PATH = r"E:/sangyun/200 AI기획(20251223~20260514)/프로젝트진행/70 프로세스 설계/Uni-Mate Data_모의고사 20260427.xlsx"
DB_PATH = r"C:/project/Uni-Mate/backend/data/uni_mate.db"

df = pd.read_excel(EXCEL_PATH, sheet_name="CSAT_SCORE")

col_types = {
    "csat_id": "INTEGER",
    "student_id": "INTEGER",
    "school_year": "INTEGER",
    "exam_year": "INTEGER",
    "exam_type": "TEXT",
    "exam_month": "INTEGER",
    "inquiry_type": "TEXT",
    "korean_grade": "INTEGER",
    "math_grade": "INTEGER",
    "english_grade": "INTEGER",
    "korean_history": "INTEGER",
    "social_grade": "INTEGER",
    "life_and_ethics": "INTEGER",
    "ethics_and_thought": "INTEGER",
    "korean_geography": "INTEGER",
    "world_geography": "INTEGER",
    "east_asian_history": "INTEGER",
    "world_history": "INTEGER",
    "economics": "INTEGER",
    "politics_and_law": "INTEGER",
    "society_and_culture": "INTEGER",
    "science_grade": "INTEGER",
    "physics_1": "INTEGER",
    "chemistry_1": "INTEGER",
    "earth_science_1": "INTEGER",
    "life_science_1": "INTEGER",
    "physics_2": "INTEGER",
    "chemistry_2": "INTEGER",
    "earth_science_2": "INTEGER",
    "life_science_2": "INTEGER",
    "language2_grade": "INTEGER",
    "german_1": "INTEGER",
    "french_1": "INTEGER",
    "spanish_1": "INTEGER",
    "chinese_1": "INTEGER",
    "japanese_1": "INTEGER",
    "russian_1": "INTEGER",
    "vietnamese_1": "INTEGER",
    "arabic_1": "INTEGER",
    "classical_chinese_1": "INTEGER",
    "total_score": "REAL",
    "percentile": "REAL",
}

with sqlite3.connect(DB_PATH, timeout=5) as conn:
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout = 5000")

    existing_cols = [r[1] for r in cur.execute("PRAGMA table_info(TB_CSAT_SCORE)").fetchall()]
    missing = [c for c in df.columns if c not in existing_cols]
    for col in missing:
        cur.execute(f"ALTER TABLE TB_CSAT_SCORE ADD COLUMN {col} {col_types.get(col, 'TEXT')}")

    cur.execute("DROP TABLE IF EXISTS TB_CSAT_SCORE_BAK_20260427_SCHEMA")
    cur.execute("CREATE TABLE TB_CSAT_SCORE_BAK_20260427_SCHEMA AS SELECT * FROM TB_CSAT_SCORE")
    cur.execute("DELETE FROM TB_CSAT_SCORE")

    cols = list(df.columns)
    placeholders = ",".join(["?"] * len(cols))
    insert_sql = f"INSERT INTO TB_CSAT_SCORE ({','.join(cols)}) VALUES ({placeholders})"

    rows = []
    for _, row in df.iterrows():
        rows.append(tuple(None if pd.isna(row.get(c)) else row.get(c) for c in cols))

    cur.executemany(insert_sql, rows)
    conn.commit()

    print("added_columns", missing)
    print("inserted_rows", len(rows))
    print("table_count", cur.execute("SELECT COUNT(1) FROM TB_CSAT_SCORE").fetchone()[0])
    print("schema_columns", [r[1] for r in cur.execute("PRAGMA table_info(TB_CSAT_SCORE)").fetchall()])
