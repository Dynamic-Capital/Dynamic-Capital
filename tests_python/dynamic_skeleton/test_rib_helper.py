from __future__ import annotations

import unittest

from dynamic_helpers.rib import DynamicRibHelper
from dynamic_agents.skull import DynamicSkullAgent
from dynamic_skeleton.compliance import DynamicComplianceAlgo
from dynamic_skeleton.governance import DynamicGovernanceAlgo, Vote


class DynamicRibHelperTest(unittest.TestCase):
    def _build_insight(self):
        governance = DynamicGovernanceAlgo()
        proposal = governance.create_proposal(
            "p1",
            "Fortify rib cage",
            "Install carbon-weave ribs",
            quorum=1.0,
        )
        governance.open_voting(proposal.proposal_id, actor="guardian")
        governance.cast_vote(proposal.proposal_id, Vote("guardian", True, weight=1.0))
        governance.finalize(proposal.proposal_id, actor="guardian")

        rejected = governance.create_proposal(
            "p2",
            "Optional cartilage swap",
            "Replace cartilage",
            quorum=2.0,
        )
        governance.open_voting(rejected.proposal_id, actor="guardian")
        governance.finalize(rejected.proposal_id, actor="guardian")

        compliance = DynamicComplianceAlgo()
        compliance.register_check("aml", "AML", "AML checks")
        compliance.register_check("kyc", "KYC", "KYC refresh")
        compliance.update_check("aml", "fail")
        compliance.update_check("kyc", "warn")

        agent = DynamicSkullAgent(governance=governance, compliance=compliance)
        return agent.detailed_insight()

    def test_compose_digest_includes_tagline_and_enrichments(self) -> None:
        helper = DynamicRibHelper()
        insight = self._build_insight()

        digest = helper.compose_digest(insight)

        self.assertIn("Reinforcing Integrity", digest)
        self.assertIn("Governance outcomes", digest)
        self.assertIn("Compliance posture", digest)
        self.assertIn("Compliance FAIL", digest)

    def test_compose_digest_handles_raw_agent_insight(self) -> None:
        helper = DynamicRibHelper()
        insight = self._build_insight().raw

        digest = helper.compose_digest(insight)

        self.assertIn("Skeleton Governance Pulse", digest)
        self.assertIn("Key metrics", digest)

    def test_helper_role_and_tasks_are_defined(self) -> None:
        helper = DynamicRibHelper()

        self.assertIn("Rib", helper.role)
        self.assertGreaterEqual(len(helper.tasks), 3)
        self.assertTrue(all(task for task in helper.tasks))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
