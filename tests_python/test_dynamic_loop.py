from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:  # pragma: no cover - import path hygiene
    sys.path.append(str(PROJECT_ROOT))

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


@pytest.fixture
def sustain_signals() -> list[LoopSignal]:
    return [
        LoopSignal(metric="Latency", value=0.2, weight=1.0, trend=0.8, tags=(" core ", "")),
        LoopSignal(metric="Quality", value=-0.6, weight=2.0, trend=0.3),
        LoopSignal(metric="Quality", value=-0.4, weight=1.5, trend=0.2),
        LoopSignal(metric="Delivery", value=0.3, weight=0.5, trend=0.6),
    ]


@pytest.fixture
def intervention_signals() -> list[LoopSignal]:
    return [
        LoopSignal(metric="Throughput", value=0.9, weight=0.5, trend=0.2),
        LoopSignal(metric="Errors", value=-0.95, weight=2.0, trend=0.9),
        LoopSignal(metric="Latency", value=-0.85, weight=1.5, trend=0.8),
    ]


def _assert_state(
    state: LoopState,
    *,
    stability: float,
    momentum: float,
    fatigue: float,
    insights: tuple[str, ...],
) -> None:
    assert isinstance(state, LoopState)
    assert state.stability == pytest.approx(stability, rel=1e-6)
    assert state.momentum == pytest.approx(momentum, rel=1e-6)
    assert state.fatigue == pytest.approx(fatigue, rel=1e-6)
    assert state.insights == insights


def test_dynamic_loop_engine_evaluate_generates_state(
    engine: DynamicLoopEngine, sustain_signals: list[LoopSignal]
) -> None:
    state = engine.evaluate(sustain_signals)
    history = engine.history()

    _assert_state(
        state,
        stability=0.71,
        momentum=0.7,
        fatigue=0.25,
        insights=(
            "Signal 'delivery' variance 0.30",
            "Signal 'latency' variance 0.20",
            "Signal 'quality' variance 0.50",
        ),
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


def test_dynamic_loop_engine_flags_interventions(
    engine: DynamicLoopEngine, intervention_signals: list[LoopSignal]
) -> None:
    state = engine.evaluate(intervention_signals)

    params = engine.parameters
    assert state.stability < params.stability_floor
    assert state.momentum < params.momentum_floor
    assert state.fatigue > params.fatigue_ceiling

    recommendations = engine.latest_recommendations()
    focuses = {rec.focus for rec in recommendations[-3:]}
    assert focuses == {"stabilise", "momentum", "recovery"}


def test_dynamic_loop_engine_back_to_back_evaluations(
    engine: DynamicLoopEngine,
    sustain_signals: list[LoopSignal],
    intervention_signals: list[LoopSignal],
) -> None:
    first_state = engine.evaluate(sustain_signals)
    second_state = engine.evaluate(intervention_signals)

    history = engine.history()
    assert history == (first_state, second_state)
    assert second_state.updated_at >= first_state.updated_at

    _assert_state(
        second_state,
        stability=0.31875,
        momentum=0.2,
        fatigue=0.85,
        insights=(
            "Signal 'errors' variance 0.95",
            "Signal 'latency' variance 0.85",
            "Signal 'throughput' variance 0.90",
        ),
    )

    focuses = [rec.focus for rec in engine.latest_recommendations()]
    assert focuses == ["sustain", "stabilise", "momentum", "recovery"]


def test_dynamic_loop_engine_back_to_back_helper(
    engine: DynamicLoopEngine,
    sustain_signals: list[LoopSignal],
    intervention_signals: list[LoopSignal],
) -> None:
    states = engine.evaluate_back_to_back((sustain_signals, intervention_signals))

    assert len(states) == 2
    first_state, second_state = states
    assert engine.history() == states

    assert second_state.updated_at >= first_state.updated_at
    _assert_state(
        second_state,
        stability=0.31875,
        momentum=0.2,
        fatigue=0.85,
        insights=(
            "Signal 'errors' variance 0.95",
            "Signal 'latency' variance 0.85",
            "Signal 'throughput' variance 0.90",
        ),
    )

    focuses = [rec.focus for rec in engine.latest_recommendations()]
    assert focuses == ["sustain", "stabilise", "momentum", "recovery"]


def test_dynamic_loop_engine_limits_history_and_recommendations(
    sustain_signals: list[LoopSignal], intervention_signals: list[LoopSignal]
) -> None:
    engine = DynamicLoopEngine(history_limit=1, recommendation_limit=2)

    engine.evaluate(sustain_signals)
    engine.evaluate(intervention_signals)

    history = engine.history()
    assert len(history) == 1
    _assert_state(
        history[0],
        stability=0.31875,
        momentum=0.2,
        fatigue=0.85,
        insights=(
            "Signal 'errors' variance 0.95",
            "Signal 'latency' variance 0.85",
            "Signal 'throughput' variance 0.90",
        ),
    )

    recommendations = engine.latest_recommendations()
    assert len(recommendations) == 2
    assert [rec.focus for rec in recommendations] == ["momentum", "recovery"]


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
