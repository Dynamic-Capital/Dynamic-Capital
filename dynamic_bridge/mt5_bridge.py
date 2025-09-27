"""Factory helpers for orchestrating the Dynamic Capital MT5 bridge."""

from __future__ import annotations

from typing import Mapping, MutableMapping, Sequence

from .orchestrator import (
    BridgeEndpoint,
    BridgeIncident,
    BridgeLink,
    DynamicBridgeOrchestrator,
)

__all__ = [
    "create_dynamic_mt5_bridge",
]


_MT5_ENDPOINTS: tuple[Mapping[str, object], ...] = (
    {
        "name": "tradingview-webhook",
        "kind": "webhook",
        "environment": "production",
        "protocol": "https",
        "description": "TradingView alert listener hosted on Vercel.",
        "criticality": "high",
        "tags": ("ingest", "tradingview"),
    },
    {
        "name": "supabase-edge",
        "kind": "edge-function",
        "environment": "production",
        "protocol": "https",
        "description": "Supabase Edge Function that validates alerts and persists signals.",
        "criticality": "high",
        "tags": ("supabase", "ingest"),
    },
    {
        "name": "supabase-signals",
        "kind": "database",
        "environment": "production",
        "protocol": "postgres",
        "description": "Signals table backing the MT5 dispatch queue.",
        "criticality": "high",
        "tags": ("supabase", "signals"),
    },
    {
        "name": "supabase-realtime",
        "kind": "realtime-channel",
        "environment": "production",
        "protocol": "websocket",
        "description": "Realtime channel emitting signal claims for workers.",
        "criticality": "medium",
        "tags": ("supabase", "realtime"),
    },
    {
        "name": "mt5-bridge-worker",
        "kind": "worker",
        "environment": "operations",
        "protocol": "python",
        "description": "Python worker that claims signals and forwards them to MT5.",
        "criticality": "high",
        "tags": ("mt5", "execution"),
    },
    {
        "name": "mt5-terminal",
        "kind": "terminal",
        "environment": "operations",
        "protocol": "mt5",
        "description": "MetaTrader 5 terminal executing trades via Expert Advisor.",
        "criticality": "high",
        "tags": ("mt5", "execution"),
    },
    {
        "name": "supabase-trade-logs",
        "kind": "database",
        "environment": "production",
        "protocol": "postgres",
        "description": "Trade log table mirroring fills and execution telemetry.",
        "criticality": "medium",
        "tags": ("supabase", "telemetry"),
    },
)


_MT5_LINKS: tuple[Mapping[str, object], ...] = (
    {
        "name": "tradingview-to-edge",
        "source": "tradingview-webhook",
        "target": "supabase-edge",
        "protocol": "https",
        "expected_latency_ms": 110.0,
        "latency_budget_ms": 250.0,
        "reliability": 0.99,
        "throughput_per_minute": 1200.0,
        "encryption": True,
        "transformation": "Validates shared secret and normalises alert payloads.",
        "tags": ("ingest", "tradingview"),
    },
    {
        "name": "edge-to-signals",
        "source": "supabase-edge",
        "target": "supabase-signals",
        "protocol": "postgres",
        "expected_latency_ms": 80.0,
        "latency_budget_ms": 150.0,
        "reliability": 0.985,
        "throughput_per_minute": 900.0,
        "encryption": True,
        "transformation": "Persists MT5-ready signals and emits audit logs.",
        "tags": ("supabase", "signals"),
    },
    {
        "name": "signals-to-realtime",
        "source": "supabase-signals",
        "target": "supabase-realtime",
        "protocol": "realtime",
        "expected_latency_ms": 120.0,
        "latency_budget_ms": 200.0,
        "reliability": 0.97,
        "throughput_per_minute": 850.0,
        "encryption": True,
        "transformation": "Broadcasts signal claims to subscribed bridge workers.",
        "tags": ("supabase", "realtime"),
    },
    {
        "name": "realtime-to-worker",
        "source": "supabase-realtime",
        "target": "mt5-bridge-worker",
        "protocol": "websocket",
        "expected_latency_ms": 160.0,
        "latency_budget_ms": 240.0,
        "reliability": 0.95,
        "throughput_per_minute": 720.0,
        "encryption": True,
        "transformation": "Worker claims next actionable signal for execution.",
        "tags": ("mt5", "signals"),
    },
    {
        "name": "worker-to-terminal",
        "source": "mt5-bridge-worker",
        "target": "mt5-terminal",
        "protocol": "mt5-api",
        "expected_latency_ms": 220.0,
        "latency_budget_ms": 360.0,
        "reliability": 0.94,
        "throughput_per_minute": 480.0,
        "encryption": True,
        "transformation": "Executes trades through MT5 Expert Advisor with risk checks.",
        "tags": ("mt5", "execution"),
    },
    {
        "name": "terminal-to-logs",
        "source": "mt5-terminal",
        "target": "supabase-trade-logs",
        "protocol": "https",
        "expected_latency_ms": 180.0,
        "latency_budget_ms": 300.0,
        "reliability": 0.96,
        "throughput_per_minute": 600.0,
        "encryption": True,
        "transformation": "Publishes fill telemetry back to Supabase trade logs.",
        "tags": ("mt5", "telemetry"),
    },
)


_ALLOWED_LINK_OVERRIDE_KEYS = {
    "expected_latency_ms",
    "latency_budget_ms",
    "reliability",
    "throughput_per_minute",
    "protocol",
    "encryption",
    "transformation",
    "tags",
}


def _build_endpoint(config: Mapping[str, object]) -> BridgeEndpoint:
    return BridgeEndpoint(**dict(config))


def _build_link(
    config: Mapping[str, object],
    overrides: Mapping[str, object] | None,
) -> BridgeLink:
    data: MutableMapping[str, object] = dict(config)
    if overrides:
        for key, value in overrides.items():
            if key not in _ALLOWED_LINK_OVERRIDE_KEYS:
                raise KeyError(f"Unsupported override '{key}' for link '{config['name']}'")
            data[key] = value
    return BridgeLink(**data)


def _coerce_incident(value: BridgeIncident | Mapping[str, object]) -> BridgeIncident:
    if isinstance(value, BridgeIncident):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("incident must be a BridgeIncident or mapping")
    return BridgeIncident(**dict(value))


def create_dynamic_mt5_bridge(
    *,
    link_overrides: Mapping[str, Mapping[str, object]] | None = None,
    incidents: Sequence[BridgeIncident | Mapping[str, object]] | None = None,
) -> DynamicBridgeOrchestrator:
    """Construct a ready-to-evaluate Dynamic Capital MT5 bridge topology."""

    orchestrator = DynamicBridgeOrchestrator()

    for endpoint_config in _MT5_ENDPOINTS:
        orchestrator.register_endpoint(_build_endpoint(endpoint_config))

    for link_config in _MT5_LINKS:
        overrides = None
        if link_overrides:
            overrides = link_overrides.get(str(link_config["name"]))
        link = _build_link(link_config, overrides)
        orchestrator.register_link(link)

    if incidents:
        for incident_like in incidents:
            incident = _coerce_incident(incident_like)
            orchestrator.record_incident(incident)

    return orchestrator
