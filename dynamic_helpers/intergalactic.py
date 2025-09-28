"""Formatting helper for intergalactic summaries."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.intergalactic import IntergalacticAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicIntergalacticHelper"]


class DynamicIntergalacticHelper(InsightHelper):
    """Render intergalactic network updates."""

    def __init__(self) -> None:
        super().__init__(tagline="Intergalactic Space = Intelligence Navigating Galactic Systems")

    def compose_digest(self, insight: IntergalacticAgentInsight | AgentInsight) -> str:
        if isinstance(insight, IntergalacticAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            highlights.append(f"Total sectors catalogued: {len(insight.sectors)}")
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
