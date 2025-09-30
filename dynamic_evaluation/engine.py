"""Dynamic evaluation orchestration primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "EvaluationCriterion",
    "EvaluationSignal",
    "EvaluationContext",
    "EvaluationSnapshot",
    "EvaluationReport",
    "DynamicEvaluationEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
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


def _ensure_mapping(mapping: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if mapping is None:
        return {}
    if isinstance(mapping, Mapping):
        return dict(mapping)
    raise TypeError("metadata must be a mapping")


def _freeze_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object]:
    if not mapping:
        return MappingProxyType({})
    if isinstance(mapping, MappingProxyType):
        return mapping
    return MappingProxyType(dict(mapping))


def _dedupe(items: Iterable[str]) -> tuple[str, ...]:
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


# ---------------------------------------------------------------------------
# engine implementation


class DynamicEvaluationEngine:
    """Coordinate evaluation signals and generate aggregate reports."""

    def __init__(
        self,
        criteria: Sequence[EvaluationCriterion],
        *,
        history: int = 200,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if not criteria:
            raise ValueError("at least one criterion must be provided")
        self._history = history
        self._signals: Deque[EvaluationSignal] = deque(maxlen=history)
        self._criteria: dict[str, EvaluationCriterion] = {}
        self._order: list[str] = []
        for criterion in criteria:
            key = criterion.key
            if key in self._criteria:
                raise ValueError(f"duplicate criterion key: {key}")
            self._criteria[key] = criterion
            self._order.append(key)

    # ------------------------------------------------------------------ ingest
    def capture(self, signal: EvaluationSignal | Mapping[str, object]) -> EvaluationSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[EvaluationSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    # ----------------------------------------------------------------- accessors
    @property
    def criteria(self) -> tuple[EvaluationCriterion, ...]:
        return tuple(self._criteria[key] for key in self._order)

    @property
    def signals(self) -> tuple[EvaluationSignal, ...]:
        return tuple(self._signals)

    # ------------------------------------------------------------------ reporting
    def build_report(self, context: EvaluationContext) -> EvaluationReport:
        if not self._signals:
            raise RuntimeError("no evaluation signals captured")

        snapshots: list[EvaluationSnapshot] = [
            self._snapshot_for(self._criteria[key]) for key in self._order
        ]
        considered = [snapshot for snapshot in snapshots if snapshot.coverage > 0]
        if not considered:
            raise RuntimeError("evaluation has no coverage for configured criteria")

        overall_score, overall_confidence = self._aggregate_overall(considered)
        status = self._overall_status(overall_score, overall_confidence, context)
        summary = self._build_summary(context, overall_score, overall_confidence, status)
        strengths = self._identify_strengths(considered)
        weaknesses = self._identify_weaknesses(considered)
        focus_areas = self._derive_focus_areas(snapshots)
        metadata = self._build_metadata(context)

        return EvaluationReport(
            objective=context.objective,
            generated_at=_utcnow(),
            overall_score=round(overall_score, 4),
            overall_confidence=round(overall_confidence, 4),
            status=status,
            summary=summary,
            strengths=strengths,
            weaknesses=weaknesses,
            focus_areas=focus_areas,
            snapshots=tuple(snapshots),
            metadata=metadata,
        )

    # ----------------------------------------------------------------- internals
    def _coerce_signal(self, signal: EvaluationSignal | Mapping[str, object]) -> EvaluationSignal:
        if isinstance(signal, EvaluationSignal):
            resolved = signal
        elif isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            resolved = EvaluationSignal(**payload)  # type: ignore[arg-type]
        else:
            raise TypeError("signal must be EvaluationSignal or mapping")

        if resolved.criterion not in self._criteria:
            raise KeyError(f"unknown evaluation criterion: {resolved.criterion}")
        return resolved

    def _signals_for(self, criterion_key: str) -> list[EvaluationSignal]:
        return [signal for signal in self._signals if signal.criterion == criterion_key]

    def _snapshot_for(self, criterion: EvaluationCriterion) -> EvaluationSnapshot:
        signals = self._signals_for(criterion.key)
        if not signals:
            recommendations = (f"Capture evaluation signals for {criterion.title}.",)
            return EvaluationSnapshot(
                key=criterion.key,
                title=criterion.title,
                threshold=criterion.threshold,
                score=0.0,
                confidence=0.0,
                impact=0.0,
                coverage=0.0,
                status="no_data",
                summary=f"No evaluation signals recorded for {criterion.title}.",
                recommendations=recommendations,
            )

        coverage = _clamp(len(signals) / 5.0)
        weights = [
            max(signal.confidence, 0.05) * (0.5 + 0.5 * signal.impact)
            for signal in signals
        ]
        total_weight = sum(weights)
        if total_weight == 0:
            score = fmean(signal.score for signal in signals)
        else:
            score = sum(signal.score * weight for signal, weight in zip(signals, weights)) / total_weight
        score = _clamp(score)
        confidence = fmean(signal.confidence for signal in signals)
        impact = fmean(signal.impact for signal in signals)
        status = self._status_for_snapshot(score, confidence, coverage, criterion)
        summary = self._snapshot_summary(criterion, score, confidence, coverage, status)
        recommendations = self._snapshot_recommendations(
            criterion, status, confidence, coverage, impact
        )
        return EvaluationSnapshot(
            key=criterion.key,
            title=criterion.title,
            threshold=criterion.threshold,
            score=round(score, 4),
            confidence=round(confidence, 4),
            impact=round(impact, 4),
            coverage=round(coverage, 4),
            status=status,
            summary=summary,
            recommendations=recommendations,
        )

    def _status_for_snapshot(
        self,
        score: float,
        confidence: float,
        coverage: float,
        criterion: EvaluationCriterion,
    ) -> str:
        if coverage == 0:
            return "no_data"
        if coverage < 0.2 or confidence < 0.35:
            return "insufficient"
        exceeding_threshold = min(1.0, criterion.threshold + 0.1)
        if score >= exceeding_threshold and confidence >= 0.45:
            return "exceeding"
        if score >= criterion.threshold:
            return "on_track"
        if score >= max(0.0, criterion.threshold - 0.1):
            return "watch"
        return "at_risk"

    def _snapshot_summary(
        self,
        criterion: EvaluationCriterion,
        score: float,
        confidence: float,
        coverage: float,
        status: str,
    ) -> str:
        return (
            f"{criterion.title} scored {int(round(score * 100))}% "
            f"(threshold {int(round(criterion.threshold * 100))}%). "
            f"Confidence {int(round(confidence * 100))}% with {int(round(coverage * 100))}% coverage. "
            f"Status: {status.replace('_', ' ')}."
        )

    def _snapshot_recommendations(
        self,
        criterion: EvaluationCriterion,
        status: str,
        confidence: float,
        coverage: float,
        impact: float,
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        title = criterion.title
        threshold_pct = int(round(criterion.threshold * 100))

        if status == "no_data":
            recommendations.append(f"Capture evaluation signals for {title}.")
        elif status == "insufficient":
            recommendations.append(
                f"Improve evidence quality for {title} to raise confidence and coverage."
            )
        elif status in {"at_risk", "watch"}:
            recommendations.append(
                f"Prioritise corrective plan for {title} to reach the {threshold_pct}% threshold."
            )
        elif status == "on_track" and coverage < 0.6:
            recommendations.append(
                f"Expand sampling for {title} to solidify progress."
            )
        elif status == "exceeding":
            recommendations.append(
                f"Document sustaining practices keeping {title.lower()} strong."
            )

        if confidence < 0.55 and status not in {"no_data"}:
            recommendations.append("Gather additional evidence to lift evaluation confidence.")
        if coverage < 0.4 and status not in {"no_data"}:
            recommendations.append("Increase signal collection cadence for richer coverage.")
        if impact >= 0.7 and status in {"watch", "at_risk"}:
            recommendations.append(
                f"Address high-impact risks linked to {title.lower()} before expansion."
            )

        if not recommendations:
            recommendations.append("Maintain steady evaluation cadence.")
        return _dedupe(recommendations)

    def _aggregate_overall(
        self, snapshots: Sequence[EvaluationSnapshot]
    ) -> tuple[float, float]:
        weights: list[float] = []
        for snapshot in snapshots:
            criterion = self._criteria[snapshot.key]
            weight = criterion.weight * (0.2 + 0.8 * snapshot.coverage)
            weights.append(weight)
        total_weight = sum(weights)
        if total_weight <= 0:
            total_weight = float(len(snapshots))
            weights = [1.0] * len(snapshots)
        overall_score = sum(
            snapshot.score * weight for snapshot, weight in zip(snapshots, weights)
        ) / total_weight
        overall_confidence = sum(
            snapshot.confidence * weight for snapshot, weight in zip(snapshots, weights)
        ) / total_weight
        return overall_score, overall_confidence

    def _overall_status(
        self,
        overall_score: float,
        overall_confidence: float,
        context: EvaluationContext,
    ) -> str:
        if overall_confidence < 0.4:
            return "uncertain"

        if context.is_conservative:
            healthy_cutoff = 0.85
            watch_cutoff = 0.75
        elif context.is_aggressive:
            healthy_cutoff = 0.76
            watch_cutoff = 0.62
        else:
            healthy_cutoff = 0.8
            watch_cutoff = 0.68

        if overall_score >= healthy_cutoff:
            return "healthy"
        if overall_score >= watch_cutoff:
            return "focused_watch"
        return "critical"

    def _build_summary(
        self,
        context: EvaluationContext,
        overall_score: float,
        overall_confidence: float,
        status: str,
    ) -> str:
        timeframe = f" within {context.timeframe}" if context.timeframe else ""
        risk = context.risk_tolerance.replace("_", " ")
        return (
            f"Objective '{context.objective}'{timeframe}. "
            f"Overall score {int(round(overall_score * 100))}% with {int(round(overall_confidence * 100))}% confidence. "
            f"Risk posture {risk}; status {status.replace('_', ' ')}."
        )

    def _identify_strengths(
        self, snapshots: Sequence[EvaluationSnapshot]
    ) -> tuple[str, ...]:
        strengths = [
            snapshot.title
            for snapshot in snapshots
            if snapshot.status in {"exceeding", "on_track"}
            and snapshot.score >= snapshot.threshold
        ]
        return _dedupe(strengths)

    def _identify_weaknesses(
        self, snapshots: Sequence[EvaluationSnapshot]
    ) -> tuple[str, ...]:
        weaknesses = [
            snapshot.title
            for snapshot in snapshots
            if snapshot.status in {"watch", "at_risk"}
        ]
        return _dedupe(weaknesses)

    def _derive_focus_areas(
        self, snapshots: Sequence[EvaluationSnapshot]
    ) -> tuple[str, ...]:
        actions: list[str] = []
        for snapshot in snapshots:
            if snapshot.status in {"watch", "at_risk", "insufficient"}:
                actions.extend(snapshot.recommendations)
        if not actions:
            for snapshot in snapshots:
                if snapshot.status not in {"no_data"}:
                    actions.extend(snapshot.recommendations)
                    break
        return _dedupe(actions)[:5]

    def _build_metadata(self, context: EvaluationContext) -> Mapping[str, object]:
        metadata: MutableMapping[str, object] = dict(context.metadata)
        metadata.setdefault("risk_tolerance", context.risk_tolerance)
        if context.timeframe is not None:
            metadata.setdefault("timeframe", context.timeframe)
        if context.audience:
            metadata.setdefault("audience", list(context.audience))
        if context.constraints:
            metadata.setdefault("constraints", list(context.constraints))
        return _freeze_mapping(metadata)
