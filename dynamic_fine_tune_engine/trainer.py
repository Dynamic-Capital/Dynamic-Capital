"""Training orchestration utilities for dynamic fine-tuning cycles."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, List, Mapping, Optional, Sequence

from dynamic.intelligence.agi.fine_tune import DynamicAGIFineTuner, FineTuneExample
from dynamic.intelligence.agi.self_improvement import LearningSnapshot

from .agent import DynamicFineTuneAgent

__all__ = ["FineTuneTrainer"]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_score(value: float) -> float:
    if value > 1.0:
        return _clamp(value / 100.0)
    if value < 0.0:
        return 0.0
    return value


def _extract_signals(metadata: Mapping[str, object]) -> Sequence[Mapping[str, object]]:
    raw_signals = metadata.get("signals", ())
    extracted: List[Mapping[str, object]] = []
    if isinstance(raw_signals, Mapping):  # pragma: no cover - defensive guard
        raw_signals = (raw_signals,)
    for signal in raw_signals or ():
        if isinstance(signal, Mapping):
            extracted.append(dict(signal))
    return tuple(extracted)


def _signal_quality(signals: Sequence[Mapping[str, object]]) -> float:
    if not signals:
        return 0.5
    weighted_total = 0.0
    weight_sum = 0.0
    for signal in signals:
        weight = float(signal.get("weight", 1.0) or 0.0)
        if weight <= 0:
            continue
        direction = str(signal.get("direction", "neutral")).lower()
        value = float(signal.get("value", 0.0) or 0.0)
        magnitude = abs(value)
        signed_value = magnitude if direction != "negative" else -magnitude
        weighted_total += signed_value * weight
        weight_sum += weight
    if weight_sum == 0:
        return 0.5
    normalised = weighted_total / weight_sum
    return 0.5 + (_clamp(normalised, lower=-1.0, upper=1.0) / 2.0)


def _signal_priority(signals: Sequence[Mapping[str, object]]) -> float:
    if not signals:
        return 0.5
    negative_weight = 0.0
    positive_weight = 0.0
    for signal in signals:
        weight = float(signal.get("weight", 1.0) or 0.0)
        if weight <= 0:
            continue
        direction = str(signal.get("direction", "neutral")).lower()
        if direction == "negative":
            negative_weight += weight
        elif direction == "positive":
            positive_weight += weight
    total = negative_weight + positive_weight
    if total == 0:
        return 0.5
    balance = (negative_weight - positive_weight) / (2.0 * total)
    return _clamp(0.5 + balance)


def _quality_from_metadata(metadata: Mapping[str, object]) -> float:
    signals = _extract_signals(metadata)
    performance_score = _normalise_score(float(metadata.get("performance_score", 0.0) or 0.0))
    signal_score = _signal_quality(signals)
    return _clamp((performance_score + signal_score) / 2.0)


def _priority_from_metadata(metadata: Mapping[str, object]) -> float:
    signals = _extract_signals(metadata)
    return _signal_priority(signals)


def _payload_from_example(example: FineTuneExample, *, source: str) -> Mapping[str, object]:
    metadata = dict(example.metadata)
    quality = _quality_from_metadata(metadata)
    priority = _priority_from_metadata(metadata)
    return {
        "prompt": example.prompt,
        "completion": example.completion,
        "source": metadata.get("source", source),
        "tags": tuple(example.tags),
        "metadata": metadata,
        "quality": quality,
        "priority": priority,
    }


@dataclass(slots=True)
class FineTuneTrainer:
    """Bridge Dynamic AGI telemetry into the fine-tune dataset engine."""

    agent: DynamicFineTuneAgent
    tuner: DynamicAGIFineTuner = field(default_factory=DynamicAGIFineTuner)
    source: str = "agi.self_improvement"

    def fine_tune(
        self,
        snapshots: Iterable[LearningSnapshot],
        *,
        batch_size: int = 32,
        minimum_quality: float = 0.6,
        remove: bool = False,
        notes: Optional[str] = None,
    ) -> Mapping[str, object]:
        """Ingest snapshots, build the dataset, and return harvest artefacts."""

        snapshots = tuple(snapshots)
        if not snapshots:
            batches = tuple(self.tuner.build_batches(batch_size=batch_size, notes=notes))
            summary = self.tuner.dataset_summary()
            batch = self.agent.harvest(
                batch_size=batch_size,
                minimum_quality=minimum_quality,
                remove=remove,
                notes=notes,
            )
            return {
                "ingested": 0,
                "harvest": batch,
                "batches": batches,
                "summary": summary,
            }

        added = self.tuner.ingest_snapshots(snapshots)
        if added:
            dataset_snapshot = self.tuner.dataset.snapshot()
            new_examples = dataset_snapshot[-min(added, len(dataset_snapshot)) :]
        else:
            new_examples = ()

        payloads = [
            _payload_from_example(example, source=self.source)
            for example in new_examples
        ]
        ingested = self.agent.ingest_payloads(payloads) if payloads else 0

        batch = self.agent.harvest(
            batch_size=batch_size,
            minimum_quality=minimum_quality,
            remove=remove,
            notes=notes,
        )
        batches = tuple(self.tuner.build_batches(batch_size=batch_size, notes=notes))
        summary = self.tuner.dataset_summary()
        return {
            "ingested": ingested,
            "harvest": batch,
            "batches": batches,
            "summary": summary,
        }
