"""Benchmark synthesis primitives for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean, mean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from dynamic_grading.system import classify_proficiency

__all__ = [
    "BenchmarkMetric",
    "BenchmarkScenario",
    "BenchmarkRun",
    "MetricAssessment",
    "BenchmarkReport",
    "DynamicBenchmark",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_name(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _coerce_mapping(
    mapping: Mapping[str, object] | None,
) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_numeric(value: float | int) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    return numeric


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class BenchmarkMetric:
    """Definition for a metric tracked within a benchmark scenario."""

    name: str
    target: float
    weight: float = 1.0
    higher_is_better: bool = True
    tolerance: float = 0.05
    description: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.target = _coerce_numeric(self.target)
        if self.weight <= 0:
            raise ValueError("weight must be positive")
        self.weight = float(self.weight)
        self.higher_is_better = bool(self.higher_is_better)
        self.tolerance = max(float(self.tolerance), 0.0)
        self.description = _normalise_optional_text(self.description)
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class BenchmarkScenario:
    """Container describing a benchmark configuration."""

    name: str
    cadence: str
    owner: str
    metrics: Sequence[BenchmarkMetric]
    description: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.cadence = _normalise_name(self.cadence)
        self.owner = _normalise_name(self.owner)
        if not self.metrics:
            raise ValueError("scenario must define at least one metric")
        deduped: dict[str, BenchmarkMetric] = {}
        for metric in self.metrics:
            if metric.name in deduped:
                raise ValueError(f"duplicate metric name: {metric.name}")
            deduped[metric.name] = metric
        self.metrics = tuple(deduped.values())
        self.description = _normalise_optional_text(self.description)

    @property
    def metric_names(self) -> tuple[str, ...]:
        return tuple(metric.name for metric in self.metrics)

    def get_metric(self, name: str) -> BenchmarkMetric:
        normalised = _normalise_name(name)
        for metric in self.metrics:
            if metric.name == normalised:
                return metric
        raise KeyError(f"metric '{name}' not found in scenario '{self.name}'")


@dataclass(slots=True)
class BenchmarkRun:
    """Single execution of a benchmark with collected metric values."""

    run_id: str
    metrics: Mapping[str, float]
    timestamp: datetime = field(default_factory=_utcnow)
    notes: str | None = None
    inputs: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.run_id = _normalise_name(self.run_id)
        normalised: dict[str, float] = {}
        for key, value in self.metrics.items():
            key = _normalise_name(key)
            numeric = _coerce_numeric(value)
            normalised[key] = numeric
        self.metrics = normalised
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.notes = _normalise_optional_text(self.notes)
        self.inputs = _coerce_mapping(self.inputs)


@dataclass(slots=True)
class MetricAssessment:
    """Scorecard for a single metric within a benchmark run."""

    name: str
    value: float
    target: float
    score: float
    delta: float
    status: str
    weight: float
    narrative: str
    proficiency_level: str
    proficiency_label: str
    proficiency_narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "value": self.value,
            "target": self.target,
            "score": self.score,
            "delta": self.delta,
            "status": self.status,
            "weight": self.weight,
            "narrative": self.narrative,
            "proficiency_level": self.proficiency_level,
            "proficiency_label": self.proficiency_label,
            "proficiency_narrative": self.proficiency_narrative,
        }


@dataclass(slots=True)
class BenchmarkReport:
    """Aggregated benchmark results for a run."""

    scenario: str
    run_id: str
    timestamp: datetime
    overall_score: float
    status: str
    metric_assessments: tuple[MetricAssessment, ...]
    recommendations: tuple[str, ...]
    inputs: Mapping[str, object] | None = None
    proficiency_level: str | None = None
    proficiency_label: str | None = None
    proficiency_narrative: str | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "scenario": self.scenario,
            "run_id": self.run_id,
            "timestamp": self.timestamp.isoformat(),
            "overall_score": self.overall_score,
            "status": self.status,
            "metric_assessments": [
                assessment.as_dict() for assessment in self.metric_assessments
            ],
            "recommendations": list(self.recommendations),
            "inputs": dict(self.inputs) if self.inputs is not None else None,
            "proficiency_level": self.proficiency_level,
            "proficiency_label": self.proficiency_label,
            "proficiency_narrative": self.proficiency_narrative,
        }


# ---------------------------------------------------------------------------
# benchmark engine


class DynamicBenchmark:
    """Evaluate benchmark runs and synthesise trend-aware guidance."""

    def __init__(
        self,
        scenario: BenchmarkScenario,
        *,
        history: Iterable[BenchmarkRun] | None = None,
        history_limit: int = 12,
    ) -> None:
        self.scenario = scenario
        self._history_limit = max(history_limit, 1)
        self._history: Deque[BenchmarkRun] = deque(maxlen=self._history_limit)
        self._metric_lookup: Mapping[str, BenchmarkMetric] = {
            metric.name: metric for metric in scenario.metrics
        }
        if history:
            for run in history:
                self._history.append(run)

    @property
    def history(self) -> tuple[BenchmarkRun, ...]:
        return tuple(self._history)

    def record(self, run: BenchmarkRun) -> BenchmarkReport:
        """Record and evaluate a new benchmark run."""

        report = self.evaluate(run)
        self._history.append(run)
        return report

    def evaluate(self, run: BenchmarkRun) -> BenchmarkReport:
        """Evaluate a run without mutating history."""

        metric_assessments = self._evaluate_metrics(run)
        overall_score = self._aggregate_score(metric_assessments)
        status = self._classify_status(overall_score)
        recommendations = self._recommendations(metric_assessments, status)
        classification = classify_proficiency(overall_score)
        return BenchmarkReport(
            scenario=self.scenario.name,
            run_id=run.run_id,
            timestamp=run.timestamp,
            overall_score=overall_score,
            status=status,
            metric_assessments=metric_assessments,
            recommendations=recommendations,
            inputs=run.inputs,
            proficiency_level=classification.level,
            proficiency_label=classification.label,
            proficiency_narrative=classification.narrative,
        )

    # ------------------------------------------------------------------
    # evaluation helpers

    def _evaluate_metrics(self, run: BenchmarkRun) -> tuple[MetricAssessment, ...]:
        assessments: list[MetricAssessment] = []
        for metric in self.scenario.metrics:
            value = run.metrics.get(metric.name)
            if value is None:
                raise KeyError(
                    f"run '{run.run_id}' missing metric '{metric.name}' for scenario '{self.scenario.name}'"
                )
            score, delta, status = self._score_metric(metric, value)
            narrative = self._metric_narrative(metric, value, delta, status)
            classification = classify_proficiency(score)
            assessments.append(
                MetricAssessment(
                    name=metric.name,
                    value=value,
                    target=metric.target,
                    score=score,
                    delta=delta,
                    status=status,
                    weight=metric.weight,
                    narrative=narrative,
                    proficiency_level=classification.level,
                    proficiency_label=classification.label,
                    proficiency_narrative=classification.narrative,
                )
            )
        return tuple(assessments)

    def _score_metric(
        self, metric: BenchmarkMetric, value: float
    ) -> tuple[float, float, str]:
        target = metric.target
        if target == 0:
            baseline_ratio = 1.0 if value == 0 else 2.0
        else:
            if metric.higher_is_better:
                baseline_ratio = value / target
            else:
                # smaller values are better, so invert the ratio
                baseline_ratio = target / value if value != 0 else 2.0
        ratio = max(baseline_ratio, 0.0)
        score = _clamp(ratio)
        delta = value - target if metric.higher_is_better else target - value
        tolerance = metric.tolerance * target if target != 0 else metric.tolerance
        if ratio >= 1.05:
            status = "exceeds"
        elif ratio >= 1.0 - (tolerance / target if target != 0 else metric.tolerance):
            status = "meets"
        else:
            status = "lags"
        return score, delta, status

    def _metric_narrative(
        self,
        metric: BenchmarkMetric,
        value: float,
        delta: float,
        status: str,
    ) -> str:
        direction = "higher" if metric.higher_is_better else "lower"
        if status == "exceeds":
            return (
                f"{metric.name} outperforms the target by {delta:+.2f}. Maintain the inputs driving this "
                f"{direction} result."
            )
        if status == "meets":
            return (
                f"{metric.name} is on target with {value:.2f}. Continue monitoring {direction} pressures to "
                "sustain performance."
            )
        adjustment = "increase" if metric.higher_is_better else "reduce"
        return (
            f"{metric.name} trails the benchmark by {abs(delta):.2f}. Prioritise initiatives that {adjustment} "
            f"the metric within the next cycle."
        )

    def _aggregate_score(self, assessments: Sequence[MetricAssessment]) -> float:
        total_weight = sum(assessment.weight for assessment in assessments)
        if total_weight <= 0:
            return 0.0
        weighted = sum(
            assessment.score * assessment.weight for assessment in assessments
        )
        return _clamp(weighted / total_weight)

    def _classify_status(self, overall_score: float) -> str:
        if overall_score >= 1.05:
            return "surpassing"
        if overall_score >= 0.95:
            return "on-track"
        return "at-risk"

    def _recommendations(
        self,
        assessments: Sequence[MetricAssessment],
        overall_status: str,
    ) -> tuple[str, ...]:
        recommendations: list[str] = []
        if overall_status == "at-risk":
            lagging = [a for a in assessments if a.status == "lags"]
            if lagging:
                worst = min(lagging, key=lambda a: a.score)
                recommendations.append(
                    f"Escalate recovery plan for '{worst.name}' with focus on {worst.narrative.lower()}"
                )
        exceeding = [a for a in assessments if a.status == "exceeds"]
        if exceeding:
            trend = self._trend_commentary(exceeding)
            recommendations.append(trend)
        if not recommendations:
            recommendations.append(
                "Maintain current execution cadence and validate signals against leading indicators."
            )
        return tuple(recommendations)

    def _trend_commentary(self, assessments: Sequence[MetricAssessment]) -> str:
        metric_names = {assessment.name for assessment in assessments}
        historical_scores = list(self._historical_normalised_scores(metric_names))
        if len(historical_scores) >= 2:
            avg_score = fmean(historical_scores)
            return (
                "Sustain outperforming metrics by codifying playbooks; "
                f"historical average sits at {avg_score:.2f}."
            )
        return "Track outperforming metrics for durability across future cycles."

    def _historical_normalised_scores(
        self, metric_names: Iterable[str]
    ) -> Iterable[float]:
        for run in self._history:
            for name in metric_names:
                value = run.metrics.get(name)
                if value is None:
                    continue
                metric = self._metric_lookup.get(name)
                if metric is None:
                    continue
                score, _, _ = self._score_metric(metric, value)
                yield score
