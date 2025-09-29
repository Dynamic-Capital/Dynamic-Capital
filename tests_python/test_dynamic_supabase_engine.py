from __future__ import annotations

from pathlib import Path
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import dynamic_supabase.engine as engine_module
from dynamic_supabase.engine import DynamicSupabaseEngine


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
