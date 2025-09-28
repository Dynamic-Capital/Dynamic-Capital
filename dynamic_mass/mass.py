"""Stellar mass modelling primitives and orchestration engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from math import pow
from types import MappingProxyType
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "SOLAR_MASS_KG",
    "SpectralType",
    "StarProfile",
    "StellarMassModel",
    "DynamicMassEngine",
]

SOLAR_MASS_KG = 1.988_47e30


class SpectralType(str, Enum):
    """Enumeration of supported stellar spectral classifications."""

    O = "o"
    B = "b"
    A = "a"
    F = "f"
    G = "g"
    K = "k"
    M = "m"
    L = "l"
    T = "t"
    Y = "y"


_SPECTRAL_MASS_FACTORS: Mapping[SpectralType, float] = MappingProxyType(
    {
        SpectralType.O: 19.0,
        SpectralType.B: 5.8,
        SpectralType.A: 2.4,
        SpectralType.F: 1.6,
        SpectralType.G: 1.0,
        SpectralType.K: 0.78,
        SpectralType.M: 0.45,
        SpectralType.L: 0.25,
        SpectralType.T: 0.18,
        SpectralType.Y: 0.12,
    }
)


# ---------------------------------------------------------------------------
# helper utilities


def _normalise_name(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _identifier(value: str) -> str:
    return _normalise_name(value).lower()


def _clamp01(value: float | int) -> float:
    numeric = float(value)
    if numeric < 0.0:
        return 0.0
    if numeric > 1.0:
        return 1.0
    return numeric


def _ensure_positive(value: float | int, *, minimum: float = 0.0) -> float:
    numeric = float(value)
    if numeric <= minimum:
        raise ValueError(f"value must be greater than {minimum}")
    return numeric


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip()
        if cleaned:
            lowered = cleaned.lower()
            if lowered not in seen:
                seen.add(lowered)
                ordered.append(cleaned)
    return tuple(ordered)


def _normalise_metadata(metadata: Mapping[str, float] | None) -> Mapping[str, float] | None:
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


# ---------------------------------------------------------------------------
# data models


@dataclass(slots=True)
class StarProfile:
    """Representation of a star tracked by the mass engine."""

    name: str
    spectral_type: SpectralType | str
    luminosity_solar: float
    radius_solar: float
    temperature_k: float
    metallicity: float = 0.012
    variability_index: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, float] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        if isinstance(self.spectral_type, str):
            try:
                self.spectral_type = SpectralType(self.spectral_type.lower())
            except ValueError as exc:  # pragma: no cover - defensive path
                raise ValueError(f"unsupported spectral type: {self.spectral_type}") from exc
        self.luminosity_solar = _ensure_positive(self.luminosity_solar, minimum=0.0)
        self.radius_solar = _ensure_positive(self.radius_solar, minimum=0.0)
        self.temperature_k = _ensure_positive(self.temperature_k, minimum=0.0)
        self.metallicity = max(float(self.metallicity), 0.0)
        self.variability_index = _clamp01(self.variability_index)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def identifier(self) -> str:
        return _identifier(self.name)

    @property
    def estimated_mass_solar(self) -> float:
        luminosity_term = pow(max(self.luminosity_solar, 1e-9), 0.285714)  # approx. L^(1/3.5)
        radius_term = pow(max(self.radius_solar, 1e-9), 0.9)
        temperature_term = max(self.temperature_k / 5772.0, 0.1)
        base = 0.62 * luminosity_term + 0.28 * radius_term + 0.1 * temperature_term
        factor = _SPECTRAL_MASS_FACTORS[self.spectral_type]
        estimated = base * factor
        return max(0.08, estimated)

    def with_variability(self, value: float) -> "StarProfile":
        return StarProfile(
            name=self.name,
            spectral_type=self.spectral_type,
            luminosity_solar=self.luminosity_solar,
            radius_solar=self.radius_solar,
            temperature_k=self.temperature_k,
            metallicity=self.metallicity,
            variability_index=_clamp01(value),
            tags=self.tags,
            metadata=self.metadata,
        )


@dataclass(slots=True)
class StellarMassModel:
    """Mass assignment for a specific star."""

    star_name: str
    baseline_mass_solar: float
    adjustment_factor: float = 1.0
    variability_index: float = 0.0
    metadata: Mapping[str, float] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.star_name = _normalise_name(self.star_name)
        self.baseline_mass_solar = max(float(self.baseline_mass_solar), 0.08)
        self.adjustment_factor = max(float(self.adjustment_factor), 0.0)
        self.variability_index = _clamp01(self.variability_index)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def star_identifier(self) -> str:
        return _identifier(self.star_name)

    @property
    def assigned_mass_solar(self) -> float:
        variability_multiplier = 1.0 + 0.12 * self.variability_index
        assigned = self.baseline_mass_solar * max(self.adjustment_factor, 0.0) * variability_multiplier
        return max(0.08, assigned)

    @property
    def assigned_mass_kg(self) -> float:
        return self.assigned_mass_solar * SOLAR_MASS_KG

    def adjusted(
        self,
        *,
        baseline_mass_solar: float | None = None,
        adjustment_factor: float | None = None,
        variability_index: float | None = None,
        metadata: Mapping[str, float] | None = None,
    ) -> "StellarMassModel":
        return StellarMassModel(
            star_name=self.star_name,
            baseline_mass_solar=baseline_mass_solar if baseline_mass_solar is not None else self.baseline_mass_solar,
            adjustment_factor=adjustment_factor if adjustment_factor is not None else self.adjustment_factor,
            variability_index=_clamp01(variability_index if variability_index is not None else self.variability_index),
            metadata=self.metadata if metadata is None else metadata,
        )


# ---------------------------------------------------------------------------
# orchestration engine


class DynamicMassEngine:
    """Co-ordinates star profiles and their associated mass models."""

    def __init__(
        self,
        stars: Sequence[StarProfile | Mapping[str, object]] | None = None,
    ) -> None:
        self._stars: MutableMapping[str, StarProfile] = {}
        self._mass_models: MutableMapping[str, StellarMassModel] = {}
        if stars:
            self.register_stars(stars)

    # ------------------------------------------------------------------ ingestion
    def register_star(self, star: StarProfile | Mapping[str, object]) -> StarProfile:
        resolved = self._resolve_star(star)
        key = resolved.identifier
        self._stars[key] = resolved
        baseline = resolved.estimated_mass_solar
        current = self._mass_models.get(key)
        if current is None:
            self._mass_models[key] = StellarMassModel(
                star_name=resolved.name,
                baseline_mass_solar=baseline,
                variability_index=resolved.variability_index,
                metadata=resolved.metadata,
            )
        else:
            self._mass_models[key] = current.adjusted(
                baseline_mass_solar=baseline,
                variability_index=resolved.variability_index,
                metadata=resolved.metadata,
            )
        return resolved

    def register_stars(self, stars: Iterable[StarProfile | Mapping[str, object]]) -> tuple[StarProfile, ...]:
        registered: list[StarProfile] = []
        for star in stars:
            registered.append(self.register_star(star))
        return tuple(registered)

    def remove_star(self, name: str) -> None:
        key = _identifier(name)
        self._stars.pop(key, None)
        self._mass_models.pop(key, None)

    # ------------------------------------------------------------------- queries
    @property
    def stars(self) -> tuple[StarProfile, ...]:
        return tuple(self._stars.values())

    @property
    def mass_models(self) -> tuple[StellarMassModel, ...]:
        return tuple(self._mass_models.values())

    def get_star(self, name: str) -> StarProfile | None:
        return self._stars.get(_identifier(name))

    def get_mass_model(self, name: str) -> StellarMassModel | None:
        return self._mass_models.get(_identifier(name))

    # ---------------------------------------------------------------- assignment
    def assign_mass(
        self,
        name: str,
        *,
        adjustment_factor: float | None = None,
        variability_index: float | None = None,
        metadata: Mapping[str, float] | None = None,
    ) -> StellarMassModel:
        key = _identifier(name)
        star = self._stars.get(key)
        if star is None:
            raise KeyError(f"unknown star '{name}'")
        baseline = star.estimated_mass_solar
        current = self._mass_models.get(key)
        if current is None:
            current = StellarMassModel(
                star_name=star.name,
                baseline_mass_solar=baseline,
                variability_index=star.variability_index,
                metadata=metadata if metadata is not None else star.metadata,
            )
        updated_metadata = metadata if metadata is not None else current.metadata
        updated = current.adjusted(
            baseline_mass_solar=baseline,
            adjustment_factor=adjustment_factor,
            variability_index=variability_index,
            metadata=updated_metadata,
        )
        self._mass_models[key] = updated
        return updated

    def assign_all(self) -> tuple[StellarMassModel, ...]:
        assigned: list[StellarMassModel] = []
        for star in self._stars.values():
            assigned.append(self.assign_mass(star.name))
        return tuple(assigned)

    # ------------------------------------------------------------------- metrics
    def total_assigned_mass_solar(self) -> float:
        return sum(model.assigned_mass_solar for model in self._mass_models.values())

    def total_assigned_mass_kg(self) -> float:
        return self.total_assigned_mass_solar() * SOLAR_MASS_KG

    def ranked_by_mass(self, *, descending: bool = True) -> tuple[StellarMassModel, ...]:
        return tuple(
            sorted(
                self._mass_models.values(),
                key=lambda model: model.assigned_mass_solar,
                reverse=descending,
            )
        )

    def export_state(self) -> dict[str, object]:
        return {
            "stars": [
                {
                    "name": star.name,
                    "spectral_type": star.spectral_type.value,
                    "luminosity_solar": star.luminosity_solar,
                    "radius_solar": star.radius_solar,
                    "temperature_k": star.temperature_k,
                    "metallicity": star.metallicity,
                    "variability_index": star.variability_index,
                    "estimated_mass_solar": star.estimated_mass_solar,
                    "tags": star.tags,
                }
                for star in self._stars.values()
            ],
            "mass_models": [
                {
                    "star_name": model.star_name,
                    "baseline_mass_solar": model.baseline_mass_solar,
                    "assigned_mass_solar": model.assigned_mass_solar,
                    "assigned_mass_kg": model.assigned_mass_kg,
                    "adjustment_factor": model.adjustment_factor,
                    "variability_index": model.variability_index,
                }
                for model in self._mass_models.values()
            ],
            "total_mass_solar": self.total_assigned_mass_solar(),
            "total_mass_kg": self.total_assigned_mass_kg(),
        }

    # ------------------------------------------------------------------ internals
    @staticmethod
    def _resolve_star(star: StarProfile | Mapping[str, object]) -> StarProfile:
        if isinstance(star, StarProfile):
            return star
        if isinstance(star, Mapping):
            return StarProfile(**star)
        raise TypeError("star must be a StarProfile instance or mapping")
