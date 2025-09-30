"""Psychology aggregation helpers for Dynamic Capital trading workflows."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field, fields
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Iterator, Mapping, MutableMapping

from algorithms.python.trading_psychology_elements import (
    Element,
    ElementProfile,
    PsychologyTelemetry,
    score_elements,
)

__all__ = [
    "PsychologyEntry",
    "ElementAggregate",
    "PsychologySnapshot",
    "DynamicPsychologyAlgo",
]


_ELEMENT_ORDER: Mapping[Element, int] = {
    element: index for index, element in enumerate(Element)
}


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    """Return a timezone-aware timestamp for *value*."""

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _coerce_telemetry(value: PsychologyTelemetry | Mapping[str, object]) -> PsychologyTelemetry:
    if isinstance(value, PsychologyTelemetry):
        return value

    if isinstance(value, Mapping):
        allowed = {field.name for field in fields(PsychologyTelemetry)}
        payload: MutableMapping[str, object] = {}
        for key, raw in value.items():
            if key in allowed:
                payload[key] = raw
        return PsychologyTelemetry(**payload)

    raise TypeError("telemetry must be PsychologyTelemetry or mapping")


def _deduplicate(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            unique.append(item)
    return unique


def _element_order(element: Element) -> int:
    return _ELEMENT_ORDER[element]


@dataclass(slots=True)
class PsychologyEntry:
    """Captured trader psychology snapshot with resolved elemental profile."""

    trader_id: str
    profile: ElementProfile
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    telemetry: PsychologyTelemetry | None = None
    weight: float = 1.0
    notes: str | None = None

    def __post_init__(self) -> None:
        self.trader_id = str(self.trader_id).upper()
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.weight = max(float(self.weight), 0.0)


@dataclass(slots=True)
class ElementAggregate:
    """Aggregated statistics for a specific elemental archetype."""

    element: Element
    average_score: float
    level: str
    reasons: tuple[str, ...]
    recommendations: tuple[str, ...]

    @property
    def name(self) -> str:
        return self.element.value


@dataclass(slots=True)
class PsychologySnapshot:
    """Computed mental performance snapshot for a trader."""

    trader_id: str
    sample_count: int
    elements: tuple[ElementAggregate, ...]
    readiness_score: float
    caution_score: float
    recovery_score: float
    stability_index: float
    dominant_element: str
    dominant_score: float
    dominant_level: str
    last_sample_at: datetime | None

    @property
    def readiness_percent(self) -> float:
        return round(self.readiness_score * 10, 2)

    @property
    def caution_percent(self) -> float:
        return round(self.caution_score * 10, 2)

    @property
    def recovery_percent(self) -> float:
        return round(self.recovery_score * 10, 2)


@dataclass(slots=True)
class _TraderBuffer:
    """Internal per-trader cache to avoid re-computing snapshots."""

    history: Deque[PsychologyEntry] = field(default_factory=deque)
    cached_snapshot: PsychologySnapshot | None = None
    dirty: bool = True


class DynamicPsychologyAlgo:
    """Maintain rolling psychology telemetry and compute actionable metrics."""

    _READINESS_ELEMENTS = frozenset({Element.EARTH, Element.LIGHT})
    _CAUTION_ELEMENTS = frozenset({Element.FIRE, Element.WATER, Element.WIND, Element.LIGHTNING})
    _RECOVERY_ELEMENTS = frozenset({Element.DARKNESS})
    _LEVEL_PRIORITY: Mapping[str, int] = {
        "critical": 6,
        "peak": 6,
        "elevated": 5,
        "building": 4,
        "stable": 3,
        "nascent": 2,
    }

    def __init__(
        self,
        *,
        window_size: int | None = 120,
        window_duration: timedelta | None = None,
    ) -> None:
        self.window_size = window_size
        self.window_duration = window_duration
        self._entries: Dict[str, _TraderBuffer] = {}

    # -------------------------------------------------------------- record utils
    def record(
        self,
        trader_id: str,
        *,
        telemetry: PsychologyTelemetry | Mapping[str, object] | None = None,
        profile: ElementProfile | None = None,
        weight: float = 1.0,
        timestamp: datetime | str | None = None,
        notes: str | None = None,
    ) -> PsychologyEntry:
        """Store a telemetry point and return the canonical entry."""

        if profile is None and telemetry is None:
            raise ValueError("record requires telemetry or profile")

        resolved_telemetry = (
            _coerce_telemetry(telemetry) if telemetry is not None else None
        )
        resolved_profile = profile or score_elements(resolved_telemetry)  # type: ignore[arg-type]

        entry = PsychologyEntry(
            trader_id=trader_id,
            profile=resolved_profile,
            telemetry=resolved_telemetry,
            weight=weight,
            timestamp=timestamp or datetime.now(timezone.utc),
            notes=notes,
        )

        state = self._state_for(entry.trader_id)
        state.history.append(entry)
        state.cached_snapshot = None
        state.dirty = True
        self._prune(state.history, reference=entry.timestamp)
        return entry

    # --------------------------------------------------------------- aggregators
    def snapshot(self, trader_id: str) -> PsychologySnapshot:
        """Return the aggregated psychology state for *trader_id*."""

        key = str(trader_id).upper()
        state = self._state_for(key)
        if self._prune(state.history):
            state.cached_snapshot = None
            state.dirty = True

        if not state.history:
            snapshot = PsychologySnapshot(
                trader_id=key,
                sample_count=0,
                elements=(),
                readiness_score=0.0,
                caution_score=0.0,
                recovery_score=0.0,
                stability_index=0.0,
                dominant_element="neutral",
                dominant_score=0.0,
                dominant_level="stable",
                last_sample_at=None,
            )
            state.cached_snapshot = snapshot
            state.dirty = False
            return snapshot

        if not state.dirty and state.cached_snapshot is not None:
            return state.cached_snapshot

        history = state.history
        totals: dict[Element, float] = {element: 0.0 for element in Element}
        level_votes: dict[Element, Counter[str]] = {
            element: Counter() for element in Element
        }
        reason_map: dict[Element, list[str]] = {element: [] for element in Element}
        recommendation_map: dict[Element, list[str]] = {
            element: [] for element in Element
        }

        total_weight = 0.0
        last_sample_at: datetime | None = None
        for entry in history:
            weight = entry.weight if entry.weight > 0 else 1.0
            total_weight += weight
            profile = entry.profile
            for signal in profile.signals:
                totals[signal.element] += signal.score * weight
                if signal.level:
                    level_votes[signal.element][signal.level] += weight
                if signal.reasons:
                    reason_map[signal.element].extend(signal.reasons)
                if signal.recommendations:
                    recommendation_map[signal.element].extend(signal.recommendations)

            if last_sample_at is None or entry.timestamp > last_sample_at:
                last_sample_at = entry.timestamp

        if total_weight <= 0 and history:
            total_weight = float(len(history))

        aggregates: list[ElementAggregate] = []
        for element in Element:
            average = totals[element] / total_weight if total_weight > 0 else 0.0
            level = self._select_level(level_votes[element], element)
            aggregates.append(
                ElementAggregate(
                    element=element,
                    average_score=round(average, 4),
                    level=level,
                    reasons=tuple(_deduplicate(reason_map[element])),
                    recommendations=tuple(_deduplicate(recommendation_map[element])),
                )
            )

        aggregates.sort(
            key=lambda agg: (agg.average_score, _element_order(agg.element)),
            reverse=True,
        )

        readiness = self._average_for(aggregates, self._READINESS_ELEMENTS)
        caution = self._average_for(aggregates, self._CAUTION_ELEMENTS)
        recovery = self._average_for(aggregates, self._RECOVERY_ELEMENTS)
        stability = readiness - caution

        dominant = aggregates[0]
        snapshot = PsychologySnapshot(
            trader_id=history[0].trader_id,
            sample_count=len(history),
            elements=tuple(aggregates),
            readiness_score=round(readiness, 4),
            caution_score=round(caution, 4),
            recovery_score=round(recovery, 4),
            stability_index=round(stability, 4),
            dominant_element=dominant.name,
            dominant_score=dominant.average_score,
            dominant_level=dominant.level,
            last_sample_at=last_sample_at,
        )
        state.cached_snapshot = snapshot
        state.dirty = False
        return snapshot

    def snapshot_all(self) -> Dict[str, PsychologySnapshot]:
        return {trader: self.snapshot(trader) for trader in self._entries}

    def psychology_state(self, trader_id: str) -> MutableMapping[str, object]:
        snapshot = self.snapshot(trader_id)
        state: MutableMapping[str, object] = {
            "trader_id": snapshot.trader_id,
            "sample_count": snapshot.sample_count,
            "dominant_element": snapshot.dominant_element,
            "dominant_score": snapshot.dominant_score,
            "dominant_level": snapshot.dominant_level,
            "readiness_score": snapshot.readiness_score,
            "caution_score": snapshot.caution_score,
            "recovery_score": snapshot.recovery_score,
            "stability_index": snapshot.stability_index,
            "readiness_percent": snapshot.readiness_percent,
            "caution_percent": snapshot.caution_percent,
            "recovery_percent": snapshot.recovery_percent,
            "last_sample_at": snapshot.last_sample_at.isoformat()
            if snapshot.last_sample_at
            else None,
            "elements": [
                {
                    "element": aggregate.name,
                    "score": aggregate.average_score,
                    "level": aggregate.level,
                    "reasons": list(aggregate.reasons),
                    "recommendations": list(aggregate.recommendations),
                }
                for aggregate in snapshot.elements
            ],
        }
        return state

    # ------------------------------------------------------------- maintenance
    def clear(self, trader_id: str | None = None) -> None:
        if trader_id is None:
            self._entries.clear()
        else:
            self._entries.pop(str(trader_id).upper(), None)

    def traders(self) -> Iterable[str]:
        return tuple(self._entries.keys())

    def entries(self, trader_id: str) -> Iterator[PsychologyEntry]:
        state = self._entries.get(str(trader_id).upper())
        if state is None:
            return iter(())
        return iter(state.history)

    # -------------------------------------------------------------- internals
    def _state_for(self, trader_id: str) -> _TraderBuffer:
        key = str(trader_id).upper()
        state = self._entries.get(key)
        if state is None:
            state = _TraderBuffer()
            self._entries[key] = state
        return state

    def _prune(
        self,
        history: Deque[PsychologyEntry],
        *,
        reference: datetime | None = None,
    ) -> bool:
        modified = False
        if self.window_size is not None:
            while len(history) > self.window_size:
                history.popleft()
                modified = True

        if self.window_duration is not None and history:
            base_time = reference or history[-1].timestamp
            cutoff = base_time - self.window_duration
            while history and history[0].timestamp < cutoff:
                history.popleft()
                modified = True

        return modified

    def _select_level(self, votes: Counter[str], element: Element) -> str:
        if not votes:
            return "nascent" if element in self._READINESS_ELEMENTS else "stable"
        return max(
            votes.items(),
            key=lambda item: (item[1], self._LEVEL_PRIORITY.get(item[0], 0)),
        )[0]

    def _average_for(
        self, aggregates: Iterable[ElementAggregate], elements: Iterable[Element]
    ) -> float:
        scores = [agg.average_score for agg in aggregates if agg.element in elements]
        if not scores:
            return 0.0
        return sum(scores) / len(scores)

