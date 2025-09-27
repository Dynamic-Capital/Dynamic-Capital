"""Dynamic interplanetary navigation and situational awareness models."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CelestialBody",
    "TransferWindow",
    "SpaceWeatherEvent",
    "NavigationSegment",
    "NavigationAssessment",
    "OrbitalClassification",
    "DynamicInterplanetarySpace",
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


def _normalise_identifier(value: str) -> str:
    text = value.strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _identifier_key(value: str) -> str:
    return _normalise_identifier(value).lower()


def _clamp(value: float, *, minimum: float = 0.0, maximum: float = 1.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return minimum
    if numeric != numeric:  # NaN check
        return minimum
    if numeric < minimum:
        return minimum
    if numeric > maximum:
        return maximum
    return numeric


def _positive(value: float, *, default: float = 0.0) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return max(default, 0.0)
    if numeric < 0.0:
        return 0.0
    return numeric


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        cleaned = item.strip()
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_time_window(values: Sequence[datetime]) -> tuple[datetime, datetime]:
    if len(values) != 2:
        raise ValueError("time window must contain exactly two datetime values")
    start = _ensure_tzaware(values[0])
    end = _ensure_tzaware(values[1])
    if end < start:
        start, end = end, start
    if end == start:
        end = start + timedelta(minutes=1)
    return (start, end)


def _mean(values: Iterable[float]) -> float:
    data = [float(value) for value in values if value is not None]
    if not data:
        return 0.0
    return float(fmean(data))


# ---------------------------------------------------------------------------
# domain models


class OrbitalClassification(str, Enum):
    """Enumeration of supported celestial body categories."""

    STAR = "star"
    PLANET = "planet"
    MOON = "moon"
    ASTEROID = "asteroid"
    STATION = "station"
    COMET = "comet"

    @classmethod
    def from_value(cls, value: str | "OrbitalClassification") -> "OrbitalClassification":
        if isinstance(value, cls):
            return value
        cleaned = value.strip().lower()
        try:
            return cls(cleaned)
        except ValueError as exc:
            raise ValueError(f"unsupported orbital classification: {value!r}") from exc


@dataclass(slots=True)
class CelestialBody:
    """Representation of a celestial body participating in interplanetary travel."""

    identifier: str
    classification: OrbitalClassification
    mass_kg: float
    radius_km: float
    orbital_radius_au: float | None = None
    surface_gravity_ms2: float | None = None
    habitability_index: float = 0.3
    hazard_index: float = 0.2
    influence_zones: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.classification = OrbitalClassification.from_value(self.classification)
        self.mass_kg = _positive(self.mass_kg, default=1.0)
        self.radius_km = _positive(self.radius_km, default=1.0)
        if self.orbital_radius_au is not None:
            self.orbital_radius_au = _positive(self.orbital_radius_au, default=0.1)
        if self.surface_gravity_ms2 is not None:
            self.surface_gravity_ms2 = _positive(self.surface_gravity_ms2, default=0.1)
        self.habitability_index = _clamp(self.habitability_index)
        self.hazard_index = _clamp(self.hazard_index)
        self.influence_zones = _normalise_tuple(self.influence_zones)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping when provided")

    @property
    def key(self) -> str:
        return self.identifier.lower()

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "identifier": self.identifier,
            "classification": self.classification.value,
            "mass_kg": self.mass_kg,
            "radius_km": self.radius_km,
            "habitability_index": self.habitability_index,
            "hazard_index": self.hazard_index,
            "influence_zones": list(self.influence_zones),
        }
        if self.orbital_radius_au is not None:
            payload["orbital_radius_au"] = self.orbital_radius_au
        if self.surface_gravity_ms2 is not None:
            payload["surface_gravity_ms2"] = self.surface_gravity_ms2
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class TransferWindow:
    """Feasible orbital transfer opportunity between two bodies."""

    origin: str
    destination: str
    departure_window: tuple[datetime, datetime]
    delta_v_kms: float
    travel_time_days: float
    reliability: float = 0.7
    alignment_score: float = 0.5
    supporting_bodies: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.origin = _normalise_identifier(self.origin)
        self.destination = _normalise_identifier(self.destination)
        self.departure_window = _normalise_time_window(self.departure_window)
        self.delta_v_kms = _positive(self.delta_v_kms, default=0.1)
        self.travel_time_days = _positive(self.travel_time_days, default=1.0)
        self.reliability = _clamp(self.reliability)
        self.alignment_score = _clamp(self.alignment_score)
        self.supporting_bodies = _normalise_tuple(self.supporting_bodies)

    @property
    def key(self) -> tuple[str, str]:
        return (self.origin.lower(), self.destination.lower())

    def midpoint(self) -> datetime:
        start, end = self.departure_window
        return start + (end - start) / 2


@dataclass(slots=True)
class SpaceWeatherEvent:
    """Space weather impact affecting specific celestial bodies."""

    event_type: str
    severity: float
    start: datetime
    end: datetime
    affected_bodies: tuple[str, ...] = field(default_factory=tuple)
    description: str | None = None

    def __post_init__(self) -> None:
        self.event_type = _normalise_identifier(self.event_type)
        self.severity = _clamp(self.severity)
        window = _normalise_time_window((self.start, self.end))
        self.start, self.end = window
        self.affected_bodies = tuple(_identifier_key(body) for body in self.affected_bodies)
        if self.description is not None:
            self.description = self.description.strip() or None

    @property
    def duration_hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600.0


@dataclass(slots=True)
class NavigationSegment:
    """Single leg of an interplanetary itinerary with contextual advisories."""

    origin: str
    destination: str
    delta_v_kms: float
    travel_time_days: float
    reliability: float
    risk_index: float
    weather_events: tuple[SpaceWeatherEvent, ...]
    advisory: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "origin": self.origin,
            "destination": self.destination,
            "delta_v_kms": self.delta_v_kms,
            "travel_time_days": self.travel_time_days,
            "reliability": self.reliability,
            "risk_index": self.risk_index,
            "weather_events": [
                {
                    "event_type": event.event_type,
                    "severity": event.severity,
                    "start": event.start.isoformat(),
                    "end": event.end.isoformat(),
                }
                for event in self.weather_events
            ],
            "advisory": self.advisory,
        }


@dataclass(slots=True)
class NavigationAssessment:
    """Aggregate itinerary assessment across multiple navigation segments."""

    segments: tuple[NavigationSegment, ...]
    total_delta_v_kms: float
    total_travel_days: float
    composite_risk: float
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "total_delta_v_kms": self.total_delta_v_kms,
            "total_travel_days": self.total_travel_days,
            "composite_risk": self.composite_risk,
            "narrative": self.narrative,
            "segments": [segment.as_dict() for segment in self.segments],
        }


# ---------------------------------------------------------------------------
# orchestrator


class DynamicInterplanetarySpace:
    """Manage interplanetary bodies, transfer windows, and space weather."""

    def __init__(self, *, weather_history: int = 128) -> None:
        if weather_history <= 0:
            raise ValueError("weather_history must be positive")
        self._bodies: MutableMapping[str, CelestialBody] = {}
        self._routes: MutableMapping[tuple[str, str], list[TransferWindow]] = defaultdict(list)
        self._weather: Deque[SpaceWeatherEvent] = deque(maxlen=weather_history)

    # -------------------------------------------------------------- body registry
    def register_body(
        self, body: CelestialBody | Mapping[str, object]
    ) -> CelestialBody:
        resolved = self._coerce_body(body)
        self._bodies[resolved.key] = resolved
        return resolved

    def extend_bodies(self, bodies: Iterable[CelestialBody | Mapping[str, object]]) -> None:
        for body in bodies:
            self.register_body(body)

    def get_body(self, identifier: str) -> CelestialBody | None:
        return self._bodies.get(_identifier_key(identifier))

    # -------------------------------------------------------------- transfer windows
    def add_transfer_window(
        self, window: TransferWindow | Mapping[str, object]
    ) -> TransferWindow:
        resolved = self._coerce_window(window)
        key = resolved.key
        routes = self._routes[key]
        routes.append(resolved)
        routes.sort(key=lambda item: item.departure_window[0])
        return resolved

    def extend_transfer_windows(
        self, windows: Iterable[TransferWindow | Mapping[str, object]]
    ) -> None:
        for window in windows:
            self.add_transfer_window(window)

    def available_windows(self, origin: str, destination: str) -> tuple[TransferWindow, ...]:
        key = (_identifier_key(origin), _identifier_key(destination))
        return tuple(self._routes.get(key, ()))

    # -------------------------------------------------------------- weather intake
    def record_space_weather(
        self, event: SpaceWeatherEvent | Mapping[str, object]
    ) -> SpaceWeatherEvent:
        resolved = self._coerce_weather(event)
        self._weather.append(resolved)
        return resolved

    def extend_space_weather(
        self, events: Iterable[SpaceWeatherEvent | Mapping[str, object]]
    ) -> None:
        for event in events:
            self.record_space_weather(event)

    def recent_space_weather(self) -> tuple[SpaceWeatherEvent, ...]:
        return tuple(self._weather)

    # -------------------------------------------------------------- itinerary synthesis
    def evaluate_itinerary(
        self,
        itinerary: Sequence[str],
        *,
        departure: datetime | None = None,
    ) -> NavigationAssessment:
        if len(itinerary) < 2:
            raise ValueError("itinerary must contain at least two waypoints")
        waypoints = [_normalise_identifier(item) for item in itinerary]
        slug_sequence = [_identifier_key(item) for item in waypoints]
        segments: list[NavigationSegment] = []
        departure_time = _ensure_tzaware(departure) if departure is not None else None

        for index in range(len(slug_sequence) - 1):
            origin_slug = slug_sequence[index]
            destination_slug = slug_sequence[index + 1]
            window = self._select_window(origin_slug, destination_slug, departure_time)
            if window is None:
                raise LookupError(
                    f"no transfer window available between {waypoints[index]} and {waypoints[index + 1]}"
                )
            departure_time = self._determine_departure(window, fallback=departure_time)
            arrival_time = departure_time + timedelta(days=window.travel_time_days)
            weather = self._relevant_weather(origin_slug, destination_slug, departure_time, arrival_time)
            hazard = self._segment_hazard(origin_slug, destination_slug)
            risk = self._segment_risk(window, weather, hazard)
            advisory = self._compose_advisory(window, weather, hazard)
            segment = NavigationSegment(
                origin=waypoints[index],
                destination=waypoints[index + 1],
                delta_v_kms=window.delta_v_kms,
                travel_time_days=window.travel_time_days,
                reliability=window.reliability,
                risk_index=risk,
                weather_events=weather,
                advisory=advisory,
            )
            segments.append(segment)
            departure_time = arrival_time

        total_delta_v = sum(segment.delta_v_kms for segment in segments)
        total_travel_days = sum(segment.travel_time_days for segment in segments)
        composite_risk = _clamp(_mean(segment.risk_index for segment in segments))
        narrative = self._compose_narrative(segments, composite_risk)
        return NavigationAssessment(
            segments=tuple(segments),
            total_delta_v_kms=total_delta_v,
            total_travel_days=total_travel_days,
            composite_risk=composite_risk,
            narrative=narrative,
        )

    # -------------------------------------------------------------- internal helpers
    def _coerce_body(self, body: CelestialBody | Mapping[str, object]) -> CelestialBody:
        if isinstance(body, CelestialBody):
            return body
        if not isinstance(body, Mapping):
            raise TypeError("body must be a CelestialBody or mapping")
        return CelestialBody(**body)

    def _coerce_window(self, window: TransferWindow | Mapping[str, object]) -> TransferWindow:
        if isinstance(window, TransferWindow):
            return window
        if not isinstance(window, Mapping):
            raise TypeError("window must be a TransferWindow or mapping")
        return TransferWindow(**window)

    def _coerce_weather(self, event: SpaceWeatherEvent | Mapping[str, object]) -> SpaceWeatherEvent:
        if isinstance(event, SpaceWeatherEvent):
            return event
        if not isinstance(event, Mapping):
            raise TypeError("event must be a SpaceWeatherEvent or mapping")
        return SpaceWeatherEvent(**event)

    def _select_window(
        self,
        origin_slug: str,
        destination_slug: str,
        departure_time: datetime | None,
    ) -> TransferWindow | None:
        windows = self._routes.get((origin_slug, destination_slug))
        if not windows:
            return None
        if departure_time is None:
            return windows[0]
        for window in windows:
            start, end = window.departure_window
            if start <= departure_time <= end:
                return window
        for window in windows:
            if window.departure_window[0] >= departure_time:
                return window
        return windows[-1]

    def _determine_departure(
        self,
        window: TransferWindow,
        *,
        fallback: datetime | None,
    ) -> datetime:
        if fallback is not None and window.departure_window[0] <= fallback <= window.departure_window[1]:
            return fallback
        return window.departure_window[0]

    def _relevant_weather(
        self,
        origin: str,
        destination: str,
        departure: datetime,
        arrival: datetime,
    ) -> tuple[SpaceWeatherEvent, ...]:
        affected_keys = {origin, destination}
        relevant: list[SpaceWeatherEvent] = []
        for event in self._weather:
            if not event.affected_bodies:
                continue
            if not affected_keys.intersection(event.affected_bodies):
                continue
            if event.end < departure or event.start > arrival:
                continue
            relevant.append(event)
        return tuple(relevant)

    def _segment_hazard(self, origin: str, destination: str) -> float:
        origin_body = self._bodies.get(origin)
        destination_body = self._bodies.get(destination)
        hazards = []
        if origin_body is not None:
            hazards.append(origin_body.hazard_index)
        if destination_body is not None:
            hazards.append(destination_body.hazard_index)
        return _mean(hazards) if hazards else 0.2

    def _segment_risk(
        self,
        window: TransferWindow,
        weather: Sequence[SpaceWeatherEvent],
        hazard: float,
    ) -> float:
        weather_risk = _mean(event.severity for event in weather)
        intrinsic_risk = 1.0 - window.reliability
        alignment_risk = 1.0 - window.alignment_score
        combined = (
            intrinsic_risk * 0.35
            + weather_risk * 0.25
            + hazard * 0.2
            + alignment_risk * 0.2
        )
        return _clamp(combined, minimum=0.0, maximum=1.0)

    def _compose_advisory(
        self,
        window: TransferWindow,
        weather: Sequence[SpaceWeatherEvent],
        hazard: float,
    ) -> str:
        advisories: list[str] = []
        if weather:
            descriptors = ", ".join(f"{event.event_type} (severity {event.severity:.2f})" for event in weather)
            advisories.append(f"Space weather alerts: {descriptors}.")
        if hazard > 0.6:
            advisories.append("Destination hazard index elevated; ensure redundant shielding.")
        if window.reliability < 0.5:
            advisories.append("Transfer reliability is marginal; prepare contingency propellant reserves.")
        if window.alignment_score < 0.4:
            advisories.append("Trajectory alignment is suboptimal; expect course corrections.")
        if not advisories:
            advisories.append("Trajectory nominal with minimal external risk factors.")
        return " ".join(advisories)

    def _compose_narrative(
        self,
        segments: Sequence[NavigationSegment],
        composite_risk: float,
    ) -> str:
        origin = segments[0].origin
        destination = segments[-1].destination
        leg_descriptions = ", ".join(
            f"{segment.origin}→{segment.destination} ({segment.risk_index:.2f} risk)"
            for segment in segments
        )
        return (
            f"Interplanetary itinerary from {origin} to {destination} spans {len(segments)} segments "
            f"with composite risk {composite_risk:.2f}. Legs: {leg_descriptions}."
        )

