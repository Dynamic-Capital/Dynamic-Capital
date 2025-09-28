"""State keeper for dynamic energy profiles."""

from __future__ import annotations

from dynamic_agents.energy import DynamicEnergyAgent, EnergyAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicEnergyKeeper"]


class DynamicEnergyKeeper(InsightKeeper):
    """Persist energy profiles for trend analysis."""

    def __init__(self, *, limit: int = 180) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicEnergyAgent, *, baseline=None) -> EnergyAgentInsight:
        insight = agent.detailed_insight(baseline=baseline)
        self.record(insight.raw)
        return insight

    def average_energy(self) -> float:
        return self.average_metric("overall_energy")

    def average_stability(self) -> float:
        return self.average_metric("stability")
