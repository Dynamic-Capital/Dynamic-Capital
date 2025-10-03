"""Synthetic data-training orchestration helpers.

This module packages a lightweight bridge between raw dataset records and the
``DynamicTrainerEngine`` readiness model.  It mirrors the heuristics used by the
research corpus tooling but is dependency-light so it can run inside unit tests
or automation where the heavier ML stack is unavailable.

Typical usage::

    from dynamic_data_training import DynamicDataTrainingEngine

    engine = DynamicDataTrainingEngine(objective="knowledge-base-refresh")
    summary = engine.summarise(records)
    report = engine.report(records)

The ``summary`` object exposes the synthesised ``TrainingSignal`` sequence and
the aggregated ``DynamicTrainerModel`` so downstream automation can determine
whether the dataset is ready for promotion.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, field
from statistics import mean, pstdev
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_trainer import (  # Re-exported for convenience via __all__
    DynamicTrainerEngine,
    DynamicTrainerModel,
    TrainerContext,
    TrainingSignal,
)

__all__ = [
    "DataTrainingSummary",
    "DynamicDataTrainingEngine",
    "generate_training_report",
    "generate_training_summary",
]


def _normalise_objective(value: str) -> str:
    value = str(value).strip()
    if not value:
        raise ValueError("objective must be a non-empty string")
    return value


def _coerce_records(records: Iterable[Mapping[str, object]]) -> list[Mapping[str, object]]:
    coerced: list[Mapping[str, object]] = []
    for record in records:
        if not isinstance(record, Mapping):
            raise TypeError("records must be mappings of string keys to values")
        coerced.append(dict(record))
    if not coerced:
        raise ValueError("records must contain at least one entry")
    return coerced


def _safe_len(value: object) -> int:
    if isinstance(value, str):
        return len(value)
    if value is None:
        return 0
    return len(str(value))


def _sequence_mean(values: Sequence[int]) -> float:
    if not values:
        return 0.0
    return float(mean(values))


def _sequence_pstdev(values: Sequence[int]) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return 0.0
    return float(pstdev(values))


def _chunk_records(
    records: Sequence[Mapping[str, object]], epochs: int
) -> list[list[Mapping[str, object]]]:
    epochs = max(int(epochs), 1)
    chunk_size = max(1, len(records) // epochs)
    return [list(records[idx : idx + chunk_size]) for idx in range(0, len(records), chunk_size)]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _derive_base_metrics(records: Sequence[Mapping[str, object]]) -> dict[str, object]:
    prompt_lengths = [_safe_len(record.get("prompt")) for record in records]
    response_lengths = [_safe_len(record.get("response")) for record in records]
    context_lengths = [_safe_len(record.get("context")) for record in records]

    languages = Counter(
        str(record.get("language", "")).strip().lower() or "unknown" for record in records
    )
    tag_counter: Counter[str] = Counter()
    for record in records:
        tags = record.get("tags")
        if isinstance(tags, Iterable):
            for tag in tags:
                if isinstance(tag, str) and tag.strip():
                    tag_counter[tag.strip().lower()] += 1

    combined_lengths = [
        prompt + response + context
        for prompt, response, context in zip(prompt_lengths, response_lengths, context_lengths)
    ]
    unique_samples = {
        (
            str(record.get("prompt", "")).strip(),
            str(record.get("response", "")).strip(),
            str(record.get("context", "")).strip(),
        )
        for record in records
    }

    dataset_rows = len(records)
    avg_prompt = _sequence_mean(prompt_lengths)
    avg_response = _sequence_mean(response_lengths)
    avg_context = _sequence_mean(context_lengths)
    avg_total = _sequence_mean(combined_lengths)
    std_total = _sequence_pstdev(combined_lengths)

    dedupe_ratio = 1.0 - (len(unique_samples) / float(dataset_rows))
    std_ratio = std_total / avg_total if avg_total else 0.0

    return {
        "dataset_rows": dataset_rows,
        "avg_prompt_chars": avg_prompt,
        "avg_response_chars": avg_response,
        "avg_context_chars": avg_context,
        "avg_total_chars": avg_total,
        "std_total_chars": std_total,
        "std_ratio": std_ratio,
        "languages": dict(languages),
        "tags": dict(tag_counter),
        "dedupe_ratio": dedupe_ratio,
        "total_characters": sum(combined_lengths),
    }


def _build_training_signals(
    records: Sequence[Mapping[str, object]], objective: str, *, epochs: int = 3
) -> tuple[list[TrainingSignal], dict[str, object]]:
    base = _derive_base_metrics(records)

    dataset_rows = base["dataset_rows"] or 1
    avg_total = base["avg_total_chars"] or 1.0
    std_ratio = float(base["std_ratio"])
    dedupe_ratio = float(base["dedupe_ratio"])
    unique_languages = len(base["languages"])
    unique_tags = len(base["tags"])

    base_accuracy = _clamp(
        0.55
        + min(avg_total / 1600.0, 0.25)
        + min(unique_languages / 5.0, 0.1)
        + min(unique_tags / 12.0, 0.1)
    )
    base_loss = max(0.08, 0.9 - base_accuracy * 0.5)
    base_throughput = max(32.0, min(320.0, dataset_rows * (avg_total / 512.0 + 0.75)))
    base_stability = _clamp(0.6 + (1.0 - min(std_ratio, 0.8)) * 0.25)
    base_efficiency = _clamp(0.65 + min(base_throughput / 512.0, 0.25) - min(dedupe_ratio, 0.15))
    base_label_quality = _clamp(
        0.7
        + min(unique_tags / max(dataset_rows, 1), 0.08)
        + min(unique_languages / 10.0, 0.05)
    )
    base_energy = _clamp(base["total_characters"] / 450000.0)

    signals: list[TrainingSignal] = []
    chunks = _chunk_records(records, epochs) or [list(records)]
    for idx, chunk in enumerate(chunks, start=1):
        improvement = 0.02 * idx
        degradation = max(0.0, 0.015 * (len(chunks) - idx))

        accuracy = _clamp(base_accuracy + improvement)
        loss = max(0.05, base_loss - improvement * 0.4)
        throughput = base_throughput * (1.0 + improvement / 3.0)
        stability = _clamp(base_stability + improvement - degradation)
        efficiency = _clamp(base_efficiency + improvement / 2.0 - dedupe_ratio * 0.05)
        label_quality = _clamp(base_label_quality + improvement / 2.5)
        energy = _clamp(base_energy + improvement / 4.0)

        chunk_tags = set()
        chunk_languages = Counter()
        for record in chunk:
            tags = record.get("tags")
            if isinstance(tags, Iterable):
                for tag in tags:
                    if isinstance(tag, str) and tag.strip():
                        chunk_tags.add(tag.strip().lower())
            language = str(record.get("language", "")).strip().lower() or "unknown"
            chunk_languages[language] += 1

        metadata = {
            "epoch": idx,
            "chunk_rows": len(chunk),
            "chunk_languages": dict(chunk_languages),
            "chunk_tags": sorted(chunk_tags),
            "avg_prompt_chars": _sequence_mean([_safe_len(r.get("prompt")) for r in chunk]),
            "avg_response_chars": _sequence_mean([_safe_len(r.get("response")) for r in chunk]),
        }

        signal = TrainingSignal(
            run_label=f"{objective}-epoch-{idx}",
            dataset_rows=len(chunk),
            accuracy=accuracy,
            loss=loss,
            throughput=throughput,
            stability=stability,
            compute_efficiency=efficiency,
            label_quality=label_quality,
            energy=energy,
            weight=max(float(len(chunk)) / max(dataset_rows, 1), 0.5),
            tags=tuple(sorted(chunk_tags)) if chunk_tags else ("general",),
            metadata=metadata,
        )
        signals.append(signal)

    summary = {
        "base_metrics": base,
        "epochs": len(chunks),
        "baseline": {
            "accuracy": base_accuracy,
            "loss": base_loss,
            "throughput": base_throughput,
            "stability": base_stability,
            "efficiency": base_efficiency,
            "label_quality": base_label_quality,
            "energy": base_energy,
        },
    }
    return signals, summary


def _build_trainer_context(
    objective: str,
    *,
    diagnostics: Mapping[str, object],
    overrides: Mapping[str, object] | None = None,
) -> TrainerContext:
    base_kwargs: MutableMapping[str, object] = {
        "objective": objective,
        "target_accuracy": 0.88,
        "max_loss": 0.45,
        "min_throughput": 64.0,
        "stability_threshold": 0.72,
        "efficiency_target": 0.78,
        "max_hours": 18.0,
    }

    tags = diagnostics.get("base_metrics", {}).get("tags", {})
    if isinstance(tags, Mapping):
        emphasis = tuple(sorted(tag for tag, _ in sorted(tags.items(), key=lambda item: (-item[1], item[0]))[:6]))
        if emphasis:
            base_kwargs["emphasis"] = emphasis

    if overrides:
        valid_fields = set(TrainerContext.__dataclass_fields__.keys())
        for key, value in overrides.items():
            if key not in valid_fields:
                raise ValueError(f"Unsupported TrainerContext override: {key}")
            base_kwargs[key] = value

    return TrainerContext(**base_kwargs)


@dataclass(slots=True)
class DataTrainingSummary:
    """Container bundling synthetic training signals and readiness output."""

    signals: tuple[TrainingSignal, ...]
    readiness: DynamicTrainerModel
    diagnostics: Mapping[str, object] = field(default_factory=dict)

    def to_report(self) -> dict[str, object]:
        """Serialise the summary into JSON-compatible primitives."""

        def _serialize_signal(signal: TrainingSignal) -> dict[str, object]:
            payload = asdict(signal)
            timestamp = payload.get("timestamp")
            if hasattr(timestamp, "isoformat"):
                payload["timestamp"] = timestamp.isoformat()
            return payload

        readiness_payload = {
            "readiness": self.readiness.readiness,
            "confidence": self.readiness.confidence,
            "quality": self.readiness.quality,
            "efficiency": self.readiness.efficiency,
            "focus_areas": self.readiness.focus_areas,
            "advisories": self.readiness.advisories,
            "recommended_actions": self.readiness.recommended_actions,
            "sample_size": self.readiness.sample_size,
            "metadata": self.readiness.metadata,
        }

        return {
            "signals": [_serialize_signal(signal) for signal in self.signals],
            "diagnostics": self.diagnostics,
            "readiness": readiness_payload,
        }


def generate_training_summary(
    records: Iterable[Mapping[str, object]],
    *,
    objective: str,
    epochs: int = 3,
    window: int | None = None,
    context_overrides: Mapping[str, object] | None = None,
) -> DataTrainingSummary:
    """Synthesise a :class:`DataTrainingSummary` from raw dataset records."""

    normalised_objective = _normalise_objective(objective)
    prepared_records = _coerce_records(records)

    signals, diagnostics = _build_training_signals(
        prepared_records,
        normalised_objective,
        epochs=max(int(epochs), 1),
    )

    engine = DynamicTrainerEngine(window=max(window or 60, len(signals) or 1))
    engine.extend(signals)

    context = _build_trainer_context(
        normalised_objective,
        diagnostics=diagnostics,
        overrides=context_overrides,
    )
    readiness = engine.summarise(context)

    return DataTrainingSummary(
        signals=tuple(signals),
        readiness=readiness,
        diagnostics=diagnostics,
    )


def generate_training_report(
    records: Iterable[Mapping[str, object]],
    *,
    objective: str,
    epochs: int = 3,
    window: int | None = None,
    context_overrides: Mapping[str, object] | None = None,
) -> dict[str, object]:
    """Return a JSON-serialisable report describing the training summary."""

    summary = generate_training_summary(
        records,
        objective=objective,
        epochs=epochs,
        window=window,
        context_overrides=context_overrides,
    )

    report = summary.to_report()
    report.update({
        "objective": _normalise_objective(objective),
        "epochs": summary.diagnostics.get("epochs"),
        "dataset_rows": summary.diagnostics.get("base_metrics", {}).get("dataset_rows"),
    })
    return report


class DynamicDataTrainingEngine:
    """High level façade to run synthetic data-training readiness analysis."""

    def __init__(
        self,
        *,
        objective: str,
        epochs: int = 3,
        window: int | None = None,
        context_overrides: Mapping[str, object] | None = None,
    ) -> None:
        self._objective = _normalise_objective(objective)
        self._epochs = max(int(epochs), 1)
        self._window = window
        self._context_overrides = dict(context_overrides or {})

    @property
    def objective(self) -> str:
        return self._objective

    @property
    def epochs(self) -> int:
        return self._epochs

    @property
    def window(self) -> int | None:
        return self._window

    @property
    def context_overrides(self) -> Mapping[str, object]:
        return dict(self._context_overrides)

    def summarise(self, records: Iterable[Mapping[str, object]]) -> DataTrainingSummary:
        """Run the synthetic training pipeline and return a summary object."""

        return generate_training_summary(
            records,
            objective=self._objective,
            epochs=self._epochs,
            window=self._window,
            context_overrides=self._context_overrides,
        )

    def report(self, records: Iterable[Mapping[str, object]]) -> dict[str, object]:
        """Run the pipeline and return the JSON-compatible report."""

        return generate_training_report(
            records,
            objective=self._objective,
            epochs=self._epochs,
            window=self._window,
            context_overrides=self._context_overrides,
        )

