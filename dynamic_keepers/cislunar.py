"""State keeper for cislunar space insights."""

from __future__ import annotations

from dynamic_agents.cislunar import CislunarAgentInsight, DynamicCislunarAgent
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicCislunarKeeper"]


class DynamicCislunarKeeper(InsightKeeper):
    """Persist cislunar snapshots for longitudinal monitoring."""

    def __init__(self, *, limit: int = 180) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicCislunarAgent) -> CislunarAgentInsight:
        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_congestion(self) -> float:
        return self.average_metric("average_congestion")

    def peak_risk(self) -> float:
        return self.average_metric("max_risk")
