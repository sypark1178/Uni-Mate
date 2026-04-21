from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class EvidenceStatus:
    status: str
    page_number: int | None
    reason: str


def build_evidence_status(page_number: int | None, numeric_evidence: dict[str, float]) -> EvidenceStatus:
    if page_number is None or not numeric_evidence:
        return EvidenceStatus(status="unverified", page_number=page_number, reason="확인 불가")
    return EvidenceStatus(status="verified", page_number=page_number, reason="근거 확인 가능")
