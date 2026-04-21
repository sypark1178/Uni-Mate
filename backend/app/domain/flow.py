from __future__ import annotations


REFINED_FLOW = (
    "landing",
    "onboarding_basic",
    "onboarding_grades",
    "onboarding_goals",
    "analysis_loading",
    "dashboard",
)


def next_step(current_step: str) -> str:
    index = REFINED_FLOW.index(current_step)
    if index == len(REFINED_FLOW) - 1:
      return "dashboard"
    return REFINED_FLOW[index + 1]


def can_enter_dashboard(has_required_info: bool, has_scores: bool, analysis_completed: bool) -> bool:
    return has_required_info and has_scores and analysis_completed
