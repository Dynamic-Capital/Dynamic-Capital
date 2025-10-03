from __future__ import annotations

import pytest

from dynamic_benchmark.gradebook import (
    ComprehensiveGrade,
    KnowledgeBaseGrade,
    KnowledgeBaseMetrics,
    grade_many,
    grade_comprehensively,
    grade_knowledge_base,
    summarise,
)


def test_grade_a_band() -> None:
    metrics = KnowledgeBaseMetrics(
        coverage_ratio=0.97,
        accuracy_ratio=0.96,
        telemetry_staleness_hours=12,
        failed_health_checks=0,
    )

    grade = grade_knowledge_base(metrics)

    assert grade.letter == "A"
    assert "telemetry" in grade.rationale
    assert "spot-audits" in grade.remediation


def test_grade_catches_lower_band() -> None:
    metrics = KnowledgeBaseMetrics.from_counts(
        coverage_present=80,
        coverage_required=100,
        accuracy_passing=72,
        accuracy_sampled=100,
        telemetry_staleness_hours=60,
        failed_health_checks=2,
    )

    grade = grade_knowledge_base(metrics)

    assert grade.band == "C range"
    assert "incident review" in grade.remediation


def test_grade_falls_through_to_d() -> None:
    metrics = KnowledgeBaseMetrics(
        coverage_ratio=0.5,
        accuracy_ratio=0.6,
        telemetry_staleness_hours=120,
        failed_health_checks=4,
    )

    grade = grade_knowledge_base(metrics)

    assert grade.letter == "D"
    assert "freeze dependent automations" in grade.remediation


def test_summarise_orders_domains() -> None:
    domains = {
        "DAGI": KnowledgeBaseMetrics(0.9, 0.9, 18, 1),
        "DAI": KnowledgeBaseMetrics(0.96, 0.94, 30, 0),
    }

    ordered = summarise(domains)

    assert ordered[0][0] == "DAGI"
    assert isinstance(ordered[0][1], KnowledgeBaseGrade)


def test_summarise_reuses_precomputed_grades() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.95, 0.9, 24, 0),
        "DAGI": KnowledgeBaseMetrics(0.9, 0.88, 26, 1),
    }

    precomputed = grade_many(domains)
    ordered = summarise(domains, precomputed_grades=precomputed)

    assert ordered[0][1] is precomputed[ordered[0][0]]


def test_grade_comprehensively_returns_weighted_metrics() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.95, 0.9, 24, 0),
        "DAGI": KnowledgeBaseMetrics(0.85, 0.8, 36, 2),
    }

    comprehensive = grade_comprehensively(domains)

    assert isinstance(comprehensive, ComprehensiveGrade)
    assert comprehensive.metrics.coverage_ratio == pytest.approx(0.9, rel=1e-6)
    assert comprehensive.metrics.accuracy_ratio == pytest.approx(0.85, rel=1e-6)
    assert "DAI" in comprehensive.domain_grades


def test_grade_comprehensively_accepts_weights() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.99, 0.96, 20, 0),
        "DAGI": KnowledgeBaseMetrics(0.8, 0.75, 60, 2),
    }

    comprehensive = grade_comprehensively(domains, weights={"DAI": 2, "DAGI": 1})

    expected_coverage = (0.99 * 2 + 0.8) / 3
    assert comprehensive.metrics.coverage_ratio == pytest.approx(expected_coverage, rel=1e-6)
    assert comprehensive.metrics.failed_health_checks in {0, 1}


def test_grade_comprehensively_reuses_precomputed_grades() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.97, 0.95, 22, 0),
        "DAGI": KnowledgeBaseMetrics(0.88, 0.86, 30, 1),
    }

    precomputed = grade_many(domains)
    comprehensive = grade_comprehensively(domains, precomputed_grades=precomputed)

    assert comprehensive.domain_grades == dict(sorted(precomputed.items()))


def test_metrics_reject_negative_values() -> None:
    with pytest.raises(ValueError):
        KnowledgeBaseMetrics(-0.1, 0.9, 10, 0)

    with pytest.raises(ValueError):
        KnowledgeBaseMetrics(0.9, 0.9, -1, 0)

    with pytest.raises(ValueError):
        KnowledgeBaseMetrics(0.9, 0.9, 10, -1)

    with pytest.raises(ValueError):
        KnowledgeBaseMetrics.from_counts(
            coverage_present=10,
            coverage_required=0,
            accuracy_passing=5,
            accuracy_sampled=10,
            telemetry_staleness_hours=10,
        )
