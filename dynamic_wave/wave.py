"""Dynamic wave orchestration with adaptive resonance analytics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from math import asin, cos, exp, pi, sin, sqrt
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "WaveformKind",
    "WaveSource",
    "WaveMedium",
    "WaveListener",
    "WaveEvent",
    "WaveSnapshot",
    "DynamicWaveField",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _seconds_since_midnight(moment: datetime) -> float:
    """Return the number of elapsed seconds from the day's start."""

    baseline = moment.replace(hour=0, minute=0, second=0, microsecond=0)
    return (moment - baseline).total_seconds()


def _normalise_identifier(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _clamp(value: float | int | None, *, lower: float = 0.0, upper: float = 1.0, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive
        return default
    if numeric != numeric:  # NaN check
        return default
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_vector(values: Sequence[float] | None) -> tuple[float, float, float]:
    if values is None:
        return (0.0, 0.0, 0.0)
    items = list(values)
    if len(items) != 3:
        raise ValueError("vectors must contain three components")
    normalised: list[float] = []
    for item in items:
        try:
            normalised.append(float(item))
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
            raise ValueError("vector components must be numeric") from exc
    return normalised[0], normalised[1], normalised[2]


def _distance(a: Sequence[float], b: Sequence[float]) -> float:
    ax, ay, az = a
    bx, by, bz = b
    return sqrt((ax - bx) ** 2 + (ay - by) ** 2 + (az - bz) ** 2)


def _ensure_source(value: WaveSource | Mapping[str, object]) -> WaveSource:
    if isinstance(value, WaveSource):
        return value
    if isinstance(value, Mapping):
        return WaveSource(**value)
    raise TypeError("sources must be WaveSource instances or mappings")


def _ensure_medium(value: WaveMedium | Mapping[str, object]) -> WaveMedium:
    if isinstance(value, WaveMedium):
        return value
    if isinstance(value, Mapping):
        return WaveMedium(**value)
    raise TypeError("media must be WaveMedium instances or mappings")


def _ensure_listener(value: WaveListener | Mapping[str, object]) -> WaveListener:
    if isinstance(value, WaveListener):
        return value
    if isinstance(value, Mapping):
        return WaveListener(**value)
    raise TypeError("listeners must be WaveListener instances or mappings")


# ---------------------------------------------------------------------------
# data models


class WaveformKind(str, Enum):
    """Enumeration of supported waveform archetypes."""

    SINE = "sine"
    SQUARE = "square"
    TRIANGLE = "triangle"
    SAWTOOTH = "sawtooth"
    NOISE = "noise"


@dataclass(slots=True)
class WaveSource:
    """Definition of a coherent wave source in the field."""

    name: str
    kind: WaveformKind | str
    frequency_hz: float
    amplitude: float
    phase: float = 0.0
    coherence: float = 0.5
    decay: float = 0.0
    position: tuple[float, float, float] = field(default_factory=lambda: (0.0, 0.0, 0.0))
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        if isinstance(self.kind, str):
            self.kind = WaveformKind(self.kind.lower())
        self.frequency_hz = max(float(self.frequency_hz), 0.0)
        self.amplitude = max(float(self.amplitude), 0.0)
        self.phase = float(self.phase)
        self.coherence = _clamp(self.coherence, lower=0.0, upper=1.0, default=0.5)
        self.decay = max(float(self.decay), 0.0)
        self.position = _normalise_vector(self.position)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover - guard
            raise TypeError("metadata must be a mapping if provided")
        cleaned_tags: list[str] = []
        seen: set[str] = set()
        for tag in self.tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                cleaned_tags.append(cleaned)
        self.tags = tuple(cleaned_tags)

    def sample(self, time_seconds: float) -> float:
        """Sample the source amplitude at a given time."""

        omega = 2 * pi * self.frequency_hz
        envelope = exp(-self.decay * max(time_seconds, 0.0))
        argument = omega * time_seconds + self.phase
        if self.kind is WaveformKind.SINE:
            return self.amplitude * envelope * sin(argument)
        if self.kind is WaveformKind.SQUARE:
            return self.amplitude * envelope * (1.0 if sin(argument) >= 0 else -1.0)
        if self.kind is WaveformKind.TRIANGLE:
            return self.amplitude * envelope * (2 / pi) * asin(sin(argument))
        if self.kind is WaveformKind.SAWTOOTH:
            return self.amplitude * envelope * (2 / pi) * (((argument / pi) % 2) - 1)
        if self.kind is WaveformKind.NOISE:
            # Deterministic pseudo-random derived from coherence for reproducibility
            return self.amplitude * envelope * ((sin(argument * 1.618) + cos(argument * 2.414)) / 2.0)
        return 0.0


@dataclass(slots=True)
class WaveMedium:
    """Properties describing the propagation medium."""

    name: str
    propagation_speed: float
    attenuation: float = 0.01
    dispersion: float = 0.0
    refraction_index: float = 1.0
    impedance: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.propagation_speed = max(float(self.propagation_speed), 0.0)
        self.attenuation = max(float(self.attenuation), 0.0)
        self.dispersion = max(float(self.dispersion), 0.0)
        self.refraction_index = max(float(self.refraction_index), 0.0)
        self.impedance = max(float(self.impedance), 0.0)
        cleaned_tags: list[str] = []
        seen: set[str] = set()
        for tag in self.tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                cleaned_tags.append(cleaned)
        self.tags = tuple(cleaned_tags)

    def propagation_delay(self, distance: float) -> float:
        if self.propagation_speed <= 0:
            return float("inf")
        return max(distance, 0.0) / self.propagation_speed


@dataclass(slots=True)
class WaveListener:
    """Observer capturing measurements from the field."""

    name: str
    position: tuple[float, float, float]
    sensitivity: float = 1.0
    bandwidth_hz: float = 1000.0
    gain: float = 1.0
    noise_floor: float = 0.01
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.position = _normalise_vector(self.position)
        self.sensitivity = max(float(self.sensitivity), 0.0)
        self.bandwidth_hz = max(float(self.bandwidth_hz), 0.0)
        self.gain = max(float(self.gain), 0.0)
        self.noise_floor = max(float(self.noise_floor), 0.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class WaveEvent:
    """Record of notable wave dynamics."""

    timestamp: datetime
    description: str
    intensity: float
    listener: str | None = None
    source: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.description = _normalise_identifier(self.description)
        self.intensity = max(float(self.intensity), 0.0)
        cleaned_tags: list[str] = []
        seen: set[str] = set()
        for tag in self.tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in seen:
                seen.add(cleaned)
                cleaned_tags.append(cleaned)
        self.tags = tuple(cleaned_tags)


@dataclass(slots=True)
class WaveSnapshot:
    """Synthesis of the wave field at a specific moment."""

    timestamp: datetime
    medium: WaveMedium
    listener_intensity: Mapping[str, float]
    dominant_frequency: float
    aggregate_energy: float
    coherence_index: float
    alerts: tuple[str, ...]

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if not isinstance(self.listener_intensity, Mapping):  # pragma: no cover - guard
            raise TypeError("listener_intensity must be a mapping")
        self.dominant_frequency = max(float(self.dominant_frequency), 0.0)
        self.aggregate_energy = max(float(self.aggregate_energy), 0.0)
        self.coherence_index = _clamp(self.coherence_index, lower=0.0, upper=1.0, default=0.0)
        self.alerts = tuple(alert.strip() for alert in self.alerts if alert.strip())


# ---------------------------------------------------------------------------
# engine


class DynamicWaveField:
    """Dynamic wave manager orchestrating sources, media, and listeners."""

    def __init__(self, *, max_history: int = 120) -> None:
        if max_history <= 0:
            raise ValueError("max_history must be positive")
        self._sources: MutableMapping[str, WaveSource] = {}
        self._media: MutableMapping[str, WaveMedium] = {}
        self._listeners: MutableMapping[str, WaveListener] = {}
        self._history: Deque[WaveSnapshot] = deque(maxlen=max_history)
        self._events: Deque[WaveEvent] = deque(maxlen=max_history * 2)
        self._default_medium: str | None = None

    @property
    def sources(self) -> Mapping[str, WaveSource]:
        return dict(self._sources)

    @property
    def media(self) -> Mapping[str, WaveMedium]:
        return dict(self._media)

    @property
    def listeners(self) -> Mapping[str, WaveListener]:
        return dict(self._listeners)

    @property
    def history(self) -> Sequence[WaveSnapshot]:
        return tuple(self._history)

    @property
    def events(self) -> Sequence[WaveEvent]:
        return tuple(self._events)

    def register_medium(self, medium: WaveMedium | Mapping[str, object], *, default: bool = False) -> WaveMedium:
        resolved = _ensure_medium(medium)
        self._media[resolved.name] = resolved
        if default or self._default_medium is None:
            self._default_medium = resolved.name
        return resolved

    def upsert_source(self, source: WaveSource | Mapping[str, object]) -> WaveSource:
        resolved = _ensure_source(source)
        self._sources[resolved.name] = resolved
        return resolved

    def attach_listener(self, listener: WaveListener | Mapping[str, object]) -> WaveListener:
        resolved = _ensure_listener(listener)
        self._listeners[resolved.name] = resolved
        return resolved

    def remove_source(self, name: str) -> None:
        self._sources.pop(name, None)

    def remove_listener(self, name: str) -> None:
        self._listeners.pop(name, None)

    def select_medium(self, name: str) -> WaveMedium:
        if name not in self._media:
            raise KeyError(f"unknown medium '{name}'")
        self._default_medium = name
        return self._media[name]

    def measure(self, *, medium: str | None = None, timestamp: datetime | None = None) -> WaveSnapshot:
        if not self._sources:
            raise RuntimeError("no sources registered")
        if not self._listeners:
            raise RuntimeError("no listeners registered")
        medium_name = medium or self._default_medium
        if medium_name is None:
            raise RuntimeError("no medium selected")
        if medium_name not in self._media:
            raise KeyError(f"unknown medium '{medium_name}'")
        medium_obj = self._media[medium_name]
        instant = timestamp or _utcnow()

        intensities: dict[str, float] = {}
        weighted_frequency = 0.0
        total_weight = 0.0
        total_energy = 0.0
        coherence_accumulator = 0.0
        alert_messages: list[str] = []

        elapsed_seconds = _seconds_since_midnight(instant)
        sources = tuple(self._sources.values())
        listeners = tuple(self._listeners.values())
        inverse_speed = (
            1.0 / medium_obj.propagation_speed if medium_obj.propagation_speed > 0 else None
        )

        for listener in listeners:
            listener_intensity = self._measure_listener(
                listener,
                medium_obj,
                elapsed=elapsed_seconds,
                sources=sources,
                inverse_speed=inverse_speed,
            )
            intensities[listener.name] = listener_intensity
            total_energy += listener_intensity ** 2
            if listener_intensity > listener.noise_floor * 10:
                alert_messages.append(
                    f"listener {listener.name} intensity {listener_intensity:.3f} exceeds safe threshold"
                )

        for source in sources:
            power = source.amplitude * max(source.coherence, 0.01)
            weighted_frequency += source.frequency_hz * power
            total_weight += power
            coherence_accumulator += source.coherence

        dominant_frequency = weighted_frequency / total_weight if total_weight else 0.0
        coherence_index = coherence_accumulator / len(self._sources) if self._sources else 0.0

        snapshot = WaveSnapshot(
            timestamp=instant,
            medium=medium_obj,
            listener_intensity=intensities,
            dominant_frequency=dominant_frequency,
            aggregate_energy=total_energy,
            coherence_index=coherence_index,
            alerts=tuple(alert_messages),
        )
        self._history.append(snapshot)
        for alert in snapshot.alerts:
            self._events.append(
                WaveEvent(
                    timestamp=instant,
                    description=alert,
                    intensity=total_energy ** 0.5,
                )
            )
        return snapshot

    def _measure_listener(
        self,
        listener: WaveListener,
        medium: WaveMedium,
        *,
        elapsed: float,
        sources: Sequence[WaveSource],
        inverse_speed: float | None,
    ) -> float:
        if not sources:
            return max(listener.noise_floor, 0.0)

        attenuation_coefficient = medium.attenuation
        dispersion_coefficient = medium.dispersion
        use_dispersion = dispersion_coefficient > 0.0
        bandwidth = listener.bandwidth_hz
        sensitivity = listener.sensitivity
        gain = listener.gain
        noise_floor = listener.noise_floor
        listener_position = listener.position
        signal_sum = 0.0
        for source in sources:
            if source.amplitude <= 0.0:
                continue
            distance = _distance(listener_position, source.position) or 0.001
            if inverse_speed is None:
                sample_time = 0.0
            else:
                delay = distance * inverse_speed
                sample_time = max(elapsed - delay, 0.0)
            contribution = source.sample(sample_time)
            attenuation = 1.0 / (1.0 + attenuation_coefficient * distance)
            if use_dispersion:
                dispersion = exp(-dispersion_coefficient * distance)
            else:
                dispersion = 1.0
            frequency = source.frequency_hz
            if frequency <= bandwidth:
                window = 1.0
            else:
                window = bandwidth / (frequency + 1e-9)
            signal_sum += contribution * attenuation * dispersion * window
        measurement = abs(signal_sum) * sensitivity * gain
        measurement = max(measurement, noise_floor)
        return measurement

    def decay_sources(self, factor: float) -> None:
        if factor <= 0:
            raise ValueError("factor must be positive")
        for name, source in list(self._sources.items()):
            decayed = replace(source, amplitude=max(source.amplitude * factor, 0.0))
            if decayed.amplitude <= 1e-6:
                self._sources.pop(name)
            else:
                self._sources[name] = decayed

    def log_event(self, description: str, *, intensity: float, listener: str | None = None, source: str | None = None) -> WaveEvent:
        event = WaveEvent(
            timestamp=_utcnow(),
            description=description,
            intensity=intensity,
            listener=listener,
            source=source,
        )
        self._events.append(event)
        return event

    def replay(self) -> Iterable[WaveSnapshot]:
        return tuple(self._history)

    def recent_activity(self, limit: int = 5) -> tuple[WaveEvent, ...]:
        if limit <= 0:
            return ()
        return tuple(list(self._events)[-limit:])
