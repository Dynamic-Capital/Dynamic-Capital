"""Formatting helper for dynamic wave digests."""

from __future__ import annotations

from datetime import datetime

from dynamic_agents._insight import AgentInsight
from dynamic_agents.wave_agent import WaveAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicWaveHelper"]


class DynamicWaveHelper(InsightHelper):
    """Render wavefield measurements with contextual highlights."""

    def __init__(self) -> None:
        super().__init__(tagline="Wave = Wavelengths Across Various Energy systems")

    def compose_digest(self, insight: WaveAgentInsight | AgentInsight) -> str:
        if isinstance(insight, WaveAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            alerts = insight.snapshot.alerts
            if alerts:
                highlights.extend(alerts)
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
