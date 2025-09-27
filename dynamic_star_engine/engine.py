"""Procedural generation utilities for dynamic star agents."""

from __future__ import annotations

import math
import random
import unicodedata
from dataclasses import dataclass
from types import MappingProxyType
from typing import Dict, Mapping, Sequence
from typing import Literal, cast

from .agents import StarAgent

__all__ = ["DynamicStarEngine", "StarAgentSeed"]

# Styles supported by both the Python engine and the TypeScript star name
# generator.  Using ``Literal`` keeps the public API type-safe and allows us to
# validate caller input before attempting to build names.
StarStyle = Literal["classical", "mythic", "catalog", "hybrid"]


DEFAULT_VOCABULARY: Mapping[str, Sequence[str]] = {
    "greek_letters": (
        "Alpha",
        "Beta",
        "Gamma",
        "Delta",
        "Epsilon",
        "Zeta",
        "Eta",
        "Theta",
        "Iota",
        "Kappa",
        "Lambda",
        "Mu",
        "Nu",
        "Xi",
        "Omicron",
        "Pi",
        "Rho",
        "Sigma",
        "Tau",
        "Upsilon",
        "Phi",
        "Chi",
        "Psi",
        "Omega",
    ),
    "constellations": (
        "Andromedae",
        "Aquilae",
        "Aurigae",
        "Boötis",
        "Canis Majoris",
        "Carinae",
        "Cassiopeiae",
        "Centauri",
        "Cygni",
        "Draconis",
        "Eridani",
        "Geminorum",
        "Leonis",
        "Lyrae",
        "Orionis",
        "Pegasi",
        "Persei",
        "Sagittarii",
        "Scorpii",
        "Tauri",
        "Ursae Majoris",
        "Ursae Minoris",
        "Virginis",
    ),
    "mythic_descriptors": (
        "Luminous",
        "Radiant",
        "Arcane",
        "Celestial",
        "Wandering",
        "Eternal",
        "Glacial",
        "Solar",
        "Nebular",
        "Verdant",
        "Harmonic",
        "Resonant",
        "Empyreal",
        "Obsidian",
        "Auroral",
        "Chrono",
        "Stellar",
        "Prismatic",
        "Vanguard",
        "Aether",
    ),
    "mythic_cores": (
        "Phoenix",
        "Drake",
        "Oracle",
        "Nomad",
        "Sentinel",
        "Aegis",
        "Lyric",
        "Crown",
        "Harbinger",
        "Grove",
        "Lattice",
        "Paradox",
        "Spire",
        "Monolith",
        "Echo",
        "Harmony",
        "Pulse",
        "Voyager",
        "Helix",
        "Beacon",
    ),
    "catalog_prefixes": ("HD", "HR", "HIP", "BD", "SAO", "TYC", "Gaia"),
    "spectral_classes": ("O", "B", "A", "F", "G", "K", "M"),
    "designations": ("A", "B", "C", "D", "E"),
    "luminosity_classes": ("Ia", "Ib", "II", "III", "IV", "V"),
}


@dataclass(frozen=True)
class StarAgentSeed:
    """Parameters controlling how agents are generated."""

    style: StarStyle = "hybrid"
    include_spectral_class: bool = True
    include_designation: bool = False
    vocabulary: Mapping[str, Sequence[str]] | None = None


@dataclass(frozen=True)
class _ResolvedSeed:
    """Immutable configuration used for a single generation step."""

    style: StarStyle
    include_spectral_class: bool
    include_designation: bool
    vocabulary: Mapping[str, Sequence[str]]


class DynamicStarEngine:
    """Create deterministic star agents suitable for simulations."""

    def __init__(
        self,
        *,
        seed: int | str | None = None,
        defaults: StarAgentSeed | None = None,
    ) -> None:
        self._seed = seed
        self._defaults = defaults or StarAgentSeed()
        self._invocation_index = 0

    def spawn_agent(
        self,
        *,
        role: str | None = None,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
        style: str | None = None,
        include_spectral_class: bool | None = None,
        include_designation: bool | None = None,
        vocabulary: Mapping[str, Sequence[str]] | None = None,
    ) -> StarAgent:
        """Generate a deterministic agent from the configured seed."""

        config = self._resolve_config(
            style=style,
            include_spectral_class=include_spectral_class,
            include_designation=include_designation,
            vocabulary=vocabulary,
        )
        tags_tuple = _normalise_sequence(tags or ())
        agent = self._spawn_agent_at(
            self._invocation_index,
            config,
            role=role,
            tags=tags_tuple,
            metadata=metadata,
        )
        self._invocation_index += 1
        return agent

    def spawn_roster(
        self,
        count: int,
        *,
        roles: Sequence[str] | None = None,
        tags: Sequence[str] | None = None,
        style: str | None = None,
        include_spectral_class: bool | None = None,
        include_designation: bool | None = None,
        vocabulary: Mapping[str, Sequence[str]] | None = None,
    ) -> list[StarAgent]:
        """Generate a roster of star agents with deterministic ordering."""

        if count <= 0 or not math.isfinite(count):
            raise ValueError("count must be a positive finite number")

        resolved = self._resolve_config(
            style=style,
            include_spectral_class=include_spectral_class,
            include_designation=include_designation,
            vocabulary=vocabulary,
        )
        tags_tuple = _normalise_sequence(tags or ())
        role_cycle = list(roles or ())

        roster: list[StarAgent] = []
        for index in range(int(count)):
            role = role_cycle[index % len(role_cycle)] if role_cycle else None
            roster.append(
                self._spawn_agent_at(
                    self._invocation_index,
                    resolved,
                    role=role,
                    tags=tags_tuple,
                    metadata=None,
                )
            )
            self._invocation_index += 1
        return roster

    def preview(
        self,
        count: int,
        *,
        style: str | None = None,
        include_spectral_class: bool | None = None,
        include_designation: bool | None = None,
        vocabulary: Mapping[str, Sequence[str]] | None = None,
    ) -> list[str]:
        """Return a quick-look list of generated designations."""

        if count <= 0 or not math.isfinite(count):
            raise ValueError("count must be a positive finite number")

        resolved = self._resolve_config(
            style=style,
            include_spectral_class=include_spectral_class,
            include_designation=include_designation,
            vocabulary=vocabulary,
        )
        return [
            self._spawn_agent_at(
                self._invocation_index + index,
                resolved,
                role=None,
                tags=(),
                metadata=None,
            ).designation
            for index in range(int(count))
        ]

    def all_designations(
        self,
        *,
        style: str | None = None,
        vocabulary: Mapping[str, Sequence[str]] | None = None,
    ) -> list[str]:
        """Enumerate every designation available for deterministic styles."""

        resolved = self._resolve_config(
            style=style,
            include_spectral_class=None,
            include_designation=None,
            vocabulary=vocabulary,
        )
        return list(_enumerate_designations(resolved.style, resolved.vocabulary))

    def _build_rng(self, offset: int) -> random.Random:
        seed = self._seed
        if seed is None:
            return random.Random()
        chained = f"{seed}:{offset}" if offset else str(seed)
        return random.Random(chained)

    def _resolve_config(
        self,
        *,
        style: str | None,
        include_spectral_class: bool | None,
        include_designation: bool | None,
        vocabulary: Mapping[str, Sequence[str]] | None,
    ) -> _ResolvedSeed:
        defaults = self._defaults
        style_value = style or defaults.style
        if style_value not in {"classical", "mythic", "catalog", "hybrid"}:
            raise ValueError(f"unknown star style: {style_value!r}")

        include_spectral = (
            include_spectral_class
            if include_spectral_class is not None
            else defaults.include_spectral_class
        )
        include_designation_value = (
            include_designation
            if include_designation is not None
            else defaults.include_designation
        )

        vocab_source = vocabulary or defaults.vocabulary
        vocabulary_value = _normalise_vocabulary(vocab_source)

        resolved_style = cast(StarStyle, style_value)
        return _ResolvedSeed(
            style=resolved_style,
            include_spectral_class=include_spectral,
            include_designation=include_designation_value,
            vocabulary=vocabulary_value,
        )

    def _generate_name(self, rng: random.Random, config: _ResolvedSeed) -> str:
        vocab = config.vocabulary
        style = config.style
        if style == "classical":
            name = _classical_name(rng, vocab)
        elif style == "mythic":
            name = _mythic_name(rng, vocab)
        elif style == "catalog":
            name = _catalog_name(rng, vocab)
        else:
            name = _hybrid_name(rng, vocab)

        segments = [name]
        if config.include_spectral_class:
            spectral = rng.choice(vocab["spectral_classes"])
            subclass = rng.randrange(10)
            segments.append(f"({spectral}{subclass})")
        if config.include_designation:
            segments.append(rng.choice(vocab["designations"]))
        return " ".join(segments)

    def _generate_spectral_type(
        self,
        rng: random.Random,
        config: _ResolvedSeed,
        name: str,
    ) -> str:
        vocab = config.vocabulary
        spectral = rng.choice(vocab["spectral_classes"])
        subclass = rng.randrange(10)
        luminosity = rng.choice(vocab["luminosity_classes"])
        checksum = sum(ord(char) for char in name) % 3
        variability = ("var", "pec", "std")[checksum]
        return f"{spectral}{subclass} {luminosity} {variability}"

    def _spawn_agent_at(
        self,
        offset: int,
        config: _ResolvedSeed,
        *,
        role: str | None,
        tags: tuple[str, ...],
        metadata: Mapping[str, object] | None,
    ) -> StarAgent:
        rng = self._build_rng(offset)
        name = self._generate_name(rng, config)
        spectral_type = self._generate_spectral_type(rng, config, name)
        magnitude = _round(rng.uniform(-5.5, 14.0), 3)
        distance = _round(rng.uniform(3.2, 1500.0), 3)
        temperament = _build_temperament(rng)
        role_tuple = _normalise_sequence((role,) if role else ())
        identifier = _slugify(name)

        return StarAgent(
            identifier=identifier,
            designation=name,
            spectral_type=spectral_type,
            absolute_magnitude=magnitude,
            distance_ly=distance,
            roles=role_tuple,
            temperament=temperament,
            tags=tags,
            metadata=dict(metadata) if metadata is not None else None,
        )


def _normalise_vocabulary(
    overrides: Mapping[str, Sequence[str]] | None,
) -> Mapping[str, Sequence[str]]:
    if overrides is None:
        return DEFAULT_VOCABULARY

    merged: Dict[str, Sequence[str]] = {
        key: tuple(values) for key, values in DEFAULT_VOCABULARY.items()
    }
    for key, values in overrides.items():
        normalised = tuple(values)
        if not normalised:
            raise ValueError(f"vocabulary[{key!r}] must not be empty")
        merged[key] = normalised
    return MappingProxyType(merged)


def _classical_name(rng: random.Random, vocab: Mapping[str, Sequence[str]]) -> str:
    return f"{rng.choice(vocab['greek_letters'])} {rng.choice(vocab['constellations'])}"


def _mythic_name(rng: random.Random, vocab: Mapping[str, Sequence[str]]) -> str:
    return f"{rng.choice(vocab['mythic_descriptors'])} {rng.choice(vocab['mythic_cores'])}"


def _catalog_name(rng: random.Random, vocab: Mapping[str, Sequence[str]]) -> str:
    prefix = rng.choice(vocab["catalog_prefixes"])
    digits = rng.randrange(1000, 9999)
    suffix = rng.randrange(100)
    return f"{prefix} {digits}{suffix:02d}"


def _hybrid_name(rng: random.Random, vocab: Mapping[str, Sequence[str]]) -> str:
    return f"{_mythic_name(rng, vocab)} of {_classical_name(rng, vocab)}"


def _enumerate_designations(
    style: StarStyle,
    vocabulary: Mapping[str, Sequence[str]],
) -> Sequence[str]:
    if style == "classical":
        return _enumerate_classical(vocabulary)
    if style == "mythic":
        return _enumerate_mythic(vocabulary)
    if style == "hybrid":
        return _enumerate_hybrid(vocabulary)
    # Catalog designations rely on pseudo-random numeric components and would
    # explode combinatorially if enumerated. Callers should instead request the
    # specific amount they need via ``preview`` or ``spawn_roster``.
    raise ValueError("catalog designations cannot be enumerated exhaustively")


def _enumerate_classical(
    vocabulary: Mapping[str, Sequence[str]],
) -> Sequence[str]:
    letters = vocabulary["greek_letters"]
    constellations = vocabulary["constellations"]
    return [
        f"{letter} {constellation}"
        for letter in letters
        for constellation in constellations
    ]


def _enumerate_mythic(
    vocabulary: Mapping[str, Sequence[str]],
) -> Sequence[str]:
    descriptors = vocabulary["mythic_descriptors"]
    cores = vocabulary["mythic_cores"]
    return [f"{descriptor} {core}" for descriptor in descriptors for core in cores]


def _enumerate_hybrid(
    vocabulary: Mapping[str, Sequence[str]],
) -> Sequence[str]:
    mythic_names = _enumerate_mythic(vocabulary)
    classical_names = _enumerate_classical(vocabulary)
    return [f"{mythic} of {classical}" for mythic in mythic_names for classical in classical_names]


def _build_temperament(rng: random.Random) -> Mapping[str, float]:
    traits = {
        "stability": rng.uniform(0.2, 0.95),
        "curiosity": rng.uniform(0.3, 0.99),
        "ingenuity": rng.uniform(0.25, 0.98),
        "influence": rng.uniform(0.1, 0.9),
    }
    return {key: _round(value, 3) for key, value in traits.items()}


def _normalise_sequence(values: Sequence[str]) -> tuple[str, ...]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        stripped = value.strip()
        if stripped and stripped not in seen:
            cleaned.append(stripped)
            seen.add(stripped)
    return tuple(cleaned)


def _slugify(value: str) -> str:
    normalised = unicodedata.normalize("NFKD", value)
    ascii_value = normalised.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_value.lower()
    slug = "".join(char if char.isalnum() else "-" for char in lowered)
    slug = "-".join(filter(None, slug.split("-")))
    return slug or "star-agent"


def _round(value: float, precision: int) -> float:
    return round(value, precision)
