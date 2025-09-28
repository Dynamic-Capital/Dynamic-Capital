"""Formatting helper for dimension digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.dimensions import DimensionAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicDimensionHelper"]


class DynamicDimensionHelper(InsightHelper):
    """Render dimension profiles with contextual highlights."""

    def __init__(self) -> None:
        super().__init__(tagline="Dimensions = Defining Infinite Models Ensuring New Spatial Systems")

    def compose_digest(self, insight: DimensionAgentInsight | AgentInsight) -> str:
        if isinstance(insight, DimensionAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            sorted_axes = sorted(insight.profile.axis_scores.items(), key=lambda item: item[1], reverse=True)
            if sorted_axes:
                best_axis, score = sorted_axes[0]
                highlights.append(f"Strongest axis {best_axis} at {score:.2f}")
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
