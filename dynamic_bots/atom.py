"""Bot orchestration for dynamic atom monitoring."""

from __future__ import annotations

from dynamic_agents.atom import DynamicAtomAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.atom import DynamicAtomHelper
from dynamic_keepers.atom import DynamicAtomKeeper

__all__ = ["DynamicAtomBot"]


class DynamicAtomBot(InsightBot):
    """Expose atomic state reports through a bot-friendly interface."""

    def __init__(
        self,
        *,
        agent: DynamicAtomAgent | None = None,
        helper: DynamicAtomHelper | None = None,
        keeper: DynamicAtomKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicAtomAgent(),
            helper=helper or DynamicAtomHelper(),
            keeper=keeper or DynamicAtomKeeper(),
        )

    def pulse(self) -> str:
        """Record the latest atomic snapshot and return a digest."""

        return super().publish_update()
