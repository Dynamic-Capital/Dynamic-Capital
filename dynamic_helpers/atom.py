"""Formatting helper for dynamic atom digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.atom import AtomAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicAtomHelper"]


class DynamicAtomHelper(InsightHelper):
    """Render atomic state updates."""

    def __init__(self) -> None:
        super().__init__(tagline="Atom = Advanced Theory Of Matter")

    def compose_digest(self, insight: AtomAgentInsight | AgentInsight) -> str:
        if isinstance(insight, AtomAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            highlights.append(f"Recorded transitions: {len(insight.history)}")
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
