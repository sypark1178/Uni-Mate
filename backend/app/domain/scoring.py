from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class UniversityWeights:
    academic: float = 0.55
    mock: float = 0.3
    extracurricular: float = 0.15


def normalize_grade(grade: float) -> float:
    """1등급에 가까울수록 100점에 수렴한다."""
    if grade < 1:
        grade = 1
    if grade > 9:
        grade = 9
    return round((10 - grade) / 9 * 100, 2)


def normalize_mock_score(score: float) -> float:
    if score < 0:
        score = 0
    if score > 100:
        score = 100
    return round(score, 2)


def convert_to_university_score(
    grade_average: float,
    mock_average: float,
    extracurricular_strength: float = 0.0,
    weights: UniversityWeights | None = None,
) -> float:
    applied = weights or UniversityWeights()
    academic_score = normalize_grade(grade_average)
    mock_score = normalize_mock_score(mock_average)
    extracurricular_score = max(0.0, min(extracurricular_strength, 100.0))

    total = (
        academic_score * applied.academic
        + mock_score * applied.mock
        + extracurricular_score * applied.extracurricular
    )
    return round(total, 2)


def build_subject_profile(subject_grades: dict[str, float]) -> dict[str, float]:
    return {subject: normalize_grade(grade) for subject, grade in subject_grades.items()}
