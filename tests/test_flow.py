import unittest

from backend.app.domain.flow import can_enter_dashboard, next_step


class FlowRuleTests(unittest.TestCase):
    def test_onboarding_sequence_is_forced(self) -> None:
        self.assertEqual(next_step("landing"), "onboarding_basic")
        self.assertEqual(next_step("onboarding_basic"), "onboarding_grades")
        self.assertEqual(next_step("onboarding_grades"), "onboarding_goals")
        self.assertEqual(next_step("onboarding_goals"), "analysis_loading")

    def test_dashboard_requires_analysis_and_inputs(self) -> None:
        self.assertFalse(can_enter_dashboard(True, False, True))
        self.assertFalse(can_enter_dashboard(False, True, True))
        self.assertTrue(can_enter_dashboard(True, True, True))


if __name__ == "__main__":
    unittest.main()
