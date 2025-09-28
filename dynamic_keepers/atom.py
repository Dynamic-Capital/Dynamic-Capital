"""State keeper for dynamic atom insights."""

from __future__ import annotations

from dynamic_agents.atom import AtomAgentInsight, DynamicAtomAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicAtomKeeper"]


class DynamicAtomKeeper(InsightKeeper):
    """Persist atom insights for trend analysis."""

    def __init__(self, *, limit: int = 256) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicAtomAgent) -> AtomAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_excitation(self) -> float:
        return self.average_metric("excitation_energy_ev")

    def dominant_ratio(self) -> float:
        return self.average_metric("dominant_shell_ratio")
