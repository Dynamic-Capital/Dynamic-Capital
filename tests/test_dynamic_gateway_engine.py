import re
from datetime import datetime, timezone

import pytest

from dynamic_gateway_engine import (
    DynamicGatewayEngine,
    GatewayEndpoint,
    GatewayHealth,
    GatewayRoute,
)


def test_gateway_engine_routes_prefer_online_endpoints():
    engine = DynamicGatewayEngine()
    primary = GatewayEndpoint(
        identifier="edge-us",
        url="https://edge-us.dynamic.gateway",
        region="us-east",
        protocols=("https",),
        weight=2.0,
        tags=("primary",),
    )
    backup = GatewayEndpoint(
        identifier="edge-eu",
        url="https://edge-eu.dynamic.gateway",
        region="eu-central",
        protocols=("https", "http"),
        weight=1.0,
        tags=("fallback",),
    )
    engine.register_endpoint(primary)
    engine.register_endpoint(backup)

    route = GatewayRoute(
        name="public-api",
        upstream="https://internal.dynamic/api",
        methods=("GET", "POST"),
        latency_budget_ms=900,
        tags=("region:us-east", "protocol:https"),
    )
    engine.register_route(route)

    engine.record_health(
        GatewayHealth(
            endpoint_id="edge-us",
            status="online",
            availability=0.98,
            latency_ms=120,
            checked_at=datetime(2025, 10, 10, 12, 0, tzinfo=timezone.utc),
        )
    )
    engine.record_health(
        GatewayHealth(
            endpoint_id="edge-eu",
            status="degraded",
            availability=0.72,
            latency_ms=340,
            incidents=("packet loss",),
        )
    )

    snapshot = engine.compose_snapshot()
    assert snapshot.active_endpoints == ("edge-us",)
    assert snapshot.degraded_endpoints == ("edge-eu",)
    assert snapshot.offline_endpoints == ()

    plan = snapshot.routes["public-api"]
    assert plan == ("edge-us",)
    notes = snapshot.notes
    assert pytest.approx(notes["overall_availability"], rel=1e-6) == 0.85
    assert notes["endpoint_count"] == 2
    assert "active_ratio" in notes


def test_gateway_engine_fallback_when_requirements_filter_everything():
    engine = DynamicGatewayEngine()
    endpoint = GatewayEndpoint(
        identifier="edge-sg",
        url="https://edge-sg.dynamic.gateway",
        region="ap-sg",
        protocols=("https",),
        weight=1.5,
    )
    engine.register_endpoint(endpoint)
    engine.record_health(GatewayHealth(endpoint_id="edge-sg", status="online", availability=1.0))

    restricted_route = GatewayRoute(
        name="backoffice",
        upstream="https://internal.dynamic/backoffice",
        tags=("region:eu-west", "protocol:http"),
    )
    engine.register_route(restricted_route)

    snapshot = engine.compose_snapshot()
    plan = snapshot.routes["backoffice"]
    assert plan == ("edge-sg",)


def test_gateway_health_serialisation_includes_iso_timestamp():
    health = GatewayHealth(endpoint_id="edge-us", status="online", availability=1.0)
    payload = health.as_dict()
    assert payload["status"] == "online"
    assert re.match(r"^edge-us$", payload["endpoint_id"])
    assert payload["checked_at"].endswith("+00:00")
