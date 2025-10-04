from __future__ import annotations

import pytest

from dynamic_benchmark import (
    KnowledgeBaseMetrics,
    fine_tune_until_average,
)


def _baseline_average(domains: dict[str, KnowledgeBaseMetrics]) -> float:
    scores = [metrics.composite_score() for metrics in domains.values()]
    return sum(scores) / len(scores)


def test_fine_tune_until_average_improves_below_threshold() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.98, 0.97, 12, 0),
        "DAGI": KnowledgeBaseMetrics(0.82, 0.78, 54, 2),
        "DAGS": KnowledgeBaseMetrics(0.84, 0.8, 50, 1),
    }

    baseline = _baseline_average(domains)
    below_baseline = {
        name
        for name, metrics in domains.items()
        if metrics.composite_score() < baseline
    }

    result = fine_tune_until_average(domains, learning_rate=0.5, max_cycles=6)

    assert result.converged is True
    assert result.baseline_average == pytest.approx(baseline)
    assert len(result.cycles) >= 2
    for name in below_baseline:
        tuned_score = result.metrics[name].composite_score()
        assert tuned_score + 1e-4 >= baseline
    assert result.comprehensive.grade.letter == "AAA"


def test_fine_tune_until_average_no_changes_when_aligned() -> None:
    domains = {
        "DAI": KnowledgeBaseMetrics(0.998, 0.997, 6, 0),
        "DAGI": KnowledgeBaseMetrics(0.998, 0.997, 6, 0),
    }

    result = fine_tune_until_average(domains)

    assert result.converged is True
    assert len(result.cycles) == 1
    assert result.metrics == domains


@pytest.mark.parametrize(
    "kwargs",
    [
        {"learning_rate": 0.0},
        {"learning_rate": 1.5},
        {"max_cycles": 0},
        {"coverage_target": -0.1},
        {"accuracy_target": 1.5},
        {"staleness_target": -1.0},
        {"failed_checks_target": -1},
        {"tolerance": -1.0},
        {"target_letter": "UNKNOWN"},
    ],
)
def test_fine_tune_until_average_validates_inputs(kwargs) -> None:
    domains = {"DAI": KnowledgeBaseMetrics(0.9, 0.9, 24, 0)}

    with pytest.raises(ValueError):
        fine_tune_until_average(domains, **kwargs)


def test_fine_tune_until_average_rejects_empty_domains() -> None:
    with pytest.raises(ValueError):
        fine_tune_until_average({})
