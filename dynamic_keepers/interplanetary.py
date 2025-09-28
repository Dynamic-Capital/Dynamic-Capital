"""State keeper for interplanetary insights."""

from __future__ import annotations

from dynamic_agents.interplanetary import DynamicInterplanetaryAgent, InterplanetaryAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicInterplanetaryKeeper"]


class DynamicInterplanetaryKeeper(InsightKeeper):
    """Persist logistics snapshots across interplanetary routes."""

    def __init__(self, *, limit: int = 200) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicInterplanetaryAgent) -> InterplanetaryAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_routes(self) -> float:
        return self.average_metric("routes")

    def average_weather(self) -> float:
        return self.average_metric("recent_weather")
