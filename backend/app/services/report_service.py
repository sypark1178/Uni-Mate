from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from ai.evidence import build_evidence_status
from ai.scoring import calculate_admission_score
from backend.app.domain.models import ChecklistTask, Profile, ScoreInput, UnivGuideline
from backend.app.domain.scoring import convert_to_university_score


@dataclass(slots=True)
class StrategySummary:
    university: str
    major: str
    fit_score: float
    university_score: float
    evidence_page: int | None
    evidence_status: str
    notes: str


def build_strategy_report(
    profile: Profile,
    score_input: ScoreInput,
    guideline: UnivGuideline,
) -> StrategySummary:
    university_score = convert_to_university_score(
        grade_average=score_input.grade_average,
        mock_average=score_input.mock_average,
        extracurricular_strength=score_input.extracurricular_strength,
    )
    fit_score = calculate_admission_score(
        academic_fit=university_score,
        major_fit=78.0 if profile.track == "인문" else 72.0,
        minimum_requirement_probability=66.0 if guideline.page_number else 0.0,
    )
    evidence = build_evidence_status(guideline.page_number, guideline.numeric_evidence)
    notes = "확인 불가" if evidence.status == "unverified" else "근거 확인 가능"
    return StrategySummary(
        university=guideline.university,
        major=guideline.major,
        fit_score=fit_score,
        university_score=university_score,
        evidence_page=evidence.page_number,
        evidence_status=evidence.status,
        notes=notes,
    )


def build_execution_checklist(guidelines: Iterable[UnivGuideline]) -> list[ChecklistTask]:
    items = [
        ChecklistTask(id="upload", title="학생부 PDF 업로드", due_label="오늘", is_done=True),
        ChecklistTask(id="minimum", title="수능 최저 체크", due_label="D-7", is_done=False),
    ]
    if any(item.page_number is None for item in guidelines):
        items.append(ChecklistTask(id="evidence", title="근거 페이지 보강", due_label="D-3", is_done=False))
    return items
