"""Dynamic astronomy orchestration primitives for adaptive observation planning."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timedelta, timezone
from enum import Enum, IntEnum
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "CelestialEventType",
    "CelestialEvent",
    "TelescopeProfile",
    "ObservatorySite",
    "ObservationPriority",
    "ObservationRequest",
    "ObservationStatus",
    "ObservationLogEntry",
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


def _clamp(value: float | int | None, *, lower: float = 0.0, upper: float = 1.0, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if numeric != numeric or numeric in {float("inf"), float("-inf")}:
        return default
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_range(values: Sequence[float], *, minimum_span: float = 1e-6) -> tuple[float, float]:
    if len(values) != 2:
        raise ValueError("range must contain exactly two values")
    start, stop = float(values[0]), float(values[1])
    if stop < start:
        start, stop = stop, start
    if stop - start < minimum_span:
        stop = start + minimum_span
    return (start, stop)


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for item in values:
        cleaned = item.strip()
        lowered = cleaned.lower()
        if cleaned and lowered not in seen:
            seen.add(lowered)
            normalised.append(cleaned)
    return tuple(normalised)


def _mean(values: Iterable[float]) -> float:
    data = [float(item) for item in values]
    if not data:
        return 0.0
    return sum(data) / len(data)


# ---------------------------------------------------------------------------
# data models


class CelestialEventType(str, Enum):
    """Enumeration of supported celestial events."""

    TRANSIT = "transit"
    OCCULTATION = "occultation"
    SUPERNOVA = "supernova"
    METEOR_SHOWER = "meteor_shower"
    COMETARY = "cometary"
    GRAVITATIONAL_WAVE = "gravitational_wave"


@dataclass(slots=True)
class CelestialEvent:
    """Representation of a time-bound celestial event."""

    identifier: str
    event_type: CelestialEventType | str
    start_time: datetime
    end_time: datetime
    magnitude: float
    right_ascension_deg: float
    declination_deg: float
    probability: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        if isinstance(self.event_type, str):
            self.event_type = CelestialEventType(self.event_type.lower())
        self.start_time = _ensure_tzaware(self.start_time)
        self.end_time = _ensure_tzaware(self.end_time)
        if self.end_time <= self.start_time:
            raise ValueError("end_time must occur after start_time")
        self.magnitude = float(self.magnitude)
        self.right_ascension_deg = float(self.right_ascension_deg) % 360.0
        dec = float(self.declination_deg)
        if not -90.0 <= dec <= 90.0:
            raise ValueError("declination must be between -90 and 90 degrees")
        self.declination_deg = dec
        self.probability = _clamp(self.probability, default=1.0)
        self.tags = _normalise_tags(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    @property
    def duration(self) -> timedelta:
        return self.end_time - self.start_time

    def overlaps(self, other: "CelestialEvent") -> bool:
        return not (self.end_time <= other.start_time or other.end_time <= self.start_time)


@dataclass(slots=True)
class TelescopeProfile:
    """Description of an observatory instrument."""

    name: str
    aperture_m: float
    field_of_view_deg: float
    wavelength_range_nm: tuple[float, float]
    sensitivity_index: float = 0.5
    supported_events: tuple[CelestialEventType, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.aperture_m = max(float(self.aperture_m), 0.0)
        self.field_of_view_deg = max(float(self.field_of_view_deg), 0.0)
        self.wavelength_range_nm = _normalise_range(self.wavelength_range_nm, minimum_span=0.1)
        self.sensitivity_index = _clamp(self.sensitivity_index, default=0.5)
        if not self.supported_events:
            self.supported_events = tuple(CelestialEventType)
        else:
            normalised: list[CelestialEventType] = []
            for item in self.supported_events:
                if isinstance(item, CelestialEventType):
                    normalised.append(item)
                else:
                    normalised.append(CelestialEventType(str(item).lower()))
            self.supported_events = tuple(dict.fromkeys(normalised))
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def supports(self, event_type: CelestialEventType | str) -> bool:
        if isinstance(event_type, str):
            event_type = CelestialEventType(event_type.lower())
        return event_type in self.supported_events

    def sensitivity_for(self, event: CelestialEvent) -> float:
        penalty = 0.0
        if not self.supports(event.event_type):
            penalty += 0.3
        if event.magnitude > 20:
            penalty += 0.2
        return max(0.0, self.sensitivity_index - penalty)

    def with_sensitivity(self, value: float) -> "TelescopeProfile":
        return replace(self, sensitivity_index=_clamp(value, default=self.sensitivity_index))


@dataclass(slots=True)
class ObservatorySite:
    """Representation of an observation site with installed telescopes."""

    name: str
    latitude_deg: float
    longitude_deg: float
    elevation_m: float
    sky_quality_index: float = 0.5
    telescopes: tuple[TelescopeProfile, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        lat = float(self.latitude_deg)
        if not -90.0 <= lat <= 90.0:
            raise ValueError("latitude must be between -90 and 90 degrees")
        self.latitude_deg = lat
        lon = float(self.longitude_deg)
        if not -180.0 <= lon <= 180.0:
            raise ValueError("longitude must be between -180 and 180 degrees")
        self.longitude_deg = lon
        self.elevation_m = max(float(self.elevation_m), -500.0)
        self.sky_quality_index = _clamp(self.sky_quality_index, default=0.5)
        normalised_telescopes: list[TelescopeProfile] = []
        seen: set[str] = set()
        for telescope in self.telescopes:
            if isinstance(telescope, TelescopeProfile):
                profile = telescope
            elif isinstance(telescope, Mapping):
                profile = TelescopeProfile(**telescope)
            else:
                raise TypeError("telescopes must be TelescopeProfile instances or mappings")
            key = profile.name.lower()
            if key not in seen:
                seen.add(key)
                normalised_telescopes.append(profile)
        self.telescopes = tuple(normalised_telescopes)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def telescope(self, name: str) -> TelescopeProfile | None:
        key = name.strip().lower()
        for profile in self.telescopes:
            if profile.name.lower() == key:
                return profile
        return None

    def score_event_visibility(self, event: CelestialEvent) -> float:
        altitude_factor = _clamp(1.0 - abs(event.declination_deg - self.latitude_deg) / 90.0)
        return _mean([self.sky_quality_index, altitude_factor])


class ObservationPriority(IntEnum):
    """Priority levels for scheduling observations."""

    LOW = 0
    STANDARD = 1
    HIGH = 2
    CRITICAL = 3


@dataclass(slots=True)
class ObservationRequest:
    """A request to observe a celestial event with a specific instrument."""

    event_id: str
    site: str
    telescope: str
    priority: ObservationPriority | int | str = ObservationPriority.STANDARD
    earliest_start: datetime | None = None
    latest_end: datetime | None = None
    required_snr: float = 0.5
    weather_risk: float = 0.3
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.event_id = _normalise_identifier(self.event_id)
        self.site = _normalise_identifier(self.site)
        self.telescope = _normalise_identifier(self.telescope)
        if isinstance(self.priority, ObservationPriority):
            priority_value = self.priority
        elif isinstance(self.priority, str):
            priority_value = ObservationPriority[self.priority.strip().upper()]
        else:
            priority_value = ObservationPriority(int(self.priority))
        self.priority = ObservationPriority(priority_value)
        self.earliest_start = _ensure_tzaware(self.earliest_start)
        self.latest_end = _ensure_tzaware(self.latest_end) if self.latest_end else None
        if self.latest_end and self.latest_end <= self.earliest_start:
            raise ValueError("latest_end must occur after earliest_start")
        self.required_snr = _clamp(self.required_snr, lower=0.1, upper=10.0, default=0.5)
        self.weather_risk = _clamp(self.weather_risk, default=0.3)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    def urgency_score(self) -> float:
        return (self.priority.value + 1) / (ObservationPriority.CRITICAL.value + 1)

    def risk_adjustment(self) -> float:
        return 1.0 - self.weather_risk


class ObservationStatus(str, Enum):
    """Possible states of an observation request."""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ABORTED = "aborted"


@dataclass(slots=True)
class ObservationLogEntry:
    """A log entry describing the outcome of an observation attempt."""

    request: ObservationRequest
    status: ObservationStatus | str
    timestamp: datetime = field(default_factory=_utcnow)
    signal_to_noise: float | None = None
    notes: str | None = None

    def __post_init__(self) -> None:
        if isinstance(self.status, str):
            self.status = ObservationStatus(self.status.lower())
        self.timestamp = _ensure_tzaware(self.timestamp)
        if self.signal_to_noise is not None:
            self.signal_to_noise = max(0.0, float(self.signal_to_noise))
        if self.notes is not None:
            self.notes = self.notes.strip()

    def is_successful(self) -> bool:
        return self.status == ObservationStatus.COMPLETED and (
            self.signal_to_noise is None or self.signal_to_noise >= self.request.required_snr
        )


# ---------------------------------------------------------------------------
# dynamic controller


class DynamicAstronomy:
    """Coordinator for astronomy events, resources, and observation planning."""

    def __init__(self) -> None:
        self._sites: MutableMapping[str, ObservatorySite] = {}
        self._events: MutableMapping[str, CelestialEvent] = {}
        self._requests: Deque[ObservationRequest] = deque()
        self._history: list[ObservationLogEntry] = []

    # -- registration -----------------------------------------------------

    def register_site(self, site: ObservatorySite | Mapping[str, object]) -> ObservatorySite:
        profile = site if isinstance(site, ObservatorySite) else ObservatorySite(**site)
        self._sites[profile.name.lower()] = profile
        return profile

    def register_event(self, event: CelestialEvent | Mapping[str, object]) -> CelestialEvent:
        record = event if isinstance(event, CelestialEvent) else CelestialEvent(**event)
        self._events[record.identifier.lower()] = record
        return record

    def submit_request(self, request: ObservationRequest | Mapping[str, object]) -> ObservationRequest:
        item = request if isinstance(request, ObservationRequest) else ObservationRequest(**request)
        self._requests.append(item)
        return item

    # -- lookups ----------------------------------------------------------

    def site(self, name: str) -> ObservatorySite | None:
        return self._sites.get(name.strip().lower())

    def event(self, identifier: str) -> CelestialEvent | None:
        return self._events.get(identifier.strip().lower())

    def pending_requests(self) -> tuple[ObservationRequest, ...]:
        return tuple(self._requests)

    def history(self) -> tuple[ObservationLogEntry, ...]:
        return tuple(self._history)

    # -- planning ---------------------------------------------------------

    def evaluate_request(self, request: ObservationRequest) -> float:
        event = self.event(request.event_id)
        site = self.site(request.site)
        if event is None or site is None:
            return 0.0
        telescope = site.telescope(request.telescope)
        if telescope is None:
            return 0.0
        visibility = site.score_event_visibility(event)
        sensitivity = telescope.sensitivity_for(event)
        urgency = request.urgency_score()
        risk = request.risk_adjustment()
        base_score = _mean([visibility, sensitivity, urgency, risk])
        # emphasise higher priority by slight quadratic boost
        return _clamp(base_score * (1.0 + 0.2 * urgency), default=0.0)

    def next_request(self) -> ObservationRequest | None:
        if not self._requests:
            return None
        sorted_requests = sorted(self._requests, key=self.evaluate_request, reverse=True)
        chosen = sorted_requests[0]
        self._requests = deque(item for item in self._requests if item is not chosen)
        return chosen

    def plan_observations(self, limit: int | None = None) -> list[ObservationRequest]:
        planned: list[ObservationRequest] = []
        remaining = limit if limit is not None else len(self._requests)
        while remaining and self._requests:
            request = self.next_request()
            if request is None:
                break
            planned.append(request)
            remaining -= 1
        return planned

    # -- logging ----------------------------------------------------------

    def record_observation(self, entry: ObservationLogEntry | Mapping[str, object]) -> ObservationLogEntry:
        log_entry = entry if isinstance(entry, ObservationLogEntry) else ObservationLogEntry(**entry)
        self._history.append(log_entry)
        return log_entry

    def success_rate(self, *, window: int | None = None) -> float:
        history = self._history[-window:] if window else self._history
        if not history:
            return 0.0
        successes = sum(1 for entry in history if entry.is_successful())
        return successes / len(history)

    def utilisation_index(self) -> float:
        if not self._history:
            return 0.0
        scheduled = sum(1 for entry in self._history if entry.status == ObservationStatus.SCHEDULED)
        completed = sum(1 for entry in self._history if entry.status == ObservationStatus.COMPLETED)
        if scheduled == 0:
            return 1.0
        return completed / scheduled

    # -- maintenance ------------------------------------------------------

    def prune_events(self, *, before: datetime | None = None) -> None:
        cutoff = _ensure_tzaware(before)
        to_remove = [identifier for identifier, event in self._events.items() if event.end_time < cutoff]
        for identifier in to_remove:
            del self._events[identifier]

    def clear_requests(self) -> None:
        self._requests.clear()

    def reset(self) -> None:
        self._sites.clear()
        self._events.clear()
        self._requests.clear()
        self._history.clear()
