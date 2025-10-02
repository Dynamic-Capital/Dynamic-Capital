"""Formatting helpers for Dhivehi language operations."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.dhivehi_language import DhivehiLanguageAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicDhivehiLanguageHelper"]


class DynamicDhivehiLanguageHelper(InsightHelper):
    """Render Dhivehi language insights into concise digests."""

    def __init__(self) -> None:
        super().__init__(
            tagline="Dhivehi Language Ops = Transliteration, Glossaries, Translation Memory, Speech QA"
        )

    def compose_digest(self, insight: DhivehiLanguageAgentInsight | AgentInsight) -> str:
        if isinstance(insight, DhivehiLanguageAgentInsight):
            base = super().compose_digest(insight.raw)
            lines = [base]
            if insight.pending_actions:
                lines.append("Immediate follow-ups:")
                for action in insight.pending_actions[:3]:
                    lines.append(f"  - {action}")
            if insight.at_risk_assets:
                lines.append("At-risk assets:")
                for asset in insight.at_risk_assets[:3]:
                    lines.append(
                        f"  - {asset.name} ({asset.asset_type}, coverage {asset.coverage:.0%}, quality {asset.quality_score:.0%})"
                    )
            return "\n".join(lines)
        return super().compose_digest(insight)
