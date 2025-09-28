"""History management for dynamic astronomy insights."""

from __future__ import annotations

from dynamic_agents.astronomy import AstronomyAgentInsight, DynamicAstronomyAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicAstronomyKeeper"]


class DynamicAstronomyKeeper(InsightKeeper):
    """Persist astronomy agent insights and expose simple aggregates."""

    def __init__(self, *, limit: int = 90) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicAstronomyAgent, *, limit: int | None = None) -> AstronomyAgentInsight:
        insight = agent.detailed_insight(limit=limit)
        self.record(insight.raw)
        return insight

    def average_success_rate(self) -> float:
        """Return the mean success rate across the stored insights."""

        return self.average_metric("success_rate")

    def average_utilisation(self) -> float:
        """Return the mean utilisation index across the stored insights."""

        return self.average_metric("utilisation_index")
