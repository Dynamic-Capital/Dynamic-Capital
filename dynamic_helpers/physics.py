"""Formatting helper for dynamic physics digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.physics_agent import PhysicsAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicPhysicsHelper"]


class DynamicPhysicsHelper(InsightHelper):
    """Render physics simulation updates."""

    def __init__(self) -> None:
        super().__init__(tagline="Physics = Principles Harnessing Innovation, Science & Knowledge Systems")

    def compose_digest(self, insight: PhysicsAgentInsight | AgentInsight) -> str:
        if isinstance(insight, PhysicsAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            if insight.snapshot.bodies:
                highlights.append(f"Bodies tracked: {len(insight.snapshot.bodies)}")
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
