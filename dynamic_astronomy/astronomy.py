"""Dynamic astronomy engine for orchestrating celestial observations."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ObjectCategory",
    "CelestialObject",
    "Observatory",
    "AstronomyObservation",
    "AstronomySnapshot",
    "AstronomyAlertSeverity",
    "AstronomyAlert",
    "DynamicAstronomy",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(identifier: str) -> str:
    text = str(identifier).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _clamp(
    value: float | int | None,
    *,
    lower: float = 0.0,
    upper: float = 1.0,
    default: float = 0.0,
) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if numeric != numeric:
        return default
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _mean(values: Iterable[float]) -> float:
    data = list(values)
    if not data:
        return 0.0
    return float(fmean(data))


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for item in values:
        cleaned = item.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_observation(value: AstronomyObservation | Mapping[str, object]) -> "AstronomyObservation":
    if isinstance(value, AstronomyObservation):
        return value
    if isinstance(value, Mapping):
        return AstronomyObservation(**value)
    raise TypeError("observations must be AstronomyObservation instances or mappings")


def _ensure_object(value: CelestialObject | Mapping[str, object]) -> "CelestialObject":
    if isinstance(value, CelestialObject):
        return value
    if isinstance(value, Mapping):
        return CelestialObject(**value)
    raise TypeError("objects must be CelestialObject instances or mappings")


def _ensure_observatory(value: Observatory | Mapping[str, object]) -> "Observatory":
    if isinstance(value, Observatory):
        return value
    if isinstance(value, Mapping):
        return Observatory(**value)
    raise TypeError("observatories must be Observatory instances or mappings")


# ---------------------------------------------------------------------------
# data models


class ObjectCategory(str, Enum):
    """Enumeration of supported celestial object classifications."""

    STAR = "star"
    PLANET = "planet"
    MOON = "moon"
    ASTEROID = "asteroid"
    COMET = "comet"
    EXOPLANET = "exoplanet"
    NEBULA = "nebula"
    GALAXY = "galaxy"


@dataclass(slots=True)
class CelestialObject:
    """Representation of a managed celestial object."""

    identifier: str
    category: ObjectCategory | str
    right_ascension: float
    declination: float
    magnitude: float
    temperature_k: float | None = None
    metallicity: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        if isinstance(self.category, str):
            try:
                self.category = ObjectCategory(self.category.lower())
            except ValueError as exc:
                raise ValueError(f"unsupported object category: {self.category}") from exc
        self.right_ascension = float(self.right_ascension)
        self.declination = float(self.declination)
        self.magnitude = float(self.magnitude)
        if self.temperature_k is not None:
            self.temperature_k = float(self.temperature_k)
        self.metallicity = _clamp(self.metallicity, lower=-5.0, upper=5.0, default=0.0)
        self.tags = _normalise_tags(self.tags)

    def with_magnitude(self, value: float) -> "CelestialObject":
        return replace(self, magnitude=float(value))

    def with_temperature(self, value: float | None) -> "CelestialObject":
        return replace(self, temperature_k=None if value is None else float(value))


@dataclass(slots=True)
class Observatory:
    """Description of an observatory contributing data to the engine."""

    identifier: str
    latitude: float
    longitude: float
    capability_index: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.latitude = float(self.latitude)
        self.longitude = float(self.longitude)
        self.capability_index = _clamp(self.capability_index, default=0.5)
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class AstronomyObservation:
    """Single observation collected for an object."""

    object_id: str
    magnitude: float
    spectral_index: float
    confidence: float = 1.0
    captured_at: datetime | None = None
    observatory_id: str | None = None

    def __post_init__(self) -> None:
        self.object_id = _normalise_identifier(self.object_id)
        self.magnitude = float(self.magnitude)
        self.spectral_index = float(self.spectral_index)
        self.confidence = _clamp(self.confidence, default=1.0)
        self.captured_at = _ensure_tzaware(self.captured_at)
        if self.observatory_id is not None:
            self.observatory_id = _normalise_identifier(self.observatory_id)


@dataclass(slots=True)
class AstronomySnapshot:
    """Aggregated state for a celestial object."""

    object: CelestialObject
    recent_magnitude: float
    average_magnitude: float
    spectral_index: float
    trend: float
    last_observation: datetime


class AstronomyAlertSeverity(str, Enum):
    """Severity classification for alerts produced by the engine."""

    INFO = "info"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(slots=True)
class AstronomyAlert:
    """Alert emitted when an observation triggers a notable change."""

    object_id: str
    message: str
    severity: AstronomyAlertSeverity
    triggered_at: datetime
    delta_magnitude: float
    confidence: float


# ---------------------------------------------------------------------------
# engine


class DynamicAstronomy:
    """Coordinator for celestial observations and alerting."""

    def __init__(
        self,
        *,
        max_observations: int = 50,
        magnitude_alert_threshold: float = 1.5,
        low_confidence_threshold: float = 0.4,
    ) -> None:
        if max_observations <= 0:
            raise ValueError("max_observations must be positive")
        self._objects: MutableMapping[str, CelestialObject] = {}
        self._observatories: MutableMapping[str, Observatory] = {}
        self._history: MutableMapping[str, Deque[AstronomyObservation]] = {}
        self._max_observations = int(max_observations)
        self._magnitude_alert_threshold = float(magnitude_alert_threshold)
        self._low_confidence_threshold = _clamp(
            low_confidence_threshold, default=0.4
        )

    # -- registration -----------------------------------------------------

    def register_object(
        self, value: CelestialObject | Mapping[str, object]
    ) -> CelestialObject:
        obj = _ensure_object(value)
        self._objects[obj.identifier] = obj
        self._history.setdefault(obj.identifier, deque(maxlen=self._max_observations))
        return obj

    def register_observatory(
        self, value: Observatory | Mapping[str, object]
    ) -> Observatory:
        observatory = _ensure_observatory(value)
        self._observatories[observatory.identifier] = observatory
        return observatory

    # -- observation ingestion -------------------------------------------

    def ingest(self, value: AstronomyObservation | Mapping[str, object]) -> AstronomyObservation:
        observation = _ensure_observation(value)
        if observation.object_id not in self._objects:
            raise KeyError(f"unknown object: {observation.object_id}")
        if (
            observation.observatory_id is not None
            and observation.observatory_id not in self._observatories
        ):
            raise KeyError(f"unknown observatory: {observation.observatory_id}")
        history = self._history.setdefault(
            observation.object_id, deque(maxlen=self._max_observations)
        )
        history.append(observation)
        obj = self._objects[observation.object_id]
        self._objects[observation.object_id] = obj.with_magnitude(observation.magnitude)
        return observation

    # -- analytics --------------------------------------------------------

    def snapshot(self, object_id: str) -> AstronomySnapshot:
        object_id = _normalise_identifier(object_id)
        if object_id not in self._objects:
            raise KeyError(f"unknown object: {object_id}")
        history = self._history.get(object_id)
        if not history:
            raise ValueError("no observations available for object")
        latest = history[-1]
        magnitudes = [obs.magnitude for obs in history]
        spectral = [obs.spectral_index for obs in history]
        trend = 0.0
        if len(magnitudes) >= 2:
            trend = magnitudes[-1] - magnitudes[0]
        return AstronomySnapshot(
            object=self._objects[object_id],
            recent_magnitude=latest.magnitude,
            average_magnitude=_mean(magnitudes),
            spectral_index=_mean(spectral),
            trend=trend,
            last_observation=latest.captured_at,
        )

    def snapshot_all(self) -> list[AstronomySnapshot]:
        return [self.snapshot(identifier) for identifier in self._objects]

    def detect_alerts(self, object_id: str) -> list[AstronomyAlert]:
        object_id = _normalise_identifier(object_id)
        history = self._history.get(object_id)
        if not history or len(history) < 2:
            return []
        latest = history[-1]
        previous = history[-2]
        delta = latest.magnitude - previous.magnitude
        alerts: list[AstronomyAlert] = []
        severity = AstronomyAlertSeverity.INFO
        if abs(delta) >= self._magnitude_alert_threshold:
            severity = (
                AstronomyAlertSeverity.CRITICAL
                if abs(delta) >= self._magnitude_alert_threshold * 2
                else AstronomyAlertSeverity.WARNING
            )
            alerts.append(
                AstronomyAlert(
                    object_id=object_id,
                    message=(
                        "sudden brightening" if delta < 0 else "rapid dimming"
                    ),
                    severity=severity,
                    triggered_at=latest.captured_at,
                    delta_magnitude=delta,
                    confidence=latest.confidence,
                )
            )
        if latest.confidence <= self._low_confidence_threshold:
            alerts.append(
                AstronomyAlert(
                    object_id=object_id,
                    message="low confidence observation",
                    severity=AstronomyAlertSeverity.WATCH,
                    triggered_at=latest.captured_at,
                    delta_magnitude=delta,
                    confidence=latest.confidence,
                )
            )
        return alerts

    def detect_alerts_all(self) -> list[AstronomyAlert]:
        alerts: list[AstronomyAlert] = []
        for identifier in self._objects:
            alerts.extend(self.detect_alerts(identifier))
        return alerts

    def score_visibility(self, object_id: str, *, observatory_id: str | None = None) -> float:
        object_id = _normalise_identifier(object_id)
        obj = self._objects.get(object_id)
        if obj is None:
            raise KeyError(f"unknown object: {object_id}")
        base_score = _clamp(1.0 / (abs(obj.magnitude) + 1.0), upper=1.0)
        if observatory_id is None:
            return base_score
        observatory_id = _normalise_identifier(observatory_id)
        observatory = self._observatories.get(observatory_id)
        if observatory is None:
            raise KeyError(f"unknown observatory: {observatory_id}")
        modifier = 0.2 * (observatory.capability_index - 0.5)
        return _clamp(base_score + modifier, upper=1.0, lower=0.0)

    # -- utilities --------------------------------------------------------

    def objects(self) -> list[CelestialObject]:
        return list(self._objects.values())

    def observatories(self) -> list[Observatory]:
        return list(self._observatories.values())

    def history(self, object_id: str) -> list[AstronomyObservation]:
        object_id = _normalise_identifier(object_id)
        history = self._history.get(object_id, ())
        return list(history)
