import unittest

from dynamic_summary import (
    ChecklistItemStatus,
    ChecklistReport,
    SummaryDepth,
    SummaryDraft,
    SummaryLength,
    SummaryPlanner,
    SummaryPurpose,
)


class SummaryPlannerChecklistReportTest(unittest.TestCase):
    def setUp(self) -> None:
        self.planner = SummaryPlanner()
        self.depth = SummaryDepth.INFORMATIVE
        self.length = SummaryLength.ABSTRACT
        self.purpose = SummaryPurpose.TECHNICAL

    def test_checklist_report_passes_when_all_requirements_met(self) -> None:
        draft = SummaryDraft(
            word_count=200,
            sentence_count=6,
            bullet_count=3,
            reference_count=2,
            action_item_count=2,
            ratings={
                "Accuracy vs. source": 1.0,
                "Clarity & brevity": 0.9,
                "Traceability": 0.8,
                "Actionability": 1.0,
            },
            type_aligned=True,
            index_pointer_count=1,
            qa_signoff=True,
        )

        report = self.planner.checklist_report(
            self.depth,
            self.length,
            self.purpose,
            draft,
        )

        self.assertIsInstance(report, ChecklistReport)
        self.assertTrue(report.completed)
        for item in report.items:
            self.assertIsInstance(item, ChecklistItemStatus)
            self.assertTrue(item.passed)
        self.assertEqual(report.missing_items(), ())

    def test_checklist_report_lists_missing_items(self) -> None:
        draft = SummaryDraft(
            word_count=600,
            sentence_count=20,
            bullet_count=0,
            reference_count=0,
            action_item_count=0,
            ratings={},
            type_aligned=False,
            index_pointer_count=0,
            qa_signoff=False,
        )

        report = self.planner.checklist_report(
            self.depth,
            self.length,
            self.purpose,
            draft,
        )

        self.assertFalse(report.completed)
        missing = {status.item: status for status in report.missing_items()}
        blueprint = self.planner.blueprint(self.depth, self.length, self.purpose)

        self.assertIn(blueprint.checklist[0], missing)
        self.assertIn(blueprint.checklist[1], missing)
        self.assertIn(blueprint.checklist[2], missing)
        self.assertIn(blueprint.checklist[3], missing)
        self.assertIn(blueprint.checklist[4], missing)

        self.assertIn("reference", missing[blueprint.checklist[2]].details.lower())
        self.assertIn("index", missing[blueprint.checklist[2]].details.lower())
        self.assertIn("sign-off", missing[blueprint.checklist[4]].details.lower())


if __name__ == "__main__":
    unittest.main()
