"""Bot wrapper for dynamic energy analytics."""

from __future__ import annotations

from dynamic_agents.energy import DynamicEnergyAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.energy import DynamicEnergyHelper
from dynamic_keepers.energy import DynamicEnergyKeeper

__all__ = ["DynamicEnergyBot"]


class DynamicEnergyBot(InsightBot):
    """Expose energy insights through a bot interface."""

    def __init__(
        self,
        *,
        agent: DynamicEnergyAgent | None = None,
        helper: DynamicEnergyHelper | None = None,
        keeper: DynamicEnergyKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicEnergyAgent(),
            helper=helper or DynamicEnergyHelper(),
            keeper=keeper or DynamicEnergyKeeper(),
        )

    def evaluate(self) -> str:
        return super().publish_update()
