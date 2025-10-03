"""Dynamic cosmic network modelling and resonance analytics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from math import sqrt
from statistics import fmean
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CosmicCoordinate",
    "CosmicSignal",
    "CosmicPhenomenon",
    "CosmicBridge",
    "CosmicTimelineEvent",
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
# orchestration engine


class DynamicCosmic:
    """Coordinates cosmic phenomena, bridges, and timeline events."""

    def __init__(
        self,
        *,
        phenomena: Sequence[CosmicPhenomenon] | None = None,
        bridges: Sequence[CosmicBridge] | None = None,
        history_limit: int = 500,
    ) -> None:
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._phenomena: MutableMapping[str, CosmicPhenomenon] = {}
        self._bridges: MutableMapping[tuple[str, str], CosmicBridge] = {}
        self._events: Deque[CosmicTimelineEvent] = deque()
        self._history_limit = int(history_limit)
        self._resilience_cache: float | None = None
        self._metrics_cache: Mapping[str, float] | None = None

        if phenomena:
            for item in phenomena:
                self.register_phenomenon(item)
        if bridges:
            for bridge in bridges:
                self.register_bridge(bridge)

    # ------------------------------------------------------------------
    # internal bookkeeping

    def _mark_resilience_dirty(self) -> None:
        self._resilience_cache = None
        self._metrics_cache = None

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

    def register_phenomenon(self, phenomenon: CosmicPhenomenon | Mapping[str, object]) -> CosmicPhenomenon:
        if not isinstance(phenomenon, CosmicPhenomenon):
            phenomenon = CosmicPhenomenon(**phenomenon)
        self._phenomena[phenomenon.identifier] = phenomenon
        self._mark_resilience_dirty()
        return phenomenon

    def remove_phenomenon(self, identifier: str) -> None:
        key = _normalise_identifier(identifier)
        removed = self._phenomena.pop(key, None)
        bridges_removed = False
        for bridge_key in list(self._bridges):
            if key in bridge_key:
                del self._bridges[bridge_key]
                bridges_removed = True
        if removed is not None or bridges_removed:
            self._mark_resilience_dirty()

    def get_phenomenon(self, identifier: str) -> CosmicPhenomenon | None:
        return self._phenomena.get(_normalise_identifier(identifier))

    def register_bridge(self, bridge: CosmicBridge | Mapping[str, object]) -> CosmicBridge:
        if not isinstance(bridge, CosmicBridge):
            bridge = CosmicBridge(**bridge)
        if bridge.source not in self._phenomena or bridge.target not in self._phenomena:
            raise KeyError("bridge endpoints must reference registered phenomena")
        self._bridges[(bridge.source, bridge.target)] = bridge
        self._mark_resilience_dirty()
        return bridge

    def remove_bridge(self, source: str, target: str) -> None:
        key = (_normalise_identifier(source), _normalise_identifier(target))
        if self._bridges.pop(key, None) is not None:
            self._mark_resilience_dirty()

    def get_bridge(self, source: str, target: str) -> CosmicBridge | None:
        """Return the bridge connecting ``source`` to ``target`` if present."""

        key = (_normalise_identifier(source), _normalise_identifier(target))
        return self._bridges.get(key)

    def bridges_for(self, identifier: str) -> tuple[CosmicBridge, ...]:
        """Return all bridges connected to a given phenomenon."""

        key = _normalise_identifier(identifier)
        return tuple(
            bridge
            for (source, target), bridge in self._bridges.items()
            if key in (source, target)
        )

    def ingest_signal(self, identifier: str, signal: CosmicSignal | Mapping[str, object]) -> CosmicPhenomenon:
        if not isinstance(signal, CosmicSignal):
            signal = CosmicSignal(**signal)
        phenomenon = self.get_phenomenon(identifier)
        if phenomenon is None:
            raise KeyError(f"unknown phenomenon '{identifier}'")
        updated = phenomenon.with_signal(signal)
        self._phenomena[updated.identifier] = updated
        self._mark_resilience_dirty()
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

    def _enforce_history_limit(self) -> None:
        while len(self._events) > self._history_limit:
            self._events.pop()

    def evaluate_resilience(self) -> float:
        if self._resilience_cache is not None:
            return self._resilience_cache
        if not self._phenomena:
            self._resilience_cache = 0.0
            return 0.0

        resonance = _mean(phenomenon.resonance_score() for phenomenon in self._phenomena.values())
        if not self._bridges:
            self._resilience_cache = resonance
            return resonance

        connectivity = _mean(bridge.transfer_efficiency() for bridge in self._bridges.values())
        self._resilience_cache = resonance * (0.6 + 0.4 * min(1.0, connectivity / (resonance + 1e-9)))
        return self._resilience_cache

    def topology_metrics(self) -> Mapping[str, float]:
        """Return aggregate metrics describing the current network topology."""

        if self._metrics_cache is not None:
            return self._metrics_cache

        resonance_scores = [phenomenon.resonance_score() for phenomenon in self._phenomena.values()]
        bridge_efficiencies = [bridge.transfer_efficiency() for bridge in self._bridges.values()]
        volatility = [phenomenon.volatility for phenomenon in self._phenomena.values()]

        metrics = {
            "phenomena": float(len(self._phenomena)),
            "bridges": float(len(self._bridges)),
            "mean_resonance": _mean(resonance_scores),
            "mean_bridge_efficiency": _mean(bridge_efficiencies),
            "volatility_index": _mean(volatility),
        }
        self._metrics_cache = MappingProxyType(metrics)
        return self._metrics_cache

    def snapshot(self) -> Mapping[str, object]:
        ordered_phenomena = sorted(self._phenomena.values(), key=lambda phenomenon: phenomenon.identifier)
        ordered_bridges = sorted(
            self._bridges.values(),
            key=lambda bridge: (bridge.source, bridge.target),
        )

        return {
            "phenomena": [
                {
                    "identifier": phenomenon.identifier,
                    "magnitude": phenomenon.magnitude,
                    "volatility": phenomenon.volatility,
                    "signals": [signal.identifier for signal in phenomenon.signals],
                }
                for phenomenon in ordered_phenomena
            ],
            "bridges": [
                {
                    "source": bridge.source,
                    "target": bridge.target,
                    "stability": bridge.stability,
                }
                for bridge in ordered_bridges
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
            "metrics": self.topology_metrics(),
        }
