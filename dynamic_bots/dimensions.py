"""Bot wrapper for dimension insights."""

from __future__ import annotations

from dynamic_agents.dimensions import DynamicDimensionAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.dimensions import DynamicDimensionHelper
from dynamic_keepers.dimensions import DynamicDimensionKeeper

__all__ = ["DynamicDimensionBot"]


class DynamicDimensionBot(InsightBot):
    """Expose dimension intelligence through bot workflows."""

    def __init__(
        self,
        *,
        agent: DynamicDimensionAgent | None = None,
        helper: DynamicDimensionHelper | None = None,
        keeper: DynamicDimensionKeeper | None = None,
    ) -> None:
        if agent is None:
            raise ValueError("DynamicDimensionBot requires an explicit agent configuration")
        super().__init__(
            agent=agent,
            helper=helper or DynamicDimensionHelper(),
            keeper=keeper or DynamicDimensionKeeper(),
        )

    def profile(self) -> str:
        return super().publish_update()
