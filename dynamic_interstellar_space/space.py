"""Dynamic interstellar space topology and orchestration toolkit."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from math import sqrt
from typing import Deque, Mapping, MutableMapping, Sequence

__all__ = [
    "StellarCoordinate",
    "StellarBody",
    "WormholeCorridor",
    "CosmicCurrent",
    "InterstellarEvent",
    "DynamicInterstellarSpace",
]


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _non_negative(value: float) -> float:
    result = float(value)
    if result < 0.0:
        raise ValueError("value must be non-negative")
    return result


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_identifier(value: str) -> str:
    return _normalise_text(value).lower()


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


def _coerce_mapping(mapping: Mapping[str, float] | None) -> Mapping[str, float] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_vector(vector: Sequence[float]) -> tuple[float, float, float]:
    if len(vector) != 3:
        raise ValueError("vector must contain exactly three components")
    return tuple(float(component) for component in vector)


def _normalise_vector(vector: Sequence[float]) -> tuple[float, float, float]:
    if len(vector) != 3:
        raise ValueError("vector must contain exactly three components")
    x, y, z = (float(component) for component in vector)
    magnitude = sqrt(x * x + y * y + z * z)
    if magnitude == 0.0:
        raise ValueError("vector magnitude must be greater than zero")
    return (x / magnitude, y / magnitude, z / magnitude)


@dataclass(slots=True)
class StellarCoordinate:
    """Represents a location in interstellar space using light-year coordinates."""

    x: float
    y: float
    z: float

    def __post_init__(self) -> None:
        self.x = float(self.x)
        self.y = float(self.y)
        self.z = float(self.z)

    def distance_to(self, other: "StellarCoordinate") -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        dz = self.z - other.z
        return sqrt(dx * dx + dy * dy + dz * dz)

    def shifted(self, vector: Sequence[float]) -> "StellarCoordinate":
        offset = _coerce_vector(vector)
        return StellarCoordinate(self.x + offset[0], self.y + offset[1], self.z + offset[2])

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)


@dataclass(slots=True)
class StellarBody:
    """Describes a gravitational anchor within the interstellar network."""

    name: str
    coordinate: StellarCoordinate
    mass: float
    luminosity: float
    resonance: float = 0.5
    classification: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.mass = _non_negative(self.mass)
        self.luminosity = _non_negative(self.luminosity)
        self.resonance = _clamp01(self.resonance)
        if self.classification is not None:
            self.classification = _normalise_text(self.classification)
        self.tags = _normalise_tags(self.tags)

    def gravity_signature(self) -> float:
        return (self.mass ** 0.6) * (1.0 + 0.4 * self.resonance)

    def radiation_flux(self) -> float:
        return self.luminosity * (0.7 + 0.3 * self.resonance)


@dataclass(slots=True)
class WormholeCorridor:
    """Represents a traversable corridor connecting two stellar bodies."""

    entry: str
    exit: str
    stability: float
    throughput: float
    latency_bias: float = 0.5
    corridor_length: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.entry = _normalise_identifier(self.entry)
        self.exit = _normalise_identifier(self.exit)
        if self.entry == self.exit:
            raise ValueError("entry and exit must reference different bodies")
        self.stability = _clamp01(self.stability)
        self.throughput = _non_negative(self.throughput)
        self.latency_bias = _clamp01(self.latency_bias)
        self.corridor_length = _non_negative(self.corridor_length)
        self.tags = _normalise_tags(self.tags)

    def effective_bandwidth(self) -> float:
        efficiency = 0.5 + 0.5 * self.stability
        penalty = 1.0 + self.corridor_length * (0.2 + 0.6 * (1.0 - self.latency_bias))
        return (self.throughput * efficiency) / penalty


@dataclass(slots=True)
class CosmicCurrent:
    """Cosmic energy flow influencing spatial navigation."""

    name: str
    orientation: tuple[float, float, float]
    intensity: float = 0.5
    turbulence: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.orientation = _normalise_vector(self.orientation)
        self.intensity = _clamp01(self.intensity)
        self.turbulence = _clamp01(self.turbulence)
        self.tags = _normalise_tags(self.tags)

    def coherence(self) -> float:
        return self.intensity * (1.0 - 0.5 * self.turbulence)


@dataclass(slots=True)
class InterstellarEvent:
    """Records a notable shift in the interstellar topology."""

    label: str
    location: StellarCoordinate
    intensity: float
    duration: float
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.label = _normalise_text(self.label)
        self.intensity = _clamp01(self.intensity)
        self.duration = _non_negative(self.duration)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    def influence_radius(self) -> float:
        return 1.0 + 4.0 * self.intensity + 0.5 * self.duration


@dataclass(slots=True)
class DynamicInterstellarSpace:
    """Maintains a registry of interstellar bodies, corridors, and cosmic currents."""

    bodies: MutableMapping[str, StellarBody] = field(default_factory=dict)
    corridors: MutableMapping[tuple[str, str], WormholeCorridor] = field(default_factory=dict)
    currents: MutableMapping[str, CosmicCurrent] = field(default_factory=dict)
    events: Deque[InterstellarEvent] = field(default_factory=deque, repr=False)
    history_limit: int = 256

    def __post_init__(self) -> None:
        if self.history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self.history_limit = int(self.history_limit)
        if not isinstance(self.events, deque):  # pragma: no cover - defensive
            self.events = deque(self.events)
        self._enforce_history_limit()

    def register_body(self, body: StellarBody) -> None:
        key = _normalise_identifier(body.name)
        self.bodies[key] = body

    def register_corridor(self, corridor: WormholeCorridor) -> None:
        if corridor.entry not in self.bodies:
            raise KeyError(f"unknown entry body '{corridor.entry}'")
        if corridor.exit not in self.bodies:
            raise KeyError(f"unknown exit body '{corridor.exit}'")
        key = (corridor.entry, corridor.exit)
        self.corridors[key] = corridor

    def register_current(self, current: CosmicCurrent) -> None:
        key = _normalise_identifier(current.name)
        self.currents[key] = current

    def record_event(self, event: InterstellarEvent) -> InterstellarEvent:
        self.events.append(event)
        self._enforce_history_limit()
        return event

    @property
    def history_size(self) -> int:
        return len(self.events)

    def clear_events(self) -> None:
        self.events.clear()

    def set_history_limit(self, limit: int) -> None:
        if limit <= 0:
            raise ValueError("limit must be positive")
        self.history_limit = int(limit)
        self._enforce_history_limit()

    def _enforce_history_limit(self) -> None:
        while len(self.events) > self.history_limit:
            self.events.popleft()

    def body_density(self) -> float:
        if not self.bodies:
            return 0.0
        total_mass = sum(body.mass for body in self.bodies.values())
        total_luminosity = sum(body.luminosity for body in self.bodies.values())
        return (total_mass ** 0.4) * (1.0 + 0.2 * (total_luminosity ** 0.1))

    def corridor_resilience(self) -> float:
        if not self.corridors:
            return 0.0
        total = sum(corridor.effective_bandwidth() for corridor in self.corridors.values())
        average_stability = sum(corridor.stability for corridor in self.corridors.values()) / len(self.corridors)
        return total * (0.6 + 0.4 * average_stability)

    def current_coherence(self) -> float:
        if not self.currents:
            return 0.0
        return sum(current.coherence() for current in self.currents.values()) / len(self.currents)

    def topology_health(self) -> float:
        density = self.body_density()
        resilience = self.corridor_resilience()
        coherence = self.current_coherence()
        return (density * 0.5) + (resilience * 0.3) + (coherence * 0.2)

    def radiant_bodies(self, limit: int = 5) -> list[StellarBody]:
        if limit <= 0:
            return []
        bodies = sorted(
            self.bodies.values(),
            key=lambda body: (body.radiation_flux(), body.gravity_signature()),
            reverse=True,
        )
        return bodies[:limit]

    def corridor_map(self) -> Mapping[str, list[WormholeCorridor]]:
        mapping: MutableMapping[str, list[WormholeCorridor]] = {}
        for corridor in self.corridors.values():
            mapping.setdefault(corridor.entry, []).append(corridor)
        return mapping

    def propagate_event(self, event: InterstellarEvent) -> Mapping[str, float]:
        influence = event.influence_radius()
        impact: MutableMapping[str, float] = {}
        for key, body in self.bodies.items():
            distance = body.coordinate.distance_to(event.location)
            if distance == 0.0:
                impact[key] = event.intensity
            else:
                scaled = event.intensity * (influence / (distance + influence))
                if scaled > 0.01:
                    impact[key] = scaled
        return impact

    def narrative_snapshot(self) -> Mapping[str, float]:
        return {
            "body_density": self.body_density(),
            "corridor_resilience": self.corridor_resilience(),
            "current_coherence": self.current_coherence(),
            "topology_health": self.topology_health(),
        }

    def merge(self, other: "DynamicInterstellarSpace") -> "DynamicInterstellarSpace":
        merged = DynamicInterstellarSpace(history_limit=max(self.history_limit, other.history_limit))
        merged.bodies = {**self.bodies, **other.bodies}
        merged.corridors = {**self.corridors, **other.corridors}
        merged.currents = {**self.currents, **other.currents}
        merged.events.extend(self.events)
        merged.events.extend(other.events)
        merged._enforce_history_limit()
        return merged

    def __bool__(self) -> bool:  # pragma: no cover - sentinel for misuse
        raise TypeError("DynamicInterstellarSpace does not support truthiness checks; use narrative_snapshot().")

