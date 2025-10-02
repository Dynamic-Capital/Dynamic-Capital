"""Digest helper for the dynamic business engine."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.business import BusinessEngineInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicBusinessHelper"]


class DynamicBusinessHelper(InsightHelper):
    """Compose business engine insights into stakeholder-friendly digests."""

    def __init__(self) -> None:
        super().__init__(
            tagline=(
                "Business Engine = Aligning Sales, Accounting, Marketing, "
                "and People Intelligence"
            )
        )

    def compose_digest(self, insight: AgentInsight | BusinessEngineInsight) -> str:
        if isinstance(insight, BusinessEngineInsight):
            base = super().compose_digest(insight.raw)
            lines = [base, "", "Domain snapshots:"]
            sales = insight.sales
            accounting = insight.accounting
            marketing = insight.marketing
            psychology = insight.psychology
            lines.append(
                "  • Sales | revenue ${:,.0f}, pipeline ${:,.0f}, win rate {:0.0%}".format(
                    sales.quarterly_revenue,
                    sales.pipeline_value,
                    sales.win_rate,
                )
            )
            lines.append(
                "  • Accounting | cash ${:,.0f}, runway {:0.1f}m, margin {:0.0%}".format(
                    accounting.cash_on_hand,
                    accounting.runway_months,
                    accounting.profit_margin,
                )
            )
            lines.append(
                "  • Marketing | lead velocity {:,.0f}, ROI {:0.2f}x, engagement {:0.0%}".format(
                    marketing.lead_velocity,
                    marketing.campaign_roi,
                    marketing.engagement_rate,
                )
            )
            lines.append(
                "  • People | wellbeing {:0.0f}, burnout {:0.0%}, retention risk {:0.0%}".format(
                    psychology.wellbeing_index,
                    psychology.burnout_risk,
                    psychology.retention_risk,
                )
            )
            return "\n".join(lines).strip()
        return super().compose_digest(insight)
