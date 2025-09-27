"""Tests for the Dynamic WebSocket orchestrator."""

from __future__ import annotations

import pytest

from dynamic_websockets import (
    DynamicWebSocketOrchestrator,
    WebSocketEndpoint,
)


def _make_endpoint(name: str) -> WebSocketEndpoint:
    return WebSocketEndpoint(
        name=name,
        url="wss://example.com/ws",
        role="bidirectional",
        description=f"Endpoint {name}",
        requires_auth=True,
        tags=("market-data", "primary"),
    )


def test_snapshot_tracks_latency_and_heartbeat() -> None:
    orchestrator = DynamicWebSocketOrchestrator()
    orchestrator.register_endpoint(_make_endpoint("market-feed"))

    session = orchestrator.start_session("market-feed", client="trade-engine")
    orchestrator.mark_connected(session.session_id)
    orchestrator.record_message(
        session.session_id,
        direction="INBOUND",
        bytes_transferred=1_024,
        latency_ms=42.5,
    )
    orchestrator.record_heartbeat(session.session_id, lag_ms=75.0)

    snapshot, = orchestrator.snapshot_endpoints()
    assert snapshot.endpoint == "market-feed"
    assert snapshot.total_sessions == 1
    assert snapshot.total_messages == 1
    assert snapshot.total_errors == 0
    assert snapshot.status_breakdown["connected"] == 1
    assert snapshot.average_latency_ms == pytest.approx(42.5)
    assert snapshot.average_heartbeat_ms == pytest.approx(75.0)
    assert snapshot.active_sessions == 1


def test_record_error_creates_incident_and_degrades_session() -> None:
    orchestrator = DynamicWebSocketOrchestrator()
    orchestrator.register_endpoint(_make_endpoint("realtime"))

    session = orchestrator.start_session("realtime", client="alpha")
    orchestrator.mark_connected(session.session_id)
    incident = orchestrator.record_error(
        session.session_id,
        summary="dropped channel",
        severity="major",
        metadata={"attempts": 3},
    )

    updated_session = orchestrator.get_session(session.session_id)
    assert updated_session.status == "degraded"
    assert incident in orchestrator.list_open_incidents()

    resolved = orchestrator.resolve_incident(incident.identifier)
    assert resolved is True
    assert orchestrator.list_open_incidents() == ()


def test_close_session_and_event_history_limits() -> None:
    orchestrator = DynamicWebSocketOrchestrator(max_event_history=3)
    orchestrator.register_endpoint(_make_endpoint("analytics"))

    session = orchestrator.start_session("analytics", client="worker")
    orchestrator.mark_connected(session.session_id)
    orchestrator.record_message(session.session_id, bytes_transferred=256)
    orchestrator.record_error(
        session.session_id,
        summary="temporary backpressure",
        severity="minor",
    )
    orchestrator.close_session(
        session.session_id,
        reason="maintenance",
        drop=True,
    )

    assert orchestrator.list_sessions() == ()
    events = orchestrator.get_recent_events(limit=10)
    assert len(events) == 3  # deque limited to most recent entries
    assert events[-1].event == "closed"

    incidents = orchestrator.get_recent_incidents(limit=5)
    assert incidents[-1].summary == "temporary backpressure"
    assert incidents[-1].is_open is True

    # resolve the remaining incident to verify helper path
    orchestrator.resolve_incident(incidents[-1].identifier)
    assert orchestrator.list_open_incidents() == ()
