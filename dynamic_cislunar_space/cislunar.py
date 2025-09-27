"""Dynamic Cislunar Space governance and traffic modelling utilities."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum
from math import pi, sqrt
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "CelestialBody",
    "CislunarAsset",
    "DynamicCislunarSpace",
    "MissionPhase",
    "OrbitalBand",
    "RiskAssessment",
    "RiskDimension",
    "TrafficBandMetrics",
    "TrafficSnapshot",
    "TransferCorridor",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_name(value: str, *, entity: str = "value") -> str:
    text = str(value).strip()
    if not text:
        raise ValueError(f"{entity} must be a non-empty string")
    return text


def _coerce_positive(number: float | int, *, units: str, allow_zero: bool = False) -> float:
    try:
        numeric = float(number)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise TypeError(f"{units} must be numeric") from exc
    if numeric < 0.0 or (not allow_zero and numeric == 0.0):
        raise ValueError(f"{units} must be {'>= 0' if allow_zero else '> 0'}")
    return numeric


def _clamp01(value: float | int, *, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive
        return default
    if numeric != numeric or numeric in {float("inf"), float("-inf")}:
        return default
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


def _ensure_mapping(value: Mapping[str, object] | None, *, name: str) -> Mapping[str, object] | None:
    if value is None:
        return None
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError(f"{name} must be a mapping if provided")
    return dict(value)


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class CelestialBody:
    """Physical body used as a primary for orbital bands."""

    name: str
    gravitational_parameter_km3_s2: float
    radius_km: float
    sphere_of_influence_km: float | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name, entity="body name")
        self.gravitational_parameter_km3_s2 = _coerce_positive(
            self.gravitational_parameter_km3_s2,
            units="gravitational parameter",
        )
        self.radius_km = _coerce_positive(self.radius_km, units="radius")
        if self.sphere_of_influence_km is not None:
            self.sphere_of_influence_km = _coerce_positive(
                self.sphere_of_influence_km,
                units="sphere of influence radius",
                allow_zero=True,
            )


@dataclass(slots=True)
class OrbitalBand:
    """Cislunar orbital band with shared characteristics."""

    name: str
    body: CelestialBody
    perigee_km: float
    apogee_km: float
    inclination_deg: float
    description: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name, entity="band name")
        if not isinstance(self.body, CelestialBody):
            raise TypeError("body must be a CelestialBody instance")
        self.perigee_km = _coerce_positive(self.perigee_km, units="perigee", allow_zero=True)
        self.apogee_km = _coerce_positive(self.apogee_km, units="apogee", allow_zero=True)
        if self.apogee_km < self.perigee_km:
            self.perigee_km, self.apogee_km = self.apogee_km, self.perigee_km
        self.inclination_deg = float(self.inclination_deg)
        if not 0.0 <= self.inclination_deg <= 180.0:
            raise ValueError("inclination must be between 0 and 180 degrees")
        if self.description is not None:
            self.description = _normalise_name(self.description, entity="description")

    @property
    def altitude_range_km(self) -> tuple[float, float]:
        return (self.perigee_km, self.apogee_km)

    @property
    def mean_altitude_km(self) -> float:
        return (self.perigee_km + self.apogee_km) / 2.0

    @property
    def semi_major_axis_km(self) -> float:
        return self.body.radius_km + self.mean_altitude_km

    @property
    def eccentricity(self) -> float:
        if self.apogee_km == self.perigee_km:
            return 0.0
        ra = self.body.radius_km + self.apogee_km
        rp = self.body.radius_km + self.perigee_km
        return (ra - rp) / (ra + rp)

    def orbital_period_hours(self) -> float:
        semi_major_axis = self.semi_major_axis_km
        mu = self.body.gravitational_parameter_km3_s2
        period_seconds = 2.0 * pi * sqrt(semi_major_axis**3 / mu)
        return period_seconds / 3600.0


class MissionPhase(str, Enum):
    """Lifecycle stage of a cislunar asset."""

    DEPLOYMENT = "deployment"
    TRANSIT = "transit"
    OPERATIONS = "operations"
    STANDBY = "standby"
    CONTINGENCY = "contingency"
    DECOMMISSIONED = "decommissioned"


@dataclass(slots=True)
class CislunarAsset:
    """Representation of an operational presence within a cislunar band."""

    identifier: str
    band: OrbitalBand
    mass_kg: float
    cross_section_m2: float
    operator: str
    mission_phase: MissionPhase = MissionPhase.OPERATIONS
    health: float = 1.0
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.identifier = _normalise_name(self.identifier, entity="asset identifier")
        if not isinstance(self.band, OrbitalBand):
            raise TypeError("band must be an OrbitalBand instance")
        self.mass_kg = _coerce_positive(self.mass_kg, units="mass", allow_zero=False)
        self.cross_section_m2 = _coerce_positive(
            self.cross_section_m2,
            units="cross section",
            allow_zero=False,
        )
        self.operator = _normalise_name(self.operator, entity="operator")
        if not isinstance(self.mission_phase, MissionPhase):
            self.mission_phase = MissionPhase(str(self.mission_phase).lower())
        self.health = _clamp01(self.health, default=1.0)
        self.metadata = _ensure_mapping(self.metadata, name="metadata")

    def update_health(self, value: float) -> "CislunarAsset":
        return replace(self, health=_clamp01(value, default=self.health))

    def mark_phase(self, phase: MissionPhase | str) -> "CislunarAsset":
        if not isinstance(phase, MissionPhase):
            phase = MissionPhase(str(phase).lower())
        return replace(self, mission_phase=phase)


class RiskDimension(str, Enum):
    """Risk axis considered during traffic assessments."""

    TRAFFIC = "traffic"
    NAVIGATION = "navigation"
    COMMUNICATION = "communication"
    ENVIRONMENTAL = "environmental"


@dataclass(slots=True)
class RiskAssessment:
    """Quantified risk along a particular dimension."""

    dimension: RiskDimension
    score: float
    rationale: str | None = None
    drivers: Mapping[str, float] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        if not isinstance(self.dimension, RiskDimension):
            self.dimension = RiskDimension(str(self.dimension).lower())
        self.score = _clamp01(self.score)
        self.rationale = self.rationale.strip() if isinstance(self.rationale, str) else None
        if self.rationale:
            self.rationale = self.rationale[0].upper() + self.rationale[1:]
        if self.drivers is not None:
            drivers = {}
            for key, value in self.drivers.items():
                drivers[_normalise_name(key, entity="driver")] = float(value)
            self.drivers = drivers


@dataclass(slots=True)
class TransferCorridor:
    """Transfer solution that connects two orbital bands."""

    origin: OrbitalBand
    destination: OrbitalBand
    delta_v_ms: float
    transfer_days: float
    confidence: float = 0.5
    notes: str | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.origin, OrbitalBand) or not isinstance(self.destination, OrbitalBand):
            raise TypeError("origin and destination must be OrbitalBand instances")
        self.delta_v_ms = _coerce_positive(self.delta_v_ms, units="delta-v", allow_zero=False)
        self.transfer_days = _coerce_positive(self.transfer_days, units="transfer duration", allow_zero=False)
        self.confidence = _clamp01(self.confidence, default=0.5)
        if self.notes is not None:
            self.notes = _normalise_name(self.notes, entity="notes")


@dataclass(slots=True)
class TrafficBandMetrics:
    """Aggregated metrics for a single orbital band."""

    band: OrbitalBand
    asset_count: int
    congestion: float
    average_health: float
    operators: Mapping[str, int]

    def __post_init__(self) -> None:
        if not isinstance(self.band, OrbitalBand):
            raise TypeError("band must be an OrbitalBand instance")
        self.asset_count = int(max(0, self.asset_count))
        self.congestion = _clamp01(self.congestion)
        self.average_health = _clamp01(self.average_health, default=1.0)
        operators: MutableMapping[str, int] = {}
        for name, count in self.operators.items():
            operators[_normalise_name(name, entity="operator")] = int(count)
        self.operators = dict(sorted(operators.items(), key=lambda item: item[0]))


@dataclass(slots=True)
class TrafficSnapshot:
    """Point-in-time snapshot of the cislunar traffic picture."""

    timestamp: datetime
    total_assets: int
    band_metrics: tuple[TrafficBandMetrics, ...]
    risk_summary: tuple[RiskAssessment, ...] = ()

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "total_assets": self.total_assets,
            "band_metrics": [
                {
                    "band": metrics.band.name,
                    "asset_count": metrics.asset_count,
                    "congestion": metrics.congestion,
                    "average_health": metrics.average_health,
                    "operators": dict(metrics.operators),
                }
                for metrics in self.band_metrics
            ],
            "risk_summary": [
                {
                    "dimension": assessment.dimension.value,
                    "score": assessment.score,
                    "rationale": assessment.rationale,
                    "drivers": dict(assessment.drivers or {}),
                }
                for assessment in self.risk_summary
            ],
        }


# ---------------------------------------------------------------------------
# engine


class DynamicCislunarSpace:
    """Coordinator for cislunar bodies, orbital bands, and asset activity."""

    def __init__(self, name: str | None = None) -> None:
        self.name = _normalise_name(name, entity="space name") if name else "Dynamic Cislunar Space"
        self._bodies: MutableMapping[str, CelestialBody] = {}
        self._bands: MutableMapping[str, OrbitalBand] = {}
        self._assets: MutableMapping[str, CislunarAsset] = {}
        self._corridors: MutableMapping[tuple[str, str], TransferCorridor] = {}

    # -- lookups -----------------------------------------------------------------
    def get_body(self, name: str) -> CelestialBody:
        key = _normalise_name(name, entity="body lookup").lower()
        try:
            return self._bodies[key]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"unknown body: {name}") from exc

    def get_band(self, name: str) -> OrbitalBand:
        key = _normalise_name(name, entity="band lookup").lower()
        try:
            return self._bands[key]
        except KeyError as exc:
            raise KeyError(f"unknown orbital band: {name}") from exc

    def get_asset(self, identifier: str) -> CislunarAsset:
        key = _normalise_name(identifier, entity="asset lookup").lower()
        try:
            return self._assets[key]
        except KeyError as exc:
            raise KeyError(f"unknown asset: {identifier}") from exc

    # -- registration ------------------------------------------------------------
    def register_body(self, body: CelestialBody | Mapping[str, object]) -> CelestialBody:
        instance = body if isinstance(body, CelestialBody) else CelestialBody(**body)
        key = instance.name.lower()
        self._bodies[key] = instance
        return instance

    def register_band(self, band: OrbitalBand | Mapping[str, object]) -> OrbitalBand:
        if isinstance(band, OrbitalBand):
            instance = band
        else:
            payload = dict(band)
            raw_body = payload.pop("body")
            if isinstance(raw_body, CelestialBody):
                body = raw_body
            else:
                body = self.get_body(str(raw_body))
            payload["body"] = body
            instance = OrbitalBand(**payload)
        key = instance.name.lower()
        if instance.body.name.lower() not in self._bodies:
            self._bodies[instance.body.name.lower()] = instance.body
        self._bands[key] = instance
        return instance

    def register_asset(self, asset: CislunarAsset | Mapping[str, object]) -> CislunarAsset:
        if isinstance(asset, CislunarAsset):
            instance = asset
        else:
            payload = dict(asset)
            raw_band = payload.pop("band")
            band = raw_band if isinstance(raw_band, OrbitalBand) else self.get_band(str(raw_band))
            payload["band"] = band
            if "mission_phase" in payload and not isinstance(payload["mission_phase"], MissionPhase):
                payload["mission_phase"] = MissionPhase(str(payload["mission_phase"]).lower())
            instance = CislunarAsset(**payload)
        key = instance.identifier.lower()
        if key in self._assets:
            raise ValueError(f"asset '{instance.identifier}' is already registered")
        if instance.band.name.lower() not in self._bands:
            self._bands[instance.band.name.lower()] = instance.band
        self._assets[key] = instance
        return instance

    def register_corridor(self, corridor: TransferCorridor | Mapping[str, object]) -> TransferCorridor:
        if isinstance(corridor, TransferCorridor):
            instance = corridor
        else:
            payload = dict(corridor)
            origin = payload.pop("origin")
            destination = payload.pop("destination")
            origin_band = origin if isinstance(origin, OrbitalBand) else self.get_band(str(origin))
            destination_band = (
                destination if isinstance(destination, OrbitalBand) else self.get_band(str(destination))
            )
            payload["origin"] = origin_band
            payload["destination"] = destination_band
            instance = TransferCorridor(**payload)
        key = (instance.origin.name.lower(), instance.destination.name.lower())
        self._corridors[key] = instance
        return instance

    # -- analytics ---------------------------------------------------------------
    def compute_congestion(self, band: OrbitalBand | str) -> float:
        band_obj = band if isinstance(band, OrbitalBand) else self.get_band(band)
        assets = [asset for asset in self._assets.values() if asset.band is band_obj]
        if not assets:
            return 0.0
        total_cross_section_km2 = sum(asset.cross_section_m2 for asset in assets) / 1_000_000.0
        mean_radius = band_obj.body.radius_km + band_obj.mean_altitude_km
        thickness = max(band_obj.apogee_km - band_obj.perigee_km, 1.0)
        shell_surface_area = 4.0 * pi * mean_radius**2
        shell_volume = shell_surface_area * thickness
        raw_congestion = total_cross_section_km2 / max(shell_volume, 1e-9)
        return _clamp01(raw_congestion * 1_000_000.0)

    def assess_asset(self, identifier: str, hazard_overrides: Mapping[str | RiskDimension, float] | None = None) -> tuple[RiskAssessment, ...]:
        asset = self.get_asset(identifier)
        congestion = self.compute_congestion(asset.band)
        health_gap = 1.0 - asset.health
        exposure = _clamp01(
            asset.band.mean_altitude_km / (asset.band.mean_altitude_km + asset.band.body.radius_km),
            default=0.0,
        )

        base_scores: MutableMapping[RiskDimension, float] = {
            RiskDimension.TRAFFIC: min(1.0, congestion * 6.0 + health_gap * 0.2),
            RiskDimension.NAVIGATION: min(1.0, 0.2 + health_gap * 0.6 + congestion * 1.5),
            RiskDimension.COMMUNICATION: min(1.0, 0.1 + health_gap * 0.5),
            RiskDimension.ENVIRONMENTAL: min(1.0, 0.15 + exposure * 0.6 + health_gap * 0.3),
        }

        if hazard_overrides:
            for key, value in hazard_overrides.items():
                dimension = key if isinstance(key, RiskDimension) else RiskDimension(str(key).lower())
                base_scores[dimension] = _clamp01(value, default=base_scores.get(dimension, 0.0))

        assessments: list[RiskAssessment] = []
        for dimension, score in base_scores.items():
            assessments.append(
                RiskAssessment(
                    dimension=dimension,
                    score=score,
                    rationale=f"Baseline assessment for {asset.identifier}",
                    drivers={
                        "congestion": congestion,
                        "health_gap": health_gap,
                        "altitude_exposure": exposure,
                    },
                )
            )
        return tuple(sorted(assessments, key=lambda assessment: assessment.dimension.value))

    def plan_transfer(self, origin: str, destination: str) -> TransferCorridor | None:
        key = (origin.lower(), destination.lower())
        return self._corridors.get(key)

    def snapshot(self, *, include_risks: bool = True) -> TrafficSnapshot:
        band_metrics: list[TrafficBandMetrics] = []
        for band in sorted(self._bands.values(), key=lambda item: item.name.lower()):
            assets = [asset for asset in self._assets.values() if asset.band is band]
            if assets:
                average_health = sum(asset.health for asset in assets) / len(assets)
            else:
                average_health = 1.0
            operators: MutableMapping[str, int] = defaultdict(int)
            for asset in assets:
                operators[asset.operator] += 1
            metrics = TrafficBandMetrics(
                band=band,
                asset_count=len(assets),
                congestion=self.compute_congestion(band) if assets else 0.0,
                average_health=average_health,
                operators=operators,
            )
            band_metrics.append(metrics)

        risk_summary: list[RiskAssessment] = []
        if include_risks and self._assets:
            aggregated: MutableMapping[RiskDimension, list[float]] = defaultdict(list)
            for asset in self._assets.values():
                for assessment in self.assess_asset(asset.identifier):
                    aggregated[assessment.dimension].append(assessment.score)
            for dimension, scores in sorted(aggregated.items(), key=lambda item: item[0].value):
                average_score = sum(scores) / len(scores)
                risk_summary.append(
                    RiskAssessment(
                        dimension=dimension,
                        score=average_score,
                        rationale=f"Average risk across {len(scores)} assets",
                        drivers={
                            "average": average_score,
                            "maximum": max(scores),
                            "assets": float(len(scores)),
                        },
                    )
                )

        snapshot = TrafficSnapshot(
            timestamp=_utcnow(),
            total_assets=len(self._assets),
            band_metrics=tuple(band_metrics),
            risk_summary=tuple(risk_summary),
        )
        return snapshot

    # -- iteration ---------------------------------------------------------------
    def bodies(self) -> Sequence[CelestialBody]:
        return tuple(sorted(self._bodies.values(), key=lambda body: body.name.lower()))

    def bands(self) -> Sequence[OrbitalBand]:
        return tuple(sorted(self._bands.values(), key=lambda band: band.name.lower()))

    def assets(self) -> Sequence[CislunarAsset]:
        return tuple(sorted(self._assets.values(), key=lambda asset: asset.identifier.lower()))

    def corridors(self) -> Sequence[TransferCorridor]:
        return tuple(self._corridors.values())
