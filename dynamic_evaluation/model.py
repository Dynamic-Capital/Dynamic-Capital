"""Data model primitives for dynamic evaluation workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "EvaluationCriterion",
    "EvaluationSignal",
    "EvaluationContext",
    "EvaluationSnapshot",
    "EvaluationReport",
]


# ---------------------------------------------------------------------------
# shared helpers


def _utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp."""

    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp *value* into the inclusive ``[lower, upper]`` range."""

    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_key(value: str) -> str:
    cleaned = "-".join(value.strip().lower().split())
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_ordered(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        key = cleaned.lower()
        if key not in seen:
            seen.add(key)
            ordered.append(cleaned)
    return tuple(ordered)


def _freeze_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object]:
    if not mapping:
        return MappingProxyType({})
    if isinstance(mapping, MappingProxyType):
        return mapping
    return MappingProxyType(dict(mapping))


def _dedupe(items: Sequence[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return tuple(ordered)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class EvaluationCriterion:
    """Definition for an evaluation dimension."""

    key: str
    title: str
    description: str = ""
    weight: float = 1.0
    threshold: float = 0.7
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        if self.weight <= 0:
            raise ValueError("weight must be positive")
        self.weight = float(self.weight)
        self.threshold = _clamp(float(self.threshold))
        self.tags = _normalise_tags(self.tags)
        self.metadata = _freeze_mapping(self.metadata)


@dataclass(slots=True)
class EvaluationSignal:
    """Single evaluation data point against a criterion."""

    criterion: str
    score: float
    confidence: float = 0.5
    impact: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    source: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.criterion = _normalise_key(self.criterion)
        self.score = _clamp(self.score)
        self.confidence = _clamp(self.confidence)
        self.impact = _clamp(self.impact)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.notes = _normalise_optional_text(self.notes)
        self.source = _normalise_optional_text(self.source)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _freeze_mapping(self.metadata)


@dataclass(slots=True)
class EvaluationContext:
    """Context describing the evaluation objective and risk posture."""

    objective: str
    timeframe: str | None = None
    risk_tolerance: str = "balanced"
    audience: tuple[str, ...] = field(default_factory=tuple)
    constraints: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.timeframe = _normalise_optional_text(self.timeframe)
        self.risk_tolerance = _normalise_text(self.risk_tolerance).lower()
        self.audience = _normalise_ordered(self.audience)
        self.constraints = _normalise_ordered(self.constraints)
        self.metadata = _freeze_mapping(self.metadata)

    @property
    def is_aggressive(self) -> bool:
        return self.risk_tolerance in {"aggressive", "high"}

    @property
    def is_conservative(self) -> bool:
        return self.risk_tolerance in {"conservative", "low"}


@dataclass(slots=True)
class EvaluationSnapshot:
    """Aggregated perspective for a single evaluation criterion."""

    key: str
    title: str
    threshold: float
    score: float
    confidence: float
    impact: float
    coverage: float
    status: str
    summary: str
    recommendations: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key": self.key,
            "title": self.title,
            "threshold": self.threshold,
            "score": self.score,
            "confidence": self.confidence,
            "impact": self.impact,
            "coverage": self.coverage,
            "status": self.status,
            "summary": self.summary,
            "recommendations": list(self.recommendations),
        }


@dataclass(slots=True)
class EvaluationReport:
    """Overall report for an evaluation cycle."""

    objective: str
    generated_at: datetime
    overall_score: float
    overall_confidence: float
    status: str
    summary: str
    strengths: tuple[str, ...]
    weaknesses: tuple[str, ...]
    focus_areas: tuple[str, ...]
    snapshots: tuple[EvaluationSnapshot, ...]
    metadata: Mapping[str, object]

    def __post_init__(self) -> None:
        self.metadata = _freeze_mapping(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "objective": self.objective,
            "generated_at": self.generated_at.isoformat(),
            "overall_score": self.overall_score,
            "overall_confidence": self.overall_confidence,
            "status": self.status,
            "summary": self.summary,
            "strengths": list(self.strengths),
            "weaknesses": list(self.weaknesses),
            "focus_areas": list(self.focus_areas),
            "snapshots": [snapshot.as_dict() for snapshot in self.snapshots],
            "metadata": dict(self.metadata),
        }

