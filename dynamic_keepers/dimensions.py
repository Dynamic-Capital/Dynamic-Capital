"""State keeper for dimension profiles."""

from __future__ import annotations

from dynamic_agents.dimensions import DimensionAgentInsight, DynamicDimensionAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicDimensionKeeper"]


class DynamicDimensionKeeper(InsightKeeper):
    """Persist dimension profiles for trend monitoring."""

    def __init__(self, *, limit: int = 120) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicDimensionAgent) -> DimensionAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_composite(self) -> float:
        return self.average_metric("composite")

    def average_volatility(self) -> float:
        return self.average_metric("volatility")
