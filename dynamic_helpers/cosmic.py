"""Formatting helper for dynamic cosmic insights."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.cosmic import CosmicAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicCosmicHelper"]


class DynamicCosmicHelper(InsightHelper):
    """Render cosmic system telemetry in a digestible format."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Cosmos = Creating Observations in Space, Matter, Intelligence & Consciousness"
        )

    def compose_digest(self, insight: CosmicAgentInsight | AgentInsight) -> str:
        if isinstance(insight, CosmicAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            snapshot = insight.snapshot
            events = snapshot.get("events", []) if isinstance(snapshot, dict) else []
            if events:
                recent = events[0]
                highlights.append(f"Latest timeline event impact {recent.get('impact', 0.0):.2f}")
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
