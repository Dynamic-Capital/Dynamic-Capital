"""Knowledge base training orchestration utilities.

This module exposes a thin bridge between curated knowledge base corpora and
:class:`dynamic_data_training.DynamicDataTrainingEngine`. It focuses on loading
JSON/JSONL datasets mirrored under ``data/knowledge_base`` and feeding them into
the Dynamic trainer stack so automation can determine promotion readiness.

Typical usage::

    from dynamic_knowledge_base_training import DynamicKnowledgeBaseTrainer

    trainer = DynamicKnowledgeBaseTrainer()
    summary = trainer.summarise(["data/knowledge_base/research/processed/sample.jsonl"])
    report = trainer.report(["data/knowledge_base/research/processed/sample.jsonl"])

The trainer reuses the heuristics from :mod:`dynamic_data_training` so the
resulting readiness model stays aligned with the synthetic evaluation tooling.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, MutableSequence, Sequence

from dynamic_data_training import (
    DataTrainingSummary,
    DynamicDataTrainingEngine,
)

__all__ = [
    "KnowledgeBaseDataset",
    "load_knowledge_base_records",
    "DynamicKnowledgeBaseTrainer",
]


@dataclass(slots=True)
class KnowledgeBaseDataset:
    """Container describing a knowledge base dataset slated for training."""

    records: tuple[Mapping[str, object], ...]
    sources: tuple[Path, ...]

    def __post_init__(self) -> None:
        if not self.records:
            raise ValueError("records must not be empty")
        if not self.sources:
            raise ValueError("sources must not be empty")


KnowledgeBaseSources = Path | str | Iterable[Path | str] | KnowledgeBaseDataset


def _ensure_path(source: Path | str) -> Path:
    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Knowledge base dataset not found: {path}")
    if not path.is_file():
        raise ValueError(f"Expected file input for knowledge base dataset: {path}")
    return path


def _load_json_lines(path: Path) -> list[Mapping[str, object]]:
    records: list[Mapping[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, raw in enumerate(handle, start=1):
            raw = raw.strip()
            if not raw:
                continue
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
                raise ValueError(
                    f"Invalid JSONL payload on line {line_number} of {path}: {exc}"
                ) from exc
            if not isinstance(payload, Mapping):
                raise TypeError(
                    f"JSONL entry on line {line_number} of {path} must be an object"
                )
            records.append(dict(payload))
    if not records:
        raise ValueError(f"No records parsed from JSONL dataset: {path}")
    return records


def _load_json(path: Path) -> list[Mapping[str, object]]:
    with path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    if isinstance(payload, Mapping):
        return [dict(payload)]
    if isinstance(payload, Sequence):
        records: MutableSequence[Mapping[str, object]] = []
        for index, item in enumerate(payload):
            if not isinstance(item, Mapping):
                raise TypeError(
                    f"JSON entry at index {index} of {path} must be an object"
                )
            records.append(dict(item))
        if not records:
            raise ValueError(f"No records parsed from JSON dataset: {path}")
        return list(records)
    raise TypeError(
        f"Unsupported JSON payload in {path}; expected an object or array of objects"
    )


def load_knowledge_base_records(sources: KnowledgeBaseSources) -> KnowledgeBaseDataset:
    """Load records from one or more knowledge base dataset files.

    Passing an existing :class:`KnowledgeBaseDataset` allows callers to reuse
    preloaded corpora across multiple trainer invocations without incurring
    repeated disk access.
    """

    if isinstance(sources, KnowledgeBaseDataset):
        return sources

    if isinstance(sources, (str, Path)):
        sources_iterable: tuple[Path | str, ...] = (sources,)
    else:
        sources_iterable = tuple(sources)
        if not sources_iterable:
            raise ValueError("sources iterable must not be empty")

    files = tuple(_ensure_path(item) for item in sources_iterable)

    all_records: list[Mapping[str, object]] = []
    for path in files:
        suffix = path.suffix.lower()
        if suffix in {".jsonl", ".ndjson"}:
            records = _load_json_lines(path)
        elif suffix == ".json":
            records = _load_json(path)
        else:
            raise ValueError(
                f"Unsupported knowledge base dataset format: {path.suffix or '[no extension]'}"
            )
        all_records.extend(records)

    return KnowledgeBaseDataset(records=tuple(all_records), sources=files)


class DynamicKnowledgeBaseTrainer:
    """High-level helper for running knowledge base training readiness checks."""

    def __init__(
        self,
        *,
        objective: str = "knowledge-base-training",
        epochs: int = 3,
        window: int | None = None,
        context_overrides: Mapping[str, object] | None = None,
    ) -> None:
        self._engine = DynamicDataTrainingEngine(
            objective=objective,
            epochs=epochs,
            window=window,
            context_overrides=context_overrides,
        )

    @property
    def objective(self) -> str:
        return self._engine.objective

    @property
    def epochs(self) -> int:
        return self._engine.epochs

    @property
    def window(self) -> int | None:
        return self._engine.window

    def summarise(self, sources: KnowledgeBaseSources) -> DataTrainingSummary:
        """Load the provided sources and return the training summary."""

        dataset = load_knowledge_base_records(sources)
        return self._engine.summarise(dataset.records)

    def report(self, sources: KnowledgeBaseSources) -> dict[str, object]:
        """Return a JSON-serialisable report for the supplied dataset files."""

        dataset = load_knowledge_base_records(sources)
        report = self._engine.report(dataset.records)
        report.setdefault("sources", [str(path) for path in dataset.sources])
        return report
