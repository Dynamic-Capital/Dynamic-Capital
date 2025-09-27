from __future__ import annotations

from dynamic_space import (
    BodyKind,
    CelestialBody,
    DynamicSpace,
    OrbitalRoute,
    SpaceEvent,
    SpaceEventSeverity,
    SpaceSector,
)


def _build_sector() -> SpaceSector:
    terra = CelestialBody(
        name="Terra",
        kind=BodyKind.PLANET,
        mass_kg=5.97e24,
        velocity_kms=29.78,
        resource_index=0.82,
        habitability=0.94,
    )
    station = CelestialBody(
        name="Astra Station",
        kind=BodyKind.STATION,
        mass_kg=2.5e8,
        velocity_kms=7.66,
        resource_index=0.55,
        habitability=0.4,
        tags=("logistics", "hub"),
    )
    routes = (
        OrbitalRoute(
            identifier="terra-orbit",
            origin="Terra",
            destination="Astra Station",
            delta_v_kms=9.1,
            congestion=0.72,
            stability=0.65,
        ),
        OrbitalRoute(
            identifier="station-transfer",
            origin="Astra Station",
            destination="Terra",
            delta_v_kms=9.1,
            congestion=0.68,
            stability=0.62,
        ),
    )
    return SpaceSector(
        name="L4 Corridor",
        bodies=(terra, station),
        routes=routes,
        hazard_index=0.32,
        supply_level=0.74,
        energy_output_gw=18.5,
    )


def test_dynamic_space_reacts_to_events() -> None:
    sector = _build_sector()
    manager = DynamicSpace([sector])
    base_stability = manager.project_stability("L4 Corridor")
    manager.record_event(
        SpaceEvent(
            sector_name="L4 Corridor",
            description="unexpected drift detected",
            severity=SpaceEventSeverity.CRITICAL,
            impact_score=0.75,
        )
    )
    degraded_stability = manager.project_stability("L4 Corridor")
    assert degraded_stability < base_stability

    snapshot = manager.snapshot("L4 Corridor")
    assert snapshot.sector_name == "L4 Corridor"
    assert snapshot.recent_events[-1].description == "unexpected drift detected"
    assert snapshot.traffic_load == manager.get_sector("L4 Corridor").traffic_load


def test_route_rebalancing_reduces_congestion() -> None:
    manager = DynamicSpace([_build_sector()])
    before_routes = manager.get_sector("L4 Corridor").routes
    assert any(route.congestion > 0.65 for route in before_routes)

    rebalanced = manager.rebalance_routes("L4 Corridor", congestion_threshold=0.65)
    assert all(route.congestion <= 0.65 or abs(route.congestion - before.congestion) < 1e-9 for route, before in zip(rebalanced.routes, before_routes))
    assert rebalanced.hazard_index <= 0.32

    # record event for an unknown sector to exercise auto-registration
    event = manager.record_event(
        {
            "sector_name": "Outer Rim",
            "description": "pingback from beacon",
            "impact_score": 0.1,
        }
    )
    assert event.sector_name == "Outer Rim"
    assert any(sector.name == "Outer Rim" for sector in manager.sectors)
