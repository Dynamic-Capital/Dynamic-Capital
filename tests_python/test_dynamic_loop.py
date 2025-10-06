from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_loop import (
    DynamicLoopEngine,
    LoopEquation,
    LoopEquationDelta,
    LoopEquationTimelineEntry,
    LoopRecommendation,
    LoopSignal,
    LoopState,
)
from dynamic.platform.engines import DynamicLoopEngine as LegacyLoopEngine


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
    assert state.stability == pytest.approx(0.57, rel=1e-6)
    assert state.momentum == pytest.approx(0.7333333333, rel=1e-6)
    assert state.fatigue == pytest.approx(0.7396226415, rel=1e-6)
    assert state.insights == (
        "Signal 'delivery' |Δ| 0.30, trend 0.60",
        "Signal 'latency' |Δ| 0.20, trend 0.80",
        "Signal 'quality' |Δ| 0.50, trend 0.25, negatives 2/2",
    )

    assert history and history[-1] == state

    payload = state.as_dict()
    assert payload["insights"] == list(state.insights)
    assert payload["stability"] == pytest.approx(state.stability, rel=1e-6)
    assert payload["momentum"] == pytest.approx(state.momentum, rel=1e-6)
    assert payload["fatigue"] == pytest.approx(state.fatigue, rel=1e-6)

    recommendations = engine.latest_recommendations()
    assert len(recommendations) == 1
    recovery = recommendations[0]
    assert isinstance(recovery, LoopRecommendation)
    assert recovery.focus == "recovery"
    assert recovery.tags == ("resilience", "capacity")
    assert set(recovery.as_dict().keys()) == {"focus", "narrative", "priority", "tags"}


def test_dynamic_loop_engine_flags_interventions(engine: DynamicLoopEngine) -> None:
    signals = [
        LoopSignal(metric="Throughput", value=0.9, weight=0.5, trend=0.2),
        LoopSignal(metric="Errors", value=-0.95, weight=2.0, trend=0.1),
        LoopSignal(metric="Latency", value=-0.85, weight=1.5, trend=0.15),
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


def test_dynamic_loop_back_to_back_equation(engine: DynamicLoopEngine) -> None:
    review_signals = [
        LoopSignal(metric="Latency", value=0.2, weight=1.0, trend=0.8),
        LoopSignal(metric="Quality", value=-0.6, weight=2.0, trend=0.3),
        LoopSignal(metric="Quality", value=-0.4, weight=1.5, trend=0.2),
        LoopSignal(metric="Delivery", value=0.3, weight=0.5, trend=0.6),
    ]
    optimise_signals = [
        LoopSignal(metric="Latency", value=0.1, weight=1.0, trend=0.9),
        LoopSignal(metric="Quality", value=0.2, weight=1.5, trend=0.8),
        LoopSignal(metric="Delivery", value=0.5, weight=1.0, trend=0.7),
    ]

    equation = engine.review_optimize_back_to_back(review_signals, optimise_signals)

    assert isinstance(equation, LoopEquation)
    assert len(engine.history()) == 2
    assert len(engine.latest_recommendations()) == 2

    assert equation.review_score < equation.optimise_score
    assert equation.score_delta == pytest.approx(0.2091, abs=1e-3)

    assert equation.review_terms == (
        "0.45×stability(0.57)",
        "0.35×momentum(0.73)",
        "0.20×resilience(0.26)",
    )
    assert equation.optimise_terms == (
        "0.45×stability(0.74)",
        "0.35×momentum(0.80)",
        "0.20×resilience(0.80)",
    )
    assert equation.steps == (
        "Review stage: stability=0.57, momentum=0.73, fatigue=0.74 -> score=0.5652 (0.45×stability(0.57) + 0.35×momentum(0.73) + 0.20×resilience(0.26))",
        "Optimise stage: stability=0.74, momentum=0.80, fatigue=0.20 -> score=0.7743 (0.45×stability(0.74) + 0.35×momentum(0.80) + 0.20×resilience(0.80))",
        "Delta: optimise minus review = +0.2091 (improved, meaningful shift).",
    )

    assert isinstance(equation.timeline, tuple)
    assert [entry.stage for entry in equation.timeline] == ["review", "optimise"]
    assert all(isinstance(entry, LoopEquationTimelineEntry) for entry in equation.timeline)
    assert equation.timeline[0].commentary == equation.steps[0]

    assert isinstance(equation.delta, LoopEquationDelta)
    assert equation.steps[-1] == equation.delta.narrative
    assert equation.delta.direction == "positive"
    assert equation.delta.magnitude == pytest.approx(abs(equation.score_delta), rel=1e-6)
    assert 0.5 <= equation.delta.confidence <= 0.9

    payload = equation.as_dict()
    assert payload["cadence"] == "review-optimize"
    assert payload["review_score"] == pytest.approx(equation.review_score, rel=1e-6)
    assert payload["optimise_score"] == pytest.approx(
        equation.optimise_score, rel=1e-6
    )
    assert payload["review_terms"] == list(equation.review_terms)
    assert payload["optimise_terms"] == list(equation.optimise_terms)
    assert payload["steps"] == list(equation.steps)
    assert payload["timeline"][0]["stage"] == "review"
    assert payload["delta"]["direction"] == equation.delta.direction
    assert payload["parameters"]["stability_weight"] == pytest.approx(
        equation.parameters_snapshot["stability_weight"], rel=1e-6
    )
    assert payload["version"] == equation.version
    assert "computed_at" in payload
