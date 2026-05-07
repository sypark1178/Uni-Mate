import sqlite3

c = sqlite3.connect('data/uni_mate.db')

# 각 student_id별 생기부 텍스트 총 길이 확인
rows = c.execute("""
    SELECT student_id, COUNT(*) as cnt, SUM(LENGTH(content_body)) as total_len
    FROM TB_STUDENT_RECORD
    WHERE student_id IN (100, 101, 102, 103)
    GROUP BY student_id
""").fetchall()

for r in rows:
    print(f"student_id: {r[0]}, 건수: {r[1]}, 총 글자수: {r[2]}")

c.close()