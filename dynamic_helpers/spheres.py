"""Formatting helper for spheres digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.spheres import SpheresAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicSpheresHelper"]


class DynamicSpheresHelper(InsightHelper):
    """Render sphere resonance updates."""

    def __init__(self) -> None:
        super().__init__(tagline="Spheres = Spatial Phenomena Harnessing Energy Regions & Systems")

    def compose_digest(self, insight: SpheresAgentInsight | AgentInsight) -> str:
        if isinstance(insight, SpheresAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            highlights.append(f"Pulse samples captured: {len(insight.snapshot.pulses)}")
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
