"""Catalog electromagnetic waves and generate dynamic names for project use."""

from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from typing import Dict, Iterable, List, Mapping, Tuple

__all__ = [
    "DynamicWave",
    "DynamicWaveCatalog",
    "WaveBlueprint",
    "WaveUseProfile",
    "generate_dynamic_wave_name",
]


@dataclass(slots=True)
class WaveUseProfile:
    """Describe the operational posture required for a wave band."""

    strengths: Tuple[str, ...]
    high_leverage_uses: Tuple[str, ...]
    safeguards: Tuple[str, ...]


@dataclass(slots=True)
class WaveBlueprint:
    """Baseline specification for an electromagnetic wave band."""

    band: str
    wavelength_nm: Tuple[float | None, float | None]
    frequency_hz: Tuple[float | None, float | None]
    profile: WaveUseProfile


@dataclass(slots=True)
class DynamicWave:
    """Concrete wave entry with a dynamic, project-specific name."""

    blueprint: WaveBlueprint
    dynamic_name: str = ""

    def ensure_dynamic_name(self, *, project: str | None = None, seed: str | None = None) -> str:
        """Populate ``dynamic_name`` when empty and return it."""

        if not self.dynamic_name:
            self.dynamic_name = generate_dynamic_wave_name(
                self.blueprint.band,
                project=project,
                seed=seed,
            )
        return self.dynamic_name


_DEFAULT_BLUEPRINTS: Dict[str, WaveBlueprint] = {}


def _hz_from_nm(lower_nm: float | None, upper_nm: float | None) -> Tuple[float | None, float | None]:
    """Convert wavelength nanometres to approximate frequency in hertz."""

    speed_of_light = 299_792_458.0
    lower_hz: float | None
    upper_hz: float | None
    if upper_nm:
        lower_hz = speed_of_light / (upper_nm * 1e-9)
    else:
        lower_hz = None
    if lower_nm:
        upper_hz = speed_of_light / (lower_nm * 1e-9)
    else:
        upper_hz = None
    return (lower_hz, upper_hz)


_DEF_WAVE_DATA: Tuple[Tuple[str, Tuple[float | None, float | None], Tuple[str, ...], Tuple[str, ...], Tuple[str, ...]], ...] = (
    (
        "Gamma",
        (None, 0.01),
        (
            "Deep penetration for material disruption",
            "Cellular-level energy delivery",
        ),
        (
            "Radiotherapy beam shaping",
            "Sterilising sealed equipment",
            "Astrophysical burst analysis",
        ),
        (
            "Medical physicist dose planning",
            "Vault shielding audits",
            "Robotic handling for source containment",
        ),
    ),
    (
        "X-Ray",
        (0.01, 10.0),
        (
            "High resolution through dense matter",
            "Rapid capture of anatomical detail",
        ),
        (
            "Diagnostic imaging",
            "Industrial non-destructive testing",
            "Security scanning",
        ),
        (
            "ALARA compliance",
            "Calibrated detector maintenance",
            "Operator exposure tracking",
        ),
    ),
    (
        "Ultraviolet",
        (10.0, 400.0),
        (
            "Surface sterilisation",
            "Photochemical activation",
        ),
        (
            "UV-C disinfection",
            "Forensic fluorescence",
            "Industrial UV curing",
        ),
        (
            "Material compatibility checks",
            "PPE stock monitoring",
            "Exposure timers and interlocks",
        ),
    ),
    (
        "Visible",
        (400.0, 700.0),
        (
            "Direct human perception",
            "Precision optical control",
        ),
        (
            "Vision systems",
            "Laser machining",
            "Fiber communications",
        ),
        (
            "Laser safety programme",
            "Optical alignment SOPs",
            "Protective eyewear enforcement",
        ),
    ),
    (
        "Infrared",
        (700.0, 1_000_000.0),
        (
            "Thermal mapping",
            "Visibility through particulates",
        ),
        (
            "Thermal imaging",
            "Remote sensing",
            "Medical diagnostics",
        ),
        (
            "Emissivity calibration",
            "Sensor cooling",
            "Data pipeline hardening",
        ),
    ),
    (
        "Microwave",
        (1_000_000.0, 3e8),
        (
            "Efficient molecular excitation",
            "Short to mid-range data links",
        ),
        (
            "Communications backhaul",
            "Radar operations",
            "Microwave heating",
        ),
        (
            "RF exposure surveys",
            "Interference logging",
            "Thermal management audits",
        ),
    ),
    (
        "Radio",
        (3e8, None),
        (
            "Long-range propagation",
            "Spectrum agility",
        ),
        (
            "Broadcasting",
            "Cellular connectivity",
            "Deep-space communication",
        ),
        (
            "Spectrum licensing",
            "Redundant link design",
            "Antenna siting assessments",
        ),
    ),
)


for band, wavelength_nm, strengths, uses, safeguards in _DEF_WAVE_DATA:
    _DEFAULT_BLUEPRINTS[band.lower()] = WaveBlueprint(
        band=band,
        wavelength_nm=wavelength_nm,
        frequency_hz=_hz_from_nm(*wavelength_nm),
        profile=WaveUseProfile(
            strengths=strengths,
            high_leverage_uses=uses,
            safeguards=safeguards,
        ),
    )


class DynamicWaveCatalog:
    """Manage dynamic waves and ensure the canonical bands are present."""

    def __init__(self, *, waves: Iterable[DynamicWave] | None = None) -> None:
        self._waves: Dict[str, DynamicWave] = {}
        if waves:
            for wave in waves:
                key = wave.blueprint.band.lower()
                self._waves[key] = wave
        self.ensure_default_waves()

    @property
    def waves(self) -> Mapping[str, DynamicWave]:
        return self._waves

    def ensure_default_waves(self) -> None:
        """Populate any missing canonical bands."""

        for key, blueprint in _DEFAULT_BLUEPRINTS.items():
            if key not in self._waves:
                self._waves[key] = DynamicWave(blueprint=blueprint)

    def optimise(self, *, project: str | None = None) -> None:
        """Ensure each wave has a dynamic project name and consistent ordering."""

        for wave in self._waves.values():
            wave.ensure_dynamic_name(project=project)

    def as_sorted_list(self) -> List[DynamicWave]:
        """Return waves sorted by descending frequency."""

        def _sort_key(item: DynamicWave) -> float:
            lower, upper = item.blueprint.frequency_hz
            # Prefer higher frequency bands first, fallback to 0 when unknown.
            candidates = [value for value in (upper, lower) if value is not None]
            return -max(candidates, default=0.0)

        return sorted(self._waves.values(), key=_sort_key)

    def summary(self) -> List[Dict[str, object]]:
        """Provide a serialisable summary of the catalog."""

        result: List[Dict[str, object]] = []
        for wave in self.as_sorted_list():
            bp = wave.blueprint
            result.append(
                {
                    "band": bp.band,
                    "dynamic_name": wave.dynamic_name,
                    "wavelength_nm": bp.wavelength_nm,
                    "frequency_hz": bp.frequency_hz,
                    "strengths": list(bp.profile.strengths),
                    "uses": list(bp.profile.high_leverage_uses),
                    "safeguards": list(bp.profile.safeguards),
                }
            )
        return result


def generate_dynamic_wave_name(band: str, *, project: str | None = None, seed: str | None = None) -> str:
    """Create a deterministic but distinctive name for a wave band."""

    base = "::".join(
        filter(
            None,
            (
                band.strip().lower(),
                project.strip().lower() if project else None,
                seed.strip().lower() if seed else None,
            ),
        )
    )
    digest = sha256(base.encode("utf-8")).digest()
    syllables = (
        "ara",
        "dyn",
        "flux",
        "ion",
        "nova",
        "quanta",
        "spire",
        "vela",
    )
    consonants = "bcdfghjklmnpqrstvwxyz"
    vowels = "aeiou"

    idx = digest[0] % len(syllables)
    syllable = syllables[idx]
    consonant = consonants[digest[1] % len(consonants)]
    vowel = vowels[digest[2] % len(vowels)]
    token = digest[3:7].hex()

    name_parts = [band.split()[0].title(), syllable.title(), f"{consonant}{vowel}", token]
    dynamic_name = "-".join(name_parts)

    if project:
        dynamic_name = f"{dynamic_name}-{project.strip().lower().replace(' ', '-')[:16]}"
    return dynamic_name
