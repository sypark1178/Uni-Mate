from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass(slots=True)
class User:
    id: str
    email: Optional[str]
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class Profile:
    user_id: str
    name: str
    grade_level: str
    region: str
    school_name: Optional[str]
    target_year: int
    track: str


@dataclass(slots=True)
class UnivGuideline:
    id: str
    university: str
    major: str
    admission_type: str
    source_path: str
    page_number: Optional[int]
    numeric_evidence: dict[str, float]
    summary: str


@dataclass(slots=True)
class StrategyReport:
    id: str
    user_id: str
    title: str
    top_pick: str
    fit_score: float
    evidence_page: Optional[int]
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass(slots=True)
class ScoreInput:
    grade_average: float
    mock_average: float
    subject_grades: dict[str, float]
    extracurricular_strength: float = 0.0


@dataclass(slots=True)
class ChecklistTask:
    id: str
    title: str
    due_label: str
    is_done: bool
