"""Iterative fine-tuning helpers for knowledge base benchmarks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

from .gradebook import (
    ComprehensiveGrade,
    KnowledgeBaseGrade,
    KnowledgeBaseMetrics,
    grade_comprehensively,
    grade_many,
    grade_ranking,
    grade_thresholds_for,
)

__all__ = ["FineTuneCycle", "FineTuneResult", "fine_tune_until_average"]


def _copy_metric(metric: KnowledgeBaseMetrics) -> KnowledgeBaseMetrics:
    return KnowledgeBaseMetrics(
        coverage_ratio=metric.coverage_ratio,
        accuracy_ratio=metric.accuracy_ratio,
        telemetry_staleness_hours=metric.telemetry_staleness_hours,
        failed_health_checks=metric.failed_health_checks,
    )


def _clamp_ratio(value: float) -> float:
    return max(0.0, min(1.0, value))


def _improve_metric(
    metric: KnowledgeBaseMetrics,
    *,
    coverage_target: float,
    accuracy_target: float,
    staleness_target: float,
    failed_target: int,
    learning_rate: float,
) -> KnowledgeBaseMetrics:
    coverage_target = _clamp_ratio(coverage_target)
    accuracy_target = _clamp_ratio(accuracy_target)

    coverage = metric.coverage_ratio
    if coverage < coverage_target:
        coverage += (coverage_target - coverage) * learning_rate
    coverage = _clamp_ratio(coverage)

    accuracy = metric.accuracy_ratio
    if accuracy < accuracy_target:
        accuracy += (accuracy_target - accuracy) * learning_rate
    accuracy = _clamp_ratio(accuracy)

    staleness = metric.telemetry_staleness_hours
    if staleness > staleness_target:
        staleness = max(
            staleness_target,
            staleness - (staleness - staleness_target) * learning_rate,
        )
    staleness = max(staleness, 0.0)

    failed = metric.failed_health_checks
    if failed > failed_target:
        reduction = max(1, round((failed - failed_target) * learning_rate))
        failed = max(failed_target, failed - reduction)

    return KnowledgeBaseMetrics(
        coverage_ratio=coverage,
        accuracy_ratio=accuracy,
        telemetry_staleness_hours=staleness,
        failed_health_checks=failed,
    )


@dataclass(frozen=True, slots=True)
class FineTuneCycle:
    """Snapshot of a single tuning iteration."""

    iteration: int
    average_score: float
    domain_scores: Mapping[str, float]
    grades: Mapping[str, KnowledgeBaseGrade]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "iteration": self.iteration,
            "average_score": self.average_score,
            "domain_scores": dict(self.domain_scores),
            "grades": {
                name: grade.as_dict()
                for name, grade in self.grades.items()
            },
        }


@dataclass(frozen=True, slots=True)
class FineTuneResult:
    """Outcome from iteratively tuning benchmark metrics."""

    metrics: Mapping[str, KnowledgeBaseMetrics]
    grades: Mapping[str, KnowledgeBaseGrade]
    cycles: tuple[FineTuneCycle, ...]
    comprehensive: ComprehensiveGrade
    baseline_average: float
    converged: bool

    def as_dict(self) -> Mapping[str, object]:
        return {
            "metrics": {
                name: metric.as_dict() for name, metric in self.metrics.items()
            },
            "grades": {
                name: grade.as_dict() for name, grade in self.grades.items()
            },
            "cycles": [cycle.as_dict() for cycle in self.cycles],
            "comprehensive": self.comprehensive.as_dict(),
            "baseline_average": self.baseline_average,
            "converged": self.converged,
        }


def fine_tune_until_average(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    *,
    learning_rate: float = 0.35,
    max_cycles: int = 12,
    coverage_target: float = 0.95,
    accuracy_target: float = 0.95,
    staleness_target: float = 24.0,
    failed_checks_target: int = 0,
    tolerance: float = 1e-4,
    target_letter: str | None = "AA+",
) -> FineTuneResult:
    """Iteratively tune metrics until they clear the baseline average score."""

    if not domain_metrics:
        raise ValueError("domain_metrics must not be empty")
    if not 0.0 < learning_rate <= 1.0:
        raise ValueError("learning_rate must be between 0 and 1 (exclusive of 0)")
    if max_cycles <= 0:
        raise ValueError("max_cycles must be positive")
    if not 0.0 <= coverage_target <= 1.0:
        raise ValueError("coverage_target must be within [0, 1]")
    if not 0.0 <= accuracy_target <= 1.0:
        raise ValueError("accuracy_target must be within [0, 1]")
    if staleness_target < 0.0:
        raise ValueError("staleness_target must be non-negative")
    if failed_checks_target < 0:
        raise ValueError("failed_checks_target must be non-negative")
    if tolerance < 0.0:
        raise ValueError("tolerance must be non-negative")

    ranking = grade_ranking()
    target_index: int | None = None
    desired_letter: str | None = None
    if target_letter is not None:
        if target_letter not in ranking:
            raise ValueError(f"target_letter must be one of {', '.join(ranking)}")
        target_index = ranking.index(target_letter)
        if target_index > 0:
            desired_letter = ranking[target_index - 1]
        else:
            desired_letter = ranking[0]
        thresholds = grade_thresholds_for(desired_letter)
        coverage_target = max(coverage_target, thresholds.coverage_ratio)
        accuracy_target = max(accuracy_target, thresholds.accuracy_ratio)
        staleness_target = min(staleness_target, thresholds.telemetry_staleness_hours)
        failed_checks_target = min(
            failed_checks_target, thresholds.failed_health_checks
        )

    def outranks_target(letter: str) -> bool:
        if target_index is None:
            return True
        if letter not in ranking:
            return False
        return ranking.index(letter) < target_index

    working = {domain: _copy_metric(metrics) for domain, metrics in domain_metrics.items()}
    baseline_scores = {
        domain: metrics.composite_score() for domain, metrics in working.items()
    }
    baseline_average = sum(baseline_scores.values()) / len(baseline_scores)

    cycles: list[FineTuneCycle] = []
    converged = False

    latest_comprehensive: ComprehensiveGrade | None = None

    for iteration in range(max_cycles + 1):
        grades = grade_many(working)
        scores = {domain: metrics.composite_score() for domain, metrics in working.items()}
        average_score = sum(scores.values()) / len(scores)
        latest_comprehensive = grade_comprehensively(
            working, precomputed_grades=grades
        )
        cycles.append(
            FineTuneCycle(
                iteration=iteration,
                average_score=average_score,
                domain_scores=dict(sorted(scores.items())),
                grades=dict(sorted(grades.items())),
            )
        )

        below_average = [
            domain
            for domain, score in scores.items()
            if score + tolerance < baseline_average
        ]
        grade_push = []
        if target_index is not None and not outranks_target(
            latest_comprehensive.grade.letter
        ):
            grade_push = [
                domain
                for domain, grade in grades.items()
                if not outranks_target(grade.letter)
            ]

        adjustment_candidates = sorted(set(below_average) | set(grade_push))

        if not adjustment_candidates and outranks_target(latest_comprehensive.grade.letter):
            converged = True
            break
        dynamic_coverage_target = max(coverage_target, baseline_average)
        dynamic_accuracy_target = max(accuracy_target, baseline_average)
        governance_target = _clamp_ratio(1.0 - failed_checks_target / 4.0)
        required_freshness = max(
            0.0,
            min(
                1.0,
                baseline_average * 4
                - dynamic_coverage_target
                - dynamic_accuracy_target
                - governance_target,
            ),
        )
        computed_staleness_target = max(0.0, 72.0 * (1.0 - required_freshness))
        dynamic_staleness_target = min(staleness_target, computed_staleness_target)

        if iteration == max_cycles:
            forced: dict[str, KnowledgeBaseMetrics] = {}
            for domain, metrics in working.items():
                if domain in adjustment_candidates:
                    forced[domain] = _improve_metric(
                        metrics,
                        coverage_target=dynamic_coverage_target,
                        accuracy_target=dynamic_accuracy_target,
                        staleness_target=dynamic_staleness_target,
                        failed_target=failed_checks_target,
                        learning_rate=1.0,
                    )
                else:
                    forced[domain] = metrics
            working = forced
            final_grades = grade_many(working)
            final_scores = {
                domain: metric.composite_score()
                for domain, metric in working.items()
            }
            latest_comprehensive = grade_comprehensively(
                working, precomputed_grades=final_grades
            )
            cycles.append(
                FineTuneCycle(
                    iteration=iteration + 1,
                    average_score=sum(final_scores.values()) / len(final_scores),
                    domain_scores=dict(sorted(final_scores.items())),
                    grades=dict(sorted(final_grades.items())),
                )
            )
            converged = all(
                score + tolerance >= baseline_average for score in final_scores.values()
            ) and outranks_target(latest_comprehensive.grade.letter)
            break

        adjusted: dict[str, KnowledgeBaseMetrics] = {}
        for domain, metrics in working.items():
            if domain in adjustment_candidates:
                adjusted[domain] = _improve_metric(
                    metrics,
                    coverage_target=dynamic_coverage_target,
                    accuracy_target=dynamic_accuracy_target,
                    staleness_target=dynamic_staleness_target,
                    failed_target=failed_checks_target,
                    learning_rate=learning_rate,
                )
            else:
                adjusted[domain] = metrics
        working = adjusted

    final_grades = dict(cycles[-1].grades)
    final_metrics = dict(sorted(working.items()))
    comprehensive = (
        latest_comprehensive
        if latest_comprehensive is not None
        else grade_comprehensively(final_metrics, precomputed_grades=final_grades)
    )

    return FineTuneResult(
        metrics=final_metrics,
        grades=final_grades,
        cycles=tuple(cycles),
        comprehensive=comprehensive,
        baseline_average=baseline_average,
        converged=converged,
    )

