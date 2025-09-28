"""Formatting helper for interstellar digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.interstellar import InterstellarAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicInterstellarHelper"]


class DynamicInterstellarHelper(InsightHelper):
    """Render interstellar network health reports."""

    def __init__(self) -> None:
        super().__init__(tagline="Interstellar Space = Intelligence Navigating Stars To Explore Regions")

    def compose_digest(self, insight: InterstellarAgentInsight | AgentInsight) -> str:
        if isinstance(insight, InterstellarAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            highlights.append(f"Corridor groups tracked: {len(insight.corridors)}")
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
