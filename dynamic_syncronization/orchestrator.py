"""Cross-system synchronisation telemetry utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Iterator, Mapping, MutableMapping, Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

__all__ = [
    "DynamicSyncronizationOrchestrator",
    "SyncDependency",
    "SyncEvent",
    "SyncIncident",
    "SyncStatusSnapshot",
    "SyncSystem",
]


_ALLOWED_STATUSES = {"success", "warning", "failed", "skipped"}
_SEVERITY_WEIGHTS = {"critical": 0.6, "major": 0.4, "minor": 0.2, "info": 0.1}
_CRITICALITY_WEIGHTS = {"critical": 1.0, "high": 0.8, "medium": 0.5, "low": 0.3}


def _coerce_timezone(value: object | None) -> ZoneInfo:
    if isinstance(value, ZoneInfo):
        return value
    if value is None:
        return ZoneInfo("UTC")
    cleaned = str(value).strip()
    if not cleaned:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(cleaned)
    except ZoneInfoNotFoundError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"unknown timezone: {cleaned}") from exc


def _timezone_key(value: ZoneInfo) -> str:
    key = getattr(value, "key", None)
    return key if key else str(value)


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_category(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("category must not be empty")
    return cleaned


def _normalise_severity(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in _SEVERITY_WEIGHTS:
        raise ValueError(
            "severity must be one of: " + ", ".join(sorted(_SEVERITY_WEIGHTS))
        )
    return cleaned


def _normalise_status(value: str) -> str:
    cleaned = value.strip().lower()
    if cleaned not in _ALLOWED_STATUSES:
        raise ValueError(
            "status must be one of: " + ", ".join(sorted(_ALLOWED_STATUSES))
        )
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _ensure_timezone(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _localise_incident(incident: SyncIncident, target: ZoneInfo) -> SyncIncident:
    clone = object.__new__(SyncIncident)
    object.__setattr__(clone, "identifier", incident.identifier)
    object.__setattr__(clone, "system", incident.system)
    object.__setattr__(clone, "severity", incident.severity)
    object.__setattr__(clone, "summary", incident.summary)
    object.__setattr__(clone, "details", incident.details)
    object.__setattr__(clone, "opened_at", incident.opened_at.astimezone(target))
    object.__setattr__(clone, "resolved_at", (
        incident.resolved_at.astimezone(target)
        if incident.resolved_at is not None
        else None
    ))
    object.__setattr__(clone, "metadata", incident.metadata)
    return clone


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class SyncSystem:
    """Definition for a synchronised system or dataset."""

    name: str
    category: str
    cadence_minutes: float
    tolerance_minutes: float
    criticality: str = "medium"
    timezone: ZoneInfo = field(default_factory=lambda: ZoneInfo("UTC"))
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.category = _normalise_category(self.category)
        self.cadence_minutes = max(float(self.cadence_minutes), 1.0)
        self.tolerance_minutes = max(float(self.tolerance_minutes), 0.0)
        normalised_criticality = self.criticality.strip().lower() or "medium"
        if normalised_criticality not in _CRITICALITY_WEIGHTS:
            normalised_criticality = "medium"
        self.criticality = normalised_criticality
        self.timezone = _coerce_timezone(self.timezone)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SyncDependency:
    """Directional dependency between synchronised systems."""

    upstream: str
    downstream: str
    impact: float = 0.5

    def __post_init__(self) -> None:
        self.upstream = _normalise_identifier(self.upstream)
        self.downstream = _normalise_identifier(self.downstream)
        self.impact = _clamp(float(self.impact))


@dataclass(slots=True)
class SyncEvent:
    """Record describing the outcome of a synchronisation attempt."""

    system: str
    status: str
    drift_minutes: float = 0.0
    latency_seconds: float | None = None
    started_at: datetime | None = None
    completed_at: datetime = field(default_factory=_utcnow)
    notes: str = ""
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.system = _normalise_identifier(self.system)
        self.status = _normalise_status(self.status)
        self.drift_minutes = float(self.drift_minutes)
        self.completed_at = _ensure_timezone(self.completed_at)
        if self.started_at is None:
            self.started_at = self.completed_at
        else:
            self.started_at = _ensure_timezone(self.started_at)
        if self.latency_seconds is None:
            self.latency_seconds = max(
                (self.completed_at - self.started_at).total_seconds(), 0.0
            )
        else:
            self.latency_seconds = max(float(self.latency_seconds), 0.0)
        self.notes = self.notes.strip()
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def duration_seconds(self) -> float:
        return self.latency_seconds or 0.0


@dataclass(slots=True)
class SyncIncident:
    """Operational incident affecting synchronisation health."""

    identifier: str
    system: str
    severity: str
    summary: str
    details: str = ""
    opened_at: datetime = field(default_factory=_utcnow)
    resolved_at: datetime | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.system = _normalise_identifier(self.system)
        self.severity = _normalise_severity(self.severity)
        self.summary = self.summary.strip()
        self.details = self.details.strip()
        self.opened_at = _ensure_timezone(self.opened_at)
        if self.resolved_at is not None:
            self.resolved_at = _ensure_timezone(self.resolved_at)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def is_open(self) -> bool:
        return self.resolved_at is None

    def resolve(self, *, resolved_at: datetime | None = None) -> None:
        if self.resolved_at is not None:
            return
        self.resolved_at = _ensure_timezone(resolved_at or _utcnow())


@dataclass(slots=True)
class SyncStatusSnapshot:
    """Aggregated health snapshot for a synchronised system."""

    system: str
    status: str
    health_score: float
    reliability: float
    average_drift_minutes: float
    last_synced_at: datetime | None
    timezone: ZoneInfo
    incidents: tuple[SyncIncident, ...]
    dependencies: tuple[str, ...]
    tags: tuple[str, ...]
    summary: str
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "system": self.system,
            "status": self.status,
            "health_score": self.health_score,
            "reliability": self.reliability,
            "average_drift_minutes": self.average_drift_minutes,
            "last_synced_at": self.last_synced_at.isoformat()
            if self.last_synced_at
            else None,
            "timezone": _timezone_key(self.timezone),
            "incidents": [
                {
                    "identifier": incident.identifier,
                    "severity": incident.severity,
                    "summary": incident.summary,
                    "opened_at": incident.opened_at.isoformat(),
                }
                for incident in self.incidents
            ],
            "dependencies": list(self.dependencies),
            "tags": list(self.tags),
            "summary": self.summary,
            "metadata": dict(self.metadata),
        }


# ---------------------------------------------------------------------------
# orchestrator implementation


class DynamicSyncronizationOrchestrator:
    """Maintain synchronisation telemetry and compute health snapshots."""

    def __init__(
        self,
        *,
        systems: Iterable[SyncSystem | Mapping[str, object]] | None = None,
        dependencies: Iterable[SyncDependency | Mapping[str, object]] | None = None,
        history: int = 120,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._systems: dict[str, SyncSystem] = {}
        self._dependencies: dict[str, set[str]] = {}
        self._events: dict[str, Deque[SyncEvent]] = {}
        self._incidents: dict[str, list[SyncIncident]] = {}
        self._incident_index: dict[str, SyncIncident] = {}
        self._status_cache: dict[tuple[str, str], SyncStatusSnapshot] = {}
        if systems:
            for system in systems:
                self.add_system(system)
        if dependencies:
            for dependency in dependencies:
                self.add_dependency(dependency)

    # ------------------------------------------------------------------
    # registration helpers

    def add_system(self, system: SyncSystem | Mapping[str, object]) -> SyncSystem:
        coerced = self._coerce_system(system)
        key = _normalise_key(coerced.name)
        self._systems[key] = coerced
        self._events.setdefault(key, deque(maxlen=self._history))
        self._incidents.setdefault(key, [])
        self._dependencies.setdefault(key, set())
        self._invalidate_status(key)
        return coerced

    def add_dependency(
        self, dependency: SyncDependency | Mapping[str, object]
    ) -> SyncDependency:
        coerced = self._coerce_dependency(dependency)
        downstream_key = _normalise_key(coerced.downstream)
        upstream_key = _normalise_key(coerced.upstream)
        if downstream_key not in self._systems:
            raise KeyError(f"unknown system: {coerced.downstream}")
        if upstream_key not in self._systems:
            raise KeyError(f"unknown system: {coerced.upstream}")
        self._dependencies.setdefault(downstream_key, set()).add(coerced.upstream)
        self._invalidate_status(downstream_key)
        return coerced

    # ------------------------------------------------------------------
    # event & incident lifecycle

    def record_event(self, event: SyncEvent | Mapping[str, object]) -> SyncStatusSnapshot:
        coerced = self._coerce_event(event)
        key = _normalise_key(coerced.system)
        if key not in self._systems:
            raise KeyError(f"unknown system: {coerced.system}")
        self._events.setdefault(key, deque(maxlen=self._history)).append(coerced)
        self._invalidate_status(key)
        return self.status(coerced.system)

    def open_incident(self, incident: SyncIncident | Mapping[str, object]) -> SyncIncident:
        coerced = self._coerce_incident(incident)
        key = _normalise_key(coerced.system)
        if key not in self._systems:
            raise KeyError(f"unknown system: {coerced.system}")
        if coerced.identifier in self._incident_index:
            raise ValueError(f"incident already exists: {coerced.identifier}")
        self._incidents.setdefault(key, []).append(coerced)
        self._incident_index[coerced.identifier] = coerced
        self._invalidate_status(key)
        return coerced

    def resolve_incident(
        self,
        identifier: str,
        *,
        resolved_at: datetime | None = None,
        system: str | None = None,
    ) -> bool:
        cleaned_identifier = _normalise_identifier(identifier)
        incident = self._incident_index.get(cleaned_identifier)
        if incident is None:
            return False
        if system is not None and _normalise_key(system) != _normalise_key(incident.system):
            return False
        incident.resolve(resolved_at=resolved_at)
        self._invalidate_status(_normalise_key(incident.system))
        return True

    # ------------------------------------------------------------------
    # status computation

    def status(
        self, system: str, *, timezone: str | ZoneInfo | None = None
    ) -> SyncStatusSnapshot:
        key = _normalise_key(system)
        if key not in self._systems:
            raise KeyError(f"unknown system: {system}")
        system_definition = self._systems[key]
        target_timezone = (
            _coerce_timezone(timezone)
            if timezone is not None
            else system_definition.timezone
        )
        cache_key = (key, _timezone_key(target_timezone))
        cached = self._status_cache.get(cache_key)
        if cached is not None:
            return cached

        events = tuple(self._events.get(key, ()))
        open_incidents = tuple(
            incident for incident in self._incidents.get(key, ()) if incident.is_open
        )
        dependencies = tuple(sorted(self._dependencies.get(key, ())))
        reliability = self._compute_reliability(events)
        average_drift = self._compute_average_drift(events)
        last_event = events[-1] if events else None
        health_score = self._compute_health(
            system_definition, reliability, average_drift, open_incidents, last_event
        )
        status = self._classify_status(health_score)
        summary = self._build_summary(
            system_definition,
            status=status,
            events=events,
            open_incidents=open_incidents,
            average_drift=average_drift,
        )
        metadata: MutableMapping[str, object] = {
            "cadence_minutes": system_definition.cadence_minutes,
            "tolerance_minutes": system_definition.tolerance_minutes,
            "criticality": system_definition.criticality,
            "event_count": len(events),
            "open_incident_count": len(open_incidents),
            "reliability": reliability,
        }
        metadata["timezone"] = _timezone_key(target_timezone)
        if last_event is not None:
            metadata["last_status"] = last_event.status
            metadata["last_latency_seconds"] = last_event.duration_seconds
            metadata["last_notes"] = last_event.notes
        if system_definition.metadata:
            metadata.update(system_definition.metadata)
        localised_incidents = tuple(
            _localise_incident(incident, target_timezone) for incident in open_incidents
        )
        snapshot = SyncStatusSnapshot(
            system=system_definition.name,
            status=status,
            health_score=health_score,
            reliability=reliability,
            average_drift_minutes=average_drift,
            last_synced_at=(
                last_event.completed_at.astimezone(target_timezone)
                if last_event
                else None
            ),
            timezone=target_timezone,
            incidents=localised_incidents,
            dependencies=dependencies,
            tags=system_definition.tags,
            summary=summary,
            metadata=metadata,
        )
        self._status_cache[cache_key] = snapshot
        return snapshot

    def iter_status(
        self, *, timezone: str | ZoneInfo | None = None
    ) -> Iterator[SyncStatusSnapshot]:
        for system in sorted(self._systems.values(), key=lambda item: item.name.lower()):
            yield self.status(system.name, timezone=timezone)

    def status_map(
        self, *, timezone: str | ZoneInfo | None = None
    ) -> MutableMapping[str, SyncStatusSnapshot]:
        return {
            snapshot.system: snapshot for snapshot in self.iter_status(timezone=timezone)
        }

    # ------------------------------------------------------------------
    # computation helpers

    @staticmethod
    def _compute_reliability(events: Sequence[SyncEvent]) -> float:
        if not events:
            return 0.0
        successes = sum(1 for event in events if event.status == "success")
        return successes / len(events)

    @staticmethod
    def _compute_average_drift(events: Sequence[SyncEvent]) -> float:
        if not events:
            return 0.0
        return fmean(abs(event.drift_minutes) for event in events)

    def _compute_health(
        self,
        system: SyncSystem,
        reliability: float,
        average_drift: float,
        incidents: Sequence[SyncIncident],
        last_event: SyncEvent | None,
    ) -> float:
        base = reliability if last_event is not None else 0.4
        if last_event is not None and last_event.status == "failed":
            base = min(base, 0.4)
        drift_penalty = 0.0
        if system.tolerance_minutes > 0 and average_drift > system.tolerance_minutes:
            overage = average_drift - system.tolerance_minutes
            drift_penalty = min(overage / max(system.tolerance_minutes, 1.0), 1.0) * 0.4
        incident_penalty = sum(
            _SEVERITY_WEIGHTS.get(incident.severity, 0.2) for incident in incidents
        )
        incident_penalty = min(incident_penalty, 0.6)
        criticality_weight = _CRITICALITY_WEIGHTS.get(system.criticality, 0.5)
        health = base * criticality_weight
        health = max(health - drift_penalty - incident_penalty, 0.0)
        return _clamp(health)

    @staticmethod
    def _classify_status(health: float) -> str:
        if health >= 0.8:
            return "healthy"
        if health >= 0.55:
            return "warning"
        return "critical"

    @staticmethod
    def _build_summary(
        system: SyncSystem,
        *,
        status: str,
        events: Sequence[SyncEvent],
        open_incidents: Sequence[SyncIncident],
        average_drift: float,
    ) -> str:
        parts: list[str] = [
            f"{system.name} synchronisation is {status}.",
        ]
        if not events:
            parts.append("No synchronisation events recorded yet.")
        else:
            last_event = events[-1]
            parts.append(
                "Last run ended with "
                f"{last_event.status} status and {last_event.drift_minutes:.1f}m drift."
            )
        if average_drift > system.tolerance_minutes and system.tolerance_minutes > 0:
            parts.append(
                f"Average drift {average_drift:.1f}m exceeds tolerance of "
                f"{system.tolerance_minutes:.1f}m."
            )
        if open_incidents:
            incident_descriptions = ", ".join(
                f"{incident.identifier} ({incident.severity})" for incident in open_incidents
            )
            parts.append(f"Open incidents: {incident_descriptions}.")
        if system.tags:
            parts.append("Tags: " + ", ".join(system.tags) + ".")
        return " ".join(parts)

    # ------------------------------------------------------------------
    # coercion helpers

    @staticmethod
    def _coerce_system(system: SyncSystem | Mapping[str, object]) -> SyncSystem:
        if isinstance(system, SyncSystem):
            return system
        if isinstance(system, Mapping):
            return SyncSystem(**system)
        raise TypeError("system must be SyncSystem or mapping")

    @staticmethod
    def _coerce_dependency(
        dependency: SyncDependency | Mapping[str, object]
    ) -> SyncDependency:
        if isinstance(dependency, SyncDependency):
            return dependency
        if isinstance(dependency, Mapping):
            return SyncDependency(**dependency)
        raise TypeError("dependency must be SyncDependency or mapping")

    @staticmethod
    def _coerce_event(event: SyncEvent | Mapping[str, object]) -> SyncEvent:
        if isinstance(event, SyncEvent):
            return event
        if isinstance(event, Mapping):
            return SyncEvent(**event)
        raise TypeError("event must be SyncEvent or mapping")

    @staticmethod
    def _coerce_incident(incident: SyncIncident | Mapping[str, object]) -> SyncIncident:
        if isinstance(incident, SyncIncident):
            return incident
        if isinstance(incident, Mapping):
            return SyncIncident(**incident)
        raise TypeError("incident must be SyncIncident or mapping")

    def _invalidate_status(self, key: str) -> None:
        to_remove = [cache_key for cache_key in self._status_cache if cache_key[0] == key]
        for cache_key in to_remove:
            self._status_cache.pop(cache_key, None)
