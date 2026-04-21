from __future__ import annotations


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(value, high))


def calculate_admission_score(
    academic_fit: float,
    major_fit: float,
    minimum_requirement_probability: float,
    w1: float = 0.45,
    w2: float = 0.30,
    w3: float = 0.25,
) -> float:
    score = (
        clamp(academic_fit) * w1
        + clamp(major_fit) * w2
        + clamp(minimum_requirement_probability) * w3
    )
    return round(score, 2)
