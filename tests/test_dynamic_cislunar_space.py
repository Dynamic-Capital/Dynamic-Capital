"""Tests for the Dynamic Cislunar Space coordinator."""

from __future__ import annotations

import pytest

from dynamic_cislunar_space import (
    CelestialBody,
    CislunarAsset,
    DynamicCislunarSpace,
    MissionPhase,
    OrbitalBand,
    RiskDimension,
    TransferCorridor,
)


def build_space() -> DynamicCislunarSpace:
    earth = CelestialBody(
        name="Earth",
        gravitational_parameter_km3_s2=398_600.4418,
        radius_km=6_378.137,
        sphere_of_influence_km=925_000.0,
    )
    space = DynamicCislunarSpace("Dynamic Cislunar Testbed")
    space.register_body(earth)
    space.register_band(
        {
            "name": "Lunar NRHO",
            "body": "Earth",
            "perigee_km": 60_000.0,
            "apogee_km": 70_000.0,
            "inclination_deg": 9.7,
            "description": "Near-rectilinear halo orbit staging band",
        }
    )
    return space


def test_snapshot_generates_band_metrics() -> None:
    space = build_space()
    band = space.get_band("Lunar NRHO")

    space.register_asset(
        CislunarAsset(
            identifier="Gateway-A",
            band=band,
            mass_kg=40_000.0,
            cross_section_m2=1_200.0,
            operator="DynCo",
            mission_phase=MissionPhase.OPERATIONS,
            health=0.92,
        )
    )
    space.register_asset(
        {
            "identifier": "Support-Tug",
            "band": "Lunar NRHO",
            "mass_kg": 12_500.0,
            "cross_section_m2": 650.0,
            "operator": "Lunar Logistics",
            "mission_phase": "transit",
            "health": 0.74,
        }
    )

    snapshot = space.snapshot()

    assert snapshot.total_assets == 2
    assert len(snapshot.band_metrics) == 1
    (metrics,) = snapshot.band_metrics
    assert metrics.band is band
    assert metrics.asset_count == 2
    assert 0.0 <= metrics.average_health <= 1.0
    assert metrics.operators["DynCo"] == 1
    assert metrics.operators["Lunar Logistics"] == 1
    assert snapshot.risk_summary, "risk summary should be populated by default"


def test_risk_assessment_respects_overrides() -> None:
    space = build_space()
    space.register_asset(
        {
            "identifier": "Scout-1",
            "band": "Lunar NRHO",
            "mass_kg": 4_200.0,
            "cross_section_m2": 400.0,
            "operator": "DynCo",
            "mission_phase": MissionPhase.OPERATIONS,
            "health": 0.55,
        }
    )

    assessments = space.assess_asset(
        "Scout-1",
        hazard_overrides={RiskDimension.TRAFFIC: 0.9, "communication": 0.8},
    )

    dimensions = [assessment.dimension for assessment in assessments]
    assert dimensions == sorted(dimensions, key=lambda value: value.value)
    traffic = next(assessment for assessment in assessments if assessment.dimension is RiskDimension.TRAFFIC)
    assert traffic.score == pytest.approx(0.9)
    communication = next(
        assessment for assessment in assessments if assessment.dimension is RiskDimension.COMMUNICATION
    )
    assert communication.score == pytest.approx(0.8)
    environmental = next(
        assessment for assessment in assessments if assessment.dimension is RiskDimension.ENVIRONMENTAL
    )
    assert environmental.score >= 0.15


def test_transfer_corridor_lookup() -> None:
    space = build_space()
    band = space.get_band("Lunar NRHO")
    high_orbit = space.register_band(
        OrbitalBand(
            name="Lunar High",
            body=band.body,
            perigee_km=80_000.0,
            apogee_km=120_000.0,
            inclination_deg=25.0,
        )
    )

    corridor = TransferCorridor(
        origin=band,
        destination=high_orbit,
        delta_v_ms=650.0,
        transfer_days=9.5,
        confidence=0.7,
    )
    space.register_corridor(corridor)

    planned = space.plan_transfer("Lunar NRHO", "Lunar High")
    assert planned is corridor


def test_duplicate_asset_registration_is_rejected() -> None:
    space = build_space()
    space.register_asset(
        {
            "identifier": "Scout-1",
            "band": "Lunar NRHO",
            "mass_kg": 4_200.0,
            "cross_section_m2": 400.0,
            "operator": "DynCo",
            "mission_phase": MissionPhase.OPERATIONS,
        }
    )

    with pytest.raises(ValueError):
        space.register_asset(
            {
                "identifier": "Scout-1",
                "band": "Lunar NRHO",
                "mass_kg": 4_200.0,
                "cross_section_m2": 400.0,
                "operator": "DynCo",
                "mission_phase": MissionPhase.OPERATIONS,
            }
        )
