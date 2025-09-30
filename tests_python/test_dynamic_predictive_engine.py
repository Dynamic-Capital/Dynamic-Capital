from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_predictive.engine import (  # noqa: E402 - path mutation for tests
    DynamicPredictiveEngine,
    PredictiveFeature,
    PredictiveScenario,
    PredictiveTrainingSample,
)


def _build_features() -> tuple[PredictiveFeature, PredictiveFeature]:
    return (
        PredictiveFeature(
            name="growth",
            signal=0.4,
            confidence=0.8,
            volatility=0.2,
            impact=1.0,
            catalysts=("new market",),
        ),
        PredictiveFeature(
            name="cost",
            signal=0.2,
            confidence=0.6,
            volatility=0.3,
            impact=0.6,
            inhibitors=("supply",),
        ),
    )


def _build_scenario() -> PredictiveScenario:
    return PredictiveScenario(
        horizon="Q3",
        optimism_bias=0.1,
        risk_appetite=0.7,
        execution_capacity=0.5,
        catalysts=("partnership",),
    )


def test_generate_produces_consistent_insight() -> None:
    engine = DynamicPredictiveEngine(window=5)
    features = _build_features()
    engine.ingest_many(features)

    scenario = _build_scenario()
    insight = engine.generate(scenario)

    assert insight.score == pytest.approx(0.683, abs=1e-3)
    assert insight.risk == pytest.approx(0.239, abs=1e-3)
    assert insight.momentum == pytest.approx(0.45, abs=1e-3)
    assert insight.confidence == pytest.approx(0.409, abs=1e-3)
    assert insight.catalysts == ("new market", "partnership")
    assert insight.inhibitors == ("supply",)
    assert "Horizon: Q3" in insight.storyline


def test_optimize_adjusts_configuration_towards_targets() -> None:
    engine = DynamicPredictiveEngine(window=5)
    features = _build_features()
    engine.ingest_many(features)
    scenario = _build_scenario()

    baseline_insight = engine.generate(scenario)
    original_config = engine.config

    sample = PredictiveTrainingSample(
        features=features,
        scenario=scenario,
        target_score=0.9,
        target_risk=0.1,
        target_confidence=0.8,
    )

    updated_config = engine.optimize([sample], learning_rate=0.2, iterations=4)

    assert updated_config.optimism_bias_weight > original_config.optimism_bias_weight
    assert updated_config.volatility_weight < original_config.volatility_weight
    assert updated_config.confidence_weight > original_config.confidence_weight
    assert updated_config.execution_bias > original_config.execution_bias

    tuned_insight = engine.generate(scenario)
    assert tuned_insight.score >= baseline_insight.score
    assert tuned_insight.risk <= baseline_insight.risk
    assert tuned_insight.confidence >= baseline_insight.confidence
