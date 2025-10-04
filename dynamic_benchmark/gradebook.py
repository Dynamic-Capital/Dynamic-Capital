"""Knowledge base grading utilities for Dynamic Benchmark."""

from __future__ import annotations

from dataclasses import dataclass
from math import fsum
from typing import Mapping

from dynamic_grading.system import classify_proficiency

__all__ = [
    "KnowledgeBaseMetrics",
    "KnowledgeBaseGrade",
    "grade_knowledge_base",
    "grade_many",
    "summarise",
    "ComprehensiveGrade",
    "grade_comprehensively",
]


def _normalise_ratio(value: float) -> float:
    ratio = float(value)
    if ratio < 0:
        raise ValueError("ratio must be non-negative")
    return ratio


def _coerce_positive(numerator: float, denominator: float) -> float:
    numerator = float(numerator)
    denominator = float(denominator)
    if denominator <= 0:
        raise ValueError("denominator must be positive")
    return numerator / denominator


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, value))


def _composite_score(metrics: "KnowledgeBaseMetrics") -> float:
    coverage = _clamp_unit(metrics.coverage_ratio)
    accuracy = _clamp_unit(metrics.accuracy_ratio)
    freshness = _clamp_unit(1.0 - metrics.telemetry_staleness_hours / 72.0)
    governance = _clamp_unit(1.0 - metrics.failed_health_checks / 4.0)
    return (coverage + accuracy + freshness + governance) / 4.0


@dataclass(slots=True)
class KnowledgeBaseMetrics:
    """Observed metrics for a knowledge base health check."""

    coverage_ratio: float
    accuracy_ratio: float
    telemetry_staleness_hours: float
    failed_health_checks: int = 0

    def __post_init__(self) -> None:
        self.coverage_ratio = _normalise_ratio(self.coverage_ratio)
        self.accuracy_ratio = _normalise_ratio(self.accuracy_ratio)
        self.telemetry_staleness_hours = float(self.telemetry_staleness_hours)
        if self.telemetry_staleness_hours < 0:
            raise ValueError("telemetry staleness must be non-negative")
        if self.failed_health_checks < 0:
            raise ValueError("failed health checks must be non-negative")
        self.failed_health_checks = int(self.failed_health_checks)

    @classmethod
    def from_counts(
        cls,
        *,
        coverage_present: float,
        coverage_required: float,
        accuracy_passing: float,
        accuracy_sampled: float,
        telemetry_staleness_hours: float,
        failed_health_checks: int = 0,
    ) -> "KnowledgeBaseMetrics":
        coverage_ratio = _coerce_positive(coverage_present, coverage_required)
        accuracy_ratio = _coerce_positive(accuracy_passing, accuracy_sampled)
        return cls(
            coverage_ratio=coverage_ratio,
            accuracy_ratio=accuracy_ratio,
            telemetry_staleness_hours=telemetry_staleness_hours,
            failed_health_checks=failed_health_checks,
        )

    def as_dict(self) -> Mapping[str, float | int]:
        return {
            "coverage_ratio": self.coverage_ratio,
            "accuracy_ratio": self.accuracy_ratio,
            "telemetry_staleness_hours": self.telemetry_staleness_hours,
            "failed_health_checks": self.failed_health_checks,
        }

    def composite_score(self) -> float:
        """Return the composite proficiency score for the metrics."""

        return _composite_score(self)


@dataclass(slots=True)
class KnowledgeBaseGrade:
    """Letter-grade classification with remediation guidance."""

    letter: str
    band: str
    rationale: str
    remediation: str
    proficiency_level: str
    proficiency_label: str
    proficiency_narrative: str

    def as_dict(self) -> Mapping[str, str]:
        return {
            "letter": self.letter,
            "band": self.band,
            "rationale": self.rationale,
            "remediation": self.remediation,
            "proficiency_level": self.proficiency_level,
            "proficiency_label": self.proficiency_label,
            "proficiency_narrative": self.proficiency_narrative,
        }


@dataclass(slots=True)
class ComprehensiveGrade:
    """Aggregate grading outcome across multiple domains."""

    grade: KnowledgeBaseGrade
    metrics: KnowledgeBaseMetrics
    domain_grades: Mapping[str, KnowledgeBaseGrade]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "grade": self.grade.as_dict(),
            "metrics": self.metrics.as_dict(),
            "domain_grades": {
                name: grade.as_dict() for name, grade in self.domain_grades.items()
            },
        }


@dataclass(frozen=True, slots=True)
class _GradeRule:
    band: str
    letter: str
    coverage_min: float
    accuracy_min: float
    staleness_max: float
    failed_checks_max: int
    rationale: str
    remediation: str


_RULES: tuple[_GradeRule, ...] = (
    _GradeRule(
        band="A / A-",
        letter="A",
        coverage_min=0.95,
        accuracy_min=0.95,
        staleness_max=24.0,
        failed_checks_max=0,
        rationale="Catalogue is effectively complete with fresh telemetry and near-perfect sample accuracy.",
        remediation="Continue spot-audits and archive exemplars for future training cycles.",
    ),
    _GradeRule(
        band="B range",
        letter="B",
        coverage_min=0.88,
        accuracy_min=0.85,
        staleness_max=48.0,
        failed_checks_max=1,
        rationale="Minor catalogue gaps or sample corrections required; governance signals remain timely.",
        remediation="Patch missing assets, document fixes, and schedule follow-up validation.",
    ),
    _GradeRule(
        band="C range",
        letter="C",
        coverage_min=0.75,
        accuracy_min=0.70,
        staleness_max=72.0,
        failed_checks_max=3,
        rationale="Multiple datasets missing or stale; repeated governance warnings demand focused recovery.",
        remediation="Launch incident review, rebuild missing mirrors, and assign owners for corrective work.",
    ),
)

_DEFAULT_REMEDIATION = "Escalate to domain leads, freeze dependent automations, and rebuild the knowledge base slice before release."


def grade_knowledge_base(metrics: KnowledgeBaseMetrics) -> KnowledgeBaseGrade:
    """Classify metrics into a grade band following the rubric."""

    classification = classify_proficiency(
        _composite_score(metrics),
        coverage=_clamp_unit(metrics.coverage_ratio),
    )

    for rule in _RULES:
        if (
            metrics.coverage_ratio >= rule.coverage_min
            and metrics.accuracy_ratio >= rule.accuracy_min
            and metrics.telemetry_staleness_hours <= rule.staleness_max
            and metrics.failed_health_checks <= rule.failed_checks_max
        ):
            return KnowledgeBaseGrade(
                letter=rule.letter,
                band=rule.band,
                rationale=rule.rationale,
                remediation=rule.remediation,
                proficiency_level=classification.level,
                proficiency_label=classification.label,
                proficiency_narrative=classification.narrative,
            )
    return KnowledgeBaseGrade(
        letter="D",
        band="D or lower",
        rationale="Coverage, accuracy, or governance signals fall below minimum service expectations.",
        remediation=_DEFAULT_REMEDIATION,
        proficiency_level=classification.level,
        proficiency_label=classification.label,
        proficiency_narrative=classification.narrative,
    )


def grade_many(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
) -> Mapping[str, KnowledgeBaseGrade]:
    """Grade multiple knowledge bases at once."""

    return {
        domain: grade_knowledge_base(metrics)
        for domain, metrics in domain_metrics.items()
    }


def summarise(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    *,
    precomputed_grades: Mapping[str, KnowledgeBaseGrade] | None = None,
) -> list[tuple[str, KnowledgeBaseGrade]]:
    """Return a stable ordering of graded domains for reporting."""

    grade_map = (
        dict(precomputed_grades)
        if precomputed_grades is not None
        else grade_many(domain_metrics)
    )
    return sorted(grade_map.items(), key=lambda item: item[0])


def _normalise_weights(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    weights: Mapping[str, float | int] | None,
) -> Mapping[str, float]:
    if weights is None:
        return {domain: 1.0 for domain in domain_metrics}

    expected = set(domain_metrics)
    normalised: dict[str, float] = {}
    unknown: list[str] = []
    for domain, raw_weight in weights.items():
        if domain not in expected:
            unknown.append(domain)
            continue
        weight = float(raw_weight)
        if weight <= 0:
            raise ValueError("weights must be positive")
        normalised[domain] = weight

    if unknown:
        raise KeyError(
            f"weights provided for unknown domains: {', '.join(sorted(unknown))}"
        )

    missing = expected - normalised.keys()
    if missing:
        raise KeyError(f"missing weight for domain(s): {', '.join(sorted(missing))}")

    return normalised


def _aggregate_metrics(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    weights: Mapping[str, float],
) -> KnowledgeBaseMetrics:
    if not domain_metrics:
        raise ValueError("domain_metrics must not be empty")

    total_weight = fsum(weights[domain] for domain in domain_metrics)
    if total_weight <= 0:
        raise ValueError("weights must sum to a positive value")

    coverage_sum = 0.0
    accuracy_sum = 0.0
    staleness_sum = 0.0
    failed_sum = 0.0

    for domain, metrics in domain_metrics.items():
        weight = weights[domain]
        coverage_sum += metrics.coverage_ratio * weight
        accuracy_sum += metrics.accuracy_ratio * weight
        staleness_sum += metrics.telemetry_staleness_hours * weight
        failed_sum += metrics.failed_health_checks * weight

    return KnowledgeBaseMetrics(
        coverage_ratio=coverage_sum / total_weight,
        accuracy_ratio=accuracy_sum / total_weight,
        telemetry_staleness_hours=staleness_sum / total_weight,
        failed_health_checks=int(round(failed_sum / total_weight)),
    )


def grade_comprehensively(
    domain_metrics: Mapping[str, KnowledgeBaseMetrics],
    *,
    weights: Mapping[str, float | int] | None = None,
    precomputed_grades: Mapping[str, KnowledgeBaseGrade] | None = None,
) -> ComprehensiveGrade:
    """Compute an aggregate grade for a collection of knowledge bases."""

    if not domain_metrics:
        raise ValueError("domain_metrics must not be empty")

    weight_map = _normalise_weights(domain_metrics, weights)
    aggregate_metrics = _aggregate_metrics(domain_metrics, weight_map)
    domain_grades = (
        dict(precomputed_grades)
        if precomputed_grades is not None
        else grade_many(domain_metrics)
    )
    ordered_domain_grades = dict(
        sorted(domain_grades.items(), key=lambda item: item[0])
    )
    aggregate_grade = grade_knowledge_base(aggregate_metrics)

    return ComprehensiveGrade(
        grade=aggregate_grade,
        metrics=aggregate_metrics,
        domain_grades=ordered_domain_grades,
    )
