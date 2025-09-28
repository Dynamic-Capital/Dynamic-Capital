"""Bot orchestration for dynamic wave analytics."""

from __future__ import annotations

from datetime import datetime

from dynamic_agents.wave_agent import DynamicWaveAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.wave import DynamicWaveHelper
from dynamic_keepers.wave import DynamicWaveKeeper

__all__ = ["DynamicWaveBot"]


class DynamicWaveBot(InsightBot):
    """Provide digestible wavefield measurements."""

    def __init__(
        self,
        *,
        agent: DynamicWaveAgent | None = None,
        helper: DynamicWaveHelper | None = None,
        keeper: DynamicWaveKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicWaveAgent(),
            helper=helper or DynamicWaveHelper(),
            keeper=keeper or DynamicWaveKeeper(),
        )

    def measure(self, *, medium: str | None = None, timestamp: datetime | None = None) -> str:
        return super().publish_update(medium=medium, timestamp=timestamp)
