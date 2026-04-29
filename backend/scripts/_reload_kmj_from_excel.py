import sqlite3
import sys
import pandas as pd

DB = r'c:/project/Uni-Mate/backend/data/uni_mate.db'
XLSX = sys.argv[1]
TARGET_LOGINS = ['KMJ11','KMJ12','KMJ13','KMJ14']

con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row
cur = con.cursor()
rows = cur.execute('''
SELECT a.login_id, p.student_id
FROM TB_USER_AUTH a
JOIN TB_STUDENT_PROFILE p ON p.user_id = a.user_id
WHERE a.login_id IN (?,?,?,?)
ORDER BY a.login_id
''', TARGET_LOGINS).fetchall()
login_to_sid = {r['login_id']: int(r['student_id']) for r in rows}
target_sids = sorted(login_to_sid.values())
if len(target_sids) != 4:
    raise RuntimeError(f'대상 student_id 확인 실패: {login_to_sid}')

sr = pd.read_excel(XLSX, sheet_name='STUDENT_RECORD')
ac = pd.read_excel(XLSX, sheet_name='ACADEMIC_SCORE')
cs = pd.read_excel(XLSX, sheet_name='CSAT_SCORE')

sr = sr[sr.iloc[:, 1].isin(target_sids)].copy()
ac = ac[ac['student_id'].isin(target_sids)].copy()
cs = cs[cs['student_id'].isin(target_sids)].copy()

with con:
    for table in ['TB_STUDENT_RECORD','TB_ACADEMIC_SCORE','TB_CSAT_SCORE']:
        cur.execute(f"DELETE FROM {table} WHERE student_id IN ({','.join(['?']*len(target_sids))})", target_sids)

    for _, r in sr.iterrows():
        academic_year = None if pd.isna(r.iloc[5]) else int(r.iloc[5])
        if academic_year is None:
            school_year = None
        elif 1 <= academic_year <= 3:
            school_year = academic_year
        elif 2026 <= academic_year <= 2036:
            school_year = max(1, min(3, academic_year - 2025))
        elif 2020 <= academic_year <= 2022:
            school_year = max(1, min(3, academic_year - 2019))
        else:
            school_year = None

        cur.execute(
            '''INSERT INTO TB_STUDENT_RECORD (student_id, record_type, subject_name, content_body, school_year, semester)
               VALUES (?, ?, ?, ?, ?, ?)''',
            (
                int(r.iloc[1]),
                None if pd.isna(r.iloc[2]) else str(r.iloc[2]),
                None if pd.isna(r.iloc[3]) else str(r.iloc[3]),
                None if pd.isna(r.iloc[4]) else str(r.iloc[4]),
                school_year,
                None if pd.isna(r.iloc[6]) else int(r.iloc[6]),
            ),
        )

    ac_cols = ['student_id','school_year','semester','exam_period','subject_name','subject_cat','raw_score','grade','credit_hours','z_score']
    for _, r in ac.iterrows():
        vals = []
        for c in ac_cols:
            v = r.get(c)
            if pd.isna(v):
                vals.append(None)
            elif c in ('student_id','school_year'):
                vals.append(int(v))
            elif c == 'semester':
                vals.append(str(int(v)) if isinstance(v, float) and float(v).is_integer() else str(v))
            else:
                vals.append(v)
        cur.execute(f"INSERT INTO TB_ACADEMIC_SCORE ({','.join(ac_cols)}) VALUES ({','.join(['?']*len(ac_cols))})", vals)

    cs_cols = ['student_id','school_year','exam_year','exam_type','exam_month','inquiry_type','korean_grade','math_grade','english_grade','social_grade','life_and_ethics','ethics_and_thought','korean_geography','world_geography','east_asian_history','world_history','economics','politics_and_law','society_and_culture','science_grade','physics_1','chemistry_1','earth_science_1','life_science_1','physics_2','chemistry_2','earth_science_2','life_science_2','language2_grade','german_1','french_1','spanish_1','chinese_1','japanese_1','russian_1','vietnamese_1','arabic_1','classical_chinese_1','total_score','percentile']
    for _, r in cs.iterrows():
        vals = []
        for c in cs_cols:
            v = r.get(c)
            if pd.isna(v):
                vals.append(None)
            elif c in ('student_id','school_year','exam_year','exam_month'):
                vals.append(int(v))
            else:
                vals.append(v)
        cur.execute(f"INSERT INTO TB_CSAT_SCORE ({','.join(cs_cols)}) VALUES ({','.join(['?']*len(cs_cols))})", vals)

print('EXCEL_PATH', XLSX)
for lg in TARGET_LOGINS:
    sid = login_to_sid[lg]
    sr_cnt = cur.execute('SELECT COUNT(*) FROM TB_STUDENT_RECORD WHERE student_id=?', (sid,)).fetchone()[0]
    ac_cnt = cur.execute('SELECT COUNT(*) FROM TB_ACADEMIC_SCORE WHERE student_id=?', (sid,)).fetchone()[0]
    cs_cnt = cur.execute('SELECT COUNT(*) FROM TB_CSAT_SCORE WHERE student_id=?', (sid,)).fetchone()[0]
    print(lg, sid, sr_cnt, ac_cnt, cs_cnt)
con.close()
