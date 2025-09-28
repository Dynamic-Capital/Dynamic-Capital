"""Dynamic trainer orchestration heuristics."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableSequence, Sequence

__all__ = [
    "TrainingSignal",
    "TrainerContext",
    "DynamicTrainerModel",
    "DynamicTrainerEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    normalised = value.strip()
    if not normalised:
        raise ValueError("text must not be empty")
    return normalised


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# dataclass definitions
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class TrainingSignal:
    """Observation captured from a single training cycle."""

    run_label: str
    dataset_rows: int
    accuracy: float
    loss: float
    throughput: float
    stability: float
    compute_efficiency: float
    label_quality: float
    energy: float = 0.5
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.run_label = _normalise_text(self.run_label)
        if self.dataset_rows <= 0:
            raise ValueError("dataset_rows must be positive")
        self.dataset_rows = int(self.dataset_rows)
        self.accuracy = _clamp(float(self.accuracy))
        self.loss = max(float(self.loss), 0.0)
        self.throughput = max(float(self.throughput), 0.0)
        self.stability = _clamp(float(self.stability))
        self.compute_efficiency = _clamp(float(self.compute_efficiency))
        self.label_quality = _clamp(float(self.label_quality))
        self.energy = _clamp(float(self.energy))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.tags = _normalise_tuple(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def quality_score(self) -> float:
        loss_penalty = 1.0 - min(self.loss / 5.0, 1.0)
        return _clamp((self.accuracy * 0.7) + (loss_penalty * 0.3))


@dataclass(slots=True)
class TrainerContext:
    """Desired targets and guardrails for a training campaign."""

    objective: str
    target_accuracy: float = 0.85
    max_loss: float = 0.6
    min_throughput: float = 32.0
    stability_threshold: float = 0.65
    efficiency_target: float = 0.7
    max_hours: float = 12.0
    autopilot_enabled: bool = False
    emphasis: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.objective = _normalise_text(self.objective)
        self.target_accuracy = _clamp(float(self.target_accuracy))
        if self.max_loss <= 0:
            raise ValueError("max_loss must be positive")
        self.max_loss = float(self.max_loss)
        self.min_throughput = max(float(self.min_throughput), 0.0)
        self.stability_threshold = _clamp(float(self.stability_threshold))
        self.efficiency_target = _clamp(float(self.efficiency_target))
        self.max_hours = max(float(self.max_hours), 0.0)
        self.emphasis = _normalise_tuple(self.emphasis)


@dataclass(slots=True)
class DynamicTrainerModel:
    """Synthesised readiness model for the trainer stack."""

    readiness: float
    confidence: float
    quality: float
    efficiency: float
    focus_areas: tuple[str, ...]
    advisories: tuple[str, ...]
    recommended_actions: tuple[str, ...]
    sample_size: int
    metadata: Mapping[str, object] | None = None


# ---------------------------------------------------------------------------
# engine implementation
# ---------------------------------------------------------------------------


class DynamicTrainerEngine:
    """Aggregates training signals into a deployment readiness model."""

    def __init__(self, *, window: int = 60) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._signals: Deque[TrainingSignal] = deque(maxlen=window)

    @property
    def window(self) -> int:
        return self._window

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._signals)

    def register(self, signal: TrainingSignal) -> None:
        """Register a signal emitted from a training run."""

        self._signals.append(signal)

    def extend(self, signals: Iterable[TrainingSignal]) -> None:
        """Register multiple signals while preserving ordering."""

        for signal in signals:
            self.register(signal)

    def clear(self) -> None:
        """Reset the rolling window of signals."""

        self._signals.clear()

    def summarise(self, context: TrainerContext) -> DynamicTrainerModel:
        """Create a readiness model based on the observed signals."""

        if not self._signals:
            raise ValueError("no training signals registered")

        weighted: MutableSequence[tuple[TrainingSignal, float]] = []
        for signal in self._signals:
            weight = max(signal.weight, 0.0)
            weighted.append((signal, weight))

        total_weight = sum(weight for _, weight in weighted) or 1.0

        def _weighted_average(
            extractor: Callable[[TrainingSignal], float], *, default: float
        ) -> float:
            if total_weight == 0:
                return default
            numerator = sum(extractor(signal) * weight for signal, weight in weighted)
            return numerator / total_weight

        avg_accuracy = _weighted_average(lambda s: s.accuracy, default=0.0)
        avg_loss = _weighted_average(lambda s: s.loss, default=context.max_loss)
        avg_throughput = _weighted_average(lambda s: s.throughput, default=0.0)
        avg_stability = _weighted_average(lambda s: s.stability, default=0.5)
        avg_efficiency = _weighted_average(lambda s: s.compute_efficiency, default=0.5)
        avg_label_quality = _weighted_average(lambda s: s.label_quality, default=0.5)
        avg_energy = _weighted_average(lambda s: s.energy, default=0.5)
        avg_quality = _weighted_average(lambda s: s.quality_score, default=0.5)

        quality_component = _clamp(
            (avg_accuracy / context.target_accuracy) if context.target_accuracy else avg_accuracy
        )
        loss_component = _clamp(1.0 - min(avg_loss / context.max_loss, 1.0))
        quality_score = _clamp((quality_component * 0.7) + (loss_component * 0.3))

        throughput_component = (
            avg_throughput / context.min_throughput if context.min_throughput else 1.0
        )
        efficiency_score = _clamp((throughput_component * 0.6) + (avg_efficiency * 0.4))

        readiness = _clamp(
            (quality_score * 0.45)
            + (efficiency_score * 0.2)
            + (avg_stability * 0.2)
            + (avg_label_quality * 0.1)
            + (avg_energy * 0.05)
        )

        confidence = _clamp(
            (avg_stability * 0.5)
            + (avg_label_quality * 0.3)
            + (loss_component * 0.2)
        )

        focus: list[str] = []
        if avg_accuracy < context.target_accuracy * 0.98:
            focus.append("elevate accuracy via dataset and objective tuning")
        if avg_loss > context.max_loss:
            focus.append("tighten regularisation to compress loss trajectory")
        if context.min_throughput and avg_throughput < context.min_throughput:
            focus.append("improve throughput with batching or hardware scaling")
        if avg_efficiency < context.efficiency_target:
            focus.append("optimise compute allocation for higher efficiency")
        if avg_stability < context.stability_threshold:
            focus.append("stabilise training dynamics with scheduler adjustments")

        advisories: list[str] = []
        if context.autopilot_enabled:
            advisories.append(
                "Autopilot mode active; validate guardrails before promotion."
            )
        if context.max_hours and avg_energy > 0.85:
            advisories.append(
                "Energy utilisation trending high; monitor budget alignment."
            )
        if context.emphasis:
            advisories.append(
                "Priority themes: " + ", ".join(context.emphasis)
            )

        recommended: list[str] = []
        if readiness >= 0.75 and quality_score >= 0.7 and avg_stability >= 0.7:
            recommended.append("Promote candidate checkpoint for evaluation gate")
        if focus:
            recommended.append("Address focus areas before scaling training footprint")
        if not recommended:
            recommended.append("Maintain cadence and continue telemetry capture")

        metadata = {
            "averages": {
                "accuracy": avg_accuracy,
                "loss": avg_loss,
                "throughput": avg_throughput,
                "stability": avg_stability,
                "efficiency": avg_efficiency,
                "label_quality": avg_label_quality,
                "energy": avg_energy,
                "quality": avg_quality,
            },
            "window": self._window,
            "samples": len(self._signals),
        }

        return DynamicTrainerModel(
            readiness=readiness,
            confidence=confidence,
            quality=quality_score,
            efficiency=efficiency_score,
            focus_areas=tuple(focus),
            advisories=tuple(advisories),
            recommended_actions=tuple(recommended),
            sample_size=len(self._signals),
            metadata=metadata,
        )
