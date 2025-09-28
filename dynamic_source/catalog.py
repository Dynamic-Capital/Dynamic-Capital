"""Curated reference catalog of sources across multiple knowledge domains."""

from __future__ import annotations

from typing import Iterable, Mapping, MutableMapping, Sequence

from .engine import DynamicSourceEngine, SourceDescriptor

__all__ = [
    "REFERENCE_SOURCE_TAXONOMY",
    "build_reference_descriptors",
    "register_reference_catalog",
]


REFERENCE_SOURCE_TAXONOMY: Mapping[str, Mapping[str, Sequence[str]]] = {
    "law": {
        "primary": (
            "Constitutions",
            "Statutes",
            "Judicial decisions",
        ),
        "secondary": (
            "Scholarly articles",
            "Legal encyclopedias",
            "Legal treatises",
        ),
    },
    "academic_research": {
        "primary": (
            "Original documents",
            "Interview transcripts",
            "Raw data",
        ),
        "secondary": (
            "Journal articles",
            "Books",
            "Literature reviews",
        ),
        "tertiary": (
            "Encyclopedias",
            "Research databases",
        ),
    },
    "energy": {
        "renewable": (
            "Solar energy",
            "Wind energy",
            "Hydroelectric energy",
            "Geothermal energy",
            "Biomass energy",
        ),
        "non_renewable": (
            "Coal",
            "Oil",
            "Natural gas",
            "Nuclear fuels",
        ),
    },
    "water": {
        "natural": (
            "Rainfall",
            "Rivers",
            "Lakes",
            "Streams",
            "Groundwater",
        ),
        "man_made": (
            "Reservoirs",
            "Dams",
            "Canals",
        ),
    },
    "science_experiment": {
        "random_errors": ("Measurement noise",),
        "systematic_errors": (
            "Instrument calibration drift",
        ),
        "human_errors": (
            "Misreading instruments",
            "Data entry mistakes",
        ),
    },
    "business_finance": {
        "internal": (
            "Retained earnings",
            "Owner capital",
            "Asset sales",
        ),
        "external": (
            "Bank loans",
            "Venture capital",
            "Grants",
            "Trade credit",
        ),
    },
    "religious_authority": {
        "sacred_texts": (
            "Bible",
            "Guru Granth Sahib",
            "Qur'an",
            "Vedas",
        ),
        "religious_tradition": (
            "Oral teachings",
            "Ritual laws",
        ),
        "religious_leaders": (
            "Prophets",
            "Gurus",
            "Imams",
            "Saints",
        ),
    },
}


def build_reference_descriptors(
    *,
    reliability_overrides: Mapping[str, float] | None = None,
    criticality_overrides: Mapping[str, float] | None = None,
    freshness_overrides: Mapping[str, int] | None = None,
) -> tuple[SourceDescriptor, ...]:
    """Create source descriptors from the curated taxonomy.

    The override mappings accept either a fully-qualified ``"domain:name"`` key or
    a plain source name.  This gives consumers flexibility to tune scores without
    having to duplicate the taxonomy structure.
    """

    reliability_overrides = dict(reliability_overrides or {})
    criticality_overrides = dict(criticality_overrides or {})
    freshness_overrides = dict(freshness_overrides or {})

    descriptors: list[SourceDescriptor] = []
    for domain, categories in REFERENCE_SOURCE_TAXONOMY.items():
        for tier, sources in categories.items():
            for source in sources:
                lookup_keys = (f"{domain}:{source}", source)
                reliability = _lookup_override(lookup_keys, reliability_overrides, default=_default_reliability(tier))
                criticality = _lookup_override(lookup_keys, criticality_overrides, default=_default_criticality(domain, tier))
                freshness = _lookup_override(lookup_keys, freshness_overrides, default=_default_freshness(domain))
                descriptors.append(
                    SourceDescriptor(
                        name=source,
                        domain=domain,
                        tier=tier,
                        reliability=reliability,
                        criticality=criticality,
                        freshness_sla_minutes=freshness,
                        tags=(domain, tier),
                        metadata={"domain": domain, "tier": tier},
                    )
                )
    return tuple(descriptors)


def register_reference_catalog(
    engine: DynamicSourceEngine,
    *,
    clear_existing: bool = False,
    descriptors: Iterable[SourceDescriptor] | None = None,
) -> tuple[SourceDescriptor, ...]:
    """Populate an engine with the curated catalog.

    Parameters
    ----------
    engine:
        The :class:`~dynamic_source.engine.DynamicSourceEngine` instance to
        populate.
    clear_existing:
        When ``True`` existing sources tracked by the engine are removed before
        the catalog is registered.
    descriptors:
        Custom descriptors to register instead of building the default catalog.

    Returns
    -------
    tuple[SourceDescriptor, ...]
        The descriptors that were registered with the engine.
    """

    if clear_existing:
        for descriptor in list(engine.sources):
            engine.remove_source(descriptor.name)

    catalog = tuple(descriptors or build_reference_descriptors())
    for descriptor in catalog:
        engine.register_source(descriptor)
    return catalog


def _lookup_override(
    keys: Sequence[str],
    overrides: MutableMapping[str, float | int],
    *,
    default: float | int,
) -> float | int:
    for key in keys:
        if key in overrides:
            return overrides[key]
    return default


def _default_reliability(tier: str) -> float:
    if "primary" in tier:
        return 0.85
    if tier in {"renewable", "non_renewable"}:
        return 0.75
    if tier in {"internal", "external"}:
        return 0.7
    return 0.65


def _default_criticality(domain: str, tier: str) -> float:
    if domain == "business_finance" and tier == "external":
        return 0.8
    if domain == "energy" and tier == "renewable":
        return 0.75
    if domain == "religious_authority" and tier == "sacred_texts":
        return 0.85
    return 0.6


def _default_freshness(domain: str) -> int:
    if domain in {"energy", "water"}:
        return 1440  # daily updates
    if domain == "science_experiment":
        return 180
    return 720
