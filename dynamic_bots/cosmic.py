"""Bot interface for dynamic cosmic coordination."""

from __future__ import annotations

from dynamic_agents.cosmic import DynamicCosmicAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.cosmic import DynamicCosmicHelper
from dynamic_keepers.cosmic import DynamicCosmicKeeper

__all__ = ["DynamicCosmicBot"]


class DynamicCosmicBot(InsightBot):
    """Expose cosmic system telemetry through a bot wrapper."""

    def __init__(
        self,
        *,
        agent: DynamicCosmicAgent | None = None,
        helper: DynamicCosmicHelper | None = None,
        keeper: DynamicCosmicKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicCosmicAgent(),
            helper=helper or DynamicCosmicHelper(),
            keeper=keeper or DynamicCosmicKeeper(),
        )

    def broadcast(self) -> str:
        return super().publish_update()
