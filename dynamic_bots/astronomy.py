"""Bot wrapper for dynamic astronomy operations."""

from __future__ import annotations

from dynamic_agents.astronomy import DynamicAstronomyAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.astronomy import DynamicAstronomyHelper
from dynamic_keepers.astronomy import DynamicAstronomyKeeper

__all__ = ["DynamicAstronomyBot"]


class DynamicAstronomyBot(InsightBot):
    """High-level interface exposing astronomy plans as digests."""

    def __init__(
        self,
        *,
        agent: DynamicAstronomyAgent | None = None,
        helper: DynamicAstronomyHelper | None = None,
        keeper: DynamicAstronomyKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicAstronomyAgent(),
            helper=helper or DynamicAstronomyHelper(),
            keeper=keeper or DynamicAstronomyKeeper(),
        )

    def plan(self, *, limit: int | None = None) -> str:
        """Capture the latest observation outlook and return a digest."""

        return super().publish_update(limit=limit)
