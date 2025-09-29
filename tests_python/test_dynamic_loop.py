from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_loop import (
    DynamicLoopEngine,
    LoopRecommendation,
    LoopSignal,
    LoopState,
)
from dynamic_engines import DynamicLoopEngine as LegacyLoopEngine


@pytest.fixture
def engine() -> DynamicLoopEngine:
    return DynamicLoopEngine()


def test_dynamic_loop_engine_evaluate_generates_state(engine: DynamicLoopEngine) -> None:
    signals = [
        LoopSignal(metric="Latency", value=0.2, weight=1.0, trend=0.8, tags=(" core ", "")),
        LoopSignal(metric="Quality", value=-0.6, weight=2.0, trend=0.3),
        LoopSignal(metric="Quality", value=-0.4, weight=1.5, trend=0.2),
        LoopSignal(metric="Delivery", value=0.3, weight=0.5, trend=0.6),
    ]

    state = engine.evaluate(signals)
    history = engine.history()

    assert isinstance(state, LoopState)
    assert state.stability == pytest.approx(0.71, rel=1e-6)
    assert state.momentum == pytest.approx(0.7, rel=1e-6)
    assert state.fatigue == pytest.approx(0.25, rel=1e-6)
    assert state.insights == (
        "Signal 'delivery' variance 0.30",
        "Signal 'latency' variance 0.20",
        "Signal 'quality' variance 0.50",
    )

    assert history and history[-1] == state

    payload = state.as_dict()
    assert payload["insights"] == list(state.insights)
    assert payload["stability"] == pytest.approx(state.stability, rel=1e-6)
    assert payload["momentum"] == pytest.approx(state.momentum, rel=1e-6)
    assert payload["fatigue"] == pytest.approx(state.fatigue, rel=1e-6)

    recommendations = engine.latest_recommendations()
    assert len(recommendations) == 1
    sustain = recommendations[0]
    assert isinstance(sustain, LoopRecommendation)
    assert sustain.focus == "sustain"
    assert sustain.tags == ("maintenance",)
    assert set(sustain.as_dict().keys()) == {"focus", "narrative", "priority", "tags"}


def test_dynamic_loop_engine_flags_interventions(engine: DynamicLoopEngine) -> None:
    signals = [
        LoopSignal(metric="Throughput", value=0.9, weight=0.5, trend=0.2),
        LoopSignal(metric="Errors", value=-0.95, weight=2.0, trend=0.9),
        LoopSignal(metric="Latency", value=-0.85, weight=1.5, trend=0.8),
    ]

    state = engine.evaluate(signals)

    params = engine.parameters
    assert state.stability < params.stability_floor
    assert state.momentum < params.momentum_floor
    assert state.fatigue > params.fatigue_ceiling

    recommendations = engine.latest_recommendations()
    focuses = {rec.focus for rec in recommendations[-3:]}
    assert focuses == {"stabilise", "momentum", "recovery"}


def test_dynamic_engines_legacy_loop_entrypoint() -> None:
    legacy = LegacyLoopEngine()
    assert isinstance(legacy, DynamicLoopEngine)

    signals = [
        LoopSignal(metric="Quality", value=-0.7, weight=1.0, trend=0.4),
        LoopSignal(metric="Delivery", value=0.4, weight=1.0, trend=0.7),
    ]
    state = legacy.evaluate(signals)

    assert isinstance(state, LoopState)
    assert legacy.history()
    assert legacy.latest_recommendations()
