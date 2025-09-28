"""State keeper for spheres insights."""

from __future__ import annotations

from dynamic_agents.spheres import DynamicSpheresAgent, SpheresAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicSpheresKeeper"]


class DynamicSpheresKeeper(InsightKeeper):
    """Persist sphere resonance snapshots for trend analysis."""

    def __init__(self, *, limit: int = 180) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicSpheresAgent, *, sphere: str | None = None) -> SpheresAgentInsight:
        insight = agent.detailed_insight(sphere=sphere)
        self.record(insight.raw)
        return insight

    def average_resonance(self) -> float:
        return self.average_metric("resonance_index")

    def average_trend(self) -> float:
        return self.average_metric("resonance_trend")
