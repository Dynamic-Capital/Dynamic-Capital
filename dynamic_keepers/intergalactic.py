"""State keeper for intergalactic insights."""

from __future__ import annotations

from dynamic_agents.intergalactic import DynamicIntergalacticAgent, IntergalacticAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicIntergalacticKeeper"]


class DynamicIntergalacticKeeper(InsightKeeper):
    """Persist intergalactic summaries for trend analysis."""

    def __init__(self, *, limit: int = 200) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicIntergalacticAgent) -> IntergalacticAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_risk(self) -> float:
        return self.average_metric("mean_risk")

    def corridor_density(self) -> float:
        return self.average_metric("corridors")
