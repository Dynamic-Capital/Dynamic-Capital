"""High-level orchestration utilities for spherical resonance networks."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SphereProfile",
    "SpherePulse",
    "SphereSnapshot",
    "SphereNetworkState",
    "DynamicSpheresEngine",
]


# --------------------------------------------------------------------------- utils

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_name(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("name must not be empty")
    return cleaned


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("name must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(value, upper))


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


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


def _coerce_profile(value: SphereProfile | Mapping[str, object]) -> SphereProfile:
    if isinstance(value, SphereProfile):
        return value
    if isinstance(value, Mapping):
        return SphereProfile(**value)
    raise TypeError("profile must be a SphereProfile or mapping")


def _coerce_pulse(value: SpherePulse | Mapping[str, object]) -> SpherePulse:
    if isinstance(value, SpherePulse):
        return value
    if isinstance(value, Mapping):
        return SpherePulse(**value)
    raise TypeError("pulse must be a SpherePulse or mapping")


# ------------------------------------------------------------------------ dataclasses


@dataclass(slots=True)
class SphereProfile:
    """Baseline properties that describe a resonant sphere."""

    name: str
    radius_km: float
    density_gcc: float
    orbital_velocity_kms: float
    vibrational_state: float = 0.0
    energy_output_twh: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.radius_km = max(float(self.radius_km), 0.0)
        self.density_gcc = max(float(self.density_gcc), 0.0)
        self.orbital_velocity_kms = max(float(self.orbital_velocity_kms), 0.0)
        self.vibrational_state = _clamp(float(self.vibrational_state), lower=-1.0, upper=1.0)
        self.energy_output_twh = float(self.energy_output_twh)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SpherePulse:
    """Momentary resonance adjustment recorded for a sphere."""

    sphere: str
    resonance: float
    energy_delta_twh: float = 0.0
    density_shift: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.sphere = _normalise_key(self.sphere)
        self.resonance = _clamp(float(self.resonance), lower=-1.0, upper=1.0)
        self.energy_delta_twh = float(self.energy_delta_twh)
        self.density_shift = float(self.density_shift)
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class SphereSnapshot:
    """Aggregated view of a sphere's posture and resonance."""

    sphere: SphereProfile
    resonance_index: float
    resonance_trend: float
    total_energy_output_twh: float
    cumulative_energy_delta_twh: float
    cumulative_density_shift: float
    pulses: tuple[SpherePulse, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "sphere": {
                "name": self.sphere.name,
                "radius_km": self.sphere.radius_km,
                "density_gcc": self.sphere.density_gcc,
                "orbital_velocity_kms": self.sphere.orbital_velocity_kms,
                "vibrational_state": self.sphere.vibrational_state,
                "energy_output_twh": self.sphere.energy_output_twh,
                "metadata": dict(self.sphere.metadata or {}),
            },
            "resonance_index": self.resonance_index,
            "resonance_trend": self.resonance_trend,
            "total_energy_output_twh": self.total_energy_output_twh,
            "cumulative_energy_delta_twh": self.cumulative_energy_delta_twh,
            "cumulative_density_shift": self.cumulative_density_shift,
            "pulses": [
                {
                    "sphere": pulse.sphere,
                    "resonance": pulse.resonance,
                    "energy_delta_twh": pulse.energy_delta_twh,
                    "density_shift": pulse.density_shift,
                    "tags": list(pulse.tags),
                    "weight": pulse.weight,
                    "timestamp": pulse.timestamp.isoformat(),
                    "metadata": dict(pulse.metadata or {}),
                }
                for pulse in self.pulses
            ],
        }


@dataclass(slots=True)
class SphereNetworkState:
    """Network level aggregates for a collection of resonant spheres."""

    average_resonance: float
    total_energy_output_twh: float
    total_energy_delta_twh: float
    spheres_requiring_attention: tuple[str, ...]
    snapshots: Mapping[str, SphereSnapshot]


# --------------------------------------------------------------------------- engine


class DynamicSpheresEngine:
    """Coordinate resonance data for a network of spheres."""

    def __init__(
        self,
        profiles: Iterable[SphereProfile | Mapping[str, object]] | None = None,
        *,
        history: int = 72,
        attention_threshold: float = 0.35,
        smoothing: float = 0.25,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history = int(history)
        self._attention_threshold = _clamp(float(attention_threshold), lower=-1.0, upper=1.0)
        self._smoothing = _clamp(float(smoothing), lower=0.0, upper=1.0)
        self._profiles: dict[str, SphereProfile] = {}
        self._pulses: dict[str, Deque[SpherePulse]] = {}
        if profiles:
            for profile in profiles:
                self.upsert_profile(profile)

    # ------------------------------------------------------------------- configure
    @property
    def attention_threshold(self) -> float:
        return self._attention_threshold

    def configure_attention_threshold(self, value: float) -> None:
        self._attention_threshold = _clamp(float(value), lower=-1.0, upper=1.0)

    @property
    def profiles(self) -> tuple[SphereProfile, ...]:
        return tuple(self._profiles.values())

    # --------------------------------------------------------------------- register
    def upsert_profile(self, profile: SphereProfile | Mapping[str, object]) -> SphereProfile:
        resolved = _coerce_profile(profile)
        key = _normalise_key(resolved.name)
        self._profiles[key] = resolved
        self._pulses.setdefault(key, deque(maxlen=self._history))
        return resolved

    def remove_profile(self, name: str) -> None:
        key = _normalise_key(name)
        self._profiles.pop(key, None)
        self._pulses.pop(key, None)

    # ---------------------------------------------------------------------- capture
    def capture(self, pulse: SpherePulse | Mapping[str, object]) -> SpherePulse:
        resolved = _coerce_pulse(pulse)
        if resolved.sphere not in self._profiles:
            raise KeyError(f"sphere '{resolved.sphere}' is not registered")
        self._pulses.setdefault(resolved.sphere, deque(maxlen=self._history)).append(resolved)
        return resolved

    def extend(self, pulses: Iterable[SpherePulse | Mapping[str, object]]) -> None:
        for pulse in pulses:
            self.capture(pulse)

    # --------------------------------------------------------------------- snapshot
    def snapshot(self, name: str) -> SphereSnapshot:
        key = _normalise_key(name)
        profile = self._profiles.get(key)
        if profile is None:
            raise KeyError(f"sphere '{name}' is not registered")
        history = tuple(self._pulses.get(key, ()))
        if history:
            total_weight = sum(pulse.weight for pulse in history) or 1.0
            weighted_sum = sum(pulse.resonance * pulse.weight for pulse in history)
            resonance_index = weighted_sum / total_weight
            resonance_trend = self._calculate_trend(history)
            energy_delta = sum(pulse.energy_delta_twh for pulse in history)
            density_shift = sum(pulse.density_shift for pulse in history)
        else:
            resonance_index = profile.vibrational_state
            resonance_trend = 0.0
            energy_delta = 0.0
            density_shift = 0.0
        total_energy = profile.energy_output_twh + energy_delta
        return SphereSnapshot(
            sphere=profile,
            resonance_index=resonance_index,
            resonance_trend=resonance_trend,
            total_energy_output_twh=total_energy,
            cumulative_energy_delta_twh=energy_delta,
            cumulative_density_shift=density_shift,
            pulses=history,
        )

    def _calculate_trend(self, history: Sequence[SpherePulse]) -> float:
        if len(history) < 2:
            return 0.0
        window = min(6, len(history))
        recent = history[-window:]
        baseline = sum(p.resonance for p in history[:window]) / window
        latest = sum(p.resonance for p in recent) / len(recent)
        raw_trend = latest - baseline
        return raw_trend * (1.0 - self._smoothing) + history[-1].resonance * self._smoothing

    # ------------------------------------------------------------------- aggregates
    def network_state(self) -> SphereNetworkState:
        snapshots: MutableMapping[str, SphereSnapshot] = {}
        for key in self._profiles:
            snapshots[key] = self.snapshot(key)
        if snapshots:
            average_resonance = sum(snapshot.resonance_index for snapshot in snapshots.values()) / len(snapshots)
            total_energy_output = sum(snapshot.total_energy_output_twh for snapshot in snapshots.values())
            total_energy_delta = sum(snapshot.cumulative_energy_delta_twh for snapshot in snapshots.values())
        else:
            average_resonance = 0.0
            total_energy_output = 0.0
            total_energy_delta = 0.0
        attention = tuple(
            snapshot.sphere.name
            for snapshot in sorted(
                snapshots.values(),
                key=lambda snap: (snap.resonance_index, snap.sphere.name.lower()),
            )
            if snapshot.resonance_index < self._attention_threshold
        )
        return SphereNetworkState(
            average_resonance=average_resonance,
            total_energy_output_twh=total_energy_output,
            total_energy_delta_twh=total_energy_delta,
            spheres_requiring_attention=attention,
            snapshots=snapshots,
        )

    def export_state(self) -> dict[str, object]:
        state = self.network_state()
        return {
            "average_resonance": state.average_resonance,
            "total_energy_output_twh": state.total_energy_output_twh,
            "total_energy_delta_twh": state.total_energy_delta_twh,
            "spheres_requiring_attention": state.spheres_requiring_attention,
            "snapshots": {
                key: snapshot.as_dict()
                for key, snapshot in state.snapshots.items()
            },
        }
