"""Dynamic modelling for intergalactic space navigation and coordination."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from math import sqrt
from typing import Dict, Mapping, MutableMapping, Sequence

__all__ = [
    "SpaceCoordinate",
    "SectorConditions",
    "IntergalacticCorridor",
    "IntergalacticSector",
    "IntergalacticRoute",
    "CorridorWeights",
    "DynamicIntergalacticSpace",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_identifier(identifier: str) -> str:
    value = str(identifier).strip()
    if not value:
        raise ValueError("identifier must not be empty")
    return value


def _clamp(value: float | int | None, *, minimum: float = 0.0, maximum: float = 1.0, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if numeric != numeric:  # NaN
        return default
    if numeric < minimum:
        return minimum
    if numeric > maximum:
        return maximum
    return numeric


def _ensure_datetime(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_weights(weights: Mapping[str, float] | None, *, defaults: Mapping[str, float]) -> Dict[str, float]:
    result: Dict[str, float] = {key: float(val) for key, val in defaults.items()}
    if not weights:
        return result
    for key, value in weights.items():
        if key in result:
            result[key] = float(value)
    total = sum(result.values())
    if total <= 0.0:
        return dict(defaults)
    return {key: val / total for key, val in result.items()}


# ---------------------------------------------------------------------------
# core models


@dataclass(slots=True, frozen=True)
class SpaceCoordinate:
    """Three-dimensional coordinate expressed in mega light years."""

    x: float
    y: float
    z: float

    def distance_to(self, other: "SpaceCoordinate") -> float:
        """Euclidean distance to another coordinate."""

        dx = self.x - other.x
        dy = self.y - other.y
        dz = self.z - other.z
        return sqrt(dx * dx + dy * dy + dz * dz)


@dataclass(slots=True)
class SectorConditions:
    """Operational parameters describing a sector of intergalactic space."""

    baryonic_density: float
    dark_energy_flux: float
    radiation_index: float
    anomaly_score: float = 0.0

    def __post_init__(self) -> None:
        self.baryonic_density = _clamp(self.baryonic_density)
        self.dark_energy_flux = _clamp(self.dark_energy_flux)
        self.radiation_index = _clamp(self.radiation_index)
        self.anomaly_score = _clamp(self.anomaly_score)

    def blend(self, other: "SectorConditions", *, influence: float = 0.5) -> "SectorConditions":
        """Blend two condition sets with a weighting between 0 and 1."""

        weight = _clamp(influence)
        inverse = 1.0 - weight
        return SectorConditions(
            baryonic_density=self.baryonic_density * inverse + other.baryonic_density * weight,
            dark_energy_flux=self.dark_energy_flux * inverse + other.dark_energy_flux * weight,
            radiation_index=self.radiation_index * inverse + other.radiation_index * weight,
            anomaly_score=self.anomaly_score * inverse + other.anomaly_score * weight,
        )

    def risk_index(self, *, weights: Mapping[str, float] | None = None) -> float:
        """Composite risk score used in navigation heuristics."""

        defaults = {
            "baryonic_density": 0.25,
            "dark_energy_flux": 0.25,
            "radiation_index": 0.3,
            "anomaly_score": 0.2,
        }
        factors = _normalise_weights(weights, defaults=defaults)
        return (
            self.baryonic_density * factors["baryonic_density"]
            + self.dark_energy_flux * factors["dark_energy_flux"]
            + self.radiation_index * factors["radiation_index"]
            + self.anomaly_score * factors["anomaly_score"]
        )


@dataclass(slots=True, frozen=True)
class IntergalacticCorridor:
    """Represents a travel corridor between two intergalactic sectors."""

    destination: str
    distance_ly: float
    stability: float = 1.0
    last_calibrated: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        object.__setattr__(self, "destination", _ensure_identifier(self.destination))
        object.__setattr__(self, "distance_ly", max(0.0, float(self.distance_ly)))
        object.__setattr__(self, "stability", _clamp(self.stability, minimum=0.0, maximum=1.0, default=1.0))
        object.__setattr__(self, "last_calibrated", _ensure_datetime(self.last_calibrated))

    def recalibrated(
        self,
        *,
        stability: float | None = None,
        distance_ly: float | None = None,
        timestamp: datetime | None = None,
    ) -> "IntergalacticCorridor":
        """Return a recalibrated corridor with updated telemetry."""

        return replace(
            self,
            stability=_clamp(stability, default=self.stability),
            distance_ly=max(0.0, float(distance_ly)) if distance_ly is not None else self.distance_ly,
            last_calibrated=_ensure_datetime(timestamp) if timestamp is not None else _ensure_datetime(self.last_calibrated),
        )

    def traversal_cost(self, *, weights: Mapping[str, float] | None = None) -> float:
        """Heuristic cost associated with traversing the corridor."""

        defaults = {"distance": 0.6, "instability": 0.4}
        factors = _normalise_weights(weights, defaults=defaults)
        instability = 1.0 - self.stability
        return self.distance_ly * factors["distance"] + instability * factors["instability"]


@dataclass(slots=True)
class IntergalacticSector:
    """Representation of a spatial sector connecting multiple corridors."""

    identifier: str
    centre: SpaceCoordinate
    radius_ly: float
    conditions: SectorConditions
    corridors: MutableMapping[str, IntergalacticCorridor] = field(default_factory=dict)
    metadata: Mapping[str, object] | None = field(default=None, repr=False)
    last_updated: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.identifier = _ensure_identifier(self.identifier)
        if not isinstance(self.centre, SpaceCoordinate):
            raise TypeError("centre must be a SpaceCoordinate instance")
        self.radius_ly = max(0.1, float(self.radius_ly))
        if not isinstance(self.conditions, SectorConditions):
            raise TypeError("conditions must be a SectorConditions instance")
        normalised: dict[str, IntergalacticCorridor] = {}
        for key, corridor in dict(self.corridors).items():
            if isinstance(corridor, IntergalacticCorridor):
                normalised[corridor.destination] = corridor
            elif isinstance(corridor, Mapping):
                parsed = IntergalacticCorridor(**corridor)
                normalised[parsed.destination] = parsed
            else:
                raise TypeError("corridors must contain IntergalacticCorridor instances or mappings")
        self.corridors = dict(sorted(normalised.items()))
        self.last_updated = _ensure_datetime(self.last_updated)

    def sector_area(self) -> float:
        """Return the hyperspherical surface area (4πr²) approximation."""

        return 4.0 * 3.141592653589793 * self.radius_ly * self.radius_ly

    def risk_index(self) -> float:
        return self.conditions.risk_index()

    def corridor_to(self, destination: str) -> IntergalacticCorridor | None:
        return self.corridors.get(destination)

    def upsert_corridor(self, corridor: IntergalacticCorridor) -> None:
        self.corridors[corridor.destination] = corridor
        self.last_updated = _utcnow()

    def recalibrate(self, *, conditions: SectorConditions | Mapping[str, float] | None = None) -> None:
        """Update sector conditions with new telemetry."""

        if conditions is None:
            self.last_updated = _utcnow()
            return
        if isinstance(conditions, SectorConditions):
            self.conditions = conditions
        elif isinstance(conditions, Mapping):
            payload = {
                "baryonic_density": conditions.get("baryonic_density", self.conditions.baryonic_density),
                "dark_energy_flux": conditions.get("dark_energy_flux", self.conditions.dark_energy_flux),
                "radiation_index": conditions.get("radiation_index", self.conditions.radiation_index),
                "anomaly_score": conditions.get("anomaly_score", self.conditions.anomaly_score),
            }
            self.conditions = SectorConditions(**payload)
        else:
            raise TypeError("conditions must be SectorConditions or a mapping")
        self.last_updated = _utcnow()


@dataclass(slots=True, frozen=True)
class IntergalacticRoute:
    """Summary of an evaluated intergalactic route."""

    sectors: tuple[IntergalacticSector, ...]
    total_distance_ly: float
    cumulative_risk: float
    corridor_reliability: float

    def describe(self) -> str:
        names = " → ".join(sector.identifier for sector in self.sectors)
        return (
            f"{names} | distance: {self.total_distance_ly:.2f} ly | "
            f"risk: {self.cumulative_risk:.3f} | reliability: {self.corridor_reliability:.3f}"
        )


@dataclass(slots=True, frozen=True)
class CorridorWeights:
    """Weights that balance risk vs distance during route evaluation."""

    distance: float = 0.6
    risk: float = 0.25
    stability: float = 0.15

    def normalised(self) -> Mapping[str, float]:
        return _normalise_weights(
            {"distance": self.distance, "risk": self.risk, "stability": self.stability},
            defaults={"distance": 0.6, "risk": 0.25, "stability": 0.15},
        )


class DynamicIntergalacticSpace:
    """Coordinator for sectors and routes across intergalactic space."""

    def __init__(self, sectors: Sequence[IntergalacticSector | Mapping[str, object]] | None = None) -> None:
        self._sectors: Dict[str, IntergalacticSector] = {}
        if sectors:
            for sector in sectors:
                self.upsert_sector(sector)

    def __contains__(self, identifier: str) -> bool:  # pragma: no cover - trivial
        return identifier in self._sectors

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._sectors)

    def sectors(self) -> tuple[IntergalacticSector, ...]:
        return tuple(self._sectors[key] for key in sorted(self._sectors))

    def upsert_sector(self, sector: IntergalacticSector | Mapping[str, object]) -> IntergalacticSector:
        if isinstance(sector, Mapping):
            parsed = IntergalacticSector(**sector)  # type: ignore[arg-type]
        elif isinstance(sector, IntergalacticSector):
            parsed = sector
        else:
            raise TypeError("sector must be an IntergalacticSector or mapping")
        self._sectors[parsed.identifier] = parsed
        return parsed

    def remove_sector(self, identifier: str) -> None:
        self._sectors.pop(identifier, None)
        for sector in self._sectors.values():
            if identifier in sector.corridors:
                sector.corridors.pop(identifier)

    def connect(
        self,
        origin: str,
        destination: str,
        *,
        distance_ly: float | None = None,
        stability: float = 1.0,
        symmetric: bool = True,
        timestamp: datetime | None = None,
    ) -> None:
        if origin not in self._sectors or destination not in self._sectors:
            raise KeyError("both origin and destination must exist before connecting")
        origin_sector = self._sectors[origin]
        destination_sector = self._sectors[destination]
        base_distance = origin_sector.centre.distance_to(destination_sector.centre)
        distance_value = max(0.0, distance_ly if distance_ly is not None else base_distance)
        corridor = IntergalacticCorridor(
            destination=destination,
            distance_ly=distance_value,
            stability=stability,
            last_calibrated=timestamp or _utcnow(),
        )
        origin_sector.upsert_corridor(corridor)
        if symmetric:
            mirror = corridor.recalibrated(distance_ly=distance_value, timestamp=timestamp)
            destination_sector.upsert_corridor(replace(mirror, destination=origin))

    def evaluate_route(
        self,
        origin: str,
        destination: str,
        *,
        weights: CorridorWeights | Mapping[str, float] | None = None,
    ) -> IntergalacticRoute:
        if origin not in self._sectors or destination not in self._sectors:
            raise KeyError("both origin and destination must exist for route evaluation")
        if origin == destination:
            sector = self._sectors[origin]
            return IntergalacticRoute((sector,), 0.0, sector.risk_index(), 1.0)

        if isinstance(weights, CorridorWeights):
            weight_map = dict(weights.normalised())
        elif isinstance(weights, Mapping):
            weight_map = _normalise_weights(weights, defaults={"distance": 0.6, "risk": 0.25, "stability": 0.15})
        else:
            weight_map = _normalise_weights(
                None,
                defaults={"distance": 0.6, "risk": 0.25, "stability": 0.15},
            )

        frontier: dict[str, float] = {origin: 0.0}
        visited: dict[str, float] = {}
        previous: dict[str, str | None] = {origin: None}

        while frontier:
            current_identifier = min(frontier, key=frontier.get)
            current_cost = frontier.pop(current_identifier)
            if current_identifier in visited:
                continue
            visited[current_identifier] = current_cost
            if current_identifier == destination:
                break
            current_sector = self._sectors[current_identifier]
            for corridor in current_sector.corridors.values():
                neighbour = corridor.destination
                if neighbour in visited:
                    continue
                neighbour_sector = self._sectors.get(neighbour)
                if neighbour_sector is None:
                    continue
                base_distance = corridor.distance_ly or current_sector.centre.distance_to(neighbour_sector.centre)
                risk_component = (current_sector.risk_index() + neighbour_sector.risk_index()) / 2.0
                instability = 1.0 - corridor.stability
                incremental_cost = (
                    base_distance * weight_map["distance"]
                    + risk_component * weight_map["risk"]
                    + instability * weight_map["stability"]
                )
                new_cost = current_cost + incremental_cost
                if new_cost < frontier.get(neighbour, float("inf")):
                    frontier[neighbour] = new_cost
                    previous[neighbour] = current_identifier

        if destination not in visited:
            raise ValueError(f"no viable route from {origin!r} to {destination!r}")

        path: list[str] = []
        cursor: str | None = destination
        while cursor is not None:
            path.append(cursor)
            cursor = previous.get(cursor)
        path.reverse()

        sectors = tuple(self._sectors[identifier] for identifier in path)
        total_distance = 0.0
        total_risk = 0.0
        reliability = 1.0
        for index in range(len(sectors) - 1):
            current = sectors[index]
            next_sector = sectors[index + 1]
            corridor = current.corridor_to(next_sector.identifier)
            if corridor is None:
                raise ValueError("route reconstruction encountered missing corridor")
            distance_value = corridor.distance_ly or current.centre.distance_to(next_sector.centre)
            total_distance += distance_value
            total_risk += (current.risk_index() + next_sector.risk_index()) / 2.0
            reliability = min(reliability, corridor.stability)
        if len(sectors) > 1:
            total_risk /= len(sectors) - 1
        else:
            total_risk = sectors[0].risk_index()

        return IntergalacticRoute(sectors, total_distance, total_risk, reliability)

    def summarise(self) -> Mapping[str, float]:
        """Provide aggregate statistics for the managed sectors."""

        if not self._sectors:
            return {"sectors": 0, "mean_risk": 0.0, "corridors": 0}
        risks = [sector.risk_index() for sector in self._sectors.values()]
        corridor_count = sum(len(sector.corridors) for sector in self._sectors.values())
        return {
            "sectors": float(len(self._sectors)),
            "mean_risk": sum(risks) / len(risks),
            "corridors": float(corridor_count),
        }

    def calibrate_all(self, *, timestamp: datetime | None = None) -> None:
        """Refresh last updated timestamps across sectors and corridors."""

        moment = _ensure_datetime(timestamp)
        for sector in self._sectors.values():
            sector.last_updated = moment
            for key, corridor in list(sector.corridors.items()):
                sector.corridors[key] = replace(corridor, last_calibrated=moment)
