"""Bot wrapper for the dynamic business intelligence engine."""

from __future__ import annotations

from typing import cast

from dynamic_agents.business import DynamicBusinessAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.business import DynamicBusinessHelper
from dynamic_keepers.business import DynamicBusinessKeeper

__all__ = ["DynamicBusinessBot"]


class DynamicBusinessBot(InsightBot):
    """Expose the business engine as digestible bot updates."""

    def __init__(
        self,
        *,
        agent: DynamicBusinessAgent | None = None,
        helper: DynamicBusinessHelper | None = None,
        keeper: DynamicBusinessKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicBusinessAgent(),
            helper=helper or DynamicBusinessHelper(),
            keeper=keeper or DynamicBusinessKeeper(),
        )

    @property
    def business_agent(self) -> DynamicBusinessAgent:
        """Return the strongly-typed business agent instance."""

        return cast(DynamicBusinessAgent, self.agent)

    @property
    def business_keeper(self) -> DynamicBusinessKeeper:
        return cast(DynamicBusinessKeeper, self.keeper)

    def plan(self) -> str:
        """Capture the latest insight and return a digest."""

        digest = self.publish_update()
        return digest
