from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "data/uni_mate.db"

SATTAM_SUBJECTS = {
    '생활과윤리', '윤리와사상', '한국지리', '세계지리',
    '동아시아사', '세계사', '경제', '정치와법', '사회문화', '사회·문화'
}

RECORD_GRADE_TABLE = [
    (19.0, 20.5, 1), (17.5, 19.0, 2), (15.5, 17.5, 3),
    (13.5, 15.5, 4), (11.5, 13.5, 5), (9.5, 11.5, 6),
    (7.5, 9.5, 7), (5.5, 7.5, 8), (4.0, 5.5, 9)
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def val(v):
    return v if v is not None else "미공개"

def calc_weighted_avg(grades_by_year, subject):
    weights = {1: 0.2, 2: 0.3, 3: 0.5}
    total_weight = 0
    total_score = 0
    for year in [1, 2, 3]:
        if year in grades_by_year and subject in grades_by_year[year]:
            vals = grades_by_year[year][subject]
            if vals:
                avg = sum(vals) / len(vals)
                total_score += avg * weights[year]
                total_weight += weights[year]
    if total_weight == 0:
        return None
    return total_score / total_weight

def score_to_grade(total_score):
    for low, high, grade in RECORD_GRADE_TABLE:
        if low <= total_score <= high:
            return grade
    return 9

def calc_pass_prob(composite, cutoff_50, worst_grade=None):
    if worst_grade is None:
        worst_grade = cutoff_50 + 1.5
    if worst_grade == cutoff_50:
        return 0.0
    prob = 1 - (composite - cutoff_50) / (worst_grade - cutoff_50)
    return round(max(0.0, min(0.90, prob)), 3)

@app.get("/api/recommendations/{student_id}")
def get_recommendations(student_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT r.rec_id, r.admission_id, r.rec_score, r.strategy_type,
               r.priority_rank, u.univ_name, d.dept_name, at.admission_name
        FROM TB_RECOMMENDATION r
        JOIN TB_ADMISSION_TYPE at ON r.admission_id = at.admission_id
        JOIN TB_DEPARTMENT d ON at.dept_id = d.dept_id
        JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
        WHERE r.student_id = ?
        ORDER BY r.rec_score DESC
        LIMIT 6
    """, (student_id,))
    rows = cur.fetchall()
    conn.close()
    if not rows:
        return {"error": "추천 데이터 없음"}
    result = []
    for row in rows:
        result.append({
            "rec_id": row["rec_id"],
            "admission_id": row["admission_id"],
            "rec_score": row["rec_score"],
            "strategy_type": val(row["strategy_type"]),
            "priority_rank": row["priority_rank"],
            "univ_name": row["univ_name"],
            "dept_name": row["dept_name"],
            "admission_name": val(row["admission_name"]),
        })
    return result

@app.get("/api/evidence/{admission_id}")
def get_evidence(admission_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT u.univ_name, d.dept_name, at.admission_name, at.admission_method,
               at.csat_required, ac.cutoff_50, ac.cutoff_70, ac.avg_grade,
               ac.best_grade, ac.worst_grade, ac.competition_ratio, ac.source_doc
        FROM TB_ADMISSION_TYPE at
        JOIN TB_DEPARTMENT d ON at.dept_id = d.dept_id
        JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
        LEFT JOIN TB_ADMISSION_CUTOFF ac ON at.admission_id = ac.admission_id
        WHERE at.admission_id = ?
    """, (admission_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {"error": "데이터 없음"}
    return {
        "univ_name": row["univ_name"],
        "dept_name": row["dept_name"],
        "admission_name": val(row["admission_name"]),
        "admission_method": val(row["admission_method"]),
        "csat_required": "있음" if row["csat_required"] else "없음",
        "cutoff_50": val(row["cutoff_50"]),
        "cutoff_70": val(row["cutoff_70"]),
        "avg_grade": val(row["avg_grade"]),
        "best_grade": val(row["best_grade"]),
        "worst_grade": val(row["worst_grade"]),
        "competition_ratio": val(row["competition_ratio"]),
        "source_doc": val(row["source_doc"]),
    }

@app.get("/api/smart-recommendations/{student_id}")
def get_smart_recommendations(student_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT school_year, subject_name, grade
        FROM TB_ACADEMIC_SCORE
        WHERE student_id = ?
        AND subject_name IN ('국어', '수학', '영어',
            '생활과윤리', '윤리와사상', '한국지리', '세계지리',
            '동아시아사', '세계사', '경제', '정치와법', '사회문화', '사회·문화')
    """, (student_id,))
    rows = cur.fetchall()
    grades_by_year = {}
    for row in rows:
        year = row["school_year"]
        subject = row["subject_name"]
        try:
            grade = float(row["grade"])
        except:
            continue
        if year not in grades_by_year:
            grades_by_year[year] = {}
        if subject not in grades_by_year[year]:
            grades_by_year[year][subject] = []
        grades_by_year[year][subject].append(grade)

    sattam_key = None
    for year_data in grades_by_year.values():
        for subj in year_data:
            if subj in SATTAM_SUBJECTS:
                sattam_key = subj
                break
        if sattam_key:
            break

    korean = calc_weighted_avg(grades_by_year, '국어')
    math = calc_weighted_avg(grades_by_year, '수학')
    english = calc_weighted_avg(grades_by_year, '영어')
    sattam = calc_weighted_avg(grades_by_year, sattam_key) if sattam_key else None

    missing = []
    if korean is None: missing.append('국어')
    if math is None: missing.append('수학')
    if english is None: missing.append('영어')
    if sattam is None: missing.append('사탐')

    if missing:
        conn.close()
        return {"error": f"내신 환산 불가 — {', '.join(missing)} 데이터 없음"}

    weighted = round(korean * 0.25 + math * 0.30 + english * 0.20 + sattam * 0.25, 2)

    cur.execute("""
        SELECT at.admission_id, u.univ_name, d.dept_name,
               at.admission_method, ac.cutoff_50, ac.worst_grade, ac.competition_ratio
        FROM TB_ADMISSION_TYPE at
        JOIN TB_DEPARTMENT d ON at.dept_id = d.dept_id
        JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
        JOIN TB_ADMISSION_CUTOFF ac ON at.admission_id = ac.admission_id
        WHERE d.dept_name LIKE '%경영%'
        AND ac.cutoff_50 IS NOT NULL
        ORDER BY ac.cutoff_50 ASC
    """)
    admissions = cur.fetchall()
    conn.close()

    result = []
    for row in admissions:
        cutoff = row["cutoff_50"]
        diff = weighted - cutoff
        if diff < -0.3:
            strategy = "안정"
        elif -0.3 <= diff <= 0.3:
            strategy = "적정"
        else:
            strategy = "도전"
        result.append({
            "admission_id": row["admission_id"],
            "univ_name": row["univ_name"],
            "dept_name": row["dept_name"],
            "admission_method": val(row["admission_method"]),
            "cutoff_50": cutoff,
            "competition_ratio": val(row["competition_ratio"]),
            "strategy_type": strategy,
        })

    return {
        "student_id": student_id,
        "weighted_grade": weighted,
        "recommendations": result
    }

@app.get("/api/full-analysis/{student_id}/{admission_id}")
def get_full_analysis(student_id: int, admission_id: int):
    conn = get_db()
    cur = conn.cursor()

    # 1. 내신 환산
    cur.execute("""
        SELECT school_year, subject_name, grade
        FROM TB_ACADEMIC_SCORE
        WHERE student_id = ?
        AND subject_name IN ('국어', '수학', '영어',
            '생활과윤리', '윤리와사상', '한국지리', '세계지리',
            '동아시아사', '세계사', '경제', '정치와법', '사회문화', '사회·문화')
    """, (student_id,))
    rows = cur.fetchall()
    grades_by_year = {}
    for row in rows:
        year = row["school_year"]
        subject = row["subject_name"]
        try:
            grade = float(row["grade"])
        except:
            continue
        if year not in grades_by_year:
            grades_by_year[year] = {}
        if subject not in grades_by_year[year]:
            grades_by_year[year][subject] = []
        grades_by_year[year][subject].append(grade)

    sattam_key = None
    for year_data in grades_by_year.values():
        for subj in year_data:
            if subj in SATTAM_SUBJECTS:
                sattam_key = subj
                break
        if sattam_key:
            break

    korean = calc_weighted_avg(grades_by_year, '국어')
    math = calc_weighted_avg(grades_by_year, '수학')
    english = calc_weighted_avg(grades_by_year, '영어')
    sattam = calc_weighted_avg(grades_by_year, sattam_key) if sattam_key else None

    if None in [korean, math, english, sattam]:
        conn.close()
        return {"error": "내신 환산 불가"}

    weighted_grade = round(korean * 0.25 + math * 0.30 + english * 0.20 + sattam * 0.25, 2)

    # 2. 생기부 텍스트 수집
    cur.execute("""
        SELECT record_type, content_body
        FROM TB_STUDENT_RECORD
        WHERE student_id = ?
    """, (student_id,))
    records = cur.fetchall()

    # 3. 전형 입결 데이터
    cur.execute("""
        SELECT u.univ_name, d.dept_name, at.admission_method,
               ac.cutoff_50, ac.worst_grade, ac.source_doc
        FROM TB_ADMISSION_TYPE at
        JOIN TB_DEPARTMENT d ON at.dept_id = d.dept_id
        JOIN TB_UNIVERSITY u ON d.univ_id = u.univ_id
        LEFT JOIN TB_ADMISSION_CUTOFF ac ON at.admission_id = ac.admission_id
        WHERE at.admission_id = ?
    """, (admission_id,))
    adm = cur.fetchone()
    conn.close()

    if not adm:
        return {"error": "전형 데이터 없음"}

    # 4. GPT로 생기부 4대 항목 채점
    record_text = "\n".join([
    f"[{r['record_type']}] {r['content_body'][:200]}" 
    for r in records[:10]
])

    prompt = f"""
아래는 경영학과 지원 학생의 생활기록부 내용입니다.
다음 4가지 항목을 각각 1~5점으로 채점하고, 인재부합 보너스(0.0~0.5)도 산출해주세요.

채점 기준:
- 전공적합성: 경영/경제 관련 키워드, 분석적 사고, 데이터 활용
- 활동의 깊이: 단순 참여가 아닌 탐구/분석/도출 수준
- 지속성: 활동의 연속성, 다양한 영역
- 역할/주도성: 리더십, 자기주도적 활동

생활기록부:
{record_text}

반드시 아래 JSON 형식으로만 답하세요. 다른 말은 하지 마세요:
{{"전공적합성": 숫자, "활동깊이": 숫자, "지속성": 숫자, "주도성": 숫자, "보너스": 숫자}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0
        )
        import json
        gpt_result = json.loads(response.choices[0].message.content.strip())
        major_fit = gpt_result.get("전공적합성", 3)
        depth = gpt_result.get("활동깊이", 3)
        continuity = gpt_result.get("지속성", 3)
        leadership = gpt_result.get("주도성", 3)
        bonus = gpt_result.get("보너스", 0.0)
    except Exception as e:
        return {"error": f"GPT 분석 실패: {str(e)}"}

    # 5. 생기부 총점 → 등급
    total_score = major_fit + depth + continuity + leadership + bonus
    record_grade = score_to_grade(total_score)

    # 6. 종합등급 = 내신 70% + 생기부 30%
    composite = round(weighted_grade * 0.7 + record_grade * 0.3, 2)

    # 7. 합격가능성 산출
    cutoff_50 = adm["cutoff_50"]
    worst_grade = adm["worst_grade"]
    if cutoff_50 is None:
        return {"error": "입결 데이터 없음"}

    pass_prob = calc_pass_prob(composite, cutoff_50, worst_grade)
    pass_pct = round(pass_prob * 100, 1)

    # 8. 요약 문장 생성
    summary = f"경영학과 기준 최근 모집요강과 학생부 반영 비율, 최저 기준을 근거로 {pass_pct}%의 합격 가능성을 산출했습니다."

    return {
        "student_id": student_id,
        "admission_id": admission_id,
        "univ_name": adm["univ_name"],
        "dept_name": adm["dept_name"],
        "weighted_grade": weighted_grade,
        "record_scores": {
            "전공적합성": major_fit,
            "활동깊이": depth,
            "지속성": continuity,
            "주도성": leadership,
            "보너스": bonus,
            "총점": total_score,
            "등급": record_grade
        },
        "composite_score": composite,
        "pass_prob": pass_pct,
        "summary": summary,
        "source_doc": val(adm["source_doc"])
    }