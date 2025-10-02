from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dynamic_supabase.engine as engine_module
from dynamic_supabase.engine import (
    DynamicSupabaseEngine,
    SupabaseFunctionBlueprint,
    SupabaseQueryProfile,
    SupabaseTableBlueprint,
)


@pytest.fixture(autouse=True)
def _clear_supabase_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Ensure Supabase environment variables are reset between tests."""

    for key in (
        "SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SUPABASE_SERVICE_ROLE",
        "SUPABASE_SERVICE_KEY",
        "SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ):
        monkeypatch.delenv(key, raising=False)


def test_verify_connection_requires_url() -> None:
    engine = DynamicSupabaseEngine()

    status = engine.verify_connection()

    assert not status.ok
    assert status.endpoint == ""
    assert status.error == "Supabase URL is not configured."


def test_verify_connection_success(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = DynamicSupabaseEngine()

    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-key")

    captured: dict[str, object] = {}

    def fake_get(url: str, headers: dict[str, str], timeout: float):  # type: ignore[override]
        captured.update({"url": url, "headers": headers, "timeout": timeout})
        return SimpleNamespace(status_code=200, text="")

    monkeypatch.setattr(
        engine_module,
        "requests",
        SimpleNamespace(get=fake_get),
        raising=False,
    )

    status = engine.verify_connection(timeout=2.5)

    assert status.ok
    assert status.status_code == 200
    assert status.endpoint == "https://example.supabase.co/auth/v1/settings"
    assert captured["timeout"] == 2.5
    assert captured["headers"] == {
        "apikey": "test-key",
        "Authorization": "Bearer test-key",
    }


def test_verify_connection_override(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = DynamicSupabaseEngine()

    captured: dict[str, object] = {}

    def fake_get(url: str, headers: dict[str, str], timeout: float):  # type: ignore[override]
        captured.update({"url": url, "headers": headers, "timeout": timeout})
        return SimpleNamespace(status_code=401, text="unauthorised")

    monkeypatch.setattr(
        engine_module,
        "requests",
        SimpleNamespace(get=fake_get),
        raising=False,
    )

    status = engine.verify_connection(
        url="https://custom.supabase.co",
        api_key="anon-key",
        timeout=1.0,
    )

    assert captured["url"] == "https://custom.supabase.co/auth/v1/settings"
    assert captured["headers"] == {
        "apikey": "anon-key",
        "Authorization": "Bearer anon-key",
    }
    assert status.endpoint == "https://custom.supabase.co/auth/v1/settings"
    assert status.status_code == 401
    assert not status.ok
    assert status.error == "Unexpected status 401: unauthorised"


def test_optimisation_hints_detects_large_tables() -> None:
    engine = DynamicSupabaseEngine(
        tables=(
            SupabaseTableBlueprint(
                name="events",
                schema="public",
                primary_keys=("id",),
                indexes=(),
                row_estimate=25_000,
            ),
        ),
    )

    hints = engine.optimisation_hints(table_row_threshold=10_000)

    assert any(
        hint.target_type == "table"
        and hint.target == "public.events"
        and hint.action == "add_index"
        for hint in hints
    )


def test_optimisation_hints_flags_function_latency_and_error() -> None:
    engine = DynamicSupabaseEngine(
        functions=(
            SupabaseFunctionBlueprint(
                name="analysis-ingest",
                endpoint="/functions/v1/analysis-ingest",
                invocation_count=120,
                error_rate=0.12,
                average_latency_ms=480.0,
            ),
        ),
    )

    function_hints = [
        hint
        for hint in engine.optimisation_hints(
            function_error_rate_threshold=0.05,
            function_latency_threshold_ms=300.0,
        )
        if hint.target_type == "function"
    ]

    actions = {hint.action for hint in function_hints}
    assert "reduce_error_rate" in actions
    assert "improve_latency" in actions


def test_optimisation_hints_uses_query_history() -> None:
    table = SupabaseTableBlueprint(
        name="user_analytics",
        schema="public",
        primary_keys=("id",),
        indexes=("idx_user_analytics_created_at",),
        row_estimate=8_000,
    )
    engine = DynamicSupabaseEngine(tables=(table,))

    engine.log_query(
        SupabaseQueryProfile(
            query_id="q-fast",
            resource_type="table",
            resource_name="public.user_analytics",
            operation="select",
            duration_ms=520.0,
            rows_processed=18_000,
        ),
    )
    engine.log_query(
        SupabaseQueryProfile(
            query_id="q-error",
            resource_type="function",
            resource_name="analysis-ingest",
            operation="invoke",
            duration_ms=80.0,
            status="failure",
        ),
    )

    hints = engine.optimisation_hints(
        table_latency_threshold_ms=400.0,
        query_scan_threshold=10_000,
        query_latency_threshold_ms=400.0,
    )

    table_hints = [
        hint
        for hint in hints
        if hint.target_type == "table" and hint.target == "public.user_analytics"
    ]
    assert any(hint.action == "optimise_queries" for hint in table_hints)

    query_hints = [hint for hint in hints if hint.target_type == "query"]
    assert any(
        hint.action == "profile_slow_query" and hint.target == "table:public.user_analytics"
        for hint in query_hints
    )
    assert any(
        hint.action == "review_errors" and hint.target == "function:analysis-ingest"
        for hint in query_hints
    )
