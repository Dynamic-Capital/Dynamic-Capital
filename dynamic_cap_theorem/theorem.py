"""Dynamic CAP theorem interpreter for distributed posture design."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CapVector",
    "CapEvent",
    "CapContext",
    "CapAssessment",
    "DynamicCapTheorem",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _clamp_sym(value: float, *, magnitude: float = 1.0) -> float:
    bound = abs(magnitude)
    return max(-bound, min(bound, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        if not isinstance(tag, str):
            raise TypeError("tags must be strings")
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, float] | None) -> Mapping[str, float] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    coerced: dict[str, float] = {}
    for key, value in mapping.items():
        if not isinstance(key, str):  # pragma: no cover - defensive guard
            raise TypeError("metadata keys must be strings")
        coerced[key] = float(value)
    return coerced


@dataclass(slots=True)
class CapVector:
    """Represents the health of each CAP axis on a normalised scale."""

    consistency: float
    availability: float
    partition_tolerance: float
    narrative: str | None = None

    def __post_init__(self) -> None:
        self.consistency = _clamp(float(self.consistency))
        self.availability = _clamp(float(self.availability))
        self.partition_tolerance = _clamp(float(self.partition_tolerance))
        if self.narrative is not None:
            self.narrative = _normalise_text(self.narrative)

    def adjusted(
        self,
        *,
        consistency: float = 0.0,
        availability: float = 0.0,
        partition_tolerance: float = 0.0,
        narrative: str | None = None,
    ) -> "CapVector":
        """Return a new vector shifted by the supplied adjustments."""

        return CapVector(
            consistency=_clamp(self.consistency + float(consistency)),
            availability=_clamp(self.availability + float(availability)),
            partition_tolerance=_clamp(
                self.partition_tolerance + float(partition_tolerance)
            ),
            narrative=narrative or self.narrative,
        )

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "consistency": self.consistency,
            "availability": self.availability,
            "partition_tolerance": self.partition_tolerance,
        }


@dataclass(slots=True)
class CapEvent:
    """Describes an incident that perturbs the CAP posture."""

    label: str
    consistency_delta: float
    availability_delta: float
    partition_delta: float
    criticality: float = 0.5
    persistence: float = 0.5
    narrative: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.label = _normalise_text(self.label)
        self.consistency_delta = _clamp_sym(float(self.consistency_delta))
        self.availability_delta = _clamp_sym(float(self.availability_delta))
        self.partition_delta = _clamp_sym(float(self.partition_delta))
        self.criticality = _clamp(float(self.criticality))
        self.persistence = _clamp(float(self.persistence))
        if self.narrative is not None:
            self.narrative = _normalise_text(self.narrative)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def weight(self) -> float:
        return self.criticality * (0.4 + 0.6 * self.persistence)

    def weighted_deltas(self) -> tuple[float, float, float]:
        weight = self.weight
        return (
            self.consistency_delta * weight,
            self.availability_delta * weight,
            self.partition_delta * weight,
        )


@dataclass(slots=True)
class CapContext:
    """Environmental context influencing CAP trade-offs."""

    read_bias: float = 0.5
    write_criticality: float = 0.5
    latency_sensitivity: float = 0.5
    geographic_dispersal: float = 0.5
    regulatory_risk: float = 0.5
    resilience_budget: float = 0.5
    narratives: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.read_bias = _clamp(float(self.read_bias))
        self.write_criticality = _clamp(float(self.write_criticality))
        self.latency_sensitivity = _clamp(float(self.latency_sensitivity))
        self.geographic_dispersal = _clamp(float(self.geographic_dispersal))
        self.regulatory_risk = _clamp(float(self.regulatory_risk))
        self.resilience_budget = _clamp(float(self.resilience_budget))
        self.narratives = tuple(_normalise_text(narrative) for narrative in self.narratives)

    @property
    def is_global(self) -> bool:
        return self.geographic_dispersal >= 0.65

    @property
    def is_regulated(self) -> bool:
        return self.regulatory_risk >= 0.6

    @property
    def prioritises_reads(self) -> bool:
        return self.read_bias >= 0.6

    @property
    def prioritises_writes(self) -> bool:
        return self.write_criticality >= 0.6


@dataclass(slots=True)
class CapAssessment:
    """Synthesised view of the active CAP posture."""

    vector: CapVector
    dominant_focus: str
    trade_off_tension: float
    alerts: tuple[str, ...]
    recommendations: tuple[str, ...]
    event_pressure: Mapping[str, float]

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "vector": self.vector.as_dict(),
            "dominant_focus": self.dominant_focus,
            "trade_off_tension": self.trade_off_tension,
            "alerts": list(self.alerts),
            "recommendations": list(self.recommendations),
            "event_pressure": dict(self.event_pressure),
        }
        return payload


class DynamicCapTheorem:
    """Evaluates trade-offs between consistency, availability, and partition tolerance."""

    def __init__(self, *, window: int = 144) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._events: Deque[CapEvent] = deque()
        self._pressure_totals = self._new_pressure_totals()

    @staticmethod
    def _new_pressure_totals() -> MutableMapping[str, float]:
        return {
            "consistency": 0.0,
            "availability": 0.0,
            "partition_tolerance": 0.0,
        }

    def _evict_if_needed(self) -> None:
        if len(self._events) < self._window:
            return
        evicted = self._events.popleft()
        c_delta, a_delta, p_delta = evicted.weighted_deltas()
        self._pressure_totals["consistency"] -= c_delta
        self._pressure_totals["availability"] -= a_delta
        self._pressure_totals["partition_tolerance"] -= p_delta

    def _record_event(self, event: CapEvent) -> None:
        self._evict_if_needed()
        self._events.append(event)
        c_delta, a_delta, p_delta = event.weighted_deltas()
        self._pressure_totals["consistency"] += c_delta
        self._pressure_totals["availability"] += a_delta
        self._pressure_totals["partition_tolerance"] += p_delta

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial container semantics
        return len(self._events)

    def clear(self) -> None:
        self._events.clear()
        self._pressure_totals = self._new_pressure_totals()

    def register(self, event: CapEvent) -> None:
        if not isinstance(event, CapEvent):  # pragma: no cover - defensive guard
            raise TypeError("event must be a CapEvent")
        self._record_event(event)

    def extend(self, events: Iterable[CapEvent]) -> None:
        buffered: list[CapEvent] = []
        for event in events:
            if not isinstance(event, CapEvent):
                raise TypeError("events must be CapEvent instances")
            buffered.append(event)
        for event in buffered:
            self._record_event(event)

    @property
    def events(self) -> tuple[CapEvent, ...]:
        return tuple(self._events)

    def _aggregate_event_pressure(self) -> Mapping[str, float]:
        return dict(self._pressure_totals)

    def _derive_focus(
        self,
        vector: CapVector,
        context: CapContext,
        pressure: Mapping[str, float],
    ) -> tuple[str, float]:
        c_pressure = (
            context.write_criticality * (1.0 - vector.consistency)
            + 0.35 * abs(pressure.get("consistency", 0.0))
        )
        a_pressure = (
            ((context.read_bias + context.latency_sensitivity) / 2.0)
            * (1.0 - vector.availability)
            + 0.35 * abs(pressure.get("availability", 0.0))
        )
        p_pressure = (
            ((context.geographic_dispersal + context.regulatory_risk) / 2.0)
            * (1.0 - vector.partition_tolerance)
            + 0.35 * abs(pressure.get("partition_tolerance", 0.0))
        )
        pressures = {
            "consistency": c_pressure,
            "availability": a_pressure,
            "partition_tolerance": p_pressure,
        }
        dominant_axis = max(pressures, key=pressures.get)
        sorted_pressures = sorted(pressures.values())
        tension = _clamp(sorted_pressures[-1] - sorted_pressures[0], lower=0.0, upper=1.0)
        second_best = sorted_pressures[-2]
        if pressures[dominant_axis] - second_best <= 0.08:
            dominant_axis = "balanced"
        return dominant_axis, tension

    def _build_alerts(self, vector: CapVector, context: CapContext) -> tuple[str, ...]:
        alerts: list[str] = []
        if vector.consistency <= 0.35:
            alerts.append("consistency integrity at risk: reinforce write verification")
        if vector.availability <= 0.4:
            alerts.append("availability erosion detected: audit failover orchestration")
        if vector.partition_tolerance <= 0.45:
            alerts.append("partition tolerance fragile: validate cross-region quorum")
        if context.is_global and vector.partition_tolerance <= 0.55:
            alerts.append("global distribution demands stronger partition safeguards")
        if context.is_regulated and vector.consistency <= 0.55:
            alerts.append("regulatory posture requires elevated consistency controls")
        if context.resilience_budget <= 0.35 and vector.availability <= 0.6:
            alerts.append("limited resilience budget amplifies availability risk")
        return tuple(dict.fromkeys(alerts))

    def _build_recommendations(
        self,
        focus: str,
        vector: CapVector,
        context: CapContext,
        pressure: Mapping[str, float],
    ) -> tuple[str, ...]:
        recs: list[str] = []
        if focus in {"consistency", "balanced"}:
            recs.append("prioritise deterministic write paths and quorum acknowledgements")
            if context.prioritises_writes:
                recs.append("introduce adaptive write fences aligned to business-critical flows")
        if focus in {"availability", "balanced"}:
            recs.append("expand horizontal replicas and latency-aware routing policies")
            if context.prioritises_reads:
                recs.append("deploy read-through caches with bounded staleness contracts")
        if focus in {"partition_tolerance", "balanced"}:
            recs.append("stress-test inter-region links and rehearse failure domains")
            if context.is_global:
                recs.append("codify disaster envelopes per geography with resilient consensus")
        if abs(pressure.get("consistency", 0.0)) >= 0.5 and vector.consistency <= 0.6:
            recs.append("schedule incident review for recurring consistency regressions")
        if abs(pressure.get("availability", 0.0)) >= 0.5 and vector.availability <= 0.65:
            recs.append("investigate cascading availability degradations across layers")
        if abs(pressure.get("partition_tolerance", 0.0)) >= 0.5 and vector.partition_tolerance <= 0.65:
            recs.append("map partition hotspots and assign ownership for mitigation")
        return tuple(dict.fromkeys(recs))

    def snapshot(self, *, baseline: CapVector, context: CapContext) -> CapAssessment:
        if not isinstance(baseline, CapVector):  # pragma: no cover - defensive guard
            raise TypeError("baseline must be a CapVector")
        if not isinstance(context, CapContext):  # pragma: no cover - defensive guard
            raise TypeError("context must be a CapContext")
        pressure = self._aggregate_event_pressure()
        vector = baseline.adjusted(
            consistency=pressure.get("consistency", 0.0),
            availability=pressure.get("availability", 0.0),
            partition_tolerance=pressure.get("partition_tolerance", 0.0),
        )
        focus, tension = self._derive_focus(vector, context, pressure)
        alerts = self._build_alerts(vector, context)
        recommendations = self._build_recommendations(focus, vector, context, pressure)
        return CapAssessment(
            vector=vector,
            dominant_focus=focus,
            trade_off_tension=tension,
            alerts=alerts,
            recommendations=recommendations,
            event_pressure=pressure,
        )
