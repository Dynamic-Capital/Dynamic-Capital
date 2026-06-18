from __future__ import annotations

from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_source import catalog as source_catalog
from dynamic_source import engine as source_engine


@pytest.fixture()
def engine() -> source_engine.DynamicSourceEngine:
    return source_engine.DynamicSourceEngine()


def test_build_reference_descriptors_defaults() -> None:
    descriptors = source_catalog.build_reference_descriptors()

    assert len(descriptors) == 52

    constitutions = next(descriptor for descriptor in descriptors if descriptor.name == "Constitutions")
    assert constitutions.domain == "law"
    assert constitutions.tier == "primary"
    assert constitutions.reliability == pytest.approx(0.85)
    assert constitutions.criticality == pytest.approx(0.6)
    assert constitutions.freshness_sla_minutes == 720
    assert set(constitutions.tags) == {"law", "primary"}
    assert constitutions.metadata == {"domain": "law", "tier": "primary"}


def test_build_reference_descriptors_overrides() -> None:
    descriptors = source_catalog.build_reference_descriptors(
        reliability_overrides={
            "law:Constitutions": 0.92,
            "Trade credit": 0.45,
        },
        criticality_overrides={
            "academic_research:Original documents": 0.9,
        },
        freshness_overrides={
            "religious_authority:Vedas": 1440,
        },
    )

    constitutions = next(descriptor for descriptor in descriptors if descriptor.name == "Constitutions")
    assert constitutions.reliability == pytest.approx(0.92)

    trade_credit = next(descriptor for descriptor in descriptors if descriptor.name == "Trade credit")
    assert trade_credit.reliability == pytest.approx(0.45)

    original_docs = next(descriptor for descriptor in descriptors if descriptor.name == "Original documents")
    assert original_docs.criticality == pytest.approx(0.9)

    vedas = next(descriptor for descriptor in descriptors if descriptor.name == "Vedas")
    assert vedas.freshness_sla_minutes == 1440


def test_register_reference_catalog_replaces_existing(engine: source_engine.DynamicSourceEngine) -> None:
    legacy = source_engine.SourceDescriptor(
        name="Legacy Source",
        domain="legacy",
        reliability=0.2,
        criticality=0.1,
    )
    engine.register_source(legacy)

    registered = source_catalog.register_reference_catalog(engine, clear_existing=True)

    assert len(registered) == 52
    assert all(descriptor.name != "Legacy Source" for descriptor in engine.sources)
    assert set(descriptor.name for descriptor in registered) == set(descriptor.name for descriptor in engine.sources)


def test_register_reference_catalog_appends(engine: source_engine.DynamicSourceEngine) -> None:
    engine.register_source(
        source_engine.SourceDescriptor(
            name="Custom Source",
            domain="custom",
            reliability=0.5,
            criticality=0.4,
        )
    )

    registered = source_catalog.register_reference_catalog(engine, clear_existing=False)

    names = {descriptor.name for descriptor in engine.sources}
    assert "Custom Source" in names
    assert len(names) == 53
    assert len(registered) == 52
