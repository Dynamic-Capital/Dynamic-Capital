from __future__ import annotations

import pytest

from dynamic_evaluation import (
    DynamicEvaluationEngine,
    EvaluationContext,
    EvaluationCriterion,
    EvaluationSignal,
)


def _build_engine() -> DynamicEvaluationEngine:
    criteria = [
        EvaluationCriterion(key="quality", title="Quality", threshold=0.7, weight=1.0),
        EvaluationCriterion(key="safety", title="Safety", threshold=0.8, weight=1.5),
    ]
    return DynamicEvaluationEngine(criteria, history=32)


def test_dynamic_evaluation_report_basic() -> None:
    engine = _build_engine()
    engine.capture(
        EvaluationSignal(
            criterion="quality",
            score=0.75,
            confidence=0.8,
            impact=0.6,
            notes="QA retrospective",
        )
    )
    engine.capture(
        EvaluationSignal(
            criterion="quality",
            score=0.65,
            confidence=0.6,
            impact=0.4,
            notes="Regression sweep",
        )
    )
    engine.capture(
        EvaluationSignal(
            criterion="safety",
            score=0.9,
            confidence=0.9,
            impact=0.7,
            notes="Red team review",
        )
    )

    context = EvaluationContext(
        objective="Assess release candidate",
        timeframe="2024-Q4",
        audience=("cto", "qa"),
    )
    report = engine.build_report(context)

    assert report.objective == "Assess release candidate"
    assert report.status == "healthy"
    assert 0.79 < report.overall_score < 0.82
    assert 0.74 < report.overall_confidence < 0.86

    quality_snapshot = next(snapshot for snapshot in report.snapshots if snapshot.key == "quality")
    assert quality_snapshot.status == "on_track"
    assert any(
        "coverage" in rec.lower() or "sampling" in rec.lower()
        for rec in quality_snapshot.recommendations
    )

    safety_snapshot = next(snapshot for snapshot in report.snapshots if snapshot.key == "safety")
    assert safety_snapshot.status == "exceeding"
    assert "Safety" in report.strengths
    assert report.focus_areas  # non-empty focus areas give guidance


def test_dynamic_evaluation_report_requires_signals() -> None:
    engine = _build_engine()
    context = EvaluationContext(objective="Dry run")
    with pytest.raises(RuntimeError):
        engine.build_report(context)
