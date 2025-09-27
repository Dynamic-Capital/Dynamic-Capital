"""Compliance modeling for the Dynamic Skeleton layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Dict, List, Optional


COMPLIANCE_STATUSES = {"pending", "pass", "warn", "fail"}


def _utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class ComplianceCheck:
    """Definition of an AML/KYC compliance control."""

    check_id: str
    name: str
    description: str
    status: str = "pending"
    last_updated: datetime = field(default_factory=_utcnow)
    notes: List[str] = field(default_factory=list)

    def update(self, status: str, note: Optional[str] = None) -> None:
        if status not in COMPLIANCE_STATUSES:
            raise ValueError(f"Unsupported compliance status '{status}'")
        self.status = status
        self.last_updated = _utcnow()
        if note:
            self.notes.append(note)


@dataclass
class ComplianceReport:
    """Aggregate view of compliance posture."""

    generated_at: datetime
    overall_status: str
    totals: Dict[str, int]
    checks: List[ComplianceCheck]
    summary: str


class DynamicComplianceAlgo:
    """Track compliance checks and surface aggregated status."""

    def __init__(self) -> None:
        self._checks: Dict[str, ComplianceCheck] = {}

    def register_check(self, check_id: str, name: str, description: str) -> ComplianceCheck:
        if check_id in self._checks:
            raise ValueError(f"Compliance check '{check_id}' already registered")
        check = ComplianceCheck(check_id=check_id, name=name, description=description)
        self._checks[check_id] = check
        return check

    def update_check(self, check_id: str, status: str, note: Optional[str] = None) -> ComplianceCheck:
        check = self._get_check_or_raise(check_id)
        check.update(status, note)
        return check

    def get_check(self, check_id: str) -> ComplianceCheck:
        return self._get_check_or_raise(check_id)

    def all_checks(self) -> List[ComplianceCheck]:
        return list(self._checks.values())

    def status_totals(self) -> Dict[str, int]:
        totals = {status: 0 for status in COMPLIANCE_STATUSES}
        for check in self._checks.values():
            totals[check.status] += 1
        return totals

    def status_summary(self) -> str:
        totals = self.status_totals()
        parts = [f"{status}:{totals[status]}" for status in sorted(totals)]
        return ", ".join(parts)

    def generate_report(self) -> ComplianceReport:
        totals = self.status_totals()
        overall_status = self._derive_overall_status(totals)
        summary = self._build_summary(overall_status, totals)
        return ComplianceReport(
            generated_at=_utcnow(),
            overall_status=overall_status,
            totals=totals,
            checks=self.all_checks(),
            summary=summary,
        )

    def _derive_overall_status(self, totals: Dict[str, int]) -> str:
        if totals.get("fail", 0) > 0:
            return "fail"
        if totals.get("warn", 0) > 0:
            return "warn"
        if totals.get("pass", 0) == len(self._checks) and self._checks:
            return "pass"
        return "pending"

    def _build_summary(self, overall_status: str, totals: Dict[str, int]) -> str:
        if not self._checks:
            return "No compliance checks registered"
        details = ", ".join(
            f"{status}={count}" for status, count in sorted(totals.items()) if count
        )
        if not details:
            details = "all pending"
        return f"Overall {overall_status.upper()} ({details})"

    def _get_check_or_raise(self, check_id: str) -> ComplianceCheck:
        if check_id not in self._checks:
            raise KeyError(f"Unknown compliance check '{check_id}'")
        return self._checks[check_id]
