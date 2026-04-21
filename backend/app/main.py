from __future__ import annotations

"""
FastAPI 런타임이 설치되면 아래 `create_app`를 그대로 연결할 수 있는 구조입니다.
현재 환경에서는 순수 도메인/서비스 로직과 테스트를 먼저 제공합니다.
"""

from backend.app.domain.models import Profile, ScoreInput, UnivGuideline
from backend.app.services.report_service import build_execution_checklist, build_strategy_report


def create_demo_payload() -> dict:
    profile = Profile(
        user_id="user-1",
        name="김민지",
        grade_level="고2",
        region="서울 강남구",
        school_name="대치고",
        target_year=2027,
        track="인문",
    )
    score_input = ScoreInput(
        grade_average=1.7,
        mock_average=82.0,
        subject_grades={"국어": 1.5, "수학": 1.9, "영어": 1.6},
        extracurricular_strength=74.0,
    )
    guideline = UnivGuideline(
        id="guide-1",
        university="서강대",
        major="경영학과",
        admission_type="학생부교과",
        source_path="/guidelines/sogang.pdf",
        page_number=27,
        numeric_evidence={"교과반영": 100.0, "최저합": 5.0},
        summary="학생부교과 성적 100% 반영, 수능 최저 2개 합 5",
    )
    report = build_strategy_report(profile, score_input, guideline)
    checklist = build_execution_checklist([guideline])
    return {"report": report, "checklist": checklist}
