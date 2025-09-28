"""Formatting helper for supercluster digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.superclusters import SuperclusterAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicSuperclusterHelper"]


class DynamicSuperclusterHelper(InsightHelper):
    """Render supercluster evaluations with clarity."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Superclusters = Systems Uniting Planets, Energy & Regions Clustering Light Universes"
        )

    def compose_digest(self, insight: SuperclusterAgentInsight | AgentInsight) -> str:
        if isinstance(insight, SuperclusterAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            highlights.append(f"Clusters analysed: {len(insight.snapshot.clusters)}")
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
