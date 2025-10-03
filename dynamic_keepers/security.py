"""Keeper utilities for persisting dynamic security insights."""

from __future__ import annotations

from dynamic_agents.security import DynamicSecurityAgent, SecurityAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicSecurityKeeper"]


class DynamicSecurityKeeper(InsightKeeper):
    """Maintain a rolling history of security insights and quick analytics."""

    def capture(
        self,
        agent: DynamicSecurityAgent,
        *,
        domain: str | None = None,
        horizon_hours: int = 24,
    ) -> SecurityAgentInsight:
        insight = agent.detailed_insight(domain=domain, horizon_hours=horizon_hours)
        self.record(insight.raw)
        return insight

    def average_risk_index(self) -> float:
        return self.average_metric("risk_index")

    def open_incident_trend(self) -> float:
        return self.average_metric("open_incidents")
