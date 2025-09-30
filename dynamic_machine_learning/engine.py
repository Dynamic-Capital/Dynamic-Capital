"""Core planning utilities for Dynamic Capital's machine learning initiatives."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, MutableMapping, Sequence, Tuple

__all__ = [
    "DatasetSignal",
    "ModelExperiment",
    "MachineLearningContext",
    "MachineLearningPlan",
    "DynamicMachineLearningEngine",
]


def _normalise_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _clamp_unit(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _normalise_iterable(values: Sequence[str] | None) -> Tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        candidate = raw.strip()
        if not candidate:
            continue
        candidate = candidate.rstrip(".")
        key = candidate.lower()
        if key not in seen:
            seen.add(key)
            normalised.append(candidate)
    return tuple(normalised)


@dataclass(slots=True)
class DatasetSignal:
    """Snapshot describing an available training dataset."""

    name: str
    rows: int
    features: int
    quality_score: float
    freshness_days: int
    label_balance: float
    issues: Tuple[str, ...] = ()

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name)
        self.rows = max(int(self.rows), 0)
        self.features = max(int(self.features), 0)
        self.quality_score = _clamp_unit(self.quality_score)
        self.freshness_days = max(int(self.freshness_days), 0)
        self.label_balance = _clamp_unit(self.label_balance)
        self.issues = _normalise_iterable(self.issues)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "rows": self.rows,
            "features": self.features,
            "quality_score": self.quality_score,
            "freshness_days": self.freshness_days,
            "label_balance": self.label_balance,
            "issues": list(self.issues),
        }


@dataclass(slots=True)
class ModelExperiment:
    """Captured result from a model training iteration."""

    identifier: str
    algorithm: str
    accuracy: float
    latency_ms: float
    fairness: float
    status: str = "completed"
    notes: Tuple[str, ...] = ()

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier)
        self.algorithm = _normalise_text(self.algorithm)
        self.accuracy = _clamp_unit(self.accuracy)
        self.latency_ms = max(float(self.latency_ms), 0.0)
        self.fairness = _clamp_unit(self.fairness)
        self.status = _normalise_text(self.status).lower().replace(" ", "_")
        self.notes = _normalise_iterable(self.notes)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "identifier": self.identifier,
            "algorithm": self.algorithm,
            "accuracy": self.accuracy,
            "latency_ms": self.latency_ms,
            "fairness": self.fairness,
            "status": self.status,
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class MachineLearningContext:
    """Planning inputs describing the business mission."""

    mission: str
    target_metric: str
    deployment_deadline_days: int
    risk_tolerance: float
    latency_budget_ms: float

    def __post_init__(self) -> None:
        self.mission = _normalise_text(self.mission)
        self.target_metric = _normalise_text(self.target_metric)
        self.deployment_deadline_days = max(int(self.deployment_deadline_days), 0)
        self.risk_tolerance = _clamp_unit(self.risk_tolerance)
        self.latency_budget_ms = max(float(self.latency_budget_ms), 0.0)


@dataclass(slots=True)
class MachineLearningPlan:
    """Structured recommendation produced by the engine."""

    dataset: DatasetSignal
    experiment: ModelExperiment
    actions: Tuple[str, ...]
    risks: Tuple[str, ...]
    next_steps: Tuple[str, ...]
    narrative: str
    confidence: float = 0.0

    def __post_init__(self) -> None:
        self.confidence = _clamp_unit(self.confidence)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "dataset": self.dataset.as_dict(),
            "experiment": self.experiment.as_dict(),
            "actions": list(self.actions),
            "risks": list(self.risks),
            "next_steps": list(self.next_steps),
            "narrative": self.narrative,
            "confidence": self.confidence,
        }


class DynamicMachineLearningEngine:
    """Create actionable roadmaps from dataset signals and experimentation."""

    def __init__(self) -> None:
        self._datasets: Dict[str, DatasetSignal] = {}
        self._experiments: Dict[str, ModelExperiment] = {}

    # ------------------------------------------------------------------ ingest
    def register_dataset(self, signal: DatasetSignal) -> None:
        if not isinstance(signal, DatasetSignal):  # pragma: no cover - guard
            raise TypeError("signal must be a DatasetSignal instance")
        self._datasets[signal.name] = signal

    def extend_datasets(self, signals: Iterable[DatasetSignal]) -> None:
        for signal in signals:
            self.register_dataset(signal)

    def record_experiment(self, experiment: ModelExperiment) -> None:
        if not isinstance(experiment, ModelExperiment):  # pragma: no cover - guard
            raise TypeError("experiment must be a ModelExperiment instance")
        self._experiments[experiment.identifier] = experiment

    def extend_experiments(self, experiments: Iterable[ModelExperiment]) -> None:
        for experiment in experiments:
            self.record_experiment(experiment)

    def clear(self) -> None:
        self._datasets.clear()
        self._experiments.clear()

    # -------------------------------------------------------------- summaries
    def dataset_overview(self) -> Tuple[DatasetSignal, ...]:
        return tuple(
            sorted(self._datasets.values(), key=self._dataset_score, reverse=True)
        )

    def experiment_overview(
        self, *, context: MachineLearningContext | None = None
    ) -> Tuple[ModelExperiment, ...]:
        completed = [exp for exp in self._experiments.values() if exp.status == "completed"]
        return tuple(
            sorted(
                completed,
                key=lambda exp: self._experiment_score(exp, context=context),
                reverse=True,
            )
        )

    # ------------------------------------------------------------------ plan
    def plan(self, context: MachineLearningContext) -> MachineLearningPlan:
        if not self._datasets:
            raise RuntimeError("no datasets registered")
        overview = self.experiment_overview(context=context)
        if not overview:
            raise RuntimeError("no completed experiments recorded")

        candidates = self._candidate_scores(context)
        if not candidates:
            raise RuntimeError("no completed experiments recorded")

        score, dataset, experiment = candidates[0]
        return self._build_plan(dataset, experiment, context, score)

    def ranked_plans(
        self, context: MachineLearningContext, *, limit: int = 3
    ) -> Tuple[MachineLearningPlan, ...]:
        """Return up to ``limit`` high-scoring plan candidates."""

        if limit <= 0:
            return ()

        ranked = self._candidate_scores(context)
        plans: list[MachineLearningPlan] = []
        for score, dataset, experiment in ranked[:limit]:
            plans.append(self._build_plan(dataset, experiment, context, score))
        return tuple(plans)

    # ----------------------------------------------------------------- scoring
    def _dataset_score(self, dataset: DatasetSignal) -> float:
        balance_score = 1.0 - min(1.0, abs(dataset.label_balance - 0.5) * 2.0)
        freshness_score = max(0.0, 1.0 - dataset.freshness_days / 30.0)
        scale = 1.0 if dataset.rows == 0 else min(1.0, dataset.rows / 10_000)
        return dataset.quality_score * 0.6 + balance_score * 0.2 + freshness_score * 0.15 + scale * 0.05

    def _experiment_score(
        self,
        experiment: ModelExperiment,
        *,
        context: MachineLearningContext | None = None,
    ) -> float:
        latency_score = 1.0 / (1.0 + experiment.latency_ms / 150.0)
        score = experiment.accuracy * 0.6 + experiment.fairness * 0.3 + latency_score * 0.1
        if context and context.latency_budget_ms > 0.0:
            penalty = max(0.0, experiment.latency_ms - context.latency_budget_ms)
            score -= min(penalty / max(context.latency_budget_ms, 1.0), 0.3)
        return score

    def _plan_score(
        self,
        dataset: DatasetSignal,
        experiment: ModelExperiment,
        context: MachineLearningContext,
    ) -> float:
        dataset_score = self._dataset_score(dataset)
        experiment_score = self._experiment_score(experiment, context=context)

        risk_focus = 1.0 - context.risk_tolerance

        dataset_weight = 0.45 + 0.2 * risk_focus
        experiment_weight = 0.45 + 0.2 * context.risk_tolerance
        fairness_weight = 0.15 + 0.35 * risk_focus
        latency_weight = 0.1 + 0.15 * context.risk_tolerance
        freshness_weight = 0.1 + 0.15 * risk_focus

        total_weight = (
            dataset_weight
            + experiment_weight
            + fairness_weight
            + latency_weight
            + freshness_weight
        )

        latency_alignment = 1.0
        if context.latency_budget_ms > 0:
            over_budget = max(0.0, experiment.latency_ms - context.latency_budget_ms)
            latency_alignment = max(
                0.0,
                1.0 - over_budget / (context.latency_budget_ms + 1.0),
            )

        freshness_alignment = max(
            0.0,
            1.0 - dataset.freshness_days / (max(context.deployment_deadline_days, 1) + 7.0),
        )

        score = (
            dataset_score * dataset_weight
            + experiment_score * experiment_weight
            + experiment.fairness * fairness_weight
            + latency_alignment * latency_weight
            + freshness_alignment * freshness_weight
        ) / total_weight

        balance_penalty = max(0.0, abs(dataset.label_balance - 0.5) - 0.05) * (0.6 + 0.4 * risk_focus)
        issue_penalty = min(len(dataset.issues) * 0.04 * (1.0 + risk_focus), 0.25)
        score -= balance_penalty + issue_penalty

        return max(score, 0.0)

    def _candidate_scores(
        self, context: MachineLearningContext
    ) -> List[Tuple[float, DatasetSignal, ModelExperiment]]:
        candidates: list[Tuple[float, DatasetSignal, ModelExperiment]] = []
        for dataset in self._datasets.values():
            for experiment in self._experiments.values():
                if experiment.status != "completed":
                    continue
                score = self._plan_score(dataset, experiment, context)
                candidates.append((score, dataset, experiment))

        candidates.sort(key=lambda entry: entry[0], reverse=True)
        return candidates

    # ------------------------------------------------------------------- heuristics
    def _actions(
        self,
        dataset: DatasetSignal,
        experiment: ModelExperiment,
        context: MachineLearningContext,
    ) -> List[str]:
        actions = [
            (
                f"Adopt dataset {dataset.name} with {dataset.features} features "
                f"and {dataset.rows} rows."
            ),
            (
                f"Promote {experiment.algorithm} experiment ({experiment.identifier}) "
                "for pre-production hardening."
            ),
        ]

        if dataset.issues:
            actions.append(
                "Resolve dataset issues: " + ", ".join(dataset.issues) + "."
            )

        balance = dataset.label_balance
        if balance < 0.45 or balance > 0.55:
            actions.append(
                "Introduce class balancing strategies (re-weighting or resampling)."
            )

        if experiment.latency_ms > context.latency_budget_ms > 0:
            actions.append(
                (
                    f"Optimise inference pipeline to reduce latency by "
                    f"{experiment.latency_ms - context.latency_budget_ms:.0f}ms."
                )
            )

        if experiment.fairness < 0.75:
            actions.append("Run fairness audit with counterfactual evaluation.")

        return actions

    def _risks(
        self,
        dataset: DatasetSignal,
        experiment: ModelExperiment,
        context: MachineLearningContext,
    ) -> List[str]:
        risks: list[str] = []

        if dataset.quality_score < 0.7:
            risks.append("Dataset quality below recommended 0.70 threshold.")
        if dataset.freshness_days > 7:
            risks.append("Dataset freshness exceeds one week; drift likely.")
        if experiment.status != "completed":
            risks.append("Selected experiment is not yet completed.")

        if experiment.accuracy < 0.8:
            risks.append("Model accuracy under 0.80 target.")

        fairness_bar = 0.7 + (0.2 * (1.0 - context.risk_tolerance))
        if experiment.fairness < fairness_bar:
            risks.append(
                (
                    "Fairness score below threshold for current risk tolerance "
                    f"({fairness_bar:.2f})."
                )
            )

        if context.latency_budget_ms and experiment.latency_ms > context.latency_budget_ms:
            risks.append("Latency budget exceeded by current experiment.")

        return risks

    def _next_steps(
        self,
        dataset: DatasetSignal,
        experiment: ModelExperiment,
        context: MachineLearningContext,
    ) -> List[str]:
        return [
            f"Set up automated monitoring for {context.target_metric} and fairness drift.",
            (
                f"Schedule shadow deployment for {experiment.identifier} using dataset "
                f"{dataset.name}."
            ),
            "Document model cards and compliance artefacts prior to launch.",
        ]

    def _build_plan(
        self,
        dataset: DatasetSignal,
        experiment: ModelExperiment,
        context: MachineLearningContext,
        score: float,
    ) -> MachineLearningPlan:
        actions = self._actions(dataset, experiment, context)
        risks = self._risks(dataset, experiment, context)
        next_steps = self._next_steps(dataset, experiment, context)
        narrative = (
            f"Mission {context.mission} targeting {context.target_metric}. "
            f"Deployment in {context.deployment_deadline_days} day(s) with "
            f"latency budget {context.latency_budget_ms:.0f}ms. "
            f"Composite plan confidence {score:.2f}."
        )

        return MachineLearningPlan(
            dataset=dataset,
            experiment=experiment,
            actions=tuple(actions),
            risks=tuple(risks),
            next_steps=tuple(next_steps),
            narrative=narrative,
            confidence=score,
        )
