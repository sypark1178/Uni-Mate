import unittest

from ai.evidence import build_evidence_status
from ai.scoring import calculate_admission_score
from backend.app.domain.scoring import convert_to_university_score, normalize_grade


class ScoringTests(unittest.TestCase):
    def test_grade_normalization_rewards_lower_grade_numbers(self) -> None:
        self.assertGreater(normalize_grade(1.5), normalize_grade(4.0))

    def test_university_score_is_bounded_and_weighted(self) -> None:
        result = convert_to_university_score(grade_average=1.8, mock_average=84, extracurricular_strength=70)
        self.assertGreater(result, 70)
        self.assertLessEqual(result, 100)

    def test_admission_score_uses_three_weights(self) -> None:
        result = calculate_admission_score(80, 70, 60)
        self.assertAlmostEqual(result, 72.0)

    def test_missing_numeric_evidence_returns_unverified(self) -> None:
        evidence = build_evidence_status(page_number=None, numeric_evidence={})
        self.assertEqual(evidence.status, "unverified")
        self.assertEqual(evidence.reason, "확인 불가")


if __name__ == "__main__":
    unittest.main()
