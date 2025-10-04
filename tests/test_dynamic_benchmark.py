from __future__ import annotations

import math
from datetime import datetime

import pytest

from dynamic_benchmark import (
    BenchmarkMetric,
    BenchmarkReport,
    BenchmarkRun,
    BenchmarkScenario,
    DynamicBenchmark,
)


def _scenario() -> BenchmarkScenario:
    return BenchmarkScenario(
        name="Platform Benchmark",
        cadence="weekly",
        owner="Operations",
        metrics=(
            BenchmarkMetric(
                name="Latency",
                target=100,
                weight=2.0,
                higher_is_better=False,
                tolerance=0.1,
                description="Response time in milliseconds.",
            ),
            BenchmarkMetric(
                name="Availability",
                target=0.99,
                weight=1.5,
                higher_is_better=True,
                tolerance=0.02,
            ),
        ),
        description="Core execution KPIs.",
    )


def test_evaluate_produces_weighted_scores_and_narratives() -> None:
    scenario = _scenario()
    engine = DynamicBenchmark(scenario)
    run = BenchmarkRun(
        run_id="week-01",
        metrics={"Latency": 90, "Availability": 0.98},
    )

    report = engine.evaluate(run)

    assert report.status == "on-track"
    assert math.isclose(report.overall_score, 0.995671, rel_tol=1e-5)
    metrics = {assessment.name: assessment for assessment in report.metric_assessments}
    assert metrics["Latency"].status == "exceeds"
    assert metrics["Availability"].status == "meets"
    assert "Latency outperforms" in metrics["Latency"].narrative
    assert report.recommendations == (
        "Track outperforming metrics for durability across future cycles.",
    )
    assert report.proficiency_label == "Contribution Level"
    assert metrics["Latency"].proficiency_level == "contribution"
    payload = report.as_dict()
    assert payload["scenario"] == scenario.name
    assert payload["overall_score"] == pytest.approx(report.overall_score)
    assert payload["status"] == report.status
    assert payload["metric_assessments"][0]["name"] in {"Latency", "Availability"}
    assert payload["proficiency_label"] == report.proficiency_label
    assert all(
        "proficiency_label" in metric for metric in payload["metric_assessments"]
    )


def test_record_appends_runs_to_history_and_preserves_inputs() -> None:
    scenario = _scenario()
    history = [
        BenchmarkRun(
            run_id="historical-1", metrics={"Latency": 110, "Availability": 0.97}
        ),
        BenchmarkRun(
            run_id="historical-2", metrics={"Latency": 102, "Availability": 0.99}
        ),
    ]
    engine = DynamicBenchmark(scenario, history=history, history_limit=3)
    run = BenchmarkRun(
        run_id="week-02",
        metrics={"Latency": 95, "Availability": 1.01},
        inputs={"notes": "post-maintenance"},
    )

    report = engine.record(run)

    assert engine.history[-1].run_id == "week-02"
    assert len(engine.history) == 3
    assert report.inputs == {"notes": "post-maintenance"}
    assert report.proficiency_level in {"contribution", "innovation"}
    assert any("historical average sits" in rec for rec in report.recommendations)


def test_missing_metric_raises_key_error() -> None:
    scenario = _scenario()
    engine = DynamicBenchmark(scenario)
    run = BenchmarkRun(run_id="week-03", metrics={"Latency": 105})

    with pytest.raises(KeyError):
        engine.evaluate(run)


def test_lagging_metrics_trigger_recovery_recommendation() -> None:
    scenario = _scenario()
    engine = DynamicBenchmark(scenario)
    run = BenchmarkRun(
        run_id="week-04",
        metrics={"Latency": 120, "Availability": 0.97},
        timestamp=datetime(2024, 4, 1, 12, 30),
    )

    report = engine.evaluate(run)

    assert report.status == "at-risk"
    assert any("Escalate recovery plan" in rec for rec in report.recommendations)
    metrics = {assessment.name: assessment for assessment in report.metric_assessments}
    assert metrics["Latency"].status == "lags"
    assert metrics["Latency"].delta == pytest.approx(-20.0)
    assert metrics["Latency"].narrative.startswith("Latency trails the benchmark")
    assert report.proficiency_label in {"Application Level", "Innovation Level"}
    assert isinstance(report.timestamp.isoformat(), str)


def test_report_serialisation_matches_dataclass_payload() -> None:
    scenario = _scenario()
    engine = DynamicBenchmark(scenario)
    run = BenchmarkRun(run_id="week-05", metrics={"Latency": 95, "Availability": 1.0})
    report = engine.evaluate(run)
    snapshot = BenchmarkReport(
        scenario=report.scenario,
        run_id=report.run_id,
        timestamp=report.timestamp,
        overall_score=report.overall_score,
        status=report.status,
        metric_assessments=report.metric_assessments,
        recommendations=report.recommendations,
        inputs=report.inputs,
        proficiency_level=report.proficiency_level,
        proficiency_label=report.proficiency_label,
        proficiency_narrative=report.proficiency_narrative,
    )

    assert snapshot.as_dict() == report.as_dict()
