"""State keeper for interstellar insights."""

from __future__ import annotations

from dynamic_agents.interstellar import DynamicInterstellarAgent, InterstellarAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicInterstellarKeeper"]


class DynamicInterstellarKeeper(InsightKeeper):
    """Persist interstellar network metrics for trend tracking."""

    def __init__(self, *, limit: int = 200) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicInterstellarAgent) -> InterstellarAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_health(self) -> float:
        return self.average_metric("topology_health")

    def average_resilience(self) -> float:
        return self.average_metric("corridor_resilience")
