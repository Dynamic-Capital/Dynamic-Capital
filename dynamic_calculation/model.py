"""High-level dynamic calculation model orchestrating signals and formulas."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from .engine import (
    CalculationFormula,
    CalculationResult,
    CalculationSignal,
    DynamicCalculationEngine,
)

__all__ = [
    "CalculationModelMetric",
    "CalculationModelMetricInsight",
    "CalculationModelInsight",
    "DynamicCalculationModel",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str, *, name: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be a string")
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{name} must not be empty")
    if not cleaned.replace("_", "").replace("-", "").isalnum():
        raise ValueError(
            f"{name} must contain only alphanumeric characters, hyphens, or underscores"
        )
    return cleaned.replace("-", "_").lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_weight(value: float, *, name: str) -> float:
    try:
        weight = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be a real number") from exc
    return max(weight, 0.0)


def _coerce_float(value: float | None) -> float | None:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("target values must be numeric") from exc
    return number


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


# ---------------------------------------------------------------------------
# public dataclasses


@dataclass(slots=True)
class CalculationModelMetric:
    """Metric definition that maps to a calculation formula."""

    name: str
    weight: float = 1.0
    lower_target: float | None = None
    upper_target: float | None = None
    description: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name, name="name")
        self.weight = _normalise_weight(self.weight, name="weight")
        self.lower_target = _coerce_float(self.lower_target)
        self.upper_target = _coerce_float(self.upper_target)
        if (
            self.lower_target is not None
            and self.upper_target is not None
            and self.lower_target > self.upper_target
        ):
            raise ValueError("lower_target must be <= upper_target")
        self.description = _normalise_optional_text(self.description)
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "weight": self.weight,
            "lower_target": self.lower_target,
            "upper_target": self.upper_target,
            "description": self.description,
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class CalculationModelMetricInsight:
    """Insightful view of a metric after model evaluation."""

    name: str
    value: float
    weight: float
    score: float
    status: str
    variables: Mapping[str, float]
    weighted_contributions: Mapping[str, float]
    missing_variables: tuple[str, ...]
    metadata: Mapping[str, object] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "value": self.value,
            "weight": self.weight,
            "score": self.score,
            "status": self.status,
            "variables": dict(self.variables),
            "weighted_contributions": dict(self.weighted_contributions),
            "missing_variables": list(self.missing_variables),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class CalculationModelInsight:
    """Aggregated outcome produced by the calculation model."""

    name: str
    timestamp: datetime
    overall_score: float
    coverage: float
    metrics: tuple[CalculationModelMetricInsight, ...]
    overrides: Mapping[str, float]
    missing_metrics: tuple[str, ...]
    metadata: Mapping[str, object] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "timestamp": self.timestamp.isoformat(),
            "overall_score": self.overall_score,
            "coverage": self.coverage,
            "metrics": [metric.as_dict() for metric in self.metrics],
            "overrides": dict(self.overrides),
            "missing_metrics": list(self.missing_metrics),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


# ---------------------------------------------------------------------------
# dynamic calculation model


class DynamicCalculationModel:
    """High-level model built on top of :class:`DynamicCalculationEngine`."""

    def __init__(
        self,
        *,
        name: str = "dynamic_calculation_model",
        engine: DynamicCalculationEngine | None = None,
        metrics: Sequence[CalculationModelMetric] | None = None,
        max_history: int = 24,
        metadata: Mapping[str, object] | None = None,
    ) -> None:
        self.name = _normalise_identifier(name, name="name")
        self.engine = engine or DynamicCalculationEngine(allow_partial=True)
        self._metrics: MutableMapping[str, CalculationModelMetric] = {}
        if metrics:
            self.configure_metrics(metrics)
        if max_history < 1:
            raise ValueError("max_history must be >= 1")
        self._history: Deque[CalculationModelInsight] = deque(maxlen=int(max_history))
        self.metadata = _coerce_metadata(metadata)

    @property
    def metrics(self) -> Mapping[str, CalculationModelMetric]:
        return MappingProxyType(self._metrics)

    @property
    def history(self) -> tuple[CalculationModelInsight, ...]:
        return tuple(self._history)

    def configure_metrics(
        self, metrics: Iterable[CalculationModelMetric]
    ) -> None:
        for metric in metrics:
            self._metrics[metric.name] = metric

    def remove_metric(self, name: str) -> None:
        identifier = _normalise_identifier(name, name="name")
        self._metrics.pop(identifier, None)

    def clear_metrics(self) -> None:
        self._metrics.clear()

    def register_signals(
        self, signals: Iterable[CalculationSignal | Mapping[str, object]]
    ) -> None:
        prepared: list[CalculationSignal] = []
        for signal in signals:
            if isinstance(signal, CalculationSignal):
                prepared.append(signal)
            else:
                prepared.append(CalculationSignal(**dict(signal)))
        self.engine.register_many(prepared)

    def define_formulas(
        self, formulas: Iterable[CalculationFormula | Mapping[str, object]]
    ) -> None:
        prepared: list[CalculationFormula] = []
        for formula in formulas:
            if isinstance(formula, CalculationFormula):
                prepared.append(formula)
            else:
                prepared.append(CalculationFormula(**dict(formula)))
        self.engine.define_many(prepared)

    def reset(self) -> None:
        for name in list(self.engine.signals):
            self.engine.forget(name)
        for name in list(self.engine.formulas):
            self.engine.retract(name)
        self._history.clear()

    def evaluate(
        self,
        *,
        overrides: Mapping[str, float] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> CalculationModelInsight:
        if not self._metrics:
            raise ValueError("No metrics have been configured for the model")

        overrides_snapshot: dict[str, float] = {}
        if overrides:
            for key, value in overrides.items():
                identifier = _normalise_identifier(key, name="override name")
                try:
                    overrides_snapshot[identifier] = float(value)
                except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
                    raise TypeError(
                        f"override {key!r} must be coercible to float"
                    ) from exc

        results = self.engine.evaluate_all(overrides=overrides_snapshot or None)
        index = {result.name: result for result in results}

        metric_insights: list[CalculationModelMetricInsight] = []
        missing_metrics: list[str] = []
        total_weight = sum(metric.weight for metric in self._metrics.values())
        captured_weight = 0.0
        weighted_score = 0.0

        for metric in self._metrics.values():
            result = index.get(metric.name)
            if result is None:
                missing_metrics.append(metric.name)
                continue

            captured_weight += metric.weight
            score = self._score_metric(metric, result)
            weighted_score += score
            status = self._metric_status(metric, result.value)
            metric_insights.append(
                CalculationModelMetricInsight(
                    name=metric.name,
                    value=result.value,
                    weight=metric.weight,
                    score=score,
                    status=status,
                    variables=result.variables,
                    weighted_contributions=result.weighted_contributions,
                    missing_variables=result.missing_variables,
                    metadata=metric.metadata,
                )
            )

        coverage = (
            captured_weight / total_weight
            if total_weight > 0
            else (1.0 if self._metrics else 0.0)
        )
        overall_score = (
            weighted_score / total_weight if total_weight > 0 else weighted_score
        )

        insight_metadata = {}
        if self.metadata:
            insight_metadata.update(self.metadata)
        extra_metadata = _coerce_metadata(metadata)
        if extra_metadata:
            insight_metadata.update(extra_metadata)

        insight = CalculationModelInsight(
            name=self.name,
            timestamp=_utcnow(),
            overall_score=overall_score,
            coverage=coverage,
            metrics=tuple(sorted(metric_insights, key=lambda item: item.name)),
            overrides=MappingProxyType(overrides_snapshot),
            missing_metrics=tuple(sorted(missing_metrics)),
            metadata=insight_metadata or None,
        )
        self._history.append(insight)
        return insight

    def latest(self) -> CalculationModelInsight | None:
        if not self._history:
            return None
        return self._history[-1]

    def _metric_status(
        self, metric: CalculationModelMetric, value: float
    ) -> str:
        if metric.lower_target is not None and value < metric.lower_target:
            return "below_target"
        if metric.upper_target is not None and value > metric.upper_target:
            return "above_target"
        return "within_target"

    def _score_metric(
        self, metric: CalculationModelMetric, result: CalculationResult
    ) -> float:
        return result.value * metric.weight

