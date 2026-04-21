from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from backend.app.domain.models import UnivGuideline


@dataclass(slots=True)
class SearchResult:
    guideline_id: str
    university: str
    major: str
    score: float
    page_number: int | None
    summary: str


def hybrid_search(query: str, guidelines: Iterable[UnivGuideline]) -> list[SearchResult]:
    tokens = [token.lower() for token in query.split() if token.strip()]
    results: list[SearchResult] = []
    for item in guidelines:
      haystack = f"{item.university} {item.major} {item.summary}".lower()
      keyword_score = sum(1 for token in tokens if token in haystack)
      vector_hint = 0.4 if item.numeric_evidence else 0.1
      total = round(keyword_score * 0.6 + vector_hint, 2)
      if total > 0:
          results.append(
              SearchResult(
                  guideline_id=item.id,
                  university=item.university,
                  major=item.major,
                  score=total,
                  page_number=item.page_number,
                  summary=item.summary,
              )
          )
    return sorted(results, key=lambda row: row.score, reverse=True)
