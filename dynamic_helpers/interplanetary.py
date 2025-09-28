"""Formatting helper for interplanetary logistics digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.interplanetary import InterplanetaryAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicInterplanetaryHelper"]


class DynamicInterplanetaryHelper(InsightHelper):
    """Render interplanetary route outlooks."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Interplanetary Space = Intelligence Navigating The Energy Regions Of Planets"
        )

    def compose_digest(self, insight: InterplanetaryAgentInsight | AgentInsight) -> str:
        if isinstance(insight, InterplanetaryAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            if insight.upcoming_windows:
                first = insight.upcoming_windows[0]
                highlights.append(
                    f"Primary itinerary {first.origin}->{first.destination} reliability {first.reliability:.2f}"
                )
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
