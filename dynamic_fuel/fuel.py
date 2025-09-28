"""Dynamic fuel intelligence, blending, and utilisation tooling."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicFuelSystem",
    "FuelBlend",
    "FuelComponent",
    "FuelFlow",
    "FuelSummary",
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


def _normalise_text(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_positive(value: float) -> float:
    numeric = float(value)
    if numeric <= 0:
        raise ValueError("value must be positive")
    return numeric


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
class FuelComponent:
    """Represents a physical fuel component with known performance."""

    name: str
    energy_density_mj_per_kg: float
    carbon_intensity_kg_per_mj: float
    renewable_share: float = 0.0
    description: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.energy_density_mj_per_kg = _ensure_positive(self.energy_density_mj_per_kg)
        self.carbon_intensity_kg_per_mj = max(float(self.carbon_intensity_kg_per_mj), 0.0)
        self.renewable_share = _clamp(self.renewable_share)
        self.description = self.description.strip() if self.description else None
        self.metadata = _normalise_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "energy_density_mj_per_kg": self.energy_density_mj_per_kg,
            "carbon_intensity_kg_per_mj": self.carbon_intensity_kg_per_mj,
            "renewable_share": self.renewable_share,
            "description": self.description,
            "metadata": dict(self.metadata) if self.metadata else None,
        }


@dataclass(slots=True)
class FuelBlend:
    """Weighted blend of multiple fuel components."""

    components: Sequence[tuple[FuelComponent, float]]
    name: str = "custom"
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.components, Sequence) or not self.components:
            raise ValueError("components must contain at least one (FuelComponent, ratio) pair")
        normalised: list[tuple[FuelComponent, float]] = []
        total = 0.0
        for component, ratio in self.components:
            if not isinstance(component, FuelComponent):
                raise TypeError("components must reference FuelComponent instances")
            weight = max(float(ratio), 0.0)
            if weight <= 0:
                continue
            normalised.append((component, weight))
            total += weight
        if not normalised or total <= 0:
            raise ValueError("components must provide positive ratios")
        self.components = tuple((component, weight / total) for component, weight in normalised)
        self.name = _normalise_text(self.name)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def energy_density(self) -> float:
        return sum(component.energy_density_mj_per_kg * weight for component, weight in self.components)

    @property
    def carbon_intensity(self) -> float:
        return sum(component.carbon_intensity_kg_per_mj * weight for component, weight in self.components)

    @property
    def renewable_ratio(self) -> float:
        return _clamp(
            sum(component.renewable_share * weight for component, weight in self.components)
        )

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "energy_density": self.energy_density,
            "carbon_intensity": self.carbon_intensity,
            "renewable_ratio": self.renewable_ratio,
            "components": [
                {
                    "component": component.as_dict(),
                    "ratio": weight,
                }
                for component, weight in self.components
            ],
            "tags": list(self.tags),
            "metadata": dict(self.metadata) if self.metadata else None,
        }


@dataclass(slots=True)
class FuelFlow:
    """A single fuel transaction (intake, storage, or burn)."""

    kind: str
    mass_kg: float
    blend: FuelBlend
    efficiency: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.kind = _normalise_text(self.kind).lower()
        self.mass_kg = max(float(self.mass_kg), 0.0)
        if self.mass_kg <= 0:
            raise ValueError("mass_kg must be greater than zero")
        if not isinstance(self.blend, FuelBlend):
            raise TypeError("blend must be a FuelBlend instance")
        self.efficiency = _clamp(self.efficiency)
        self.timestamp = _ensure_tzaware(self.timestamp) or _utcnow()
        self.notes = self.notes.strip() if self.notes else None
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def energy_mj(self) -> float:
        return self.mass_kg * self.blend.energy_density * self.efficiency

    @property
    def carbon_kg(self) -> float:
        return self.energy_mj * self.blend.carbon_intensity


@dataclass(slots=True)
class FuelSummary:
    """Aggregated metrics across a slice of fuel flows."""

    event_count: int
    total_intake_mass_kg: float
    total_burn_mass_kg: float
    net_mass_balance_kg: float
    average_energy_density_mj_per_kg: float
    average_renewable_ratio: float
    average_carbon_intensity_kg_per_mj: float
    window_start: datetime | None = None
    window_end: datetime | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "event_count": self.event_count,
            "total_intake_mass_kg": self.total_intake_mass_kg,
            "total_burn_mass_kg": self.total_burn_mass_kg,
            "net_mass_balance_kg": self.net_mass_balance_kg,
            "average_energy_density_mj_per_kg": self.average_energy_density_mj_per_kg,
            "average_renewable_ratio": self.average_renewable_ratio,
            "average_carbon_intensity_kg_per_mj": self.average_carbon_intensity_kg_per_mj,
            "window_start": self.window_start.isoformat() if self.window_start else None,
            "window_end": self.window_end.isoformat() if self.window_end else None,
        }


# ---------------------------------------------------------------------------
# main engine


class DynamicFuelSystem:
    """Tracks dynamic fuel events and generates rolling insights."""

    def __init__(self, *, max_events: int = 512) -> None:
        if max_events <= 0:
            raise ValueError("max_events must be positive")
        self._events: Deque[FuelFlow] = deque(maxlen=max_events)

    def record(self, flow: FuelFlow) -> FuelFlow:
        if not isinstance(flow, FuelFlow):
            raise TypeError("flow must be a FuelFlow instance")
        self._events.append(flow)
        return flow

    def record_intake(
        self,
        *,
        mass_kg: float,
        blend: FuelBlend,
        timestamp: datetime | None = None,
        efficiency: float = 1.0,
        notes: str | None = None,
        tags: Sequence[str] | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> FuelFlow:
        return self.record(
            FuelFlow(
                kind="intake",
                mass_kg=mass_kg,
                blend=blend,
                efficiency=efficiency,
                timestamp=timestamp or _utcnow(),
                notes=notes,
                tags=tags,
                metadata=metadata,
            )
        )

    def record_burn(
        self,
        *,
        mass_kg: float,
        blend: FuelBlend,
        timestamp: datetime | None = None,
        efficiency: float = 1.0,
        notes: str | None = None,
        tags: Sequence[str] | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> FuelFlow:
        return self.record(
            FuelFlow(
                kind="burn",
                mass_kg=mass_kg,
                blend=blend,
                efficiency=efficiency,
                timestamp=timestamp or _utcnow(),
                notes=notes,
                tags=tags,
                metadata=metadata,
            )
        )

    @property
    def events(self) -> tuple[FuelFlow, ...]:
        return tuple(self._events)

    def summary(
        self,
        *,
        limit: int | None = None,
        since: datetime | None = None,
        kinds: Iterable[str] | None = None,
    ) -> FuelSummary:
        if limit is not None and limit <= 0:
            raise ValueError("limit must be positive when provided")
        normalised_kinds: set[str] | None
        if kinds is None:
            normalised_kinds = None
        else:
            normalised_kinds = {str(kind).strip().lower() for kind in kinds if str(kind).strip()}
            if not normalised_kinds:
                normalised_kinds = None

        events = list(self._events)
        if since is not None:
            threshold = _ensure_tzaware(since) or _utcnow()
            events = [event for event in events if event.timestamp >= threshold]
        if normalised_kinds is not None:
            events = [event for event in events if event.kind in normalised_kinds]
        if limit is not None:
            events = events[-limit:]

        if not events:
            return FuelSummary(
                event_count=0,
                total_intake_mass_kg=0.0,
                total_burn_mass_kg=0.0,
                net_mass_balance_kg=0.0,
                average_energy_density_mj_per_kg=0.0,
                average_renewable_ratio=0.0,
                average_carbon_intensity_kg_per_mj=0.0,
                window_start=None,
                window_end=None,
            )

        total_intake_mass = 0.0
        total_burn_mass = 0.0
        energy_density_pairs: list[tuple[float, float]] = []
        renewable_pairs: list[tuple[float, float]] = []
        carbon_pairs: list[tuple[float, float]] = []
        for event in events:
            if event.kind == "intake":
                total_intake_mass += event.mass_kg
            if event.kind == "burn":
                total_burn_mass += event.mass_kg
            energy_density_pairs.append((event.blend.energy_density, event.mass_kg))
            renewable_pairs.append((event.blend.renewable_ratio, event.mass_kg))
            carbon_pairs.append((event.blend.carbon_intensity, event.energy_mj))

        window_start = events[0].timestamp
        window_end = events[-1].timestamp
        return FuelSummary(
            event_count=len(events),
            total_intake_mass_kg=total_intake_mass,
            total_burn_mass_kg=total_burn_mass,
            net_mass_balance_kg=total_intake_mass - total_burn_mass,
            average_energy_density_mj_per_kg=_weighted_mean(
                energy_density_pairs, default=0.0
            ),
            average_renewable_ratio=_weighted_mean(renewable_pairs, default=0.0),
            average_carbon_intensity_kg_per_mj=_weighted_mean(carbon_pairs, default=0.0),
            window_start=window_start,
            window_end=window_end,
        )

    def inventory_estimate(self) -> Mapping[str, float]:
        balance: Counter[str] = Counter()
        for event in self._events:
            sign = 0
            if event.kind == "intake":
                sign = 1
            elif event.kind == "burn":
                sign = -1
            if sign == 0:
                continue
            for component, ratio in event.blend.components:
                balance[component.name] += sign * event.mass_kg * ratio
        return MappingProxyType(dict(balance))

    def clear(self) -> None:
        self._events.clear()
