"""Keepers for dynamic cosmic insights."""

from __future__ import annotations

from dynamic_agents.cosmic import CosmicAgentInsight, DynamicCosmicAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicCosmicKeeper"]


class DynamicCosmicKeeper(InsightKeeper):
    """Persist cosmic telemetry for longitudinal analysis."""

    def __init__(self, *, limit: int = 200) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicCosmicAgent) -> CosmicAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_resilience(self) -> float:
        return self.average_metric("resilience")

    def average_phenomena(self) -> float:
        return self.average_metric("phenomena")
