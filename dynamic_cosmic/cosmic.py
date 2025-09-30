"""Dynamic cosmic network modelling and resonance analytics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from math import exp, sqrt, tanh
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CosmicCoordinate",
    "CosmicSignal",
    "CosmicPhenomenon",
    "CosmicBridge",
    "CosmicTimelineEvent",
    "CosmicExpansionModel",
    "DynamicCosmic",
]


# ---------------------------------------------------------------------------
# helper utilities


def _clamp01(value: float | int) -> float:
    return max(0.0, min(1.0, float(value)))


def _non_negative(value: float | int, *, minimum: float = 0.0) -> float:
    numeric = float(value)
    if numeric < minimum:
        raise ValueError("value must be greater than or equal to minimum")
    return numeric


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


def _ensure_metadata(metadata: Mapping[str, float] | None) -> Mapping[str, float] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping if provided")
    return {str(key): float(value) for key, value in metadata.items()}


def _ensure_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _mean(values: Iterable[float]) -> float:
    data = list(values)
    if not data:
        return 0.0
    return float(fmean(data))


def _sigmoid(value: float, *, clamp: float = 6.0) -> float:
    """Return a numerically stable logistic response."""

    bounded = max(-clamp, min(clamp, value))
    return 1.0 / (1.0 + exp(-bounded))


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class CosmicCoordinate:
    """Represents a point within a cosmic lattice using light-year scale coordinates."""

    x: float
    y: float
    z: float

    def __post_init__(self) -> None:
        self.x = float(self.x)
        self.y = float(self.y)
        self.z = float(self.z)

    def distance_to(self, other: "CosmicCoordinate") -> float:
        dx = self.x - other.x
        dy = self.y - other.y
        dz = self.z - other.z
        return sqrt(dx * dx + dy * dy + dz * dz)

    def shifted(self, vector: Sequence[float]) -> "CosmicCoordinate":
        vx, vy, vz = (float(component) for component in vector)
        return CosmicCoordinate(self.x + vx, self.y + vy, self.z + vz)

    def as_tuple(self) -> tuple[float, float, float]:
        return (self.x, self.y, self.z)


@dataclass(slots=True)
class CosmicSignal:
    """Defines an energetic signature that propagates through the cosmic network."""

    identifier: str
    wavelength_nm: float
    amplitude: float
    coherence: float = 0.5
    origin: str | None = None
    metadata: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.wavelength_nm = _non_negative(self.wavelength_nm, minimum=0.1)
        self.amplitude = _non_negative(self.amplitude)
        self.coherence = _clamp01(self.coherence)
        if self.origin is not None:
            self.origin = _normalise_text(self.origin)
        self.metadata = _ensure_metadata(self.metadata)

    def energy_density(self) -> float:
        spectral_factor = 1.0 + 0.002 * (700 - min(self.wavelength_nm, 700.0))
        return self.amplitude * (0.7 + 0.3 * self.coherence) * spectral_factor

    def with_coherence(self, value: float) -> "CosmicSignal":
        return replace(self, coherence=_clamp01(value))


@dataclass(slots=True)
class CosmicPhenomenon:
    """Captures a multi-signal anomaly observed within the cosmic lattice."""

    identifier: str
    location: CosmicCoordinate
    magnitude: float
    volatility: float
    signals: tuple[CosmicSignal, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.magnitude = _non_negative(self.magnitude)
        self.volatility = _clamp01(self.volatility)
        self.signals = tuple(sorted(self._normalise_signals(self.signals), key=lambda sig: sig.identifier))
        self.tags = _normalise_tags(self.tags)
        self.metadata = _ensure_metadata(self.metadata)

    @staticmethod
    def _normalise_signals(signals: Sequence[CosmicSignal] | None) -> list[CosmicSignal]:
        if not signals:
            return []
        normalised: list[CosmicSignal] = []
        for signal in signals:
            if isinstance(signal, CosmicSignal):
                normalised.append(signal)
            elif isinstance(signal, Mapping):
                normalised.append(CosmicSignal(**signal))
            else:
                raise TypeError("signals must be CosmicSignal instances or mappings")
        return normalised

    def resonance_score(self) -> float:
        if not self.signals:
            return self.magnitude * (0.5 + 0.5 * (1.0 - self.volatility))
        signal_energy = _mean(signal.energy_density() for signal in self.signals)
        stability = 1.0 - 0.6 * self.volatility
        return (self.magnitude + signal_energy) * max(0.1, stability)

    def with_signal(self, signal: CosmicSignal) -> "CosmicPhenomenon":
        updated = {sig.identifier: sig for sig in self.signals}
        updated[signal.identifier] = signal
        return replace(self, signals=tuple(sorted(updated.values(), key=lambda sig: sig.identifier)))

    def without_signal(self, identifier: str) -> "CosmicPhenomenon":
        key = _normalise_identifier(identifier)
        remaining = tuple(signal for signal in self.signals if signal.identifier != key)
        return replace(self, signals=remaining)


@dataclass(slots=True)
class CosmicBridge:
    """Represents a stabilised pathway between two cosmic phenomena."""

    source: str
    target: str
    stability: float
    flux: float
    route_length: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.source = _normalise_identifier(self.source)
        self.target = _normalise_identifier(self.target)
        if self.source == self.target:
            raise ValueError("source and target must be distinct phenomena")
        self.stability = _clamp01(self.stability)
        self.flux = _non_negative(self.flux)
        self.route_length = _non_negative(self.route_length, minimum=0.1)
        self.tags = _normalise_tags(self.tags)

    def transfer_efficiency(self) -> float:
        damping = 1.0 + self.route_length * (0.2 + 0.5 * (1.0 - self.stability))
        return (self.flux * (0.6 + 0.4 * self.stability)) / damping


@dataclass(slots=True)
class CosmicTimelineEvent:
    """Chronicles a notable change that affects cosmic orchestration."""

    description: str
    impact: float
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.description = _normalise_text(self.description)
        self.impact = _clamp01(self.impact)
        self.timestamp = _ensure_datetime(self.timestamp)
        self.tags = _normalise_tags(self.tags)


# ---------------------------------------------------------------------------
# cosmological modelling


@dataclass(slots=True)
class CosmicExpansionModel:
    """Encapsulates a simplified Λ-CDM inspired profile for the engine.

    The model tracks the cosmological constant (``Λ``), matter density,
    Hubble constant, and the dark energy equation-of-state (``w``). Even though
    these parameters are unitless here, they retain their qualitative roles:

    - ``cosmological_constant`` behaves like vacuum energy density. Larger
      values imply a stronger background expansion pressure.
    - ``matter_density`` captures clustered structure and offers a dampening
      term against runaway acceleration.
    - ``equation_of_state`` tunes how the vacuum energy couples to pressure.
      ``w = -1`` recovers the classical cosmological constant behaviour.
    - ``hubble_constant`` modulates how aggressively the system responds to the
      current density mix.

    The helper exposes derived quantities (Friedmann acceleration, continuity
    residual, etc.) that the orchestration engine can fold into its resilience
    scoring.
    """

    cosmological_constant: float = 0.7
    equation_of_state: float = -1.0
    matter_density: float = 0.3
    hubble_constant: float = 70.0

    def __post_init__(self) -> None:
        self.cosmological_constant = _non_negative(self.cosmological_constant)
        self.matter_density = _non_negative(self.matter_density)
        self.hubble_constant = _non_negative(self.hubble_constant, minimum=1e-3)
        self.equation_of_state = float(self.equation_of_state)

    def dark_energy_pressure(self) -> float:
        """Return the effective vacuum pressure using ``p = w ρ``."""

        return self.equation_of_state * self.cosmological_constant

    def energy_density(self) -> float:
        """Combined matter plus dark-energy density."""

        return self.cosmological_constant + self.matter_density

    def friedmann_acceleration(self) -> float:
        r"""Scaled \(\ddot{a} / a\) term from the second Friedmann equation."""

        density = self.energy_density()
        pressure = self.dark_energy_pressure()
        return -(density + 3.0 * pressure)

    def expansion_rate(self) -> float:
        """Normalised Hubble expansion rate for telemetry dashboards."""

        return (self.hubble_constant / 100.0) * sqrt(max(self.energy_density(), 0.0))

    def continuity_residual(self, network_density: float) -> float:
        """Deviation from a steady-state continuity equation.

        ``network_density`` approximates how many bridges exist per phenomenon
        and acts as a multiplier for expansion drag. Positive values indicate a
        tendency toward accelerated expansion that treasury teams must offset.
        """

        hubble = self.hubble_constant / 100.0
        density = self.energy_density()
        pressure = self.dark_energy_pressure()
        background = -3.0 * hubble * (self.cosmological_constant + pressure)
        coupling = hubble * density * (network_density - 1.0)
        return coupling + background

    def stability_modulation(self, network_density: float) -> float:
        """Return a multiplier for network resilience based on cosmology."""

        acceleration = self.friedmann_acceleration()
        # Normalise the acceleration by the hubble constant so a default
        # parameter set lands close to a unity multiplier. Allow negative
        # acceleration (deceleration) to meaningfully reduce the modulation
        # instead of clamping it to zero.
        hubble_scale = max(0.1, self.hubble_constant / 100.0)
        logistic = _sigmoid(acceleration / (1.5 * hubble_scale))
        density_term = tanh((network_density - 1.0) * 0.8)
        # Centre the modifier at ~1.0 and keep it within a tight band so the
        # expansion model nudges resilience without dominating the base signal.
        return 1.0 + 0.2 * (logistic - 0.5) + 0.15 * density_term

    def telemetry(self, network_density: float) -> Mapping[str, float]:
        """Expose derived cosmological quantities for downstream consumers."""

        return {
            "cosmological_constant": self.cosmological_constant,
            "equation_of_state": self.equation_of_state,
            "matter_density": self.matter_density,
            "energy_density": self.energy_density(),
            "dark_energy_pressure": self.dark_energy_pressure(),
            "friedmann_acceleration": self.friedmann_acceleration(),
            "expansion_rate": self.expansion_rate(),
            "continuity_residual": self.continuity_residual(network_density),
            "stability_modifier": self.stability_modulation(network_density),
        }


# ---------------------------------------------------------------------------
# orchestration engine


class DynamicCosmic:
    """Coordinates cosmic phenomena, bridges, and timeline events."""

    def __init__(
        self,
        *,
        phenomena: Sequence[CosmicPhenomenon] | None = None,
        bridges: Sequence[CosmicBridge] | None = None,
        history_limit: int = 500,
        expansion_model: CosmicExpansionModel | Mapping[str, object] | None = None,
    ) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._phenomena: MutableMapping[str, CosmicPhenomenon] = {}
        self._bridges: MutableMapping[tuple[str, str], CosmicBridge] = {}
        self._events: Deque[CosmicTimelineEvent] = deque()
        self._history_limit = int(history_limit)
        self._expansion_model = self._ensure_expansion_model(expansion_model)

        if phenomena:
            for item in phenomena:
                self.register_phenomenon(item)
        if bridges:
            for bridge in bridges:
                self.register_bridge(bridge)

    @property
    def phenomena(self) -> tuple[CosmicPhenomenon, ...]:
        return tuple(self._phenomena.values())

    @property
    def bridges(self) -> tuple[CosmicBridge, ...]:
        return tuple(self._bridges.values())

    @property
    def events(self) -> tuple[CosmicTimelineEvent, ...]:
        return tuple(self._events)

    @property
    def history_limit(self) -> int:
        return self._history_limit

    @property
    def history_size(self) -> int:
        return len(self._events)

    @property
    def expansion_model(self) -> CosmicExpansionModel:
        return self._expansion_model

    def register_phenomenon(self, phenomenon: CosmicPhenomenon | Mapping[str, object]) -> CosmicPhenomenon:
        if not isinstance(phenomenon, CosmicPhenomenon):
            phenomenon = CosmicPhenomenon(**phenomenon)
        self._phenomena[phenomenon.identifier] = phenomenon
        return phenomenon

    def remove_phenomenon(self, identifier: str) -> None:
        key = _normalise_identifier(identifier)
        self._phenomena.pop(key, None)
        for bridge_key in list(self._bridges):
            if key in bridge_key:
                del self._bridges[bridge_key]

    def get_phenomenon(self, identifier: str) -> CosmicPhenomenon | None:
        return self._phenomena.get(_normalise_identifier(identifier))

    def register_bridge(self, bridge: CosmicBridge | Mapping[str, object]) -> CosmicBridge:
        if not isinstance(bridge, CosmicBridge):
            bridge = CosmicBridge(**bridge)
        if bridge.source not in self._phenomena or bridge.target not in self._phenomena:
            raise KeyError("bridge endpoints must reference registered phenomena")
        self._bridges[(bridge.source, bridge.target)] = bridge
        return bridge

    def remove_bridge(self, source: str, target: str) -> None:
        key = (_normalise_identifier(source), _normalise_identifier(target))
        self._bridges.pop(key, None)

    def ingest_signal(self, identifier: str, signal: CosmicSignal | Mapping[str, object]) -> CosmicPhenomenon:
        if not isinstance(signal, CosmicSignal):
            signal = CosmicSignal(**signal)
        phenomenon = self.get_phenomenon(identifier)
        if phenomenon is None:
            raise KeyError(f"unknown phenomenon '{identifier}'")
        updated = phenomenon.with_signal(signal)
        self._phenomena[updated.identifier] = updated
        return updated

    def record_event(self, event: CosmicTimelineEvent | Mapping[str, object]) -> CosmicTimelineEvent:
        if not isinstance(event, CosmicTimelineEvent):
            event = CosmicTimelineEvent(**event)
        self._events.appendleft(event)
        self._enforce_history_limit()
        return event

    def clear_events(self) -> None:
        self._events.clear()

    def set_history_limit(self, limit: int) -> None:
        if limit <= 0:
            raise ValueError("limit must be positive")
        self._history_limit = int(limit)
        self._enforce_history_limit()

    def configure_expansion(
        self, model: CosmicExpansionModel | Mapping[str, object] | None
    ) -> CosmicExpansionModel:
        """Update the cosmological profile used for resilience calculations."""

        self._expansion_model = self._ensure_expansion_model(model)
        return self._expansion_model

    def _enforce_history_limit(self) -> None:
        while len(self._events) > self._history_limit:
            self._events.pop()

    def _ensure_expansion_model(
        self, model: CosmicExpansionModel | Mapping[str, object] | None
    ) -> CosmicExpansionModel:
        if model is None:
            return CosmicExpansionModel()
        if isinstance(model, CosmicExpansionModel):
            return model
        return CosmicExpansionModel(**model)

    def _network_density(self) -> float:
        if not self._phenomena:
            return 0.0
        return len(self._bridges) / max(1, len(self._phenomena))

    def evaluate_resilience(self) -> float:
        if not self._phenomena:
            return 0.0
        resonance = _mean(phenomenon.resonance_score() for phenomenon in self._phenomena.values())
        modifier = self._expansion_model.stability_modulation(self._network_density())
        if not self._bridges:
            return resonance * modifier
        connectivity = _mean(bridge.transfer_efficiency() for bridge in self._bridges.values())
        ratio = min(1.0, connectivity / (resonance + 1e-9))
        return resonance * (0.6 + 0.4 * ratio) * modifier

    def snapshot(self) -> Mapping[str, object]:
        network_density = self._network_density()
        return {
            "phenomena": [
                {
                    "identifier": phenomenon.identifier,
                    "magnitude": phenomenon.magnitude,
                    "volatility": phenomenon.volatility,
                    "signals": [signal.identifier for signal in phenomenon.signals],
                }
                for phenomenon in self._phenomena.values()
            ],
            "bridges": [
                {
                    "source": bridge.source,
                    "target": bridge.target,
                    "stability": bridge.stability,
                }
                for bridge in self._bridges.values()
            ],
            "events": [
                {
                    "description": event.description,
                    "impact": event.impact,
                    "timestamp": event.timestamp.isoformat(),
                }
                for event in self._events
            ],
            "resilience": self.evaluate_resilience(),
            "expansion": self._expansion_model.telemetry(network_density),
        }
