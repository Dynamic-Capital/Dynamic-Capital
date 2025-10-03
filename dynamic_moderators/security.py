"""Moderation tooling for enforcing security guardrails."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from dynamic_security_engine import DynamicSecurityEngine, SecurityPostureSnapshot

__all__ = ["SecurityModerationReport", "DynamicSecurityModerator"]


@dataclass(slots=True)
class SecurityModerationReport:
    """Result of evaluating a security domain against guardrails."""

    domain: str
    compliant: bool
    score: float
    issues: tuple[str, ...]

    def to_dict(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "compliant": self.compliant,
            "score": round(self.score, 4),
            "issues": list(self.issues),
        }


class DynamicSecurityModerator:
    """Validate security posture against baseline guardrails."""

    def __init__(self, *, engine: DynamicSecurityEngine | None = None) -> None:
        self._engine = engine or DynamicSecurityEngine()

    def evaluate(
        self,
        domain: str,
        *,
        horizon_hours: int = 24,
        required_coverage: float = 0.6,
        required_maturity: float = 0.5,
        max_risk: float = 0.6,
    ) -> SecurityModerationReport:
        snapshot = self._engine.posture(domain, horizon_hours=horizon_hours)
        issues = self._collect_issues(
            snapshot,
            required_coverage=required_coverage,
            required_maturity=required_maturity,
            max_risk=max_risk,
        )
        score = self._score_snapshot(snapshot, issues)
        compliant = not issues
        return SecurityModerationReport(
            domain=snapshot.domain,
            compliant=compliant,
            score=score,
            issues=tuple(issues),
        )

    def scorecard(self, *, horizon_hours: int = 24) -> tuple[SecurityModerationReport, ...]:
        reports = [
            self.evaluate(domain, horizon_hours=horizon_hours)
            for domain in self._engine.domains
        ]
        reports.sort(key=lambda report: report.score)
        return tuple(reports)

    # ------------------------------------------------------------------
    # helpers

    def _collect_issues(
        self,
        snapshot: SecurityPostureSnapshot,
        *,
        required_coverage: float,
        required_maturity: float,
        max_risk: float,
    ) -> list[str]:
        issues: list[str] = []
        if snapshot.coverage < required_coverage:
            issues.append(
                f"Coverage {snapshot.coverage:.2%} below target {required_coverage:.0%}"
            )
        if snapshot.maturity < required_maturity:
            issues.append(
                f"Control maturity {snapshot.maturity:.2%} below baseline {required_maturity:.0%}"
            )
        if snapshot.risk_index > max_risk:
            issues.append(
                f"Risk index {snapshot.risk_index:.2f} above limit {max_risk:.2f}"
            )
        if snapshot.critical_incident_count:
            issues.append("Active critical incidents present")
        return issues

    def _score_snapshot(
        self, snapshot: SecurityPostureSnapshot, issues: Sequence[str]
    ) -> float:
        base = 1.0 - snapshot.risk_index
        penalty = min(len(issues) * 0.1, 0.6)
        return max(0.0, round(base - penalty, 4))
