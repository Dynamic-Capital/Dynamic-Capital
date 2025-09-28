"""Bot wrapper for interplanetary space analytics."""

from __future__ import annotations

from dynamic_agents.interplanetary import DynamicInterplanetaryAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.interplanetary import DynamicInterplanetaryHelper
from dynamic_keepers.interplanetary import DynamicInterplanetaryKeeper

__all__ = ["DynamicInterplanetaryBot"]


class DynamicInterplanetaryBot(InsightBot):
    """Expose interplanetary route insights through a bot interface."""

    def __init__(
        self,
        *,
        agent: DynamicInterplanetaryAgent | None = None,
        helper: DynamicInterplanetaryHelper | None = None,
        keeper: DynamicInterplanetaryKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicInterplanetaryAgent(),
            helper=helper or DynamicInterplanetaryHelper(),
            keeper=keeper or DynamicInterplanetaryKeeper(),
        )

    def outlook(self) -> str:
        return super().publish_update()
