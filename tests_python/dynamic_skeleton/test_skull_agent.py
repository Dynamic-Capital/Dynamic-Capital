from __future__ import annotations

import unittest

from dynamic_agents.skull import DynamicSkullAgent
from dynamic_skeleton.compliance import DynamicComplianceAlgo
from dynamic_skeleton.governance import (
    PROPOSAL_STATUS_EXECUTED,
    PROPOSAL_STATUS_REJECTED,
    DynamicGovernanceAlgo,
    Vote,
)
from dynamic_agents._insight import AgentInsight


class StubGovernance:
    def __init__(self) -> None:
        self.called = False

    def list_proposals(self) -> tuple:
        self.called = True
        return ()


class StubCompliance:
    def __init__(self) -> None:
        self.called = False
        self.report = type(
            "Report",
            (),
            {
                "totals": {},
                "checks": [],
                "summary": "",
            },
        )()

    def generate_report(self) -> object:
        self.called = True
        return self.report


class DynamicSkullAgentTest(unittest.TestCase):
    def _build_agent_with_activity(self) -> DynamicSkullAgent:
        governance = DynamicGovernanceAlgo()
        proposal_1 = governance.create_proposal(
            "p1",
            "Enable bone matrix",
            "Activate osteoblast pipeline",
            quorum=2.0,
        )
        governance.open_voting(proposal_1.proposal_id, actor="keeper")
        governance.cast_vote(
            proposal_1.proposal_id,
            Vote("alice", True, weight=1.0),
        )
        governance.cast_vote(
            proposal_1.proposal_id,
            Vote("bob", True, weight=1.0),
        )
        governance.finalize(proposal_1.proposal_id, actor="keeper")

        proposal_2 = governance.create_proposal(
            "p2",
            "Recalibrate marrow flow",
            "Tune hematopoiesis cadence",
            quorum=4.0,
        )
        governance.open_voting(proposal_2.proposal_id, actor="keeper")
        governance.cast_vote(
            proposal_2.proposal_id,
            Vote("carol", True, weight=1.0),
        )
        governance.finalize(proposal_2.proposal_id, actor="keeper")

        compliance = DynamicComplianceAlgo()
        compliance.register_check("aml", "AML Monitoring", "Continuous AML checks")
        compliance.register_check("kyc", "KYC Refresh", "Refresh user attestations")
        compliance.register_check("sox", "SOX Controls", "Enforce SOX policies")
        compliance.update_check("aml", "fail", "Critical exposure detected")
        compliance.update_check("kyc", "warn", "Review pending documents")
        compliance.update_check("sox", "pass")

        return DynamicSkullAgent(governance=governance, compliance=compliance)

    def test_generate_insight_builds_metrics_and_highlights(self) -> None:
        agent = self._build_agent_with_activity()

        insight = agent.detailed_insight()

        self.assertAlmostEqual(insight.raw.metrics["proposals_total"], 2.0)
        self.assertAlmostEqual(insight.proposal_metrics["proposals_total"], 2.0)
        self.assertAlmostEqual(insight.proposal_metrics["proposals_executed"], 1.0)
        self.assertAlmostEqual(insight.proposal_metrics["proposals_rejected"], 1.0)
        self.assertAlmostEqual(insight.proposal_metrics["quorum_success_rate"], 0.5)
        self.assertEqual(
            insight.proposal_status_counts[PROPOSAL_STATUS_EXECUTED],
            1,
        )
        self.assertEqual(
            insight.proposal_status_counts[PROPOSAL_STATUS_REJECTED],
            1,
        )
        self.assertIn(PROPOSAL_STATUS_EXECUTED, {p.status for p in insight.proposals})
        self.assertIn(PROPOSAL_STATUS_REJECTED, {p.status for p in insight.proposals})
        highlight_text = "\n".join(insight.raw.highlights)
        self.assertIn("Compliance FAIL", highlight_text)
        self.assertIn("Compliance WARN", highlight_text)
        self.assertIsNotNone(insight.compliance_report)
        self.assertEqual(len(insight.failing_checks), 1)
        self.assertEqual(len(insight.warning_checks), 1)

    def test_generate_insight_uses_injected_dependencies(self) -> None:
        governance = StubGovernance()
        compliance = StubCompliance()
        agent = DynamicSkullAgent(governance=governance, compliance=compliance)  # type: ignore[arg-type]

        result = agent.generate_insight()

        self.assertIsInstance(result, AgentInsight)
        self.assertTrue(governance.called)
        self.assertTrue(compliance.called)

    def test_agent_role_and_tasks_are_assigned(self) -> None:
        agent = DynamicSkullAgent()

        self.assertIn("Skull", agent.role)
        self.assertGreaterEqual(len(agent.tasks), 3)
        self.assertTrue(all(task for task in agent.tasks))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
