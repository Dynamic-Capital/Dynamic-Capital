"""Training model generation utilities for Dynamic AGI."""

from __future__ import annotations

import math
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence, Tuple

from .self_improvement import ImprovementSignal, LearningSnapshot

__all__ = [
    "AGITrainingExample",
    "DynamicAGITrainingModel",
    "DynamicAGITrainingModelGenerator",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    if math.isfinite(number):
        return number
    return default


def _direction_score(direction: str) -> float:
    if direction == "positive":
        return 1.0
    if direction == "negative":
        return -1.0
    return 0.0


def _normalise_feedback(feedback: Sequence[str]) -> Tuple[str, ...]:
    cleaned: list[str] = []
    for item in feedback:
        text = str(item).strip()
        if text:
            cleaned.append(text)
    return tuple(cleaned)


def _average(values: Sequence[float]) -> float:
    if not values:
        return 0.0
    return fmean(values)


def _clone_mapping(payload: Mapping[str, Any]) -> Dict[str, Any]:
    cloned: Dict[str, Any] = {}
    for key, value in payload.items():
        key_text = str(key)
        if isinstance(value, Mapping):
            cloned[key_text] = _clone_mapping(value)
        elif isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            cloned[key_text] = [
                _clone_mapping(item) if isinstance(item, Mapping) else item
                for item in value
            ]
        else:
            cloned[key_text] = value
    return cloned


def _normalise_metric_key(
    metric: str,
    *,
    index: int,
    seen: Dict[str, int],
) -> str:
    base = metric.strip().lower()
    if not base:
        base = f"metric_{index}"
    occurrence = seen.get(base, 0)
    seen[base] = occurrence + 1
    if occurrence:
        return f"{base}#{occurrence + 1}"
    return base


def _summarise_signals(
    signals: Sequence[ImprovementSignal],
) -> Dict[str, Dict[str, float]]:
    summary: Dict[str, Dict[str, float]] = {}
    counts: Counter[str] = Counter()
    for signal in signals:
        metric = signal.metric.strip().lower() or "general"
        stats = summary.setdefault(
            metric,
            {"value": 0.0, "direction": 0.0, "weight": 0.0},
        )
        stats["value"] += _safe_float(signal.value)
        stats["direction"] += _direction_score(signal.direction)
        stats["weight"] += _safe_float(signal.weight, default=1.0)
        counts[metric] += 1

    for metric, count in counts.items():
        if count <= 1:
            continue
        stats = summary[metric]
        stats["value"] /= count
        stats["direction"] /= count
        stats["weight"] /= count
    return summary


def _derive_back_to_back_features(
    current: LearningSnapshot,
    previous: LearningSnapshot,
) -> Tuple[Dict[str, float], Dict[str, Any], float]:
    features: Dict[str, float] = {}
    metadata: Dict[str, Any] = {
        "delta_seconds": (
            current.timestamp - previous.timestamp
        ).total_seconds(),
    }
    magnitude_components: list[float] = []

    performance_keys = set(current.performance) | set(previous.performance)
    performance_changes: Dict[str, float] = {}
    for key in sorted(performance_keys):
        current_value = _safe_float(current.performance.get(key))
        previous_value = _safe_float(previous.performance.get(key))
        delta = current_value - previous_value
        features[f"delta::performance::{key}"] = delta
        if delta:
            performance_changes[key] = delta
            magnitude_components.append(abs(delta))

    current_signals = _summarise_signals(current.signals)
    previous_signals = _summarise_signals(previous.signals)
    signal_keys = set(current_signals) | set(previous_signals)
    value_changes: Dict[str, float] = {}
    direction_changes: Dict[str, float] = {}
    weight_changes: Dict[str, float] = {}

    for key in sorted(signal_keys):
        current_stats = current_signals.get(
            key, {"value": 0.0, "direction": 0.0, "weight": 0.0}
        )
        previous_stats = previous_signals.get(
            key, {"value": 0.0, "direction": 0.0, "weight": 0.0}
        )
        delta_value = current_stats["value"] - previous_stats["value"]
        delta_direction = current_stats["direction"] - previous_stats["direction"]
        delta_weight = current_stats["weight"] - previous_stats["weight"]

        features[f"delta::signal::{key}::value"] = delta_value
        features[f"delta::signal::{key}::direction"] = delta_direction
        features[f"delta::signal::{key}::weight"] = delta_weight

        if delta_value:
            value_changes[key] = delta_value
            magnitude_components.append(abs(delta_value))
        if delta_direction:
            direction_changes[key] = delta_direction
            magnitude_components.append(abs(delta_direction))
        if delta_weight:
            weight_changes[key] = delta_weight
            magnitude_components.append(abs(delta_weight))

    magnitude = _average(magnitude_components)
    metadata.update(
        {
            "performance_changes": performance_changes,
            "signal_value_changes": value_changes,
            "signal_direction_changes": direction_changes,
            "signal_weight_changes": weight_changes,
            "magnitude": magnitude,
        }
    )

    return features, metadata, magnitude


@dataclass(slots=True)
class AGITrainingExample:
    """Normalised features and labels derived from a learning snapshot."""

    features: Dict[str, float]
    labels: Dict[str, float]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "features": dict(self.features),
            "labels": dict(self.labels),
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class DynamicAGITrainingModel:
    """Container describing a generated Dynamic AGI training dataset."""

    examples: Tuple[AGITrainingExample, ...]
    feature_names: Tuple[str, ...]
    label_names: Tuple[str, ...]
    summary: Dict[str, Any]
    notes: Optional[str] = None
    generated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        if self.generated_at.tzinfo is None:
            self.generated_at = self.generated_at.replace(tzinfo=timezone.utc)
        else:
            self.generated_at = self.generated_at.astimezone(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "generated_at": self.generated_at.isoformat(),
            "examples": [example.to_dict() for example in self.examples],
            "feature_names": list(self.feature_names),
            "label_names": list(self.label_names),
            "summary": dict(self.summary),
        }
        if self.notes:
            payload["notes"] = self.notes
        return payload


class DynamicAGITrainingModelGenerator:
    """Generate structured training models from learning snapshots."""

    def __init__(
        self,
        *,
        include_feedback: bool = True,
        derive_back_to_back: bool = False,
    ) -> None:
        self.include_feedback = include_feedback
        self.derive_back_to_back = derive_back_to_back

    def generate(
        self,
        snapshots: Iterable[LearningSnapshot],
        *,
        notes: Optional[str] = None,
    ) -> DynamicAGITrainingModel:
        examples: list[AGITrainingExample] = []
        feature_names: set[str] = set()
        label_names: set[str] = set()
        performance_scores: list[float] = []
        direction_histogram: Counter[str] = Counter()
        transition_magnitudes: list[float] = []
        back_to_back_pairs = 0
        previous_snapshot: Optional[LearningSnapshot] = None

        for snapshot in snapshots:
            example = self._example_from_snapshot(
                snapshot,
                previous_snapshot=previous_snapshot,
            )
            examples.append(example)
            feature_names.update(example.features.keys())
            label_names.update(example.labels.keys())
            score = example.metadata.get("performance_score")
            if isinstance(score, (int, float)):
                performance_scores.append(float(score))
            for label_value in example.labels.values():
                if label_value > 0:
                    direction_histogram["positive"] += 1
                elif label_value < 0:
                    direction_histogram["negative"] += 1
                else:
                    direction_histogram["neutral"] += 1

            if self.derive_back_to_back and previous_snapshot is not None:
                back_to_back_pairs += 1
                transition = example.metadata.get("transition_magnitude")
                if isinstance(transition, (int, float)):
                    transition_magnitudes.append(float(transition))

            previous_snapshot = snapshot

        summary = {
            "example_count": len(examples),
            "feature_count": len(feature_names),
            "label_count": len(label_names),
            "average_performance_score": _average(performance_scores),
            "direction_histogram": dict(direction_histogram),
        }

        if self.derive_back_to_back:
            if not back_to_back_pairs and len(examples) > 1:
                back_to_back_pairs = len(examples) - 1
            summary["back_to_back_pairs"] = back_to_back_pairs
            summary["average_back_to_back_magnitude"] = _average(
                transition_magnitudes
            )
        else:
            summary["back_to_back_pairs"] = 0
            summary["average_back_to_back_magnitude"] = 0.0

        return DynamicAGITrainingModel(
            examples=tuple(examples),
            feature_names=tuple(sorted(feature_names)),
            label_names=tuple(sorted(label_names)),
            summary=summary,
            notes=notes,
        )

    def _example_from_snapshot(
        self,
        snapshot: LearningSnapshot,
        *,
        previous_snapshot: Optional[LearningSnapshot] = None,
    ) -> AGITrainingExample:
        features: Dict[str, float] = {}
        labels: Dict[str, float] = {}
        seen_metrics: Dict[str, int] = {}

        for key, value in snapshot.performance.items():
            feature_key = f"performance::{str(key)}"
            features[feature_key] = _safe_float(value)

        average_performance = _average(
            [_safe_float(value) for value in snapshot.performance.values()]
        )

        for index, signal in enumerate(snapshot.signals, start=1):
            metric_key = _normalise_metric_key(
                signal.metric,
                index=index,
                seen=seen_metrics,
            )
            features[f"signal::{metric_key}::value"] = _safe_float(signal.value)
            features[f"signal::{metric_key}::weight"] = _safe_float(
                signal.weight,
                default=1.0,
            )
            direction_key = f"signal::{metric_key}::direction"
            score = _direction_score(signal.direction)
            features[direction_key] = score
            labels[direction_key] = score

        metadata: Dict[str, Any] = {
            "timestamp": snapshot.timestamp.astimezone(timezone.utc).isoformat(),
            "performance_score": average_performance,
            "feedback_count": len(snapshot.feedback),
            "signals_observed": [signal.metric for signal in snapshot.signals],
        }

        if self.include_feedback:
            metadata["feedback"] = list(_normalise_feedback(snapshot.feedback))

        if snapshot.awareness_report is not None:
            metadata["awareness_report"] = _clone_mapping(snapshot.awareness_report)
        if snapshot.metacognition_report is not None:
            metadata["metacognition_report"] = _clone_mapping(snapshot.metacognition_report)

        if self.derive_back_to_back and previous_snapshot is not None:
            (
                delta_features,
                transition_metadata,
                magnitude,
            ) = _derive_back_to_back_features(snapshot, previous_snapshot)
            features.update(delta_features)
            if transition_metadata:
                metadata["back_to_back"] = transition_metadata
            metadata["transition_magnitude"] = magnitude
        elif self.derive_back_to_back:
            metadata["transition_magnitude"] = 0.0

        return AGITrainingExample(
            features=features,
            labels=labels,
            metadata=metadata,
        )
