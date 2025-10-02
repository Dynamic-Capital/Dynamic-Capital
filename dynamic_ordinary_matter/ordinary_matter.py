"""Ordinary (baryonic) matter modelling primitives and engine orchestration."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from types import MappingProxyType
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "BARYON_MASS_KG",
    "MatterConstituent",
    "OrdinaryMatterEngine",
    "OrdinaryMatterPhase",
    "OrdinaryMatterProfile",
]

BARYON_MASS_KG = 1.67262192369e-27


class OrdinaryMatterPhase(str, Enum):
    """Enumeration of supported ordinary matter phases."""

    IONISED_PLASMA = "ionised_plasma"
    NEUTRAL_GAS = "neutral_gas"
    MOLECULAR_CLOUD = "molecular_cloud"
    DUST = "dust"
    STELLAR = "stellar"
    PLANETARY = "planetary"
    COMPACT_OBJECT = "compact_object"
    INTERGALACTIC_MEDIUM = "intergalactic_medium"

    @classmethod
    def from_value(cls, value: "OrdinaryMatterPhase | str") -> "OrdinaryMatterPhase":
        if isinstance(value, cls):
            return value
        normalised = str(value).strip().lower()
        for member in cls:
            if member.value == normalised:
                return member
        raise ValueError(f"unsupported matter phase: {value!r}")


# ---------------------------------------------------------------------------
# helper utilities


def _normalise_name(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _identifier(value: str) -> str:
    return _normalise_name(value).lower()


def _ensure_positive(value: float | int, *, minimum: float = 0.0) -> float:
    numeric = float(value)
    if numeric <= minimum:
        raise ValueError(f"value must be greater than {minimum}")
    return numeric


def _ensure_non_negative(value: float | int) -> float:
    numeric = float(value)
    if numeric < 0.0:
        raise ValueError("value must be non-negative")
    return numeric


def _fraction(value: float | int) -> float:
    numeric = float(value)
    if numeric < 0.0 or numeric > 1.0:
        raise ValueError("fraction values must be between 0 and 1 inclusive")
    return numeric


def _normalise_metadata(
    metadata: Mapping[str, float] | None,
) -> Mapping[str, float] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping if provided")
    normalised: dict[str, float] = {}
    for key, value in metadata.items():
        normalised[str(key)] = float(value)
    return MappingProxyType(normalised)


def _normalise_phase_distribution(
    phases: Mapping[OrdinaryMatterPhase | str, float]
    | Iterable[tuple[OrdinaryMatterPhase | str, float]]
    | None,
) -> Mapping[OrdinaryMatterPhase, float]:
    if not phases:
        return MappingProxyType({})
    if isinstance(phases, Mapping):
        items = phases.items()
    else:
        items = tuple(phases)
    distribution: dict[OrdinaryMatterPhase, float] = {}
    total = 0.0
    for raw_phase, raw_fraction in items:
        phase = OrdinaryMatterPhase.from_value(raw_phase)
        fraction = _fraction(raw_fraction)
        if fraction == 0.0:
            continue
        previous = distribution.get(phase, 0.0)
        distribution[phase] = previous + fraction
        total += fraction
    if not distribution:
        return MappingProxyType({})
    if total == 0.0:
        return MappingProxyType({})
    normalised_total = sum(distribution.values())
    return MappingProxyType(
        {phase: value / normalised_total for phase, value in distribution.items()}
    )


def _normalise_constituents(
    constituents: Sequence["MatterConstituent"] | None,
) -> tuple["MatterConstituent", ...]:
    if not constituents:
        return ()
    return tuple(constituents)


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class MatterConstituent:
    """Represents a tracked baryonic constituent in a matter profile."""

    name: str
    mass_fraction: float
    phase: OrdinaryMatterPhase | str
    temperature_k: float
    density_kg_m3: float
    ionisation_fraction: float = 0.0
    metadata: Mapping[str, float] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.mass_fraction = _fraction(self.mass_fraction)
        self.phase = OrdinaryMatterPhase.from_value(self.phase)
        self.temperature_k = _ensure_non_negative(self.temperature_k)
        self.density_kg_m3 = _ensure_non_negative(self.density_kg_m3)
        self.ionisation_fraction = _fraction(self.ionisation_fraction)
        self.metadata = _normalise_metadata(self.metadata)

    def with_mass_fraction(self, value: float) -> "MatterConstituent":
        return MatterConstituent(
            name=self.name,
            mass_fraction=value,
            phase=self.phase,
            temperature_k=self.temperature_k,
            density_kg_m3=self.density_kg_m3,
            ionisation_fraction=self.ionisation_fraction,
            metadata=self.metadata,
        )


@dataclass(slots=True)
class OrdinaryMatterProfile:
    """Representation of a baryonic structure tracked by the engine."""

    name: str
    volume_m3: float
    mass_kg: float
    characteristic_scale_m: float
    mean_temperature_k: float
    ionisation_fraction: float
    phases: Mapping[OrdinaryMatterPhase | str, float] | None = None
    constituents: Sequence[MatterConstituent] | None = None
    metadata: Mapping[str, float] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.volume_m3 = _ensure_positive(self.volume_m3)
        self.mass_kg = _ensure_positive(self.mass_kg)
        self.characteristic_scale_m = _ensure_positive(self.characteristic_scale_m)
        self.mean_temperature_k = _ensure_non_negative(self.mean_temperature_k)
        self.ionisation_fraction = _fraction(self.ionisation_fraction)
        self.phases = _normalise_phase_distribution(self.phases)
        self.constituents = _normalise_constituents(self.constituents)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def identifier(self) -> str:
        return _identifier(self.name)

    @property
    def density_kg_m3(self) -> float:
        return self.mass_kg / self.volume_m3

    @property
    def baryon_number_density_m3(self) -> float:
        return self.mass_kg / (BARYON_MASS_KG * self.volume_m3)

    def mass_fraction_for_phase(self, phase: OrdinaryMatterPhase | str) -> float:
        resolved_phase = OrdinaryMatterPhase.from_value(phase)
        if not self.phases:
            return 0.0
        return self.phases.get(resolved_phase, 0.0)

    def constituent_mass_fraction(self, name: str) -> float:
        if not self.constituents:
            return 0.0
        target = _identifier(name)
        for constituent in self.constituents:
            if constituent.name.lower() == target:
                return constituent.mass_fraction
        return 0.0

    def with_updated_mass(self, value: float) -> "OrdinaryMatterProfile":
        return OrdinaryMatterProfile(
            name=self.name,
            volume_m3=self.volume_m3,
            mass_kg=value,
            characteristic_scale_m=self.characteristic_scale_m,
            mean_temperature_k=self.mean_temperature_k,
            ionisation_fraction=self.ionisation_fraction,
            phases=self.phases,
            constituents=self.constituents,
            metadata=self.metadata,
        )


# ---------------------------------------------------------------------------
# engine orchestration


class OrdinaryMatterEngine:
    """Orchestrates a collection of ordinary matter profiles."""

    def __init__(self) -> None:
        self._profiles: MutableMapping[str, OrdinaryMatterProfile] = {}

    def register(self, profile: OrdinaryMatterProfile, *, overwrite: bool = False) -> None:
        identifier = profile.identifier
        if not overwrite and identifier in self._profiles:
            raise ValueError(f"profile with identifier {identifier!r} already exists")
        self._profiles[identifier] = profile

    def remove(self, name: str) -> None:
        identifier = _identifier(name)
        self._profiles.pop(identifier, None)

    def get(self, name: str) -> OrdinaryMatterProfile | None:
        return self._profiles.get(_identifier(name))

    @property
    def profiles(self) -> Mapping[str, OrdinaryMatterProfile]:
        return MappingProxyType(self._profiles)

    def total_mass(self) -> float:
        return sum(profile.mass_kg for profile in self._profiles.values())

    def total_volume(self) -> float:
        return sum(profile.volume_m3 for profile in self._profiles.values())

    def average_density(self) -> float:
        total_volume = self.total_volume()
        if total_volume == 0.0:
            return 0.0
        return self.total_mass() / total_volume

    def mass_distribution_by_phase(self) -> Mapping[OrdinaryMatterPhase, float]:
        aggregated: defaultdict[OrdinaryMatterPhase, float] = defaultdict(float)
        total_mass = 0.0
        for profile in self._profiles.values():
            total_mass += profile.mass_kg
            if not profile.phases:
                continue
            for phase, fraction in profile.phases.items():
                aggregated[phase] += profile.mass_kg * fraction
        if total_mass == 0.0 or not aggregated:
            return MappingProxyType({})
        return MappingProxyType(
            {phase: mass / total_mass for phase, mass in aggregated.items()}
        )

    def baryon_number_density(self) -> float:
        total_volume = self.total_volume()
        if total_volume == 0.0:
            return 0.0
        total_mass = self.total_mass()
        return total_mass / (BARYON_MASS_KG * total_volume)

    def as_report(self) -> Mapping[str, float | Mapping[str, float]]:
        phase_distribution = {
            phase.value: fraction for phase, fraction in self.mass_distribution_by_phase().items()
        }
        return {
            "profile_count": float(len(self._profiles)),
            "total_mass_kg": self.total_mass(),
            "total_volume_m3": self.total_volume(),
            "average_density_kg_m3": self.average_density(),
            "baryon_number_density_m3": self.baryon_number_density(),
            "phase_mass_distribution": phase_distribution,
        }
