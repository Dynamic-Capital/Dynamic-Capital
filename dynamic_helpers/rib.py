"""Digest helper for Dynamic Skeleton insights."""

from __future__ import annotations

from typing import ClassVar

from dynamic_agents._insight import AgentInsight
from dynamic_agents.skull import SkullAgentInsight
from dynamic_helpers._base import InsightHelper
from dynamic_skeleton.governance import (
    PROPOSAL_STATUS_EXECUTED,
    PROPOSAL_STATUS_REJECTED,
)

__all__ = ["DynamicRibHelper"]


class DynamicRibHelper(InsightHelper):
    """Render skull agent insights with bone-themed flavour."""

    role: ClassVar[str] = "Rib cage herald translating insights into protective digests."
    _tasks: ClassVar[tuple[str, ...]] = (
        "Infuse bone-themed narration into governance updates.",
        "Echo compliance posture alongside proposal outcomes.",
        "Deliver digest-ready highlights for downstream channels.",
    )

    def __init__(self) -> None:
        super().__init__(
            tagline="RIB: Reinforcing Integrity & Balance across the skeleton stack",
        )

    @property
    def tasks(self) -> tuple[str, ...]:
        """Tasks owned by the rib helper when composing digests."""

        return self._tasks

    def compose_digest(self, insight: SkullAgentInsight | AgentInsight) -> str:
        if isinstance(insight, SkullAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)

            executed = int(insight.proposal_status_counts.get(PROPOSAL_STATUS_EXECUTED, 0))
            rejected = int(insight.proposal_status_counts.get(PROPOSAL_STATUS_REJECTED, 0))
            if executed or rejected:
                highlights.append(
                    f"Governance outcomes: {executed} executed / {rejected} rejected"
                )

            totals = insight.body_overview.get("totals", {})
            if totals:
                highlights.append(
                    (
                        "Skeletal totals: "
                        f"{int(totals.get('axial', 0))} axial | "
                        f"{int(totals.get('appendicular', 0))} appendicular"
                    )
                )
            core_functions = insight.body_overview.get("core_functions", ())
            if core_functions:
                function_names = ", ".join(fn["name"] for fn in core_functions[:3])
                if len(core_functions) > 3:
                    function_names += ", ..."
                highlights.append(f"Core functions: {function_names}")

            if insight.compliance_report is not None and insight.compliance_report.summary:
                highlights.append(
                    f"Compliance posture: {insight.compliance_report.summary}"
                )

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
