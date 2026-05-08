import sqlite3

c = sqlite3.connect('data/uni_mate.db')

# 고려대, 연세대 csat_required 1로 업데이트
c.execute("""
    UPDATE TB_ADMISSION_TYPE
    SET csat_required = 1
    WHERE dept_id IN (
        SELECT d.dept_id
        FROM TB_DEPARTMENT d
        JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
        WHERE u.univ_name IN ('고려대학교', '연세대학교')
    )
""")
c.commit()

# 확인
rows = c.execute("""
    SELECT u.univ_name, at.csat_required, COUNT(*) as cnt
    FROM TB_ADMISSION_TYPE at
    JOIN TB_DEPARTMENT d ON at.dept_id = d.dept_id
    JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
    WHERE u.univ_name IN ('고려대학교', '연세대학교')
    GROUP BY u.univ_name, at.csat_required
""").fetchall()

for r in rows:
    print(r)

c.close()
print("업데이트 완료!")