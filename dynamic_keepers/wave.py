"""State keeper for dynamic wave measurements."""

from __future__ import annotations

from datetime import datetime

from dynamic_agents.wave_agent import DynamicWaveAgent, WaveAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicWaveKeeper"]


class DynamicWaveKeeper(InsightKeeper):
    """Persist measurements from :class:`DynamicWaveAgent`."""

    def __init__(self, *, limit: int = 240) -> None:
        super().__init__(limit=limit)

    def capture(
        self,
        agent: DynamicWaveAgent,
        *,
        medium: str | None = None,
        timestamp: datetime | None = None,
    ) -> WaveAgentInsight:
        insight = agent.detailed_insight(medium=medium, timestamp=timestamp)
        self.record(insight.raw)
        return insight

    def average_coherence(self) -> float:
        return self.average_metric("coherence_index")

    def average_energy(self) -> float:
        return self.average_metric("aggregate_energy")
