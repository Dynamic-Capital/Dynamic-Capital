"""State keeper for supercluster insights."""

from __future__ import annotations

from dynamic_agents.superclusters import DynamicSuperclusterAgent, SuperclusterAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicSuperclusterKeeper"]


class DynamicSuperclusterKeeper(InsightKeeper):
    """Persist supercluster evaluations for analysis."""

    def __init__(self, *, limit: int = 120) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicSuperclusterAgent, *, supercluster: str | None = None) -> SuperclusterAgentInsight:
        insight = agent.detailed_insight(supercluster=supercluster)
        self.record(insight.raw)
        return insight

    def average_alignment(self) -> float:
        return self.average_metric("alignment")

    def average_cohesion(self) -> float:
        return self.average_metric("cohesion")
