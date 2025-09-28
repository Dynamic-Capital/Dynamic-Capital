"""Formatting helper for dynamic energy digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.energy import EnergyAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicEnergyHelper"]


class DynamicEnergyHelper(InsightHelper):
    """Render energy profiles with narrative context."""

    def __init__(self) -> None:
        super().__init__(tagline="Energy = Essential Networks Generating Renewable Yields")

    def compose_digest(self, insight: EnergyAgentInsight | AgentInsight) -> str:
        if isinstance(insight, EnergyAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            actions = insight.profile.recommended_actions
            if actions:
                highlights.append("Recommended actions:")
                highlights.extend(f"• {action}" for action in actions)
            enriched = AgentInsight(
                domain=payload.domain,
                generated_at=payload.generated_at,
                title=payload.title,
                metrics=payload.metrics,
                highlights=tuple(highlights),
                details=payload.details,
            )
            return super().compose_digest(enriched)
        return super().compose_digest(insight)
