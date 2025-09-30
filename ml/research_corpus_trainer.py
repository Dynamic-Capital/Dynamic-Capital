"""Utility to train knowledge base corpora with the dynamic trainer engine.

This helper consumes a preprocessed instruction dataset (JSONL) produced by
``ml/preprocess_corpus.py`` and synthesises a sequence of ``TrainingSignal``
observations.  The signals are aggregated with ``DynamicTrainerEngine`` to
emit a deployment readiness model that mirrors the behaviour of the LoRA
trainer service without requiring heavyweight transformer fine-tuning during
CI runs.

Typical usage:

.. code-block:: bash

    python ml/research_corpus_trainer.py \
      --dataset data/knowledge_base/research/processed/dhivehi_training_corpus.jsonl \
      --output data/knowledge_base/research/training_runs/dhivehi_radheef_v1.json

The resulting JSON document captures dataset statistics, the synthetic
training signals, and the summarised readiness model which downstream
automation (for example release checklists) can reference.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from dataclasses import asdict
from pathlib import Path
from statistics import mean, pstdev
from typing import Iterable, Iterator, Mapping, Sequence

# Ensure the repository root is available for absolute imports when the script
# is executed directly without installing the package.
import sys

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from dynamic_trainer.engine import (  # noqa: E402
    DynamicTrainerEngine,
    TrainerContext,
    TrainingSignal,
)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _load_records(path: Path) -> list[Mapping[str, object]]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")

    records: list[Mapping[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
                raise ValueError(f"Invalid JSON on line {line_number}: {exc}") from exc
            if isinstance(payload, Mapping):
                records.append(payload)
    if not records:
        raise ValueError(f"No records parsed from dataset: {path}")
    return records


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


def _chunk_records(records: Sequence[Mapping[str, object]], chunks: int) -> Iterator[list[Mapping[str, object]]]:
    chunk_size = max(1, len(records) // chunks)
    for idx in range(0, len(records), chunk_size):
        yield list(records[idx : idx + chunk_size])


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

    combined_lengths = [prompt + response + context for prompt, response, context in zip(prompt_lengths, response_lengths, context_lengths)]
    unique_samples = {
        (str(record.get("prompt", "")).strip(), str(record.get("response", "")).strip(), str(record.get("context", "")).strip())
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

    metrics = {
        "dataset_rows": dataset_rows,
        "avg_prompt_chars": avg_prompt,
        "avg_response_chars": avg_response,
        "avg_context_chars": avg_context,
        "avg_total_chars": avg_total,
        "std_total_chars": std_total,
        "std_ratio": std_ratio,
        "languages": languages,
        "tags": tag_counter,
        "dedupe_ratio": dedupe_ratio,
        "total_characters": sum(combined_lengths),
    }
    return metrics


def _build_training_signals(
    records: Sequence[Mapping[str, object]],
    objective: str,
    *,
    epochs: int = 3,
) -> tuple[list[TrainingSignal], dict[str, object]]:
    base = _derive_base_metrics(records)

    dataset_rows = base["dataset_rows"]
    avg_total = base["avg_total_chars"] or 1.0
    std_ratio = float(base["std_ratio"])
    dedupe_ratio = float(base["dedupe_ratio"])
    unique_languages = len(base["languages"])
    unique_tags = len(base["tags"])

    base_accuracy = _clamp(0.55 + min(avg_total / 1600.0, 0.25) + min(unique_languages / 5.0, 0.1) + min(unique_tags / 12.0, 0.1))
    base_loss = max(0.08, 0.9 - base_accuracy * 0.5)
    base_throughput = max(32.0, min(320.0, dataset_rows * (avg_total / 512.0 + 0.75)))
    base_stability = _clamp(0.6 + (1.0 - min(std_ratio, 0.8)) * 0.25)
    base_efficiency = _clamp(0.65 + min(base_throughput / 512.0, 0.25) - min(dedupe_ratio, 0.15))
    base_label_quality = _clamp(0.7 + min(unique_tags / max(dataset_rows, 1), 0.08) + min(unique_languages / 10.0, 0.05))
    base_energy = _clamp(base["total_characters"] / 450000.0)

    signals: list[TrainingSignal] = []
    chunks = list(_chunk_records(records, epochs)) or [list(records)]
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


def _serialize_signal(signal: TrainingSignal) -> dict[str, object]:
    payload = asdict(signal)
    timestamp = payload.get("timestamp")
    if hasattr(timestamp, "isoformat"):
        payload["timestamp"] = timestamp.isoformat()
    return payload


def train_dataset(dataset: Path, output: Path, *, objective: str) -> dict[str, object]:
    records = _load_records(dataset)
    signals, diagnostics = _build_training_signals(records, objective)

    engine = DynamicTrainerEngine(window=max(len(signals), 5))
    engine.extend(signals)

    context = TrainerContext(
        objective=objective,
        target_accuracy=0.88,
        max_loss=0.45,
        min_throughput=64.0,
        stability_threshold=0.72,
        efficiency_target=0.78,
        max_hours=18.0,
        emphasis=tuple(sorted(diagnostics["base_metrics"]["tags"].keys())),
    )

    readiness = engine.summarise(context)

    report = {
        "dataset": str(dataset),
        "objective": objective,
        "signals": [_serialize_signal(signal) for signal in signals],
        "diagnostics": diagnostics,
        "readiness": {
            "readiness": readiness.readiness,
            "confidence": readiness.confidence,
            "quality": readiness.quality,
            "efficiency": readiness.efficiency,
            "focus_areas": readiness.focus_areas,
            "advisories": readiness.advisories,
            "recommended_actions": readiness.recommended_actions,
            "sample_size": readiness.sample_size,
            "metadata": readiness.metadata,
        },
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train knowledge base datasets via DynamicTrainerEngine")
    parser.add_argument("--dataset", type=Path, required=True, help="Path to the preprocessed JSONL dataset")
    parser.add_argument("--output", type=Path, required=True, help="Destination JSON report path")
    parser.add_argument(
        "--objective",
        type=str,
        default="knowledge-base-research",
        help="High-level objective string for the trainer context",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    report = train_dataset(args.dataset, args.output, objective=args.objective)
    print(json.dumps(report["readiness"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

