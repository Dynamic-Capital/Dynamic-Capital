"""Tests for the Dynamic State engine."""

from __future__ import annotations

import math

import pytest

from dynamic_states import DynamicStateEngine, StateDefinition, StateSignal, StateSnapshot


@pytest.fixture()
def engine() -> DynamicStateEngine:
    return DynamicStateEngine(history=5, decay=0.2)


def test_snapshot_defaults_to_baseline(engine: DynamicStateEngine) -> None:
    definition = StateDefinition(name="Momentum", description="Team execution energy", baseline=0.2)
    engine.register(definition)

    snapshot = engine.snapshot("momentum")

    assert math.isclose(snapshot.value, 0.2)
    assert math.isclose(snapshot.change, 0.0)
    assert math.isclose(snapshot.trend, 0.0)
    assert snapshot.ready is False
    assert snapshot.signals == ()
    assert "Momentum state" in snapshot.summary


def test_signal_ingestion_and_trend(engine: DynamicStateEngine) -> None:
    engine.register(StateDefinition(name="Focus", description="Trader focus bandwidth", baseline=0.1, warmup=2))

    first = engine.capture(
        {
            "state": "focus",
            "intensity": -0.5,
            "confidence": 0.8,
            "momentum": -0.2,
            "tags": ["fatigue", "macro"],
        }
    )
    assert isinstance(first, StateSignal)

    snapshot_one = engine.snapshot("focus")
    assert snapshot_one.value < 0.1
    assert snapshot_one.trend < 0
    assert snapshot_one.ready is False

    engine.capture(StateSignal(state="FOCUS", intensity=0.7, confidence=0.9, momentum=0.3, tags=("reset",)))

    snapshot_two = engine.snapshot("Focus")
    assert snapshot_two.value > snapshot_one.value
    assert snapshot_two.trend > 0
    assert snapshot_two.ready is True
    assert snapshot_two.metadata["signal_count"] == 2
    assert snapshot_two.tags == ("fatigue", "macro", "reset")
    payload = snapshot_two.as_dict()
    assert payload["state"] == "Focus"
    assert payload["metadata"]["signal_count"] == 2


def test_overview_returns_all_states(engine: DynamicStateEngine) -> None:
    engine.register(StateDefinition(name="Calm", description="Calm state", baseline=0.0))
    engine.capture({"state": "alert", "intensity": 0.3, "confidence": 0.6})

    overview = engine.overview()

    assert set(overview.keys()) == {"alert", "calm"}
    assert overview["alert"].summary.startswith("Alert state")
    assert overview["calm"].value == pytest.approx(0.0)


def test_legacy_engines_module_exports_state_symbols() -> None:
    from dynamic.platform.engines import (  # type: ignore-import-not-found
        DynamicStateEngine as LegacyEngine,
        StateDefinition as LegacyDefinition,
        StateSignal as LegacySignal,
        StateSnapshot as LegacySnapshot,
    )

    assert LegacyEngine is DynamicStateEngine
    assert LegacySignal is StateSignal
    assert LegacyDefinition is StateDefinition
    assert LegacySnapshot is StateSnapshot
