import unittest

from backend.app.domain.models import Profile, ScoreInput, UnivGuideline
from backend.app.services.report_service import build_execution_checklist, build_strategy_report


class ReportServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.profile = Profile(
            user_id="u1",
            name="김민지",
            grade_level="고2",
            region="서울",
            school_name="대치고",
            target_year=2027,
            track="인문",
        )
        self.score_input = ScoreInput(
            grade_average=1.7,
            mock_average=82.0,
            subject_grades={"국어": 1.5, "수학": 1.8},
            extracurricular_strength=75.0,
        )

    def test_report_contains_verified_evidence_when_page_exists(self) -> None:
        guideline = UnivGuideline(
            id="g1",
            university="서강대",
            major="경영학과",
            admission_type="학생부교과",
            source_path="sogang.pdf",
            page_number=27,
            numeric_evidence={"교과반영": 100.0},
            summary="학생부교과 성적 100%",
        )
        report = build_strategy_report(self.profile, self.score_input, guideline)
        self.assertEqual(report.evidence_status, "verified")
        self.assertEqual(report.evidence_page, 27)

    def test_checklist_adds_evidence_task_when_page_missing(self) -> None:
        guideline = UnivGuideline(
            id="g2",
            university="한양대",
            major="경영학부",
            admission_type="학생부종합",
            source_path="hanyang.pdf",
            page_number=None,
            numeric_evidence={},
            summary="정성평가 중심",
        )
        checklist = build_execution_checklist([guideline])
        self.assertTrue(any(item.id == "evidence" for item in checklist))


if __name__ == "__main__":
    unittest.main()
