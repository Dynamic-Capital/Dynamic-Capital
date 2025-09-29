"""Tests for the Dynamic Database engine orchestration layer."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_database import (
    DatabaseRecord,
    DynamicDatabaseEngine,
    QueryFilters,
    TableDefinition,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def test_register_table_normalises_metadata() -> None:
    engine = DynamicDatabaseEngine()
    created = engine.register_table(
        "  Sales  ",
        description=" Core revenue metrics  ",
        tags=("North", " north", "Enterprise"),
        owner=" DataOps ",
        sensitivity=0.8,
    )

    assert isinstance(created, TableDefinition)
    assert created.name == "sales"
    assert created.description == "Core revenue metrics"
    assert created.tags == ("north", "enterprise")
    assert created.owner == "DataOps"
    assert created.sensitivity == pytest.approx(0.8)
    assert created.created_at.tzinfo == timezone.utc
    assert created.updated_at >= created.created_at

    updated = engine.register_table(
        "sales",
        description="Updated metrics",
        tags=("enterprise", "global"),
        owner="analytics",
        sensitivity=0.4,
    )

    assert updated.created_at == created.created_at
    assert updated.updated_at >= created.updated_at
    assert updated.tags == ("enterprise", "global")


def test_engine_ingest_and_query_filters_records() -> None:
    engine = DynamicDatabaseEngine()
    engine.register_table("Operations", description="Ops metrics")

    engine.bulk_ingest(
        "operations",
        (
            DatabaseRecord(
                key="alpha",
                payload={"status": "ok"},
                confidence=0.2,
                relevance=0.3,
                freshness=0.6,
                tags=("core",),
            ),
            DatabaseRecord(
                key="bravo",
                payload={"status": "warn"},
                confidence=0.8,
                relevance=0.7,
                freshness=0.5,
                tags=("core", "priority"),
            ),
            DatabaseRecord(
                key="charlie",
                payload={"status": "ok"},
                confidence=0.9,
                relevance=0.9,
                freshness=0.2,
                tags=("support",),
            ),
        ),
    )

    result = engine.query(
        "Operations",
        limit=2,
        min_confidence=0.5,
        min_relevance=0.5,
        tags=("core",),
        order_by="relevance",
    )

    assert result.table == "operations"
    assert isinstance(result.filters, QueryFilters)
    assert result.filters.tags == ("core",)
    assert result.requested_limit == 2
    assert result.available == 1
    assert result.total_records == 3
    assert result.coverage_ratio == pytest.approx(1 / 3)
    assert not result.is_empty
    assert [record.key for record in result.records] == ["bravo"]
    assert result.mean_confidence == pytest.approx(0.8)


def test_table_health_combines_metadata_and_snapshot() -> None:
    engine = DynamicDatabaseEngine()
    definition = engine.register_table(
        "Telemetry",
        description="Sensor feed",
        tags=("field", "environment"),
        owner="ops",
        sensitivity=0.3,
    )

    timestamp = _utcnow()
    engine.ingest(
        "telemetry",
        DatabaseRecord(
            key="sensor-a",
            payload={"temp": 25},
            confidence=0.6,
            relevance=0.7,
            freshness=0.8,
            timestamp=timestamp,
            tags=("field",),
        ),
    )

    health = engine.table_health("Telemetry")

    assert health.table == "telemetry"
    assert health.description == "Sensor feed"
    assert health.tags == definition.tags
    assert health.owner == "ops"
    assert health.record_count == 1
    assert health.mean_confidence == pytest.approx(0.6)
    assert health.coverage_score == pytest.approx((0.6 + 0.7 + 0.8) / 3)
    assert health.updated_at >= timestamp
    assert health.metadata_updated_at == definition.updated_at
