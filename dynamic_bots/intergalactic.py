"""Bot wrapper for intergalactic insights."""

from __future__ import annotations

from dynamic_agents.intergalactic import DynamicIntergalacticAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.intergalactic import DynamicIntergalacticHelper
from dynamic_keepers.intergalactic import DynamicIntergalacticKeeper

__all__ = ["DynamicIntergalacticBot"]


class DynamicIntergalacticBot(InsightBot):
    """Expose intergalactic network summaries through a bot interface."""

    def __init__(
        self,
        *,
        agent: DynamicIntergalacticAgent | None = None,
        helper: DynamicIntergalacticHelper | None = None,
        keeper: DynamicIntergalacticKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicIntergalacticAgent(),
            helper=helper or DynamicIntergalacticHelper(),
            keeper=keeper or DynamicIntergalacticKeeper(),
        )

    def overview(self) -> str:
        return super().publish_update()
