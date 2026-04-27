import sqlite3

import pandas as pd

CSV_PATH = r"E:/sangyun/200 AI기획(20251223~20260514)/프로젝트진행/70 프로세스 설계/Uni-Mate Data_모의고사 20260427.CSV"
DB_PATH = r"C:/project/Uni-Mate/backend/data/uni_mate.db"


def load_csv(path: str) -> pd.DataFrame:
    for encoding in ("cp949", "euc-kr", "utf-8-sig", "utf-8"):
        try:
            return pd.read_csv(path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise RuntimeError("CSV 인코딩을 판별하지 못했습니다.")


def nv(value):
    return None if pd.isna(value) else value


df = load_csv(CSV_PATH)
columns = list(df.columns)

with sqlite3.connect(DB_PATH, timeout=5) as conn:
    cur = conn.cursor()
    cur.execute("PRAGMA busy_timeout = 5000")
    before_count = cur.execute("SELECT COUNT(1) FROM TB_CSAT_SCORE").fetchone()[0]

    # 백업 테이블
    cur.execute("DROP TABLE IF EXISTS TB_CSAT_SCORE_BAK_20260427_CSV")
    cur.execute("CREATE TABLE TB_CSAT_SCORE_BAK_20260427_CSV AS SELECT * FROM TB_CSAT_SCORE")

    cur.execute("DELETE FROM TB_CSAT_SCORE")
    placeholders = ",".join(["?"] * len(columns))
    insert_sql = f"INSERT INTO TB_CSAT_SCORE ({','.join(columns)}) VALUES ({placeholders})"
    rows = [tuple(nv(row.get(col)) for col in columns) for _, row in df.iterrows()]
    cur.executemany(insert_sql, rows)
    conn.commit()

    after_count = cur.execute("SELECT COUNT(1) FROM TB_CSAT_SCORE").fetchone()[0]
    print("before_count", before_count)
    print("csv_rows", len(df))
    print("inserted_rows", len(rows))
    print("after_count", after_count)
