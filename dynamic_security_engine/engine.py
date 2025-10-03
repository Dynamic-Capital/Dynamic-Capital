"""Security posture modelling and analytics for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean
from threading import RLock
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SecurityControl",
    "SecuritySignal",
    "SecurityIncident",
    "SecurityPostureSnapshot",
    "DynamicSecurityEngine",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float | int, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_text(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_domain(value: str) -> str:
    return _normalise_text(value)


def _normalise_identifier(value: str) -> str:
    text = _normalise_text(value)
    if any(ch.isspace() for ch in text):
        return "-".join(text.split())
    return text


def _normalise_status(value: str, mapping: Mapping[str, str], default: str) -> str:
    key = str(value or default).strip().replace("-", "_").replace(" ", "_").lower()
    return mapping.get(key, default)


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _hours_between(start: datetime, end: datetime | None) -> float | None:
    if end is None:
        return None
    return max((end - start).total_seconds() / 3600.0, 0.0)


# ---------------------------------------------------------------------------
# dataclasses


_CONTROL_STATUS = {
    "": "active",
    "planned": "planned",
    "draft": "planned",
    "experimental": "planned",
    "active": "active",
    "operational": "active",
    "deprecated": "deprecated",
    "retired": "deprecated",
}

_SIGNAL_STATUS = {
    "": "observed",
    "observed": "observed",
    "triaged": "triaged",
    "escalated": "escalated",
    "resolved": "resolved",
}

_INCIDENT_STATUS = {
    "": "open",
    "detected": "open",
    "open": "open",
    "contained": "contained",
    "mitigated": "contained",
    "resolved": "resolved",
    "closed": "resolved",
}


@dataclass(slots=True)
class SecurityControl:
    """Preventive or detective capability tracked by the engine."""

    identifier: str
    domain: str
    description: str
    coverage: float = 0.5
    maturity: float = 0.5
    status: str = "active"
    tags: tuple[str, ...] = field(default_factory=tuple)
    owner: str | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.domain = _normalise_domain(self.domain)
        self.description = _normalise_text(self.description)
        self.coverage = _clamp(self.coverage)
        self.maturity = _clamp(self.maturity)
        self.status = _normalise_status(self.status, _CONTROL_STATUS, "active")
        self.tags = _normalise_tags(self.tags)
        self.owner = _normalise_text(self.owner) if self.owner else None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "domain": self.domain,
            "description": self.description,
            "coverage": round(self.coverage, 4),
            "maturity": round(self.maturity, 4),
            "status": self.status,
            "tags": list(self.tags),
            "owner": self.owner,
        }


@dataclass(slots=True)
class SecuritySignal:
    """Observation coming from telemetry or guardrails."""

    source: str
    domain: str
    severity: float
    confidence: float = 0.5
    category: str = "general"
    detected_at: datetime = field(default_factory=_utcnow)
    responded_at: datetime | None = None
    status: str = "observed"
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.source = _normalise_text(self.source)
        self.domain = _normalise_domain(self.domain)
        self.category = _normalise_text(self.category)
        self.severity = _clamp(self.severity)
        self.confidence = _clamp(self.confidence)
        self.detected_at = _ensure_tzaware(self.detected_at) or _utcnow()
        self.responded_at = _ensure_tzaware(self.responded_at)
        self.status = _normalise_status(self.status, _SIGNAL_STATUS, "observed")
        self.tags = _normalise_tags(self.tags)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "source": self.source,
            "domain": self.domain,
            "severity": round(self.severity, 4),
            "confidence": round(self.confidence, 4),
            "category": self.category,
            "detected_at": self.detected_at.isoformat(),
            "responded_at": self.responded_at.isoformat() if self.responded_at else None,
            "status": self.status,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class SecurityIncident:
    """Material security event tracked through detection and response."""

    identifier: str
    domain: str
    summary: str
    severity: float = 0.5
    impact: float = 0.0
    detected_at: datetime = field(default_factory=_utcnow)
    contained_at: datetime | None = None
    resolved_at: datetime | None = None
    status: str = "open"
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.domain = _normalise_domain(self.domain)
        self.summary = _normalise_text(self.summary)
        self.severity = _clamp(self.severity)
        self.impact = _clamp(self.impact)
        self.detected_at = _ensure_tzaware(self.detected_at) or _utcnow()
        self.contained_at = _ensure_tzaware(self.contained_at)
        self.resolved_at = _ensure_tzaware(self.resolved_at)
        self.status = _normalise_status(self.status, _INCIDENT_STATUS, "open")
        self.tags = _normalise_tags(self.tags)

    @property
    def is_open(self) -> bool:
        return self.status != "resolved"

    @property
    def is_critical(self) -> bool:
        return self.severity >= 0.7

    def with_updates(
        self,
        *,
        status: str | None = None,
        contained_at: datetime | None = None,
        resolved_at: datetime | None = None,
        impact: float | None = None,
    ) -> "SecurityIncident":
        return SecurityIncident(
            identifier=self.identifier,
            domain=self.domain,
            summary=self.summary,
            severity=self.severity,
            impact=self.impact if impact is None else _clamp(impact),
            detected_at=self.detected_at,
            contained_at=contained_at or self.contained_at,
            resolved_at=resolved_at or self.resolved_at,
            status=status or self.status,
            tags=self.tags,
        )

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "domain": self.domain,
            "summary": self.summary,
            "severity": round(self.severity, 4),
            "impact": round(self.impact, 4),
            "detected_at": self.detected_at.isoformat(),
            "contained_at": self.contained_at.isoformat() if self.contained_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "status": self.status,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class SecurityPostureSnapshot:
    """Aggregate metrics describing a domain's security posture."""

    domain: str
    generated_at: datetime
    coverage: float
    maturity: float
    risk_index: float
    signal_volume: int
    mean_time_to_detect_hours: float
    mean_time_to_resolve_hours: float
    open_incident_count: int
    critical_incident_count: int
    controls: tuple[SecurityControl, ...]
    signals: tuple[SecuritySignal, ...]
    incidents: tuple[SecurityIncident, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "domain": self.domain,
            "generated_at": self.generated_at.isoformat(),
            "coverage": round(self.coverage, 4),
            "maturity": round(self.maturity, 4),
            "risk_index": round(self.risk_index, 4),
            "signal_volume": self.signal_volume,
            "mean_time_to_detect_hours": round(self.mean_time_to_detect_hours, 4),
            "mean_time_to_resolve_hours": round(self.mean_time_to_resolve_hours, 4),
            "open_incident_count": self.open_incident_count,
            "critical_incident_count": self.critical_incident_count,
            "controls": [control.as_dict() for control in self.controls],
            "signals": [signal.as_dict() for signal in self.signals],
            "incidents": [incident.as_dict() for incident in self.incidents],
        }


@dataclass(slots=True)
class _SecurityDomainState:
    name: str
    description: str = ""
    controls: MutableMapping[str, SecurityControl] = field(default_factory=dict)
    signals: Deque[SecuritySignal] = field(default_factory=deque)
    incidents: MutableMapping[str, SecurityIncident] = field(default_factory=dict)

    def to_snapshot(
        self,
        *,
        horizon: timedelta,
        generated_at: datetime,
    ) -> SecurityPostureSnapshot:
        signals = tuple(
            signal
            for signal in self.signals
            if generated_at - signal.detected_at <= horizon
        )
        incidents = tuple(self.incidents.values())
        open_incidents = tuple(incident for incident in incidents if incident.is_open)
        critical_incidents = tuple(
            incident for incident in open_incidents if incident.is_critical
        )
        controls = tuple(self.controls.values())

        coverage = fmean([control.coverage for control in controls]) if controls else 0.0
        maturity = fmean([control.maturity for control in controls]) if controls else 0.0

        mttd_values = [
            _hours_between(signal.detected_at, signal.responded_at)
            for signal in signals
            if signal.responded_at is not None
        ]
        mttd = fmean([value for value in mttd_values if value is not None]) if mttd_values else 0.0

        mttr_values = [
            _hours_between(incident.detected_at, incident.resolved_at)
            for incident in incidents
            if incident.resolved_at is not None
        ]
        mttr = fmean([value for value in mttr_values if value is not None]) if mttr_values else 0.0

        base_risk = 1.0 - (coverage + maturity) / 2.0
        incident_pressure = min(len(open_incidents) * 0.05 + len(critical_incidents) * 0.1, 1.0)
        signal_pressure = min(len(signals) * 0.01, 0.25)
        risk_index = max(0.0, min(1.0, base_risk + incident_pressure + signal_pressure))

        return SecurityPostureSnapshot(
            domain=self.name,
            generated_at=generated_at,
            coverage=coverage,
            maturity=maturity,
            risk_index=risk_index,
            signal_volume=len(signals),
            mean_time_to_detect_hours=mttd,
            mean_time_to_resolve_hours=mttr,
            open_incident_count=len(open_incidents),
            critical_incident_count=len(critical_incidents),
            controls=controls,
            signals=signals,
            incidents=incidents,
        )


# ---------------------------------------------------------------------------
# engine


class DynamicSecurityEngine:
    """Store security telemetry and derive posture analytics."""

    def __init__(
        self,
        *,
        signal_history_limit: int = 500,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        if signal_history_limit <= 0:
            raise ValueError("signal_history_limit must be positive")
        self._signal_history_limit = signal_history_limit
        self._domains: MutableMapping[str, _SecurityDomainState] = {}
        self._clock: Callable[[], datetime] = clock or _utcnow
        self._lock = RLock()

    def _now(self) -> datetime:
        return _ensure_tzaware(self._clock()) or _utcnow()

    def _ensure_state_locked(self, domain: str) -> _SecurityDomainState:
        canonical = _normalise_domain(domain)
        key = canonical.lower()
        state = self._domains.get(key)
        if state is None:
            state = _SecurityDomainState(
                name=canonical,
                signals=deque(maxlen=self._signal_history_limit),
            )
            self._domains[key] = state
        return state

    # ------------------------------------------------------------------
    # domain management

    def register_domain(self, name: str, *, description: str = "") -> None:
        canonical = _normalise_domain(name)
        key = canonical.lower()
        description = description.strip()
        if not key:
            raise ValueError("domain name must not be empty")
        with self._lock:
            state = self._domains.get(key)
            if state is not None:
                if description:
                    state.description = description
                return
            self._domains[key] = _SecurityDomainState(
                name=canonical,
                description=description,
                signals=deque(maxlen=self._signal_history_limit),
            )

    @property
    def domains(self) -> tuple[str, ...]:
        with self._lock:
            return tuple(state.name for state in self._domains.values())

    # ------------------------------------------------------------------
    # data ingestion

    def upsert_control(self, control: SecurityControl | Mapping[str, object]) -> SecurityControl:
        record = control if isinstance(control, SecurityControl) else SecurityControl(**control)  # type: ignore[arg-type]
        with self._lock:
            state = self._ensure_state_locked(record.domain)
            state.controls[record.identifier] = record
        return record

    def record_signal(self, signal: SecuritySignal | Mapping[str, object]) -> SecuritySignal:
        record = signal if isinstance(signal, SecuritySignal) else SecuritySignal(**signal)  # type: ignore[arg-type]
        with self._lock:
            state = self._ensure_state_locked(record.domain)
            state.signals.append(record)
        return record

    def record_signals(self, signals: Iterable[SecuritySignal | Mapping[str, object]]) -> tuple[SecuritySignal, ...]:
        recorded: list[SecuritySignal] = []
        grouped: dict[str, list[SecuritySignal]] = {}
        for payload in signals:
            record = payload if isinstance(payload, SecuritySignal) else SecuritySignal(**payload)  # type: ignore[arg-type]
            recorded.append(record)
            grouped.setdefault(record.domain, []).append(record)
        if not recorded:
            return ()
        with self._lock:
            for domain, items in grouped.items():
                state = self._ensure_state_locked(domain)
                state.signals.extend(items)
        return tuple(recorded)

    def record_incident(self, incident: SecurityIncident | Mapping[str, object]) -> SecurityIncident:
        record = incident if isinstance(incident, SecurityIncident) else SecurityIncident(**incident)  # type: ignore[arg-type]
        with self._lock:
            state = self._ensure_state_locked(record.domain)
            state.incidents[record.identifier] = record
        return record

    def close_incident(
        self,
        identifier: str,
        *,
        domain: str,
        contained_at: datetime | None = None,
        resolved_at: datetime | None = None,
        impact: float | None = None,
        status: str | None = "resolved",
    ) -> SecurityIncident:
        key = _normalise_identifier(identifier)
        with self._lock:
            state = self._ensure_state_locked(domain)
            if key not in state.incidents:
                raise KeyError(
                    f"incident {identifier!r} is not registered for domain {domain!r}"
                )
            incident = state.incidents[key]
            updated = incident.with_updates(
                status=status,
                contained_at=_ensure_tzaware(contained_at) or incident.contained_at,
                resolved_at=_ensure_tzaware(resolved_at) or incident.resolved_at,
                impact=impact,
            )
            state.incidents[key] = updated
        return updated

    # ------------------------------------------------------------------
    # analytics

    def recent_signals(
        self,
        domain: str,
        *,
        horizon_hours: int = 24,
    ) -> tuple[SecuritySignal, ...]:
        horizon = timedelta(hours=max(horizon_hours, 1))
        now = self._now()
        with self._lock:
            state = self._ensure_state_locked(domain)
            return tuple(
                signal
                for signal in tuple(state.signals)
                if now - signal.detected_at <= horizon
            )

    def active_incidents(self, domain: str) -> tuple[SecurityIncident, ...]:
        with self._lock:
            state = self._ensure_state_locked(domain)
            return tuple(
                incident for incident in state.incidents.values() if incident.is_open
            )

    def posture(
        self,
        domain: str,
        *,
        horizon_hours: int = 24,
    ) -> SecurityPostureSnapshot:
        horizon = timedelta(hours=max(horizon_hours, 1))
        generated_at = self._now()
        with self._lock:
            state = self._ensure_state_locked(domain)
            snapshot = state.to_snapshot(horizon=horizon, generated_at=generated_at)
        return snapshot

    def aggregate_posture(
        self,
        *,
        horizon_hours: int = 24,
        label: str = "All Domains",
    ) -> SecurityPostureSnapshot:
        horizon = timedelta(hours=max(horizon_hours, 1))
        generated_at = self._now()
        with self._lock:
            states = tuple(self._domains.values())
            if not states:
                return SecurityPostureSnapshot(
                    domain=label,
                    generated_at=generated_at,
                    coverage=0.0,
                    maturity=0.0,
                    risk_index=0.0,
                    signal_volume=0,
                    mean_time_to_detect_hours=0.0,
                    mean_time_to_resolve_hours=0.0,
                    open_incident_count=0,
                    critical_incident_count=0,
                    controls=(),
                    signals=(),
                    incidents=(),
                )
            snapshots = [
                state.to_snapshot(horizon=horizon, generated_at=generated_at)
                for state in states
            ]

        if not snapshots:
            return SecurityPostureSnapshot(
                domain=label,
                generated_at=generated_at,
                coverage=0.0,
                maturity=0.0,
                risk_index=0.0,
                signal_volume=0,
                mean_time_to_detect_hours=0.0,
                mean_time_to_resolve_hours=0.0,
                open_incident_count=0,
                critical_incident_count=0,
                controls=(),
                signals=(),
                incidents=(),
            )

        def _mean(values: Sequence[float]) -> float:
            return fmean(values) if values else 0.0

        coverage = _mean([snapshot.coverage for snapshot in snapshots])
        maturity = _mean([snapshot.maturity for snapshot in snapshots])
        risk = _mean([snapshot.risk_index for snapshot in snapshots])
        signals: list[SecuritySignal] = []
        incidents: list[SecurityIncident] = []
        controls: list[SecurityControl] = []
        for snapshot in snapshots:
            signals.extend(snapshot.signals)
            incidents.extend(snapshot.incidents)
            controls.extend(snapshot.controls)
        open_incidents = sum(snapshot.open_incident_count for snapshot in snapshots)
        critical_incidents = sum(
            snapshot.critical_incident_count for snapshot in snapshots
        )
        mttd = _mean([snapshot.mean_time_to_detect_hours for snapshot in snapshots])
        mttr = _mean([snapshot.mean_time_to_resolve_hours for snapshot in snapshots])
        return SecurityPostureSnapshot(
            domain=label,
            generated_at=generated_at,
            coverage=coverage,
            maturity=maturity,
            risk_index=risk,
            signal_volume=sum(snapshot.signal_volume for snapshot in snapshots),
            mean_time_to_detect_hours=mttd,
            mean_time_to_resolve_hours=mttr,
            open_incident_count=open_incidents,
            critical_incident_count=critical_incidents,
            controls=tuple(controls),
            signals=tuple(signals),
            incidents=tuple(incidents),
        )

