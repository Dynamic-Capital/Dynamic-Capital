"""Formatting helpers for dynamic astronomy updates."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.astronomy import AstronomyAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicAstronomyHelper"]


class DynamicAstronomyHelper(InsightHelper):
    """Compose astronomy insights into readable digests."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Astronomy = Analyzing Space, Tracking Research On Natural Objects, Mapping the Universe"
        )

    def compose_digest(self, insight: AstronomyAgentInsight | AgentInsight) -> str:
        if isinstance(insight, AstronomyAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            if insight.planned_requests:
                highlights.append(
                    f"Next observation queue: {len(insight.planned_requests)} planned, {len(insight.pending_requests)} pending"
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
