"""Domain models supporting the dynamic grading framework."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Mapping

__all__ = [
    "GradingCriterion",
    "GradingSignal",
    "GradingSnapshot",
    "GradingReport",
    "_clamp",
    "_normalise_key",
    "_utcnow",
]


def _utcnow() -> datetime:
    """Return the current UTC timestamp."""

    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp *value* to the inclusive range ``[lower, upper]``."""

    return max(lower, min(upper, float(value)))


def _normalise_key(value: str) -> str:
    """Normalise identifier-like keys."""

    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("key must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive programming
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class GradingCriterion:
    """Descriptor for a rubric component that may be dynamically reweighted."""

    key: str
    title: str
    baseline_weight: float
    description: str = ""
    min_weight: float = 0.0
    max_weight: float = 1.0
    target_mastery: float = 0.75
    learning_rate: float = 0.25
    tolerance: float = 0.05
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        self.min_weight = max(0.0, float(self.min_weight))
        self.max_weight = max(self.min_weight, float(self.max_weight))
        self.baseline_weight = _clamp(
            float(self.baseline_weight), lower=self.min_weight, upper=self.max_weight
        )
        self.target_mastery = _clamp(self.target_mastery)
        self.learning_rate = _clamp(self.learning_rate)
        self.tolerance = _clamp(self.tolerance)
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class GradingSignal:
    """Observed mastery signal for a particular grading criterion."""

    criterion: str
    mastery: float
    sample_size: int = 1
    timestamp: datetime = field(default_factory=_utcnow)
    cohort: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.criterion = _normalise_key(self.criterion)
        self.mastery = _clamp(self.mastery)
        self.sample_size = max(0, int(self.sample_size))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.cohort = self.cohort.strip() or None if self.cohort else None
        self.metadata = _coerce_metadata(self.metadata)


@dataclass(slots=True)
class GradingSnapshot:
    """Aggregated perspective for a grading criterion."""

    key: str
    title: str
    baseline_weight: float
    recommended_weight: float
    mastery: float
    coverage: float
    status: str
    summary: str
    adjustments: tuple[str, ...]
    warnings: tuple[str, ...]


@dataclass(slots=True)
class GradingReport:
    """Holistic report summarising grading posture across criteria."""

    objective: str
    generated_at: datetime
    overall_mastery: float
    mean_coverage: float
    summary: str
    snapshots: tuple[GradingSnapshot, ...]
    recommended_weights: Mapping[str, float]
    alerts: tuple[str, ...]
    metadata: Mapping[str, object] | None = None

    def to_dict(self) -> dict[str, object]:
        """Return a JSON-serialisable representation of the report."""

        return {
            "objective": self.objective,
            "generated_at": self.generated_at.isoformat(),
            "overall_mastery": self.overall_mastery,
            "mean_coverage": self.mean_coverage,
            "summary": self.summary,
            "snapshots": [
                {
                    "key": snapshot.key,
                    "title": snapshot.title,
                    "baseline_weight": snapshot.baseline_weight,
                    "recommended_weight": snapshot.recommended_weight,
                    "mastery": snapshot.mastery,
                    "coverage": snapshot.coverage,
                    "status": snapshot.status,
                    "summary": snapshot.summary,
                    "adjustments": list(snapshot.adjustments),
                    "warnings": list(snapshot.warnings),
                }
                for snapshot in self.snapshots
            ],
            "recommended_weights": dict(self.recommended_weights),
            "alerts": list(self.alerts),
            "metadata": dict(self.metadata) if self.metadata else None,
        }
