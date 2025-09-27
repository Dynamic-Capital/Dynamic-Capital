"""Tests for the Dynamic Database toolkit."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_database import DatabaseRecord, DynamicDatabase


def test_record_normalisation() -> None:
    record = DatabaseRecord(
        key="  Orders-01  ",
        payload={"count": 1},
        confidence=0.9,
        relevance=0.8,
        freshness=0.7,
        weight=2,
        tags=("Alpha", "alpha", " Beta "),
        sources=("api", " api", "WEB"),
    )

    assert record.key == "Orders-01"
    assert record.canonical_key == "orders-01"
    assert record.tags == ("alpha", "beta")
    assert record.sources == ("api", "WEB")
    assert record.payload == {"count": 1}
    assert record.timestamp.tzinfo == timezone.utc


def test_record_merge_combines_payload_and_metrics() -> None:
    earlier = DatabaseRecord(
        key="Orders-01",
        payload={"count": 4, "status": "draft"},
        confidence=0.4,
        relevance=0.6,
        freshness=0.5,
        weight=1.0,
        tags=("alpha",),
    )
    later = DatabaseRecord(
        key="orders-01",
        payload={"count": 5, "owner": "ops"},
        confidence=0.8,
        relevance=0.9,
        freshness=0.7,
        weight=2.0,
        tags=("beta",),
        timestamp=earlier.timestamp + timedelta(minutes=5),
    )

    merged = earlier.merge(later)
    assert merged.payload == {"count": 5, "status": "draft", "owner": "ops"}
    assert merged.tags == ("alpha", "beta")
    assert merged.weight == pytest.approx(3.0)
    assert merged.confidence == pytest.approx((0.4 * 1.0 + 0.8 * 2.0) / 3.0)
    assert merged.relevance == pytest.approx((0.6 * 1.0 + 0.9 * 2.0) / 3.0)
    assert merged.freshness == pytest.approx((0.5 * 1.0 + 0.7 * 2.0) / 3.0)
    assert merged.timestamp == later.timestamp


def test_dynamic_database_ingest_merges_records() -> None:
    db = DynamicDatabase(history=4)
    initial = DatabaseRecord(key="User-1", payload={"status": "active"}, confidence=0.4)
    update = DatabaseRecord(
        key=" user-1 ",
        payload={"status": "inactive", "role": "admin"},
        confidence=0.8,
        relevance=0.9,
        weight=2.0,
    )

    stored_initial = db.ingest("Accounts", initial)
    stored_update = db.ingest("accounts", update)

    assert stored_initial is initial
    assert stored_update.payload == {"status": "inactive", "role": "admin"}
    assert stored_update.confidence == pytest.approx((0.4 * 1.0 + 0.8 * 2.0) / 3.0)
    assert stored_update.relevance == pytest.approx((0.5 * 1.0 + 0.9 * 2.0) / 3.0)
    assert db.get_record("ACCOUNTS", "USER-1") is stored_update
    assert [event.action for event in db.log] == ["insert", "update"]


def test_dynamic_database_snapshot_reports_health() -> None:
    db = DynamicDatabase()
    now = datetime.now(timezone.utc)
    db.bulk_ingest(
        "Telemetry",
        (
            DatabaseRecord(
                key="sensor-a",
                payload={"temp": 24},
                confidence=0.6,
                relevance=0.7,
                freshness=0.8,
                timestamp=now,
                tags=("environment", "climate"),
            ),
            DatabaseRecord(
                key="sensor-b",
                payload={"temp": 28},
                confidence=0.9,
                relevance=0.4,
                freshness=0.6,
                timestamp=now + timedelta(minutes=2),
                tags=("environment", "operations"),
            ),
        ),
    )

    snapshot = db.snapshot("telemetry")
    assert snapshot.table == "telemetry"
    assert snapshot.record_count == 2
    assert snapshot.mean_confidence == pytest.approx((0.6 + 0.9) / 2)
    assert snapshot.tag_catalog == ("climate", "environment", "operations")
    assert snapshot.updated_at >= now


def test_dynamic_database_evicts_records_and_logs_event() -> None:
    db = DynamicDatabase(history=3)
    db.ingest("Audit", DatabaseRecord(key="entry-1", payload={"ok": True}))
    db.ingest("Audit", DatabaseRecord(key="entry-2", payload={"ok": False}))

    removed = db.evict("audit", ["Entry-1", "missing"])
    assert removed == 1
    assert db.get_record("audit", "entry-1") is None
    events = db.recent_events(2)
    assert [event.action for event in events] == ["insert", "delete"]
    assert events[-1].key == "entry-1"
