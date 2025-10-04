"""Benchmark preparation utilities for Dynamic AI, AGI, and AGS domains."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, MutableMapping, Sequence

from dynamic_benchmark.config import (
    load_knowledge_base_config,
    load_knowledge_base_payload,
)
from dynamic_benchmark.gradebook import (
    KnowledgeBaseGrade,
    KnowledgeBaseMetrics,
    grade_many,
)
from dynamic_benchmark.tuning import FineTuneResult, fine_tune_until_average

from .tuning_primitives import (
    DEFAULT_ACCURACY_TARGET,
    DEFAULT_COVERAGE_TARGET,
    DEFAULT_FAILED_CHECKS_TARGET,
    DEFAULT_STALENESS_TARGET,
    compute_deficits,
    focus_metric,
    priority_multiplier_from_severity,
    quality_floor_from_severity,
    severity_from_grade,
    severity_label,
)

from .knowledge_base import resolve_domain_snapshots
from .self_improvement import LearningSnapshot

__all__ = [
    "BenchmarkDomainPlan",
    "BenchmarkPreparation",
    "prepare_benchmark_plan",
    "prepare_benchmark_plan_from_source",
    "load_benchmark_metrics",
]


@dataclass(slots=True)
class BenchmarkDomainPlan:
    """Knowledge enrichment plan for a single domain."""

    name: str
    metrics: KnowledgeBaseMetrics
    grade: KnowledgeBaseGrade
    severity: float
    severity_label: str
    quality_floor: float
    priority_multiplier: float
    deficits: Mapping[str, float]
    focus: str
    snapshots: tuple[LearningSnapshot, ...]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "name": self.name,
            "metrics": self.metrics.as_dict(),
            "grade": self.grade.as_dict(),
            "severity": self.severity,
            "severity_label": self.severity_label,
            "quality_floor": self.quality_floor,
            "priority_multiplier": self.priority_multiplier,
            "deficits": dict(self.deficits),
            "focus": self.focus,
            "snapshots": {
                "count": len(self.snapshots),
                "examples": [snapshot.to_dict() for snapshot in self.snapshots],
            },
        }


@dataclass(slots=True)
class BenchmarkPreparation:
    """Container bundling metrics, grades, and knowledge enrichment plans."""

    metrics: Mapping[str, KnowledgeBaseMetrics]
    grades: Mapping[str, KnowledgeBaseGrade]
    domain_plans: Mapping[str, BenchmarkDomainPlan]
    fine_tune_result: FineTuneResult
    minimum_quality: float
    coverage_target: float
    accuracy_target: float
    staleness_target: float
    failed_checks_target: int

    def as_dict(self) -> Mapping[str, object]:
        return {
            "metrics": {
                name: metrics.as_dict() for name, metrics in self.metrics.items()
            },
            "grades": {
                name: grade.as_dict() for name, grade in self.grades.items()
            },
            "plans": {name: plan.as_dict() for name, plan in self.domain_plans.items()},
            "fine_tune_result": self.fine_tune_result.as_dict(),
            "targets": {
                "minimum_quality": self.minimum_quality,
                "coverage": self.coverage_target,
                "accuracy": self.accuracy_target,
                "staleness": self.staleness_target,
                "failed_checks": self.failed_checks_target,
            },
        }


def load_benchmark_metrics(
    source: Mapping[str, object] | str | Path,
) -> dict[str, KnowledgeBaseMetrics]:
    """Normalise benchmark metrics from payloads or configuration paths."""

    if isinstance(source, Mapping):
        return load_knowledge_base_payload(source)
    if isinstance(source, (str, Path)):
        return load_knowledge_base_config(source)
    raise TypeError("benchmark source must be a mapping or path-like object")


def prepare_benchmark_plan(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    *,
    knowledge_base: Mapping[str, Sequence[Mapping[str, object]]] | None = None,
    minimum_quality: float = 0.6,
    coverage_target: float = DEFAULT_COVERAGE_TARGET,
    accuracy_target: float = DEFAULT_ACCURACY_TARGET,
    staleness_target: float = DEFAULT_STALENESS_TARGET,
    failed_checks_target: int = DEFAULT_FAILED_CHECKS_TARGET,
    learning_rate: float = 0.35,
    max_cycles: int = 12,
) -> BenchmarkPreparation:
    """Produce enrichment plans and tuning projections for each domain."""

    if not domain_metrics:
        raise ValueError("domain_metrics must not be empty")

    grades = grade_many(domain_metrics)
    snapshots = resolve_domain_snapshots(domain_metrics.keys(), knowledge_base=knowledge_base)

    fine_tune_result = fine_tune_until_average(
        domain_metrics,
        learning_rate=learning_rate,
        max_cycles=max_cycles,
        coverage_target=coverage_target,
        accuracy_target=accuracy_target,
        staleness_target=staleness_target,
        failed_checks_target=failed_checks_target,
    )

    plans: MutableMapping[str, BenchmarkDomainPlan] = {}

    for domain, metrics in domain_metrics.items():
        grade = grades[domain]
        severity = severity_from_grade(grade.letter)
        label = severity_label(severity)
        quality_floor = quality_floor_from_severity(minimum_quality, severity)
        priority_multiplier = priority_multiplier_from_severity(severity)
        deficits = compute_deficits(
            metrics,
            coverage_target=coverage_target,
            accuracy_target=accuracy_target,
            staleness_target=staleness_target,
            failed_checks_target=failed_checks_target,
        )
        focus = focus_metric(deficits)
        plan_snapshots = snapshots.get(domain, ())

        plans[domain] = BenchmarkDomainPlan(
            name=domain,
            metrics=metrics,
            grade=grade,
            severity=severity,
            severity_label=label,
            quality_floor=quality_floor,
            priority_multiplier=priority_multiplier,
            deficits=deficits,
            focus=focus,
            snapshots=plan_snapshots,
        )

    return BenchmarkPreparation(
        metrics=dict(domain_metrics),
        grades=grades,
        domain_plans=dict(plans),
        fine_tune_result=fine_tune_result,
        minimum_quality=minimum_quality,
        coverage_target=coverage_target,
        accuracy_target=accuracy_target,
        staleness_target=staleness_target,
        failed_checks_target=failed_checks_target,
    )


def prepare_benchmark_plan_from_source(
    source: Mapping[str, object] | str | Path,
    *,
    knowledge_base: Mapping[str, Sequence[Mapping[str, object]]] | None = None,
    minimum_quality: float = 0.6,
    coverage_target: float = DEFAULT_COVERAGE_TARGET,
    accuracy_target: float = DEFAULT_ACCURACY_TARGET,
    staleness_target: float = DEFAULT_STALENESS_TARGET,
    failed_checks_target: int = DEFAULT_FAILED_CHECKS_TARGET,
    learning_rate: float = 0.35,
    max_cycles: int = 12,
) -> BenchmarkPreparation:
    """Load metrics from ``source`` and prepare a benchmark plan."""

    metrics = load_benchmark_metrics(source)
    return prepare_benchmark_plan(
        metrics,
        knowledge_base=knowledge_base,
        minimum_quality=minimum_quality,
        coverage_target=coverage_target,
        accuracy_target=accuracy_target,
        staleness_target=staleness_target,
        failed_checks_target=failed_checks_target,
        learning_rate=learning_rate,
        max_cycles=max_cycles,
    )

