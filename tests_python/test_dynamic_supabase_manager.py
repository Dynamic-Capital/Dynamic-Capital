from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic_managers.supabase import DynamicSupabaseManager, SupabaseDomainOverview
from dynamic_supabase import DynamicSupabaseEngine


@pytest.fixture()
def manager() -> DynamicSupabaseManager:
    alert_engine = DynamicSupabaseEngine(
        tables=[
            {
                "name": "signals",
                "schema": "public",
                "primary_keys": ("id",),
                "indexes": (),
                "row_estimate": 18_000,
                "freshness_score": 0.2,
            }
        ],
        functions=[
            {
                "name": "risk_audit",
                "endpoint": "/risk-audit",
                "invocation_count": 200,
                "error_rate": 0.12,
                "average_latency_ms": 420.0,
            }
        ],
        buckets=[{"name": "ledger-exports", "is_public": False}],
    )

    now = datetime.now(timezone.utc)
    alert_engine.log_query(
        {
            "query_id": "q-1",
            "resource_type": "table",
            "resource_name": "public.signals",
            "operation": "select",
            "duration_ms": 600.0,
            "rows_processed": 18_000,
            "status": "success",
            "timestamp": now,
        }
    )
    alert_engine.log_query(
        {
            "query_id": "q-2",
            "resource_type": "function",
            "resource_name": "risk_audit",
            "operation": "invoke",
            "duration_ms": 500.0,
            "status": "error",
            "timestamp": now,
        }
    )

    calm_engine = DynamicSupabaseEngine(
        tables=[
            {
                "name": "audit_log",
                "schema": "public",
                "primary_keys": ("id",),
                "indexes": ("audit_log_user_idx",),
                "row_estimate": 250,
                "freshness_score": 0.92,
            }
        ],
        functions=[
            {
                "name": "notify",
                "endpoint": "/notify",
                "invocation_count": 25,
                "error_rate": 0.0,
                "average_latency_ms": 55.0,
            }
        ],
        buckets=[
            {
                "name": "public-assets",
                "is_public": True,
                "object_count": 480,
                "total_size_mb": 320.0,
            }
        ],
    )

    return DynamicSupabaseManager(engines={"ops": alert_engine, "growth": calm_engine})


def test_domains_are_sorted(manager: DynamicSupabaseManager) -> None:
    assert manager.domains == ("growth", "ops")


def test_overview_prioritises_domains_with_pending_hints(
    manager: DynamicSupabaseManager,
) -> None:
    overviews = manager.overview()
    assert all(isinstance(item, SupabaseDomainOverview) for item in overviews)
    assert [item.domain for item in overviews] == ["ops", "growth"]

    ops_overview = overviews[0]
    assert ops_overview.hint_count >= 2
    assert ops_overview.recent_query_count == 2
    assert ops_overview.as_dict()["pending_hints"]

    growth_overview = overviews[1]
    assert growth_overview.hint_count == 0


def test_catalogue_and_health_snapshots(manager: DynamicSupabaseManager) -> None:
    full_catalogue = manager.catalogue()
    assert set(full_catalogue) == {"growth", "ops"}
    assert full_catalogue["ops"]["tables"][0]["name"] == "signals"

    ops_catalogue = manager.catalogue(domain="ops")
    assert ops_catalogue["tables"][0]["name"] == "signals"

    health = manager.health_dashboard(domain="ops", lookback=5)
    assert "public.signals" in health["tables"]


def test_optimisation_backlog_sorting(manager: DynamicSupabaseManager) -> None:
    backlog = manager.optimisation_backlog()
    assert backlog
    assert backlog[0][0] == "ops"
    assert backlog[0][1].impact in {"high", "medium"}

    ops_backlog = manager.optimisation_backlog(domain="ops")
    assert all(hint.target for hint in ops_backlog)


def test_register_engine_overrides_existing(manager: DynamicSupabaseManager) -> None:
    replacement = DynamicSupabaseEngine()
    manager.register_engine("ops", replacement)
    assert manager.get_engine("ops") is replacement
