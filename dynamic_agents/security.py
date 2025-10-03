"""Security orchestration agent built on top of :mod:`dynamic_security_engine`."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_security_engine import (
    DynamicSecurityEngine,
    SecurityControl,
    SecurityIncident,
    SecurityPostureSnapshot,
    SecuritySignal,
)

__all__ = ["SecurityAgentInsight", "DynamicSecurityAgent"]


@dataclass(slots=True)
class SecurityAgentInsight:
    """Wrapper that exposes structured access to security posture snapshots."""

    raw: AgentInsight
    snapshot: SecurityPostureSnapshot

    @property
    def open_incidents(self) -> tuple[SecurityIncident, ...]:
        return tuple(incident for incident in self.snapshot.incidents if incident.is_open)

    @property
    def critical_incidents(self) -> tuple[SecurityIncident, ...]:
        return tuple(incident for incident in self.open_incidents if incident.is_critical)

    @property
    def signals(self) -> tuple[SecuritySignal, ...]:
        return self.snapshot.signals

    @property
    def controls(self) -> tuple[SecurityControl, ...]:
        return self.snapshot.controls


class DynamicSecurityAgent:
    """Synthesize posture metrics for security domains."""

    domain = "Security"

    def __init__(
        self,
        *,
        engine: DynamicSecurityEngine | None = None,
        default_domain: str = "All Domains",
    ) -> None:
        self._engine = engine or DynamicSecurityEngine()
        self._default_domain = default_domain

    # ------------------------------------------------------------------
    # accessors

    @property
    def engine(self) -> DynamicSecurityEngine:
        return self._engine

    @property
    def domains(self) -> tuple[str, ...]:
        return self._engine.domains

    # ------------------------------------------------------------------
    # insight generation

    def _select_domain(self, domain: str | None) -> str:
        if domain is None:
            return self._default_domain
        candidate = domain.strip()
        return candidate or self._default_domain

    def _snapshot(self, domain: str, *, horizon_hours: int) -> SecurityPostureSnapshot:
        key = domain.lower()
        if key in {"all", "*", "global", "security"}:
            return self._engine.aggregate_posture(horizon_hours=horizon_hours)
        return self._engine.posture(domain, horizon_hours=horizon_hours)

    def generate_insight(
        self,
        *,
        domain: str | None = None,
        horizon_hours: int = 24,
        tags: Sequence[str] | None = None,
        snapshot: SecurityPostureSnapshot | None = None,
    ) -> AgentInsight:
        target_domain = self._select_domain(domain)
        snapshot = snapshot or self._snapshot(target_domain, horizon_hours=horizon_hours)
        highlights = self._build_highlights(snapshot)
        metrics = self._build_metrics(snapshot)
        details: Mapping[str, object] = {
            "snapshot": snapshot.as_dict(),
        }
        if snapshot.controls:
            details = dict(details)
            details["controls"] = [control.as_dict() for control in snapshot.controls]
            details["incidents"] = [
                incident.as_dict() for incident in snapshot.incidents
            ]
            details["signals"] = [signal.as_dict() for signal in snapshot.signals]
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title=f"Security Posture – {snapshot.domain}",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
            domains=self._engine.domains,
            states=tuple(tags or ()),
        )

    def detailed_insight(
        self,
        *,
        domain: str | None = None,
        horizon_hours: int = 24,
        tags: Sequence[str] | None = None,
    ) -> SecurityAgentInsight:
        target_domain = self._select_domain(domain)
        snapshot = self._snapshot(target_domain, horizon_hours=horizon_hours)
        raw = self.generate_insight(
            domain=target_domain,
            horizon_hours=horizon_hours,
            tags=tags,
            snapshot=snapshot,
        )
        return SecurityAgentInsight(raw=raw, snapshot=snapshot)

    # ------------------------------------------------------------------
    # helpers

    def _build_highlights(self, snapshot: SecurityPostureSnapshot) -> list[str]:
        highlights: list[str] = []
        if snapshot.open_incident_count:
            highlights.append(
                f"{snapshot.open_incident_count} open incident(s); risk {snapshot.risk_index:.2f}"
            )
        if snapshot.critical_incident_count:
            highlights.append("Critical incidents require immediate attention")
        if snapshot.coverage < 0.6:
            highlights.append("Control coverage below 60%; expand telemetry footprint")
        elif snapshot.coverage > 0.85 and snapshot.maturity > 0.75:
            highlights.append("Controls performing strongly across the board")
        if snapshot.mean_time_to_resolve_hours > 24:
            highlights.append("MTTR exceeds 24h; review incident response playbooks")
        if not highlights:
            highlights.append("Security posture steady with no blocking issues")
        return highlights

    def _build_metrics(self, snapshot: SecurityPostureSnapshot) -> Mapping[str, float]:
        return {
            "coverage_score": snapshot.coverage,
            "maturity_score": snapshot.maturity,
            "risk_index": snapshot.risk_index,
            "mean_time_to_detect_hours": snapshot.mean_time_to_detect_hours,
            "mean_time_to_resolve_hours": snapshot.mean_time_to_resolve_hours,
            "signal_volume": float(snapshot.signal_volume),
            "open_incidents": float(snapshot.open_incident_count),
            "critical_incidents": float(snapshot.critical_incident_count),
        }
