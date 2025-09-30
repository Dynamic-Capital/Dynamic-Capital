"""Tests for the Dynamic Machine Learning Engine."""

from __future__ import annotations

import pytest

from dynamic_machine_learning import (
    DatasetSignal,
    DynamicMachineLearningEngine,
    MachineLearningContext,
    ModelExperiment,
)


def build_engine() -> DynamicMachineLearningEngine:
    engine = DynamicMachineLearningEngine()
    engine.extend_datasets(
        (
            DatasetSignal(
                name="baseline-ledger",
                rows=12_000,
                features=24,
                quality_score=0.72,
                freshness_days=6,
                label_balance=0.42,
                issues=("Missing currency codes",),
            ),
            DatasetSignal(
                name="premium-ledger",
                rows=18_500,
                features=32,
                quality_score=0.88,
                freshness_days=2,
                label_balance=0.51,
            ),
        )
    )
    engine.extend_experiments(
        (
            ModelExperiment(
                identifier="xgboost-v2",
                algorithm="Gradient Boosting",
                accuracy=0.87,
                latency_ms=140.0,
                fairness=0.78,
            ),
            ModelExperiment(
                identifier="linear-baseline",
                algorithm="Logistic Regression",
                accuracy=0.75,
                latency_ms=40.0,
                fairness=0.82,
            ),
        )
    )
    return engine


def test_plan_selects_highest_scoring_assets() -> None:
    engine = build_engine()
    context = MachineLearningContext(
        mission="Fraud detection",
        target_metric="F1",
        deployment_deadline_days=14,
        risk_tolerance=0.4,
        latency_budget_ms=150.0,
    )

    plan = engine.plan(context)

    assert plan.dataset.name == "premium-ledger"
    assert plan.experiment.identifier == "xgboost-v2"
    assert 0.0 < plan.confidence <= 1.0
    assert "Fraud detection" in plan.narrative
    assert any("Promote Gradient Boosting" in action for action in plan.actions)


def test_plan_surfaces_fairness_and_latency_risks() -> None:
    engine = DynamicMachineLearningEngine()
    engine.register_dataset(
        DatasetSignal(
            name="alerts",
            rows=6_000,
            features=18,
            quality_score=0.65,
            freshness_days=10,
            label_balance=0.6,
        )
    )
    engine.record_experiment(
        ModelExperiment(
            identifier="transformer",
            algorithm="Transformer",
            accuracy=0.79,
            latency_ms=320.0,
            fairness=0.6,
            status="completed",
        )
    )

    context = MachineLearningContext(
        mission="Real-time compliance",
        target_metric="Precision",
        deployment_deadline_days=21,
        risk_tolerance=0.2,
        latency_budget_ms=120.0,
    )

    plan = engine.plan(context)

    assert any("quality" in risk for risk in plan.risks)
    assert any("Fairness score" in risk for risk in plan.risks)
    assert any("Latency budget" in risk for risk in plan.risks)
    assert any("Optimise inference" in action for action in plan.actions)


def test_plan_balances_risk_sensitivity() -> None:
    engine = DynamicMachineLearningEngine()
    engine.extend_datasets(
        (
            DatasetSignal(
                name="voluminous-ledger",
                rows=25_000,
                features=40,
                quality_score=0.83,
                freshness_days=5,
                label_balance=0.35,
                issues=("Requires manual cleansing",),
            ),
            DatasetSignal(
                name="balanced-ledger",
                rows=9_500,
                features=28,
                quality_score=0.8,
                freshness_days=2,
                label_balance=0.49,
            ),
        )
    )
    engine.extend_experiments(
        (
            ModelExperiment(
                identifier="fast-but-biased",
                algorithm="Boosted Trees",
                accuracy=0.9,
                latency_ms=90.0,
                fairness=0.6,
            ),
            ModelExperiment(
                identifier="equitable-net",
                algorithm="Neural Network",
                accuracy=0.82,
                latency_ms=130.0,
                fairness=0.86,
            ),
        )
    )

    context = MachineLearningContext(
        mission="High-stakes credit decisions",
        target_metric="AUC",
        deployment_deadline_days=10,
        risk_tolerance=0.1,
        latency_budget_ms=200.0,
    )

    plan = engine.plan(context)

    assert plan.dataset.name == "balanced-ledger"
    assert plan.experiment.identifier == "equitable-net"
    assert plan.confidence > 0.5


def test_plan_requires_assets() -> None:
    engine = DynamicMachineLearningEngine()
    context = MachineLearningContext(
        mission="Portfolio forecasting",
        target_metric="RMSE",
        deployment_deadline_days=30,
        risk_tolerance=0.6,
        latency_budget_ms=200.0,
    )

    with pytest.raises(RuntimeError):
        engine.plan(context)

    engine.register_dataset(
        DatasetSignal(
            name="portfolio",
            rows=4_000,
            features=20,
            quality_score=0.82,
            freshness_days=1,
            label_balance=0.5,
        )
    )

    with pytest.raises(RuntimeError):
        engine.plan(context)


def test_overviews_are_sorted() -> None:
    engine = build_engine()

    datasets = engine.dataset_overview()
    experiments = engine.experiment_overview()

    assert datasets[0].name == "premium-ledger"
    assert experiments[0].identifier == "xgboost-v2"
    assert experiments[-1].identifier == "linear-baseline"


def test_ranked_plans_returns_ordered_candidates() -> None:
    engine = build_engine()
    context = MachineLearningContext(
        mission="Fraud detection",
        target_metric="F1",
        deployment_deadline_days=14,
        risk_tolerance=0.4,
        latency_budget_ms=150.0,
    )

    leaderboard = engine.ranked_plans(context, limit=3)

    assert len(leaderboard) == 3
    assert leaderboard[0].dataset.name == "premium-ledger"
    assert leaderboard[0].confidence >= leaderboard[1].confidence >= leaderboard[2].confidence
