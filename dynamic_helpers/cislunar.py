"""Formatting helper for dynamic cislunar digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.cislunar import CislunarAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicCislunarHelper"]


class DynamicCislunarHelper(InsightHelper):
    """Render cislunar traffic updates."""

    def __init__(self) -> None:
        super().__init__(tagline="Cislunar Space = Civilization In Space Linking Unified Near Earth Regions")

    def compose_digest(self, insight: CislunarAgentInsight | AgentInsight) -> str:
        if isinstance(insight, CislunarAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            band_metrics = insight.snapshot.band_metrics
            if band_metrics:
                totals = sum(metrics.asset_count for metrics in band_metrics)
                highlights.append(f"Assets distributed across {len(band_metrics)} bands ({totals} total)")
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
