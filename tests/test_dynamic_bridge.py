"""Tests for the Dynamic Bridge orchestration models."""

from __future__ import annotations

import importlib
from datetime import datetime, timedelta, timezone

import pytest

from dynamic_bridge import (
    BridgeEndpoint,
    BridgeIncident,
    BridgeLink,
    DynamicBridgeOrchestrator,
    create_dynamic_mt5_bridge,
)


def _make_endpoint(name: str, *, kind: str = "service") -> BridgeEndpoint:
    return BridgeEndpoint(
        name=name,
        kind=kind,
        environment="production",
        protocol="https",
        description=f"Endpoint {name}",
    )


def _register_sample_bridge(orchestrator: DynamicBridgeOrchestrator) -> None:
    orchestrator.register_endpoint(_make_endpoint("signals"))
    orchestrator.register_endpoint(_make_endpoint("execution", kind="worker"))
    orchestrator.register_link(
        BridgeLink(
            name="signals-to-execution",
            source="signals",
            target="execution",
            protocol="websocket",
            expected_latency_ms=120.0,
            latency_budget_ms=150.0,
            reliability=0.96,
            throughput_per_minute=900.0,
        )
    )


def test_health_evaluation_without_incidents() -> None:
    orchestrator = DynamicBridgeOrchestrator()
    _register_sample_bridge(orchestrator)

    report = orchestrator.evaluate_health()

    assert pytest.approx(report.overall_score, rel=1e-3) == 0.96
    assert report.degraded_links == ()
    assert report.open_incidents == ()
    assert not report.recommended_actions


def test_latency_penalty_triggers_degraded_link() -> None:
    orchestrator = DynamicBridgeOrchestrator()
    orchestrator.register_endpoint(_make_endpoint("signals"))
    orchestrator.register_endpoint(_make_endpoint("mt5"))
    orchestrator.register_link(
        BridgeLink(
            name="signals-to-mt5",
            source="signals",
            target="mt5",
            protocol="rest",
            expected_latency_ms=420.0,
            latency_budget_ms=200.0,
            reliability=0.9,
            throughput_per_minute=600.0,
        )
    )

    report = orchestrator.evaluate_health()

    assert report.degraded_links == ("signals-to-mt5",)
    assert any("signals-to-mt5" in rec for rec in report.recommended_actions)
    assert report.link_scores["signals-to-mt5"] < 0.9


def test_open_incident_penalises_score_until_resolved() -> None:
    orchestrator = DynamicBridgeOrchestrator()
    _register_sample_bridge(orchestrator)

    incident = BridgeIncident(
        identifier="bridge-outage-001",
        link="signals-to-execution",
        severity="major",
        summary="Supabase realtime channel stalled",
        started_at=datetime.now(timezone.utc) - timedelta(hours=2),
    )
    orchestrator.record_incident(incident)

    degraded_report = orchestrator.evaluate_health()
    assert degraded_report.degraded_links == ("signals-to-execution",)
    assert degraded_report.open_incidents == (incident,)
    assert degraded_report.link_scores["signals-to-execution"] < 0.96

    orchestrator.resolve_incident("bridge-outage-001")
    recovered_report = orchestrator.evaluate_health()
    assert recovered_report.degraded_links == ()
    assert recovered_report.link_scores["signals-to-execution"] == pytest.approx(0.96)


def test_create_dynamic_mt5_bridge_defaults() -> None:
    orchestrator = create_dynamic_mt5_bridge()

    edge_endpoint = orchestrator.get_endpoint("supabase-edge")
    assert edge_endpoint.protocol == "https"
    assert edge_endpoint.criticality == "high"

    report = orchestrator.evaluate_health()

    assert report.metadata["total_links"] == 6
    assert report.metadata["total_endpoints"] == 7
    assert report.degraded_links == ()
    assert report.overall_score == pytest.approx(0.9658, rel=1e-3)


def test_create_dynamic_mt5_bridge_with_overrides_and_incidents() -> None:
    orchestrator = create_dynamic_mt5_bridge(
        link_overrides={
            "realtime-to-worker": {
                "expected_latency_ms": 420.0,
                "latency_budget_ms": 200.0,
                "reliability": 0.82,
            }
        },
        incidents=[
            {
                "identifier": "mt5-latency-spike",
                "link": "realtime-to-worker",
                "severity": "major",
                "summary": "Realtime channel backlog affecting MT5 bridge",
            }
        ],
    )

    report = orchestrator.evaluate_health()

    assert "realtime-to-worker" in report.degraded_links
    assert any(inc.identifier == "mt5-latency-spike" for inc in report.open_incidents)
    assert report.link_scores["realtime-to-worker"] < 0.82


def test_platform_engines_exposes_bridge_symbols() -> None:
    platform_engines = importlib.import_module("dynamic.platform.engines")
    bridge_module = importlib.import_module("dynamic_bridge")

    assert (
        platform_engines.DynamicBridgeOrchestrator
        is bridge_module.DynamicBridgeOrchestrator
    )
    assert platform_engines.BridgeEndpoint is bridge_module.BridgeEndpoint
    assert platform_engines.BridgeLink is bridge_module.BridgeLink
    assert platform_engines.BridgeIncident is bridge_module.BridgeIncident
    assert (
        platform_engines.BridgeHealthReport is bridge_module.BridgeHealthReport
    )
    assert (
        platform_engines.BridgeOptimizationPlan
        is bridge_module.BridgeOptimizationPlan
    )
    assert (
        platform_engines.create_dynamic_mt5_bridge
        is bridge_module.create_dynamic_mt5_bridge
    )
