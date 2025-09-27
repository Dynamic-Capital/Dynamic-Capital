"""Lifecycle modelling primitives for Dynamic Capital execution cycles."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CycleEvent",
    "CyclePhase",
    "CycleSnapshot",
    "DynamicCycleOrchestrator",
]


# ---------------------------------------------------------------------------
# helpers

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _coerce_phase(phase: CyclePhase | Mapping[str, object]) -> CyclePhase:
    if isinstance(phase, CyclePhase):
        return phase
    if not isinstance(phase, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("phase must be a CyclePhase or mapping")
    return CyclePhase(**phase)


def _coerce_event(event: CycleEvent | Mapping[str, object]) -> CycleEvent:
    if isinstance(event, CycleEvent):
        return event
    if not isinstance(event, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("event must be a CycleEvent or mapping")
    return CycleEvent(**event)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class CyclePhase:
    """Definition for a single phase within a Dynamic Cycle."""

    key: str
    title: str
    description: str = ""
    entry_criteria: tuple[str, ...] = field(default_factory=tuple)
    exit_criteria: tuple[str, ...] = field(default_factory=tuple)
    expected_duration_hours: float | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        self.entry_criteria = _normalise_tuple(self.entry_criteria)
        self.exit_criteria = _normalise_tuple(self.exit_criteria)
        self.tags = _normalise_tags(self.tags)
        if self.expected_duration_hours is not None:
            self.expected_duration_hours = max(float(self.expected_duration_hours), 0.0)


@dataclass(slots=True)
class CycleEvent:
    """Event captured while progressing through a cycle phase."""

    phase: str
    category: str
    description: str
    actor: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    progress: float = 0.0
    confidence: float = 0.5
    weight: float = 1.0
    impact: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.phase = _normalise_key(self.phase)
        self.category = _normalise_text(self.category)
        self.description = _normalise_text(self.description)
        self.actor = _normalise_optional_text(self.actor)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.progress = _clamp(float(self.progress))
        self.confidence = _clamp(float(self.confidence))
        self.weight = max(float(self.weight), 0.0)
        self.impact = float(self.impact)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def weighted_progress(self) -> float:
        return self.progress * self.weight * self.confidence


@dataclass(slots=True)
class CycleSnapshot:
    """Aggregated snapshot describing the current cycle posture."""

    key: str
    title: str
    progress: float
    velocity_per_hour: float
    momentum: float
    status: str
    started_at: datetime | None
    updated_at: datetime | None
    elapsed_hours: float
    remaining_hours: float | None
    alerts: tuple[str, ...]
    notes: tuple[str, ...]
    tags: tuple[str, ...]
    definition: CyclePhase
    events: tuple[CycleEvent, ...]
    metadata: Mapping[str, object]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "title": self.title,
            "progress": self.progress,
            "velocity_per_hour": self.velocity_per_hour,
            "momentum": self.momentum,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "elapsed_hours": self.elapsed_hours,
            "remaining_hours": self.remaining_hours,
            "alerts": list(self.alerts),
            "notes": list(self.notes),
            "tags": list(self.tags),
            "events": [asdict(event) for event in self.events],
            "metadata": dict(self.metadata),
        }


# ---------------------------------------------------------------------------
# orchestrator


class DynamicCycleOrchestrator:
    """Track Dynamic Capital cycles with weighted progress telemetry."""

    def __init__(
        self,
        *,
        history: int = 120,
        phases: Iterable[CyclePhase | Mapping[str, object]] | None = None,
        start_phase: str | None = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._phases: list[CyclePhase] = []
        self._phase_lookup: dict[str, CyclePhase] = {}
        self._events: Deque[CycleEvent] = deque(maxlen=history)
        self._phase_started_at: dict[str, datetime] = {}
        self._phase_completed_at: dict[str, datetime] = {}
        self._current_phase: str | None = None
        if phases:
            for phase in phases:
                self.register_phase(phase)
        if start_phase:
            self.set_phase(start_phase)
        elif self._phases:
            self.set_phase(self._phases[0].key)

    # ----------------------------------------------------------------- phases
    @property
    def phases(self) -> tuple[CyclePhase, ...]:
        return tuple(self._phases)

    @property
    def current_phase(self) -> str | None:
        return self._current_phase

    def register_phase(self, phase: CyclePhase | Mapping[str, object]) -> CyclePhase:
        resolved = _coerce_phase(phase)
        if resolved.key in self._phase_lookup:
            raise ValueError(f"phase '{resolved.key}' is already registered")
        self._phases.append(resolved)
        self._phase_lookup[resolved.key] = resolved
        return resolved

    def set_phase(self, phase_key: str) -> CyclePhase:
        key = _normalise_key(phase_key)
        if key not in self._phase_lookup:
            raise KeyError(f"phase '{phase_key}' is not registered")
        self._current_phase = key
        self._phase_started_at.setdefault(key, _utcnow())
        return self._phase_lookup[key]

    def advance(self, phase_key: str | None = None) -> CyclePhase:
        if phase_key is not None:
            return self.set_phase(phase_key)
        if not self._phases:
            raise RuntimeError("no phases registered")
        if self._current_phase is None:
            return self.set_phase(self._phases[0].key)
        current_index = next((i for i, phase in enumerate(self._phases) if phase.key == self._current_phase), None)
        if current_index is None:
            return self.set_phase(self._phases[0].key)
        next_index = min(current_index + 1, len(self._phases) - 1)
        return self.set_phase(self._phases[next_index].key)

    # ------------------------------------------------------------------ events
    def record(self, event: CycleEvent | Mapping[str, object]) -> CycleEvent:
        resolved = _coerce_event(event)
        if resolved.phase not in self._phase_lookup:
            raise KeyError(f"phase '{resolved.phase}' is not registered")
        self._events.append(resolved)
        self._phase_started_at.setdefault(resolved.phase, resolved.timestamp)
        if resolved.progress >= 0.999:
            self._phase_completed_at.setdefault(resolved.phase, resolved.timestamp)
        if self._current_phase is None:
            self._current_phase = resolved.phase
        return resolved

    def extend(self, events: Iterable[CycleEvent | Mapping[str, object]]) -> None:
        for event in events:
            self.record(event)

    # ---------------------------------------------------------------- metrics
    def _phase_events(self, phase_key: str) -> tuple[CycleEvent, ...]:
        key = _normalise_key(phase_key)
        return tuple(event for event in self._events if event.phase == key)

    def _progress_for(self, phase_key: str) -> float:
        events = self._phase_events(phase_key)
        if not events:
            return 0.0
        weighted_total = sum(event.weighted_progress for event in events)
        weight_sum = sum(event.weight * event.confidence for event in events)
        if weight_sum <= 0:
            return 0.0
        return _clamp(weighted_total / weight_sum)

    def _velocity_for(self, phase_key: str) -> float:
        events = self._phase_events(phase_key)
        if len(events) < 2:
            return 0.0
        first, last = events[-2], events[-1]
        elapsed = (last.timestamp - first.timestamp).total_seconds()
        if elapsed <= 0:
            return 0.0
        return (last.progress - first.progress) / elapsed * 3600.0

    def _momentum_for(self, phase_key: str) -> float:
        events = self._phase_events(phase_key)
        if len(events) < 3:
            return 0.0
        deltas: list[float] = []
        recent = events[-3:]
        for older, newer in zip(recent[:-1], recent[1:]):
            elapsed = (newer.timestamp - older.timestamp).total_seconds()
            if elapsed > 0:
                deltas.append((newer.progress - older.progress) / elapsed)
        if not deltas:
            return 0.0
        return sum(deltas) / len(deltas) * 3600.0

    def _status_for(self, *, progress: float, velocity: float, has_events: bool) -> str:
        if progress >= 0.999:
            return "completed"
        if not has_events:
            return "initiated"
        if progress < 0.2:
            return "initiated"
        if velocity <= 0 and progress < 0.5:
            return "at_risk"
        return "in_progress"

    def _alerts_for(self, phase: CyclePhase, *, progress: float) -> tuple[str, ...]:
        alerts: list[str] = []
        started_at = self._phase_started_at.get(phase.key)
        if phase.expected_duration_hours is not None and started_at is not None:
            elapsed = (_utcnow() - started_at).total_seconds() / 3600.0
            if progress < 0.9 and elapsed > phase.expected_duration_hours * 1.2:
                alerts.append(
                    f"Phase '{phase.title}' is past expected duration ({elapsed:.1f}h > {phase.expected_duration_hours:.1f}h)."
                )
        return tuple(alerts)

    def _notes_for(self, events: Sequence[CycleEvent]) -> tuple[str, ...]:
        notes: list[str] = []
        for event in events:
            if event.impact > 0:
                notes.append(f"{event.category}: {event.description}")
        return tuple(notes)

    def _metadata_for(self, phase_key: str, events: Sequence[CycleEvent]) -> Mapping[str, object]:
        started_at = self._phase_started_at.get(phase_key)
        updated_at = events[-1].timestamp if events else None
        completed_at = self._phase_completed_at.get(phase_key)
        return {
            "event_count": len(events),
            "started_at": started_at,
            "updated_at": updated_at,
            "completed_at": completed_at,
        }

    # ---------------------------------------------------------------- snapshot
    def snapshot(self, phase_key: str | None = None) -> CycleSnapshot:
        if not self._phases:
            raise RuntimeError("no phases registered")
        key = _normalise_key(phase_key or self._current_phase or self._phases[0].key)
        if key not in self._phase_lookup:
            raise KeyError(f"phase '{key}' is not registered")
        phase = self._phase_lookup[key]
        events = self._phase_events(key)
        progress = self._progress_for(key)
        velocity = self._velocity_for(key)
        momentum = self._momentum_for(key)
        status = self._status_for(progress=progress, velocity=velocity, has_events=bool(events))
        alerts = self._alerts_for(phase, progress=progress)
        notes = self._notes_for(events)
        started_at = self._phase_started_at.get(key)
        updated_at = events[-1].timestamp if events else None
        elapsed_hours = 0.0
        if started_at:
            reference = updated_at or _utcnow()
            elapsed_hours = max((reference - started_at).total_seconds() / 3600.0, 0.0)
        remaining_hours: float | None = None
        if phase.expected_duration_hours is not None:
            remaining = phase.expected_duration_hours * max(0.0, 1.0 - progress)
            remaining_hours = max(remaining, 0.0)
        tags = tuple(sorted({*phase.tags, *(tag for event in events for tag in event.tags)}))
        metadata = self._metadata_for(key, events)
        return CycleSnapshot(
            key=phase.key,
            title=phase.title,
            progress=progress,
            velocity_per_hour=velocity,
            momentum=momentum,
            status=status,
            started_at=started_at,
            updated_at=updated_at,
            elapsed_hours=elapsed_hours,
            remaining_hours=remaining_hours,
            alerts=alerts,
            notes=notes,
            tags=tags,
            definition=phase,
            events=events,
            metadata=metadata,
        )

    def overview(self) -> Mapping[str, CycleSnapshot]:
        if not self._phases:
            return {}
        return {phase.key: self.snapshot(phase.key) for phase in self._phases}

    # ----------------------------------------------------------------- rewind
    def rewind(self, *, hours: float) -> None:
        if hours <= 0:
            return
        threshold = _utcnow() - timedelta(hours=float(hours))
        retained: Deque[CycleEvent] = deque(maxlen=self._history)
        for event in self._events:
            if event.timestamp >= threshold:
                retained.append(event)
        self._events = retained
        # Drop metadata for phases that no longer have events
        active_keys = {event.phase for event in self._events}
        for key in list(self._phase_started_at.keys()):
            if key not in active_keys:
                self._phase_started_at.pop(key, None)
                self._phase_completed_at.pop(key, None)
        if self._current_phase and self._current_phase not in self._phase_lookup:
            self._current_phase = None
