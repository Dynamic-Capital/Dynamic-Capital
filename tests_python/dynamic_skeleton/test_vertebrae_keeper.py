from __future__ import annotations

import unittest

from dynamic_agents.skull import DynamicSkullAgent
from dynamic_keepers.vertebrae import DynamicVertebraeKeeper
from dynamic_skeleton.compliance import DynamicComplianceAlgo
from dynamic_skeleton.governance import DynamicGovernanceAlgo, Vote


class DynamicVertebraeKeeperTest(unittest.TestCase):
    def _build_agent(self) -> DynamicSkullAgent:
        governance = DynamicGovernanceAlgo()
        proposal = governance.create_proposal(
            "p1",
            "Stabilise spinal column",
            "Introduce vertebrae reinforcements",
            quorum=1.0,
        )
        governance.open_voting(proposal.proposal_id, actor="arch")
        governance.cast_vote(proposal.proposal_id, Vote("arch", True, weight=1.0))
        governance.finalize(proposal.proposal_id, actor="arch")

        other = governance.create_proposal(
            "p2",
            "Audit skeletal marrow",
            "Review marrow production logs",
            quorum=3.0,
        )
        governance.open_voting(other.proposal_id, actor="arch")
        governance.cast_vote(other.proposal_id, Vote("arch", True, weight=1.0))
        governance.finalize(other.proposal_id, actor="arch")

        compliance = DynamicComplianceAlgo()
        compliance.register_check("aml", "AML", "AML checks")
        compliance.register_check("kyc", "KYC", "KYC refresh")
        compliance.register_check("sanctions", "Sanctions", "Sanction screening")
        compliance.update_check("aml", "fail")
        compliance.update_check("kyc", "warn")
        compliance.update_check("sanctions", "pass")

        return DynamicSkullAgent(governance=governance, compliance=compliance)

    def test_capture_records_history_and_metrics(self) -> None:
        keeper = DynamicVertebraeKeeper()
        agent = self._build_agent()

        detailed = keeper.capture(agent)

        self.assertGreater(len(keeper.history), 0)
        self.assertIs(keeper.latest, detailed.raw)
        self.assertAlmostEqual(
            keeper.average_quorum_success(), detailed.raw.metrics["quorum_success_rate"]
        )
        expected_failure_rate = 1.0 / 3.0
        self.assertAlmostEqual(keeper.compliance_failure_rate(), expected_failure_rate)

    def test_compliance_failure_rate_handles_empty_history(self) -> None:
        keeper = DynamicVertebraeKeeper()

        self.assertEqual(keeper.compliance_failure_rate(), 0.0)

    def test_keeper_role_and_tasks_are_defined(self) -> None:
        keeper = DynamicVertebraeKeeper()

        self.assertIn("Vertebrae", keeper.role)
        self.assertGreaterEqual(len(keeper.tasks), 3)
        self.assertTrue(all(task for task in keeper.tasks))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
