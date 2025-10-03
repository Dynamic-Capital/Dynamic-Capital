"""Formatting helpers for the dynamic security persona."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.security import DynamicSecurityAgent, SecurityAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicSecurityHelper"]


class DynamicSecurityHelper(InsightHelper):
    """Compose security posture highlights into digestible updates."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Security = Safeguarding Environments, Controls, Updates, Reviews, Intelligence, Compliance, Yield"
        )

    def compose_digest(self, insight: AgentInsight | SecurityAgentInsight) -> str:
        payload = insight.raw if isinstance(insight, SecurityAgentInsight) else insight
        if isinstance(insight, SecurityAgentInsight):
            snapshot = insight.snapshot
            details = payload.details or {}
            details = dict(details)
            details.setdefault(
                "headline",
                f"Risk index {snapshot.risk_index:.2f} with {snapshot.open_incident_count} open incident(s)",
            )
            enriched = AgentInsight(
                domain=payload.domain,
                generated_at=payload.generated_at,
                title=payload.title,
                metrics=payload.metrics,
                highlights=payload.highlights
                + (
                    f"Coverage {snapshot.coverage:.2%}, maturity {snapshot.maturity:.2%}",
                ),
                details=details,
                domains=payload.domains,
                states=payload.states,
            )
            return super().compose_digest(enriched)
        return super().compose_digest(payload)

    def capture_digest(
        self,
        agent: DynamicSecurityAgent,
        *,
        domain: str | None = None,
        horizon_hours: int = 24,
    ) -> str:
        insight = agent.detailed_insight(domain=domain, horizon_hours=horizon_hours)
        return self.compose_digest(insight)
