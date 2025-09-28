"""Bot wrapper for supercluster insights."""

from __future__ import annotations

from dynamic_agents.superclusters import DynamicSuperclusterAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.superclusters import DynamicSuperclusterHelper
from dynamic_keepers.superclusters import DynamicSuperclusterKeeper

__all__ = ["DynamicSuperclusterBot"]


class DynamicSuperclusterBot(InsightBot):
    """Expose supercluster evaluations through bot workflows."""

    def __init__(
        self,
        *,
        agent: DynamicSuperclusterAgent | None = None,
        helper: DynamicSuperclusterHelper | None = None,
        keeper: DynamicSuperclusterKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicSuperclusterAgent(),
            helper=helper or DynamicSuperclusterHelper(),
            keeper=keeper or DynamicSuperclusterKeeper(),
        )

    def snapshot(self, *, supercluster: str | None = None) -> str:
        return super().publish_update(supercluster=supercluster)
