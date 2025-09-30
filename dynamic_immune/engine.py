"""Adaptive immune engine for anomaly detection and remediation guidance."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = ["DynamicImmuneEngine", "ThreatAssessment", "ThreatEvent"]


def _normalise_text(value: str, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_tags(tags: Iterable[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        candidate = _normalise_text(str(tag), field_name="tag").lower()
        if candidate not in seen:
            seen.add(candidate)
            cleaned.append(candidate)
    return tuple(cleaned)


def _clamp(value: float, *, field_name: str, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower or numeric > upper:
        raise ValueError(f"{field_name} must be between {lower} and {upper}")
    return numeric


@dataclass(slots=True)
class ThreatEvent:
    """Observed anomaly or exploit attempt recorded by the immune layer."""

    vector: str
    description: str
    severity: float
    source: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.vector = _normalise_text(self.vector, field_name="vector").lower()
        self.description = _normalise_text(self.description, field_name="description")
        if self.source is not None:
            self.source = _normalise_text(str(self.source), field_name="source")
        self.severity = _clamp(self.severity, field_name="severity")
        self.tags = _normalise_tags(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "vector": self.vector,
            "description": self.description,
            "severity": self.severity,
            "source": self.source,
            "tags": list(self.tags),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class ThreatAssessment:
    """Aggregated view of immune telemetry and recommended actions."""

    events: tuple[ThreatEvent, ...]
    aggregate_severity: float
    risk_level: str
    dominant_vectors: Mapping[str, int]
    recommended_actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "events": [event.as_dict() for event in self.events],
            "aggregate_severity": self.aggregate_severity,
            "risk_level": self.risk_level,
            "dominant_vectors": dict(self.dominant_vectors),
            "recommended_actions": list(self.recommended_actions),
        }


class DynamicImmuneEngine:
    """Capture threats, assess systemic risk, and suggest mitigations."""

    def __init__(
        self,
        *,
        history: int = 250,
        alert_threshold: float = 0.45,
        critical_threshold: float = 0.8,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if not 0.0 <= alert_threshold <= 1.0:
            raise ValueError("alert_threshold must be within [0.0, 1.0]")
        if not 0.0 <= critical_threshold <= 1.0:
            raise ValueError("critical_threshold must be within [0.0, 1.0]")
        if alert_threshold > critical_threshold:
            raise ValueError("alert_threshold cannot exceed critical_threshold")

        self._events: Deque[ThreatEvent] = deque(maxlen=int(history))
        self._alert_threshold = float(alert_threshold)
        self._critical_threshold = float(critical_threshold)

    def record(self, event: ThreatEvent | Mapping[str, object]) -> ThreatEvent:
        resolved = self._coerce_event(event)
        self._events.append(resolved)
        return resolved

    def extend(self, events: Iterable[ThreatEvent | Mapping[str, object]]) -> None:
        for event in events:
            self.record(event)

    def recent_events(self, limit: int = 20) -> tuple[ThreatEvent, ...]:
        if limit <= 0:
            return ()
        return tuple(list(self._events)[-limit:])

    def clear(self) -> None:
        self._events.clear()

    def assess(self, *, lookback: int | None = None) -> ThreatAssessment:
        candidates = self._select_events(lookback)
        if not candidates:
            return ThreatAssessment(
                events=(),
                aggregate_severity=0.0,
                risk_level="stable",
                dominant_vectors={},
                recommended_actions=("maintain_observability",),
            )

        aggregate = sum(event.severity for event in candidates) / len(candidates)
        dominant_vectors = Counter(event.vector for event in candidates)
        risk_level, actions = self._derive_actions(aggregate, dominant_vectors)

        return ThreatAssessment(
            events=candidates,
            aggregate_severity=aggregate,
            risk_level=risk_level,
            dominant_vectors=dominant_vectors,
            recommended_actions=actions,
        )

    def _coerce_event(self, event: ThreatEvent | Mapping[str, object]) -> ThreatEvent:
        if isinstance(event, ThreatEvent):
            return event
        if not isinstance(event, Mapping):
            raise TypeError("event must be a ThreatEvent or mapping")
        return ThreatEvent(
            vector=event.get("vector", "unknown"),
            description=event.get("description", "undocumented anomaly"),
            severity=float(event.get("severity", 0.0)),
            source=event.get("source"),
            tags=tuple(event.get("tags", ()) or ()),
            metadata=event.get("metadata"),
        )

    def _select_events(self, lookback: int | None) -> tuple[ThreatEvent, ...]:
        if lookback is None or lookback >= len(self._events):
            return tuple(self._events)
        if lookback <= 0:
            return ()
        return tuple(list(self._events)[-lookback:])

    def _derive_actions(
        self,
        aggregate: float,
        dominant_vectors: Mapping[str, int],
    ) -> tuple[str, tuple[str, ...]]:
        if aggregate >= self._critical_threshold:
            actions = (
                "activate_emergency_response",
                "isolate_compromised_segments",
                "deploy_countermeasures",
            )
            return "critical", actions

        if aggregate >= self._alert_threshold:
            top_vector = max(dominant_vectors, key=dominant_vectors.__getitem__, default="unknown")
            actions = (
                f"intensify_monitoring_{top_vector}",
                "rollout_patch_cycle",
                "notify_governance_council",
            )
            return "alert", actions

        actions = (
            "maintain_observability",
            "run_periodic_penetration_tests",
        )
        return "stable", actions
