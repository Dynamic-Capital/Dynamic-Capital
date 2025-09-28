"""Event orchestration engine for Dynamic Capital's operations."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "EventPulse",
    "EventContext",
    "EventFrame",
    "DynamicEventEngine",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _top_items(counter: Counter[str], *, limit: int = 3) -> tuple[str, ...]:
    if not counter:
        return ()
    most_common = counter.most_common(limit)
    return tuple(item for item, _ in most_common)


def _dedupe_preserve_order(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            ordered.append(value)
    return tuple(ordered)


@dataclass(slots=True)
class EventPulse:
    """Signal representing an emergent event and its operational attributes."""

    source: str
    category: str
    description: str
    urgency: float = 0.5
    impact: float = 0.5
    confidence: float = 0.5
    preparedness: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.source = _normalise_lower(self.source)
        self.category = _normalise_lower(self.category)
        self.description = _normalise_text(self.description)
        self.urgency = _clamp(float(self.urgency))
        self.impact = _clamp(float(self.impact))
        self.confidence = _clamp(float(self.confidence))
        self.preparedness = _clamp(float(self.preparedness))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def priority_signal(self) -> float:
        return (self.urgency + self.impact) / 2.0

    @property
    def priority_weight(self) -> float:
        return max(self.priority_signal * self.confidence, 0.0)

    @property
    def impact_projection(self) -> float:
        return self.impact * self.confidence

    @property
    def coordination_demand(self) -> float:
        return self.urgency * (1.0 - self.preparedness)


@dataclass(slots=True)
class EventContext:
    """Context capturing operational posture for event response."""

    operating_mode: str
    team_capacity: float
    risk_appetite: float
    communication_bandwidth: float
    escalation_threshold: float
    active_initiatives: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.operating_mode = _normalise_text(self.operating_mode)
        self.team_capacity = _clamp(float(self.team_capacity))
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.communication_bandwidth = _clamp(float(self.communication_bandwidth))
        self.escalation_threshold = _clamp(float(self.escalation_threshold))
        self.active_initiatives = _normalise_tuple(self.active_initiatives)

    @property
    def is_capacity_constrained(self) -> bool:
        return self.team_capacity <= 0.4

    @property
    def prefers_caution(self) -> bool:
        return self.risk_appetite <= 0.4

    @property
    def bandwidth_stretched(self) -> bool:
        return self.communication_bandwidth <= 0.45

    def requires_escalation(self, priority_index: float) -> bool:
        return priority_index >= self.escalation_threshold


@dataclass(slots=True)
class EventFrame:
    """Synthesised view of the live event landscape."""

    priority_index: float
    expected_impact: float
    coordination_load: float
    dominant_sources: tuple[str, ...]
    dominant_categories: tuple[str, ...]
    alerts: tuple[str, ...]
    recommended_actions: tuple[str, ...]


class DynamicEventEngine:
    """Aggregates event pulses into an actionable prioritisation frame."""

    def __init__(self, *, window: int = 180) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._pulses: Deque[EventPulse] = deque(maxlen=window)

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._pulses)

    def register(self, pulse: EventPulse) -> None:
        """Register a new pulse in the rolling window."""

        self._pulses.append(pulse)

    def extend(self, pulses: Iterable[EventPulse]) -> None:
        """Register multiple pulses preserving chronological order."""

        for pulse in pulses:
            self.register(pulse)

    def clear(self) -> None:
        """Reset the rolling window."""

        self._pulses.clear()

    def prioritise(self, context: EventContext) -> EventFrame:
        """Collapse the rolling window into an operational frame."""

        weighted: MutableSequence[tuple[EventPulse, float]] = []
        for pulse in self._pulses:
            weight = pulse.priority_weight
            weighted.append((pulse, weight))

        total_weight = sum(weight for _, weight in weighted)

        def _weighted_average(
            extractor: Callable[[EventPulse], float], *, default: float
        ) -> float:
            if total_weight == 0:
                return default
            numerator = sum(extractor(pulse) * weight for pulse, weight in weighted)
            return _clamp(numerator / total_weight)

        priority_index = _weighted_average(
            lambda pulse: pulse.priority_signal, default=0.0
        )
        expected_impact = _weighted_average(
            lambda pulse: pulse.impact_projection, default=0.0
        )
        coordination_load = _weighted_average(
            lambda pulse: pulse.coordination_demand, default=0.0
        )

        source_counter: Counter[str] = Counter()
        category_counter: Counter[str] = Counter()
        for pulse, weight in weighted:
            source_counter[pulse.source] += weight
            category_counter[pulse.category] += weight

        alerts: list[str] = []
        if context.requires_escalation(priority_index):
            alerts.append("Priority exceeds escalation threshold.")
        if coordination_load > context.team_capacity:
            alerts.append("Coordination load exceeds team capacity.")
        if context.is_capacity_constrained and expected_impact > 0.55:
            alerts.append("Impact pressure while capacity constrained.")
        if context.bandwidth_stretched and priority_index >= 0.5:
            alerts.append("Communication bandwidth is stretched for timely updates.")

        actions: list[str] = []
        if context.requires_escalation(priority_index):
            actions.append("Schedule immediate leadership review.")
        if expected_impact > 0.6:
            actions.append("Stage contingency playbooks.")
        if coordination_load > context.team_capacity:
            actions.append("Rebalance workload across squads.")
        elif context.team_capacity and coordination_load < context.team_capacity * 0.6:
            actions.append("Reserve capacity for monitoring and follow-up.")
        if context.prefers_caution and expected_impact >= 0.5:
            actions.append("Increase frequency of situation updates.")
        if not actions:
            actions.append("Maintain situational awareness cadence.")

        return EventFrame(
            priority_index=priority_index,
            expected_impact=expected_impact,
            coordination_load=coordination_load,
            dominant_sources=_top_items(source_counter),
            dominant_categories=_top_items(category_counter),
            alerts=_dedupe_preserve_order(alerts),
            recommended_actions=_dedupe_preserve_order(actions),
        )
