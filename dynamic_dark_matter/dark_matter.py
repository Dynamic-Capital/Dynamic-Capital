"""Dynamic dark matter orchestration primitives with stability heuristics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "AnomalyKind",
    "DarkMatterHalo",
    "DarkMatterAnomaly",
    "DarkMatterSnapshot",
    "DynamicDarkMatter",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str | None) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_text(value: str | None, *, fallback: str | None = None) -> str:
    text = (value or "").strip()
    if text:
        return text
    if fallback is not None:
        fallback_text = (fallback or "").strip()
        if fallback_text:
            return fallback_text
    raise ValueError("text value must not be empty")


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    tags: list[str] = []
    for value in values:
        candidate = value.strip()
        if not candidate:
            continue
        lowered = candidate.lower()
        if lowered not in seen:
            seen.add(lowered)
            tags.append(candidate)
    return tuple(tags)


def _clamp(value: float | int | None, *, lower: float = 0.0, upper: float = 1.0, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if numeric != numeric:  # NaN check
        return default
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _score_against_target(value: float, *, target: float, tolerance: float) -> float:
    if tolerance <= 0:
        return 1.0
    delta = abs(value - target)
    if delta >= tolerance:
        return 0.0
    return 1.0 - (delta / tolerance)


def _coerce_halo(value: DarkMatterHalo | Mapping[str, object]) -> DarkMatterHalo:
    if isinstance(value, DarkMatterHalo):
        return value
    if isinstance(value, Mapping):
        data = dict(value)
        name = _normalise_identifier(str(data.get("name") or data.get("identifier") or ""))
        return DarkMatterHalo(
            name=name,
            mass_solar=float(data.get("mass_solar", data.get("mass", 0.0)) or 0.0),
            core_density=float(data.get("core_density", data.get("density", 0.0)) or 0.0),
            velocity_dispersion=float(
                data.get("velocity_dispersion", data.get("dispersion", 0.0)) or 0.0
            ),
            baryon_fraction=float(
                data.get("baryon_fraction", data.get("baryons", 0.15)) or 0.15
            ),
            structure_coherence=float(
                data.get("structure_coherence", data.get("coherence", 0.7)) or 0.7
            ),
            tags=_normalise_tags(data.get("tags")),
        )
    raise TypeError("halo must be a DarkMatterHalo or mapping")


def _coerce_anomaly(value: DarkMatterAnomaly | Mapping[str, object]) -> DarkMatterAnomaly:
    if isinstance(value, DarkMatterAnomaly):
        return value
    if isinstance(value, Mapping):
        data = dict(value)
        name = _normalise_identifier(str(data.get("halo_name") or data.get("halo") or ""))
        severity = _clamp(data.get("severity"), default=0.5)
        kind = data.get("kind") or data.get("type") or AnomalyKind.UNKNOWN
        if isinstance(kind, str):
            try:
                kind = AnomalyKind(kind.lower())
            except ValueError:
                kind = AnomalyKind.UNKNOWN
        elif not isinstance(kind, AnomalyKind):
            kind = AnomalyKind.UNKNOWN
        delta_density = float(data.get("delta_density", data.get("delta", 0.0)) or 0.0)
        description = _normalise_text(
            str(data.get("description") or data.get("summary") or ""), fallback=name
        )
        timestamp = data.get("timestamp")
        if isinstance(timestamp, datetime):
            resolved_timestamp = timestamp
        elif isinstance(timestamp, str):
            try:
                resolved_timestamp = datetime.fromisoformat(timestamp)
            except ValueError:
                resolved_timestamp = _utcnow()
        else:
            resolved_timestamp = _utcnow()
        return DarkMatterAnomaly(
            halo_name=name,
            description=description,
            severity=severity,
            kind=kind,
            delta_density=delta_density,
            timestamp=resolved_timestamp,
        )
    raise TypeError("anomaly must be a DarkMatterAnomaly or mapping")


# ---------------------------------------------------------------------------
# data models


class AnomalyKind(str, Enum):
    """Enumeration of dark matter anomaly archetypes."""

    TIDAL_SHEAR = "tidal_shear"
    DENSITY_WAVE = "density_wave"
    BARYONIC_SHOCK = "baryonic_shock"
    SUBSTRUCTURE_SWARM = "substructure_swarm"
    UNKNOWN = "unknown"


@dataclass(slots=True)
class DarkMatterHalo:
    """Representation of a managed dark matter halo."""

    name: str
    mass_solar: float
    core_density: float
    velocity_dispersion: float
    baryon_fraction: float = 0.15
    structure_coherence: float = 0.7
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        if self.mass_solar <= 0:
            raise ValueError("mass_solar must be positive")
        if self.core_density <= 0:
            raise ValueError("core_density must be positive")
        if self.velocity_dispersion <= 0:
            raise ValueError("velocity_dispersion must be positive")
        self.baryon_fraction = _clamp(self.baryon_fraction, default=0.15)
        self.structure_coherence = _clamp(self.structure_coherence, default=0.7)
        self.tags = _normalise_tags(self.tags)

    @property
    def stability_index(self) -> float:
        density_alignment = _score_against_target(
            self.core_density, target=0.35, tolerance=0.3
        )
        dispersion_alignment = _score_against_target(
            self.velocity_dispersion, target=150.0, tolerance=120.0
        )
        baryon_alignment = _score_against_target(
            self.baryon_fraction, target=0.16, tolerance=0.12
        )
        stability = (
            (self.structure_coherence * 0.4)
            + (density_alignment * 0.2)
            + (dispersion_alignment * 0.2)
            + (baryon_alignment * 0.2)
        )
        return max(0.0, min(1.0, stability))


@dataclass(slots=True)
class DarkMatterAnomaly:
    """Recorded anomaly impacting a halo."""

    halo_name: str
    description: str
    severity: float = 0.5
    kind: AnomalyKind = AnomalyKind.UNKNOWN
    delta_density: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.halo_name = _normalise_identifier(self.halo_name)
        self.description = _normalise_text(self.description, fallback=self.halo_name)
        self.severity = _clamp(self.severity, default=0.5)
        if isinstance(self.kind, str):
            try:
                self.kind = AnomalyKind(self.kind.lower())
            except ValueError:
                self.kind = AnomalyKind.UNKNOWN
        self.delta_density = float(self.delta_density)
        if not isinstance(self.timestamp, datetime):
            self.timestamp = _utcnow()
        elif self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)

    @property
    def impact_score(self) -> float:
        density_effect = min(abs(self.delta_density) / 0.5, 1.0)
        return max(0.0, min(1.0, (self.severity * 0.7) + (density_effect * 0.3)))


@dataclass(frozen=True, slots=True)
class DarkMatterSnapshot:
    """Point-in-time summary of a halo."""

    halo_name: str
    stability_score: float
    mass_solar: float
    core_density: float
    baryon_fraction: float
    structure_coherence: float
    anomaly_pressure: float
    risk_band: str
    recent_anomalies: tuple[DarkMatterAnomaly, ...]

    def to_dict(self) -> dict[str, object]:
        return {
            "halo_name": self.halo_name,
            "stability_score": self.stability_score,
            "mass_solar": self.mass_solar,
            "core_density": self.core_density,
            "baryon_fraction": self.baryon_fraction,
            "structure_coherence": self.structure_coherence,
            "anomaly_pressure": self.anomaly_pressure,
            "risk_band": self.risk_band,
            "recent_anomalies": [
                {
                    "halo_name": anomaly.halo_name,
                    "description": anomaly.description,
                    "severity": anomaly.severity,
                    "kind": anomaly.kind.value,
                    "delta_density": anomaly.delta_density,
                    "timestamp": anomaly.timestamp.isoformat(),
                    "impact_score": anomaly.impact_score,
                }
                for anomaly in self.recent_anomalies
            ],
        }


# ---------------------------------------------------------------------------
# engine core


class DynamicDarkMatter:
    """Maintain a catalogue of dark matter halos and anomalies."""

    def __init__(
        self,
        halos: Sequence[DarkMatterHalo | Mapping[str, object]] | None = None,
        *,
        max_events: int = 256,
    ) -> None:
        self._halos: MutableMapping[str, DarkMatterHalo] = {}
        self._events: Deque[DarkMatterAnomaly] = deque(maxlen=max_events)
        if halos:
            for halo in halos:
                self.register_halo(halo)

    # ------------------------------------------------------------------ access
    @property
    def halos(self) -> tuple[DarkMatterHalo, ...]:
        return tuple(sorted(self._halos.values(), key=lambda halo: halo.name.lower()))

    @property
    def events(self) -> tuple[DarkMatterAnomaly, ...]:
        return tuple(self._events)

    def get(self, halo_name: str) -> DarkMatterHalo:
        key = _normalise_identifier(halo_name)
        if key not in self._halos:
            raise KeyError(f"unknown halo: {halo_name}")
        return self._halos[key]

    # ----------------------------------------------------------------- mutation
    def register_halo(self, halo: DarkMatterHalo | Mapping[str, object]) -> DarkMatterHalo:
        resolved = _coerce_halo(halo)
        self._halos[resolved.name] = resolved
        return resolved

    def remove_halo(self, halo_name: str) -> None:
        key = _normalise_identifier(halo_name)
        self._halos.pop(key, None)
        self._events = deque(
            [event for event in self._events if event.halo_name != key],
            maxlen=self._events.maxlen,
        )

    def adjust_halo(
        self,
        halo_name: str,
        *,
        core_density: float | None = None,
        baryon_fraction: float | None = None,
        structure_coherence: float | None = None,
    ) -> DarkMatterHalo:
        halo = self.get(halo_name)
        updated = DarkMatterHalo(
            name=halo.name,
            mass_solar=halo.mass_solar,
            core_density=float(core_density if core_density is not None else halo.core_density),
            velocity_dispersion=halo.velocity_dispersion,
            baryon_fraction=baryon_fraction if baryon_fraction is not None else halo.baryon_fraction,
            structure_coherence=
                structure_coherence if structure_coherence is not None else halo.structure_coherence,
            tags=halo.tags,
        )
        self._halos[updated.name] = updated
        return updated

    def record_anomaly(
        self, anomaly: DarkMatterAnomaly | Mapping[str, object]
    ) -> DarkMatterAnomaly:
        resolved = _coerce_anomaly(anomaly)
        if resolved.halo_name not in self._halos:
            raise KeyError(f"unknown halo for anomaly: {resolved.halo_name}")
        self._events.append(resolved)
        return resolved

    def ingest_anomalies(
        self, anomalies: Iterable[DarkMatterAnomaly | Mapping[str, object]]
    ) -> list[DarkMatterAnomaly]:
        recorded: list[DarkMatterAnomaly] = []
        for anomaly in anomalies:
            recorded.append(self.record_anomaly(anomaly))
        return recorded

    # ---------------------------------------------------------------- snapshots
    def snapshot(self, halo_name: str, *, horizon: int = 5) -> DarkMatterSnapshot:
        halo = self.get(halo_name)
        recent: list[DarkMatterAnomaly] = []
        for anomaly in reversed(self._events):
            if anomaly.halo_name != halo.name:
                continue
            recent.append(anomaly)
            if len(recent) >= max(horizon, 0):
                break
        recent.reverse()
        if recent:
            pressure = sum(event.impact_score for event in recent) / len(recent)
        else:
            pressure = 0.0
        stability = halo.stability_index
        if stability < 0.3 or pressure > 0.75:
            band = "critical"
        elif stability < 0.5 or pressure > 0.55:
            band = "elevated"
        elif stability < 0.7 or pressure > 0.35:
            band = "watch"
        else:
            band = "stable"
        return DarkMatterSnapshot(
            halo_name=halo.name,
            stability_score=stability,
            mass_solar=halo.mass_solar,
            core_density=halo.core_density,
            baryon_fraction=halo.baryon_fraction,
            structure_coherence=halo.structure_coherence,
            anomaly_pressure=pressure,
            risk_band=band,
            recent_anomalies=tuple(recent),
        )

    def export_state(self, *, horizon: int = 5) -> dict[str, object]:
        snapshots = {
            halo.name: self.snapshot(halo.name, horizon=horizon).to_dict()
            for halo in self.halos
        }
        return {
            "halos": [
                {
                    "name": halo.name,
                    "mass_solar": halo.mass_solar,
                    "core_density": halo.core_density,
                    "velocity_dispersion": halo.velocity_dispersion,
                    "baryon_fraction": halo.baryon_fraction,
                    "structure_coherence": halo.structure_coherence,
                    "tags": halo.tags,
                    "stability_index": halo.stability_index,
                }
                for halo in self.halos
            ],
            "events": [
                {
                    "halo_name": event.halo_name,
                    "description": event.description,
                    "severity": event.severity,
                    "kind": event.kind.value,
                    "delta_density": event.delta_density,
                    "timestamp": event.timestamp.isoformat(),
                    "impact_score": event.impact_score,
                }
                for event in self._events
            ],
            "snapshots": snapshots,
        }
