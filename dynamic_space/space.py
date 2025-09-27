"""Dynamic space orchestration primitives with adaptive stability scoring."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "BodyKind",
    "CelestialBody",
    "OrbitalRoute",
    "SpaceSector",
    "SpaceEventSeverity",
    "SpaceEvent",
    "SpaceSnapshot",
    "DynamicSpace",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


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
    except (TypeError, ValueError):  # pragma: no cover - defensive guard
        return default
    if numeric != numeric:  # NaN check
        return default
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


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


def _ensure_body(value: CelestialBody | Mapping[str, object]) -> CelestialBody:
    if isinstance(value, CelestialBody):
        return value
    if isinstance(value, Mapping):
        return CelestialBody(**value)
    raise TypeError("bodies must be CelestialBody instances or mappings")


def _ensure_route(value: OrbitalRoute | Mapping[str, object]) -> OrbitalRoute:
    if isinstance(value, OrbitalRoute):
        return value
    if isinstance(value, Mapping):
        return OrbitalRoute(**value)
    raise TypeError("routes must be OrbitalRoute instances or mappings")


# ---------------------------------------------------------------------------
# data models


class BodyKind(str, Enum):
    """Enumeration of supported celestial body archetypes."""

    PLANET = "planet"
    MOON = "moon"
    STATION = "station"
    ASTEROID = "asteroid"
    COMET = "comet"
    ARTIFICIAL = "artificial"


@dataclass(slots=True)
class CelestialBody:
    """Representation of a celestial body within a managed space sector."""

    name: str
    kind: BodyKind | str
    mass_kg: float
    velocity_kms: float
    resource_index: float = 0.5
    habitability: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        if isinstance(self.kind, str):
            try:
                self.kind = BodyKind(self.kind.lower())
            except ValueError as exc:  # pragma: no cover - defensive branch
                raise ValueError(f"unsupported body kind: {self.kind}") from exc
        if self.mass_kg <= 0:
            raise ValueError("mass_kg must be positive")
        self.velocity_kms = float(self.velocity_kms)
        self.resource_index = _clamp(self.resource_index, default=0.5)
        self.habitability = _clamp(self.habitability, default=0.0)
        self.tags = _normalise_tags(self.tags)

    def with_resource_index(self, value: float) -> "CelestialBody":
        return replace(self, resource_index=_clamp(value, default=self.resource_index))

    def with_habitability(self, value: float) -> "CelestialBody":
        return replace(self, habitability=_clamp(value, default=self.habitability))

    @property
    def momentum(self) -> float:
        """Return a simplified momentum metric for ranking bodies."""

        return self.mass_kg * abs(self.velocity_kms)


@dataclass(slots=True)
class OrbitalRoute:
    """Route linking two celestial bodies with congestion tracking."""

    identifier: str
    origin: str
    destination: str
    delta_v_kms: float
    congestion: float = 0.0
    stability: float = 1.0

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.origin = _normalise_identifier(self.origin)
        self.destination = _normalise_identifier(self.destination)
        if self.origin == self.destination:
            raise ValueError("origin and destination must differ")
        if self.delta_v_kms <= 0:
            raise ValueError("delta_v_kms must be positive")
        self.congestion = _clamp(self.congestion, default=0.0)
        self.stability = _clamp(self.stability, default=1.0)

    def with_congestion(self, value: float) -> "OrbitalRoute":
        return replace(self, congestion=_clamp(value, default=self.congestion))

    def with_stability(self, value: float) -> "OrbitalRoute":
        return replace(self, stability=_clamp(value, default=self.stability))


@dataclass(slots=True)
class SpaceSector:
    """Container for space resources, logistics and stability state."""

    name: str
    bodies: tuple[CelestialBody, ...] = field(default_factory=tuple)
    routes: tuple[OrbitalRoute, ...] = field(default_factory=tuple)
    hazard_index: float = 0.25
    supply_level: float = 0.6
    energy_output_gw: float = 0.0
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        normalised_bodies = [_ensure_body(body) for body in self.bodies]
        normalised_routes = [_ensure_route(route) for route in self.routes]
        self.bodies = tuple(sorted(normalised_bodies, key=lambda body: body.name.lower()))
        self.routes = tuple(sorted(normalised_routes, key=lambda route: route.identifier.lower()))
        self.hazard_index = _clamp(self.hazard_index, default=0.25)
        self.supply_level = _clamp(self.supply_level, default=0.6)
        self.energy_output_gw = float(self.energy_output_gw)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    @property
    def traffic_load(self) -> float:
        if not self.routes:
            return 0.0
        return float(sum(route.congestion for route in self.routes) / len(self.routes))

    @property
    def dominant_body(self) -> CelestialBody | None:
        if not self.bodies:
            return None
        return max(self.bodies, key=lambda body: body.momentum)

    def get_body(self, name: str) -> CelestialBody:
        target = _normalise_identifier(name)
        for body in self.bodies:
            if body.name.lower() == target.lower():
                return body
        raise KeyError(f"body '{name}' not found in sector '{self.name}'")

    def with_routes(self, routes: Sequence[OrbitalRoute | Mapping[str, object]]) -> "SpaceSector":
        updated_routes = tuple(sorted((_ensure_route(route) for route in routes), key=lambda r: r.identifier.lower()))
        return replace(self, routes=updated_routes)


class SpaceEventSeverity(str, Enum):
    """Categorisation of space events by operational impact."""

    INFO = "info"
    ADVISORY = "advisory"
    ALERT = "alert"
    CRITICAL = "critical"


@dataclass(slots=True)
class SpaceEvent:
    """Event emitted when a sector experiences a notable change."""

    sector_name: str
    description: str
    impact_score: float
    severity: SpaceEventSeverity | str = SpaceEventSeverity.INFO
    timestamp: datetime | None = None
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.sector_name = _normalise_identifier(self.sector_name)
        self.description = self.description.strip()
        if not self.description:
            raise ValueError("description must not be empty")
        if isinstance(self.severity, str):
            try:
                self.severity = SpaceEventSeverity(self.severity.lower())
            except ValueError as exc:  # pragma: no cover - defensive branch
                raise ValueError(f"unsupported severity '{self.severity}'") from exc
        self.impact_score = _clamp(self.impact_score, default=0.0)
        self.timestamp = _utcnow() if self.timestamp is None else self._ensure_timezone(self.timestamp)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")

    @staticmethod
    def _ensure_timezone(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


@dataclass(slots=True)
class SpaceSnapshot:
    """Snapshot of the operational state for a managed sector."""

    sector_name: str
    timestamp: datetime
    stability_score: float
    traffic_load: float
    hazard_index: float
    energy_output_gw: float
    recent_events: tuple[SpaceEvent, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, object]:
        return {
            "sector_name": self.sector_name,
            "timestamp": self.timestamp,
            "stability_score": self.stability_score,
            "traffic_load": self.traffic_load,
            "hazard_index": self.hazard_index,
            "energy_output_gw": self.energy_output_gw,
            "recent_events": tuple(self.recent_events),
        }


# ---------------------------------------------------------------------------
# controller


class DynamicSpace:
    """Manager orchestrating sectors, routes and stability forecasting."""

    def __init__(
        self,
        sectors: Sequence[SpaceSector | Mapping[str, object]] | None = None,
        *,
        max_events: int = 256,
    ) -> None:
        self._sectors: MutableMapping[str, SpaceSector] = {}
        self._events: Deque[SpaceEvent] = deque(maxlen=max(10, int(max_events)))
        if sectors:
            for sector in sectors:
                self.register_sector(sector if isinstance(sector, SpaceSector) else SpaceSector(**sector))

    @property
    def sectors(self) -> tuple[SpaceSector, ...]:
        return tuple(sorted(self._sectors.values(), key=lambda sector: sector.name.lower()))

    def register_sector(self, sector: SpaceSector) -> None:
        self._sectors[sector.name] = sector

    def get_sector(self, name: str) -> SpaceSector:
        normalised = _normalise_identifier(name)
        try:
            return self._sectors[normalised]
        except KeyError as exc:
            raise KeyError(f"sector '{name}' not registered") from exc

    def record_event(self, event: SpaceEvent | Mapping[str, object]) -> SpaceEvent:
        normalised = event if isinstance(event, SpaceEvent) else SpaceEvent(**event)
        self._events.append(normalised)
        if normalised.sector_name not in self._sectors:
            # auto-register minimal placeholder to allow monitoring before onboarding
            self._sectors.setdefault(
                normalised.sector_name,
                SpaceSector(name=normalised.sector_name, hazard_index=0.3, supply_level=0.5),
            )
        return normalised

    def _events_for_sector(self, sector_name: str) -> tuple[SpaceEvent, ...]:
        normalised = _normalise_identifier(sector_name)
        return tuple(event for event in self._events if event.sector_name == normalised)

    def project_stability(self, sector_name: str, *, horizon: int = 5) -> float:
        sector = self.get_sector(sector_name)
        events = self._events_for_sector(sector.name)
        recent_events = events[-max(1, horizon) :]
        severity_weights = {
            SpaceEventSeverity.INFO: 0.1,
            SpaceEventSeverity.ADVISORY: 0.25,
            SpaceEventSeverity.ALERT: 0.45,
            SpaceEventSeverity.CRITICAL: 0.6,
        }
        if recent_events:
            event_penalty = sum(
                event.impact_score * severity_weights.get(event.severity, 0.3)
                for event in recent_events
            ) / len(recent_events)
        else:
            event_penalty = 0.0
        hazard_penalty = sector.hazard_index * 0.6
        traffic_penalty = sector.traffic_load * 0.25
        supply_bonus = (sector.supply_level - 0.5) * 0.15
        baseline = 0.55 + supply_bonus
        stability = baseline - hazard_penalty - traffic_penalty - event_penalty
        return _clamp(stability, default=baseline)

    def rebalance_routes(
        self,
        sector_name: str,
        *,
        congestion_threshold: float = 0.65,
        damping_factor: float = 0.85,
    ) -> SpaceSector:
        sector = self.get_sector(sector_name)
        updated_routes = []
        for route in sector.routes:
            congestion = route.congestion
            if congestion > congestion_threshold:
                congestion *= damping_factor
            stability_gain = max(0.0, (route.congestion - congestion) * 0.3)
            updated_routes.append(
                replace(
                    route,
                    congestion=_clamp(congestion, default=route.congestion),
                    stability=_clamp(route.stability + stability_gain, default=route.stability),
                )
            )
        adjusted_sector = replace(
            sector,
            routes=tuple(updated_routes),
            hazard_index=_clamp(sector.hazard_index - 0.05, default=sector.hazard_index),
        )
        self._sectors[adjusted_sector.name] = adjusted_sector
        return adjusted_sector

    def snapshot(self, sector_name: str, *, horizon: int = 5) -> SpaceSnapshot:
        sector = self.get_sector(sector_name)
        stability = self.project_stability(sector.name, horizon=horizon)
        events = self._events_for_sector(sector.name)
        return SpaceSnapshot(
            sector_name=sector.name,
            timestamp=_utcnow(),
            stability_score=stability,
            traffic_load=sector.traffic_load,
            hazard_index=sector.hazard_index,
            energy_output_gw=sector.energy_output_gw,
            recent_events=events[-max(1, horizon) :],
        )

    def ingest_events(self, events: Iterable[SpaceEvent | Mapping[str, object]]) -> list[SpaceEvent]:
        recorded: list[SpaceEvent] = []
        for event in events:
            recorded.append(self.record_event(event))
        return recorded
