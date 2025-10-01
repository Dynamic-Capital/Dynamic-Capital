from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic.trading.algo.dynamic_scripts import (
    DynamicScript,
    DynamicScriptRegistry,
    ScriptConfigError,
)


def _ts(minutes: int) -> datetime:
    return datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_dynamic_script_normalises_descriptor_payload() -> None:
    script = DynamicScript(
        script_id="  sync-env  ",
        category="Operations",
        entrypoint=" scripts/sync-env.ts ",
        cadence_minutes=60,
        env_vars=[" SUPABASE_KEY ", "SUPABASE_KEY"],
        tags=[" deploy ", "deploy"],
        metadata={"owner": "ops"},
        criticality="0.8",
    )

    assert script.script_id == "sync-env"
    assert script.category == "operations"
    assert script.entrypoint == "scripts/sync-env.ts"
    assert script.env_vars == ("SUPABASE_KEY",)
    assert script.tags == ("deploy",)
    assert script.metadata == {"owner": "ops"}
    assert script.criticality == pytest.approx(0.8)


def test_dynamic_script_due_logic_and_manual_toggle() -> None:
    scheduled = DynamicScript(
        script_id="checks", category="ops", entrypoint="scripts/checks.ts", cadence_minutes=30
    )

    assert scheduled.is_due(now=_ts(0)) is True

    scheduled.mark_run(completed_at=_ts(0))
    assert scheduled.is_due(now=_ts(15)) is False
    assert scheduled.is_due(now=_ts(30)) is True

    manual = DynamicScript(
        script_id="triage", category="ops", entrypoint="scripts/triage.ts", cadence_minutes=None
    )

    assert manual.is_due(now=_ts(0)) is False
    assert manual.is_due(now=_ts(0), include_manual=True) is True


def test_registry_resolves_due_scripts_with_prioritisation() -> None:
    registry = DynamicScriptRegistry(
        [
            {
                "script_id": "sync-env",
                "category": "ops",
                "entrypoint": "scripts/sync-env.ts",
                "cadence_minutes": 120,
                "criticality": 0.6,
                "env_vars": ["SUPABASE_SERVICE_KEY"],
            },
            {
                "script_id": "report",
                "category": "analytics",
                "entrypoint": "scripts/report.ts",
                "cadence_minutes": 60,
                "criticality": 0.9,
            },
            {
                "script_id": "manual-audit",
                "category": "ops",
                "entrypoint": "scripts/manual-audit.ts",
                "cadence_minutes": None,
                "criticality": 0.5,
            },
        ]
    )

    registry.record_result("sync-env", completed_at=_ts(0))

    due = registry.resolve_due_scripts(
        now=_ts(130), include_manual=True, available_env=["SUPABASE_SERVICE_KEY", "TELEGRAM_TOKEN"]
    )

    assert [script.script_id for script in due] == ["report", "sync-env", "manual-audit"]

    due_without_env = registry.resolve_due_scripts(available_env=["TELEGRAM_TOKEN"])
    assert [script.script_id for script in due_without_env] == ["report"]


def test_registry_record_result_updates_runtime_state() -> None:
    registry = DynamicScriptRegistry(
        [
            {
                "script_id": "health-check",
                "category": "ops",
                "entrypoint": "scripts/health-check.ts",
                "cadence_minutes": 45,
            }
        ]
    )

    script = registry.record_result(
        "health-check",
        completed_at=_ts(10),
        status="success",
        duration_ms=1500,
        notes="ok",
    )

    assert script.last_run_at == _ts(10)
    assert script.last_status == "success"
    assert script.last_duration_ms == 1500
    assert script.last_notes == "ok"


def test_category_summary_counts_scripts() -> None:
    registry = DynamicScriptRegistry(
        [
            {"script_id": "a", "category": "ops", "entrypoint": "scripts/a.ts"},
            {"script_id": "b", "category": "ops", "entrypoint": "scripts/b.ts"},
            {"script_id": "c", "category": "analytics", "entrypoint": "scripts/c.ts"},
        ]
    )

    assert registry.category_summary() == {"analytics": 1, "ops": 2}


def test_invalid_descriptor_raises() -> None:
    with pytest.raises(ScriptConfigError):
        DynamicScript(script_id="", category="ops", entrypoint="scripts/tool.ts")

    with pytest.raises(ScriptConfigError):
        DynamicScript(
            script_id="tool",
            category="ops",
            entrypoint="scripts/tool.ts",
            cadence_minutes=0,
        )
