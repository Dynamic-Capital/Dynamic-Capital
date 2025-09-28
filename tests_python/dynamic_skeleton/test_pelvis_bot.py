from __future__ import annotations

import unittest

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_bots.pelvis import DynamicPelvisBot
from dynamic_helpers.rib import DynamicRibHelper
from dynamic_keepers.vertebrae import DynamicVertebraeKeeper


class StubAgent:
    def __init__(self) -> None:
        self.called = False

    def generate_insight(self) -> AgentInsight:
        self.called = True
        return AgentInsight(
            domain="Dynamic Skeleton",
            generated_at=utcnow(),
            title="Stub",
            metrics={},
            highlights=(),
            details=None,
        )


class StubHelper(DynamicRibHelper):
    def __init__(self) -> None:
        super().__init__()
        self.received = None

    def compose_digest(self, insight: AgentInsight) -> str:
        self.received = insight
        return "digest"


class StubKeeper(DynamicVertebraeKeeper):
    def __init__(self) -> None:
        super().__init__(limit=10)
        self.recorded = None

    def record(self, insight: AgentInsight) -> None:  # type: ignore[override]
        self.recorded = insight
        super().record(insight)


class DynamicPelvisBotTest(unittest.TestCase):
    def test_orchestrate_uses_defaults(self) -> None:
        bot = DynamicPelvisBot()

        digest = bot.orchestrate()

        self.assertIsInstance(digest, str)
        self.assertGreaterEqual(len(bot.keeper.history), 1)

    def test_orchestrate_respects_injected_components(self) -> None:
        agent = StubAgent()
        helper = StubHelper()
        keeper = StubKeeper()
        bot = DynamicPelvisBot(agent=agent, helper=helper, keeper=keeper)

        digest = bot.orchestrate()

        self.assertEqual(digest, "digest")
        self.assertTrue(agent.called)
        self.assertIs(helper.received, keeper.recorded)
        self.assertEqual(len(keeper.history), 1)

    def test_assignment_brief_orders_roles_back_to_back(self) -> None:
        bot = DynamicPelvisBot()

        brief = bot.assignment_brief()

        self.assertEqual(
            tuple(entry["label"] for entry in brief),
            ("agent", "keeper", "helper", "bot"),
        )
        self.assertIn("Pelvis", brief[-1]["role"])
        self.assertTrue(all(isinstance(entry["tasks"], tuple) for entry in brief))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
