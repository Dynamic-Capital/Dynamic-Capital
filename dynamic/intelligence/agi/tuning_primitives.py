"""Shared primitives for benchmark-guided fine-tuning routines."""

from __future__ import annotations

from typing import Mapping

from dynamic_benchmark.gradebook import KnowledgeBaseMetrics

__all__ = [
    "DEFAULT_COVERAGE_TARGET",
    "DEFAULT_ACCURACY_TARGET",
    "DEFAULT_STALENESS_TARGET",
    "DEFAULT_FAILED_CHECKS_TARGET",
    "clamp",
    "compute_deficits",
    "focus_metric",
    "priority_multiplier_from_severity",
    "quality_floor_from_severity",
    "severity_from_grade",
    "severity_label",
]


DEFAULT_COVERAGE_TARGET = 0.95
DEFAULT_ACCURACY_TARGET = 0.95
DEFAULT_STALENESS_TARGET = 24.0
DEFAULT_FAILED_CHECKS_TARGET = 0

_GRADE_SEVERITY = {
    "A": 0.0,
    "B": 0.35,
    "C": 0.65,
    "D": 0.85,
}


def clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` into the inclusive ``[lower, upper]`` interval."""

    return max(lower, min(upper, value))


def severity_from_grade(letter: str) -> float:
    """Map a grade letter into a ``[0, 1]`` severity score."""

    return _GRADE_SEVERITY.get(letter.upper(), 0.5)


def severity_label(severity: float) -> str:
    """Human friendly label for the numeric severity value."""

    if severity >= 0.7:
        return "high"
    if severity >= 0.4:
        return "medium"
    return "low"


def quality_floor_from_severity(minimum_quality: float, severity: float) -> float:
    """Raise the quality floor based on the domain severity."""

    baseline = max(minimum_quality, 0.55 + (severity * 0.4))
    return clamp(baseline)


def priority_multiplier_from_severity(severity: float) -> float:
    """Boost dataset priority as severity increases."""

    return 1.0 + (severity * 0.75)


def compute_deficits(
    metrics: KnowledgeBaseMetrics,
    *,
    coverage_target: float = DEFAULT_COVERAGE_TARGET,
    accuracy_target: float = DEFAULT_ACCURACY_TARGET,
    staleness_target: float = DEFAULT_STALENESS_TARGET,
    failed_checks_target: int = DEFAULT_FAILED_CHECKS_TARGET,
) -> Mapping[str, float]:
    """Compute normalised deficit ratios for the provided metrics."""

    coverage_gap = max(0.0, coverage_target - metrics.coverage_ratio)
    accuracy_gap = max(0.0, accuracy_target - metrics.accuracy_ratio)
    staleness_gap = max(0.0, metrics.telemetry_staleness_hours - staleness_target)
    governance_gap = max(0.0, float(metrics.failed_health_checks - failed_checks_target))

    return {
        "coverage_gap_ratio": clamp(coverage_gap / coverage_target) if coverage_target else 0.0,
        "accuracy_gap_ratio": clamp(accuracy_gap / accuracy_target) if accuracy_target else 0.0,
        "staleness_gap_ratio": clamp(
            staleness_gap / max(staleness_target, 1.0)
        ),
        "governance_gap_ratio": clamp(governance_gap / 3.0),
    }


def focus_metric(deficits: Mapping[str, float]) -> str:
    """Return the deficit that should receive first attention."""

    if not deficits:
        return "coverage"
    key, _ = max(deficits.items(), key=lambda item: item[1])
    if key.startswith("coverage"):
        return "coverage"
    if key.startswith("accuracy"):
        return "accuracy"
    if key.startswith("staleness"):
        return "staleness"
    return "governance"

