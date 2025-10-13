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
    assert "fallback_routes" not in notes


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
    assert snapshot.notes["fallback_routes"] == ("backoffice",)
    assert "offline_only_routes" not in snapshot.notes


def test_gateway_route_affinity_is_cached_and_normalised():
    route = GatewayRoute(
        name="Admin Portal",
        upstream="https://internal.dynamic/admin",
        tags=("Region:US-East", "region:US-east", "protocol:HTTPS", "protocol:http"),
    )
    assert route.region_affinity == ("us-east",)
    assert route.protocol_affinity == ("https", "http")


def test_gateway_health_serialisation_includes_iso_timestamp():
    health = GatewayHealth(endpoint_id="edge-us", status="online", availability=1.0)
    payload = health.as_dict()
    assert payload["status"] == "online"
    assert re.match(r"^edge-us$", payload["endpoint_id"])
    assert payload["checked_at"].endswith("+00:00")


def test_gateway_engine_marks_routes_offline_when_everything_is_down():
    engine = DynamicGatewayEngine()
    offline = GatewayEndpoint(
        identifier="edge-down",
        url="https://edge-down.dynamic.gateway",
        region="us-west",
    )
    engine.register_endpoint(offline)
    engine.register_route(GatewayRoute(name="status", upstream="https://status"))
    engine.record_health(
        GatewayHealth(endpoint_id="edge-down", status="offline", availability=0.0)
    )

    snapshot = engine.compose_snapshot()
    assert snapshot.routes["status"] == ("edge-down",)
    assert snapshot.notes["fallback_routes"] == ("status",)
    assert snapshot.notes["offline_only_routes"] == ("status",)


def test_gateway_engine_credentials_from_environment(monkeypatch):
    engine = DynamicGatewayEngine()
    endpoint = GatewayEndpoint(
        identifier="edge-us",
        url="https://edge-us.dynamic.gateway",
        region="us-east",
    )
    engine.register_endpoint(endpoint)
    engine.register_endpoint_credential("edge-us", "EDGE_US_TOKEN")
    monkeypatch.setenv("EDGE_US_TOKEN", "super-secret")

    headers = engine.authorisation_headers("edge-us")
    assert headers == {"Authorization": "Bearer super-secret"}
    assert engine.endpoint_credentials == {"edge-us": "EDGE_US_TOKEN"}


def test_gateway_engine_credentials_require_env(monkeypatch):
    engine = DynamicGatewayEngine()
    endpoint = GatewayEndpoint(
        identifier="edge-eu",
        url="https://edge-eu.dynamic.gateway",
        region="eu-central",
    )
    engine.register_endpoint(endpoint)
    engine.register_endpoint_credential("edge-eu", "EDGE_EU_TOKEN")

    with pytest.raises(RuntimeError):
        engine.authorisation_headers("edge-eu")

    monkeypatch.setenv("EDGE_EU_TOKEN", "  scoped-token  ")
    token = engine.resolve_endpoint_token("edge-eu")
    assert token == "scoped-token"


def test_gateway_engine_rejects_invalid_env_name():
    engine = DynamicGatewayEngine()
    with pytest.raises(ValueError):
        engine.register_endpoint_credential("edge-us", "edge-us-token")
