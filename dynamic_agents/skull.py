"""Dynamic skeleton orchestration agent."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import ClassVar, Iterable, Mapping

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_skeleton.compliance import ComplianceCheck, ComplianceReport, DynamicComplianceAlgo
from dynamic_skeleton.governance import (
    PROPOSAL_STATUS_EXECUTED,
    PROPOSAL_STATUS_REJECTED,
    PROPOSAL_STATUS_VOTING,
    DynamicGovernanceAlgo,
    Proposal,
)

__all__ = ["SkullAgentInsight", "DynamicSkullAgent"]


@dataclass(slots=True)
class SkullAgentInsight:
    """Typed container for enriched skeleton insights."""

    raw: AgentInsight
    proposals: tuple[Proposal, ...]
    proposal_metrics: Mapping[str, float]
    proposal_status_counts: Mapping[str, int]
    compliance_report: ComplianceReport | None
    failing_checks: tuple[ComplianceCheck, ...]
    warning_checks: tuple[ComplianceCheck, ...]


class DynamicSkullAgent:
    """Coordinate governance and compliance engines for the skeleton layer."""

    domain = "Dynamic Skeleton"
    role: ClassVar[str] = (
        "Skull sentinel aligning governance decisions with compliance protection."
    )
    _tasks: ClassVar[tuple[str, ...]] = (
        "Survey governance proposals across the skeleton engine.",
        "Calculate quorum performance and proposal status counts.",
        "Fuse compliance checks to highlight structural and protective risks.",
    )

    def __init__(
        self,
        *,
        governance: DynamicGovernanceAlgo | None = None,
        compliance: DynamicComplianceAlgo | None = None,
    ) -> None:
        self._governance = governance or DynamicGovernanceAlgo()
        self._compliance = compliance or DynamicComplianceAlgo()

    # ------------------------------------------------------------------
    # exposed engines

    @property
    def governance(self) -> DynamicGovernanceAlgo:
        return self._governance

    @property
    def compliance(self) -> DynamicComplianceAlgo:
        return self._compliance

    @property
    def tasks(self) -> tuple[str, ...]:
        """Tasks executed by the skull agent within the skeleton engine."""

        return self._tasks

    # ------------------------------------------------------------------
    # insight synthesis helpers

    def _collect_proposals(self) -> tuple[Proposal, ...]:
        proposals: Iterable[Proposal] = self._governance.list_proposals()
        return tuple(proposals)

    def _summarise_proposals(
        self, proposals: Iterable[Proposal]
    ) -> tuple[Mapping[str, float], Counter[str]]:
        proposals = tuple(proposals)
        counts: Counter[str] = Counter(proposal.status for proposal in proposals)
        executed = counts.get(PROPOSAL_STATUS_EXECUTED, 0)
        rejected = counts.get(PROPOSAL_STATUS_REJECTED, 0)
        voting = counts.get(PROPOSAL_STATUS_VOTING, 0)
        quorum_failures = sum(
            1
            for proposal in proposals
            if proposal.rejection_reason == "quorum_not_met"
        )
        attempts = executed + quorum_failures
        if attempts:
            quorum_success = executed / attempts
        else:
            total = counts.total() if hasattr(counts, "total") else sum(counts.values())
            quorum_success = executed / total if total else 0.0
        metrics = {
            "proposals_total": float(sum(counts.values())),
            "proposals_executed": float(executed),
            "proposals_rejected": float(rejected),
            "proposals_voting": float(voting),
            "quorum_success_rate": float(quorum_success),
        }
        return metrics, counts

    def generate_insight(self) -> AgentInsight:
        proposals = self._collect_proposals()
        proposal_metrics, status_counts = self._summarise_proposals(proposals)

        report: ComplianceReport | None = None
        failing_checks: tuple[ComplianceCheck, ...] = ()
        warning_checks: tuple[ComplianceCheck, ...] = ()
        metrics = dict(proposal_metrics)
        highlights: list[str] = []

        if self._compliance is not None:
            report = self._compliance.generate_report()
            metrics.update(
                {
                    f"compliance_{status}_count": float(count)
                    for status, count in sorted(report.totals.items())
                }
            )
            failing_checks = tuple(
                check for check in report.checks if check.status == "fail"
            )
            warning_checks = tuple(
                check for check in report.checks if check.status == "warn"
            )
            highlights.extend(
                f"Compliance FAIL: {check.name} ({check.check_id})" for check in failing_checks
            )
            highlights.extend(
                f"Compliance WARN: {check.name} ({check.check_id})" for check in warning_checks
            )
            if report.summary:
                highlights.append(report.summary)

        executed = int(status_counts.get(PROPOSAL_STATUS_EXECUTED, 0))
        rejected = int(status_counts.get(PROPOSAL_STATUS_REJECTED, 0))
        if executed:
            highlights.append(f"{executed} proposal(s) executed successfully.")
        if rejected:
            quorum_shortfalls = sum(
                1 for proposal in proposals if proposal.rejection_reason == "quorum_not_met"
            )
            if quorum_shortfalls:
                highlights.append(
                    f"{quorum_shortfalls} proposal(s) rejected due to quorum shortfall."
                )
            else:
                highlights.append(f"{rejected} proposal(s) rejected in total.")

        details = {
            "proposals": proposals,
            "proposal_metrics": dict(proposal_metrics),
            "proposal_status_counts": dict(status_counts),
            "compliance_report": report,
            "failing_checks": failing_checks,
            "warning_checks": warning_checks,
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Skeleton Governance Pulse",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> SkullAgentInsight:
        raw = self.generate_insight()
        details = raw.details or {}
        proposals = tuple(details.get("proposals", ()))
        metrics = details.get("proposal_metrics") or {
            key: value
            for key, value in raw.metrics.items()
            if key.startswith("proposals_") or key == "quorum_success_rate"
        }
        status_counts = details.get("proposal_status_counts") or {
            PROPOSAL_STATUS_EXECUTED: int(raw.metrics.get("proposals_executed", 0)),
            PROPOSAL_STATUS_REJECTED: int(raw.metrics.get("proposals_rejected", 0)),
            PROPOSAL_STATUS_VOTING: int(raw.metrics.get("proposals_voting", 0)),
        }
        report = details.get("compliance_report")
        failing = tuple(details.get("failing_checks", ()))
        warnings = tuple(details.get("warning_checks", ()))
        return SkullAgentInsight(
            raw=raw,
            proposals=proposals,
            proposal_metrics=metrics,
            proposal_status_counts=status_counts,
            compliance_report=report if isinstance(report, ComplianceReport) else None,
            failing_checks=failing,
            warning_checks=warnings,
        )
