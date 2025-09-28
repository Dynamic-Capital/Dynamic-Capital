"""Dynamic recycling intelligence toolkit."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MaterialStream",
    "RecyclingEvent",
    "RecyclingFacilityProfile",
    "RecyclingInsight",
    "RecyclingStrategy",
    "DynamicRecyclingEngine",
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


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _positive(value: float, *, allow_zero: bool = False) -> float:
    numeric = float(value)
    if allow_zero and numeric == 0:
        return 0.0
    if numeric <= 0:
        raise ValueError("value must be positive")
    return numeric


def _non_negative(value: float) -> float:
    numeric = float(value)
    return numeric if numeric >= 0 else 0.0


def _normalise_text(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_tags(tags: Sequence[str] | str | None) -> tuple[str, ...]:
    if tags is None:
        return ()
    if isinstance(tags, str):
        candidates = [part.strip() for part in tags.split(",")]
    else:
        candidates = tags
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in candidates:
        cleaned = str(tag).strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


def _weighted_mean(pairs: Sequence[tuple[float, float]] | None, *, default: float) -> float:
    if not pairs:
        return default
    numerator = 0.0
    denominator = 0.0
    for value, weight in pairs:
        weight = float(weight)
        if weight <= 0:
            continue
        numerator += value * weight
        denominator += weight
    if denominator <= 0:
        return default
    return numerator / denominator


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class MaterialStream:
    """Represents a discrete inbound material stream for processing."""

    name: str
    category: str
    mass_kg: float
    contamination_rate: float = 0.0
    moisture_rate: float = 0.0
    embodied_emissions_kg: float = 0.0

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.category = _normalise_text(self.category).lower()
        self.mass_kg = _positive(self.mass_kg)
        self.contamination_rate = _clamp(self.contamination_rate)
        self.moisture_rate = _clamp(self.moisture_rate)
        self.embodied_emissions_kg = _non_negative(self.embodied_emissions_kg)

    @property
    def dry_mass(self) -> float:
        """Mass after accounting for moisture."""

        return self.mass_kg * (1.0 - self.moisture_rate)

    @property
    def recoverable_mass(self) -> float:
        """Estimated recoverable mass after contamination losses."""

        return max(self.dry_mass * (1.0 - self.contamination_rate), 0.0)

    @property
    def contamination_mass(self) -> float:
        return max(self.dry_mass - self.recoverable_mass, 0.0)

    def as_dict(self) -> MutableMapping[str, float | str]:
        return {
            "name": self.name,
            "category": self.category,
            "mass_kg": self.mass_kg,
            "contamination_rate": self.contamination_rate,
            "moisture_rate": self.moisture_rate,
            "embodied_emissions_kg": self.embodied_emissions_kg,
        }


@dataclass(slots=True)
class RecyclingEvent:
    """Lifecycle information for a processed material stream."""

    stream: MaterialStream
    facility: str
    recovery_rate: float
    energy_used_kwh: float
    labour_hours: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.stream, MaterialStream):
            raise TypeError("stream must be a MaterialStream instance")
        self.facility = _normalise_text(self.facility)
        self.recovery_rate = _clamp(self.recovery_rate)
        self.energy_used_kwh = _non_negative(self.energy_used_kwh)
        self.labour_hours = _non_negative(self.labour_hours)
        self.timestamp = _ensure_tzaware(self.timestamp) or _utcnow()
        self.notes = None if self.notes is None else _normalise_text(self.notes)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def recovered_mass(self) -> float:
        return self.stream.recoverable_mass * self.recovery_rate

    @property
    def residual_mass(self) -> float:
        return max(self.stream.mass_kg - self.recovered_mass, 0.0)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "stream": self.stream.as_dict(),
            "facility": self.facility,
            "recovery_rate": self.recovery_rate,
            "energy_used_kwh": self.energy_used_kwh,
            "labour_hours": self.labour_hours,
            "timestamp": self.timestamp.isoformat(),
            "tags": list(self.tags),
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class RecyclingFacilityProfile:
    """Contextual baseline performance for a recycling facility."""

    name: str
    throughput_capacity_kg_per_hr: float
    baseline_recovery_rate: float = 0.65
    contamination_tolerance: float = 0.15
    energy_intensity_kwh_per_kg: float = 0.35
    emission_factor_kg_per_kwh: float = 0.42
    workforce_productivity_kg_per_hr: float = 250.0

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.throughput_capacity_kg_per_hr = _positive(self.throughput_capacity_kg_per_hr)
        self.baseline_recovery_rate = _clamp(self.baseline_recovery_rate)
        self.contamination_tolerance = _clamp(self.contamination_tolerance)
        self.energy_intensity_kwh_per_kg = _positive(self.energy_intensity_kwh_per_kg, allow_zero=True)
        self.emission_factor_kg_per_kwh = _positive(self.emission_factor_kg_per_kwh, allow_zero=True)
        self.workforce_productivity_kg_per_hr = _positive(self.workforce_productivity_kg_per_hr)

    def expected_emissions(self, *, mass_kg: float) -> float:
        energy = mass_kg * self.energy_intensity_kwh_per_kg
        return energy * self.emission_factor_kg_per_kwh

    def throughput_hours(self, *, mass_kg: float) -> float:
        return mass_kg / self.throughput_capacity_kg_per_hr


@dataclass(slots=True)
class RecyclingInsight:
    """Aggregated indicators for a collection of recycling events."""

    total_input_kg: float
    total_recovered_kg: float
    recycling_rate: float
    contamination_index: float
    avg_recovery_rate: float
    energy_intensity_kwh_per_kg: float
    projected_emissions_kg: float
    labour_intensity_hours_per_tonne: float
    alerts: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> MutableMapping[str, float | Sequence[str]]:
        return {
            "total_input_kg": self.total_input_kg,
            "total_recovered_kg": self.total_recovered_kg,
            "recycling_rate": self.recycling_rate,
            "contamination_index": self.contamination_index,
            "avg_recovery_rate": self.avg_recovery_rate,
            "energy_intensity_kwh_per_kg": self.energy_intensity_kwh_per_kg,
            "projected_emissions_kg": self.projected_emissions_kg,
            "labour_intensity_hours_per_tonne": self.labour_intensity_hours_per_tonne,
            "alerts": list(self.alerts),
        }


@dataclass(slots=True)
class RecyclingStrategy:
    """Strategic intervention guidance derived from recycling insights."""

    focus_area: str
    actions: tuple[str, ...]
    expected_efficiency_gain: float
    notes: str | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "focus_area": self.focus_area,
            "actions": list(self.actions),
            "expected_efficiency_gain": self.expected_efficiency_gain,
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        return payload


# ---------------------------------------------------------------------------
# engine


class DynamicRecyclingEngine:
    """High-level orchestrator for recycling intelligence flows."""

    def __init__(
        self,
        *,
        facility: RecyclingFacilityProfile | None = None,
        history_limit: int = 240,
    ) -> None:
        self._facility = facility
        self._events: Deque[RecyclingEvent] = deque(maxlen=history_limit)
        self._history_limit = history_limit

    @property
    def facility(self) -> RecyclingFacilityProfile | None:
        return self._facility

    @facility.setter
    def facility(self, profile: RecyclingFacilityProfile | None) -> None:
        if profile is not None and not isinstance(profile, RecyclingFacilityProfile):
            raise TypeError("profile must be a RecyclingFacilityProfile instance")
        self._facility = profile

    @property
    def history_limit(self) -> int:
        return self._history_limit

    def register_event(
        self,
        event: RecyclingEvent | Mapping[str, object],
        /,
        **overrides: object,
    ) -> RecyclingEvent:
        """Normalise and register a recycling event.

        Parameters
        ----------
        event:
            A :class:`RecyclingEvent` instance or a mapping describing an event.
        overrides:
            Keyword overrides applied when building an event from a mapping.
        """

        if isinstance(event, RecyclingEvent):
            normalised = event
        else:
            if not isinstance(event, Mapping):
                raise TypeError("event must be a RecyclingEvent or mapping")
            payload = dict(event)
            payload.update(overrides)
            stream_payload = payload.pop("stream")
            if isinstance(stream_payload, MaterialStream):
                stream = stream_payload
            elif isinstance(stream_payload, Mapping):
                stream = MaterialStream(**stream_payload)
            else:
                raise TypeError("stream must be a MaterialStream or mapping")
            normalised = RecyclingEvent(stream=stream, **payload)
        self._events.append(normalised)
        return normalised

    def bulk_register(
        self, events: Iterable[RecyclingEvent | Mapping[str, object]]
    ) -> list[RecyclingEvent]:
        registered: list[RecyclingEvent] = []
        for event in events:
            registered.append(self.register_event(event))
        return registered

    def clear_history(self) -> None:
        self._events.clear()

    def iter_history(self) -> Iterable[RecyclingEvent]:
        return tuple(self._events)

    def _select_events(self, window: int | None = None) -> list[RecyclingEvent]:
        if window is None or window >= len(self._events):
            return list(self._events)
        if window <= 0:
            return []
        # convert to list once for slicing from the right
        recent = list(self._events)
        return recent[-window:]

    def summarise(self, *, window: int | None = None) -> RecyclingInsight:
        events = self._select_events(window)
        if not events:
            return RecyclingInsight(
                total_input_kg=0.0,
                total_recovered_kg=0.0,
                recycling_rate=0.0,
                contamination_index=0.0,
                avg_recovery_rate=0.0,
                energy_intensity_kwh_per_kg=0.0,
                projected_emissions_kg=0.0,
                labour_intensity_hours_per_tonne=0.0,
                alerts=(),
            )

        total_input = sum(event.stream.mass_kg for event in events)
        total_recovered = sum(event.recovered_mass for event in events)
        total_contamination = sum(event.stream.contamination_mass for event in events)
        total_energy = sum(event.energy_used_kwh for event in events)
        total_labour = sum(event.labour_hours for event in events)

        recycling_rate = total_recovered / total_input if total_input else 0.0
        contamination_index = total_contamination / total_input if total_input else 0.0
        energy_intensity = total_energy / total_input if total_input else 0.0
        labour_intensity = (total_labour / (total_input / 1000.0)) if total_input else 0.0

        recovery_pairs = [
            (event.recovery_rate, event.stream.mass_kg) for event in events
        ]
        avg_recovery_rate = _weighted_mean(recovery_pairs, default=recycling_rate)

        projected_emissions = 0.0
        alerts: list[str] = []

        if self._facility is not None:
            projected_emissions = total_energy * self._facility.emission_factor_kg_per_kwh
            if recycling_rate + 1e-9 < self._facility.baseline_recovery_rate:
                alerts.append(
                    "recycling rate trailing facility baseline"
                )
            if contamination_index > self._facility.contamination_tolerance:
                alerts.append("contamination exceeds tolerance")
            if energy_intensity > self._facility.energy_intensity_kwh_per_kg * 1.1:
                alerts.append("energy intensity materially above baseline")
        else:
            projected_emissions = total_energy * 0.38  # generic grid factor

        return RecyclingInsight(
            total_input_kg=total_input,
            total_recovered_kg=total_recovered,
            recycling_rate=recycling_rate,
            contamination_index=contamination_index,
            avg_recovery_rate=avg_recovery_rate,
            energy_intensity_kwh_per_kg=energy_intensity,
            projected_emissions_kg=projected_emissions,
            labour_intensity_hours_per_tonne=labour_intensity,
            alerts=tuple(alerts),
        )

    def recommend_strategy(self, *, window: int | None = None) -> RecyclingStrategy:
        insight = self.summarise(window=window)
        focus_area = "stabilise operations"
        actions: list[str] = []
        expected_gain = 0.04
        notes: str | None = None

        facility = self._facility
        if insight.total_input_kg <= 0:
            notes = "Insufficient data for recommendation."
            return RecyclingStrategy(
                focus_area=focus_area,
                actions=("collect additional operational data",),
                expected_efficiency_gain=0.0,
                notes=notes,
            )

        if facility is not None:
            baseline_gap = facility.baseline_recovery_rate - insight.recycling_rate
            if baseline_gap > 0.02:
                focus_area = "recovery optimisation"
                actions.append(
                    "Tune optical sorters and recalibrate screening to close recovery gap"
                )
                expected_gain = max(baseline_gap, 0.05)
            if insight.contamination_index > facility.contamination_tolerance:
                focus_area = "contamination control"
                actions.append(
                    "Expand inbound education campaigns and tighten supplier specs"
                )
                expected_gain = max(expected_gain, insight.contamination_index)
            if insight.energy_intensity_kwh_per_kg > facility.energy_intensity_kwh_per_kg * 1.05:
                actions.append(
                    "Schedule preventive maintenance on conveyors and grinders"
                )
            if not actions:
                focus_area = "continuous improvement"
                actions.append("Benchmark against top quartile facilities")
                expected_gain = max(expected_gain, 0.02)
        else:
            actions.extend(
                [
                    "Establish baseline facility profile",
                    "Instrument key process nodes for energy and contamination visibility",
                ]
            )
            expected_gain = max(expected_gain, 0.06)
            notes = "Facility benchmarks unavailable; using generic guidance."

        return RecyclingStrategy(
            focus_area=focus_area,
            actions=tuple(actions),
            expected_efficiency_gain=_clamp(expected_gain, upper=0.5),
            notes=notes,
        )

    def forecast_recovery(
        self,
        additional_mass_kg: float,
        *,
        recovery_rate: float | None = None,
    ) -> MutableMapping[str, float]:
        if additional_mass_kg <= 0:
            raise ValueError("additional_mass_kg must be positive")
        rate = _clamp(
            recovery_rate
            if recovery_rate is not None
            else (
                self._facility.baseline_recovery_rate
                if self._facility is not None
                else self.summarise().recycling_rate or 0.55
            )
        )
        recovered = additional_mass_kg * rate
        residual = additional_mass_kg - recovered
        if self._facility is not None:
            energy = additional_mass_kg * self._facility.energy_intensity_kwh_per_kg
            emissions = energy * self._facility.emission_factor_kg_per_kwh
        else:
            energy = additional_mass_kg * 0.3
            emissions = energy * 0.4
        return {
            "expected_recovered_kg": recovered,
            "expected_residual_kg": residual,
            "expected_energy_kwh": energy,
            "expected_emissions_kg": emissions,
        }
