"""Fine-tuning dataset management for the Dynamic AGI stack."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Deque, Dict, Iterable, Iterator, List, Mapping, Optional, Sequence, Tuple

from dynamic_agi.self_improvement import LearningSnapshot

__all__ = [
    "FineTuneExample",
    "FineTuneBatch",
    "DynamicFineTuneDataset",
    "DynamicAGIFineTuner",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _format_mapping(payload: Mapping[str, Any]) -> str:
    lines: List[str] = []
    for key in sorted(payload):
        value = payload[key]
        lines.append(f"{key}: {value!r}")
    return "\n".join(lines)


def _format_sequence(values: Sequence[str], *, prefix: str = "- ") -> str:
    if not values:
        return "(none)"
    return "\n".join(f"{prefix}{value}" for value in values)


def _render_prompt(snapshot: LearningSnapshot) -> str:
    output_desc = _format_mapping(snapshot.output)
    performance_desc = _format_mapping(snapshot.performance)
    feedback_desc = _format_sequence(list(snapshot.feedback))
    signals_desc = _format_sequence([
        f"{signal.metric} -> {signal.direction} ({signal.value:.3f})"
        for signal in snapshot.signals
    ])

    sections = [
        "### Observed Output",
        output_desc or "(empty)",
        "",
        "### Performance Metrics",
        performance_desc or "(none)",
        "",
        "### Human Feedback",
        feedback_desc,
        "",
        "### Recorded Signals",
        signals_desc,
    ]

    if snapshot.awareness_report:
        sections.extend(
            [
                "",
                "### Awareness Insights",
                _format_mapping(snapshot.awareness_report),
            ]
        )
    if snapshot.metacognition_report:
        sections.extend(
            [
                "",
                "### Metacognition Insights",
                _format_mapping(snapshot.metacognition_report),
            ]
        )

    return "\n".join(sections).strip()


def _render_completion(snapshot: LearningSnapshot) -> str:
    lines: List[str] = []
    for signal in snapshot.signals:
        direction = signal.direction
        action_prefix = {
            "positive": "Continue reinforcing",
            "negative": "Course-correct by",
            "neutral": "Monitor",
        }[direction]
        detail = signal.notes.strip() if signal.notes else ""
        if direction == "negative":
            recommendation = f"{action_prefix} improving {signal.metric}"
        elif direction == "positive":
            recommendation = f"{action_prefix} strength in {signal.metric}"
        else:
            recommendation = f"{action_prefix} {signal.metric}"
        if detail:
            recommendation = f"{recommendation} ({detail})"
        lines.append(
            f"- {recommendation}; weight={signal.weight:.2f}, score={signal.value:.3f}"
        )

    if snapshot.feedback:
        lines.append("- Integrate qualitative feedback into revised playbooks")
    if snapshot.awareness_report:
        lines.append("- Align adjustments with awareness diagnostics")
    if snapshot.metacognition_report:
        lines.append("- Reflect using metacognition prompts before deployment")

    if not lines:
        lines.append("- Maintain current operating profile")

    return "\n".join(lines)


@dataclass(slots=True)
class FineTuneExample:
    """Single prompt-completion pair for fine-tuning."""

    prompt: str
    completion: str
    tags: Tuple[str, ...] = ()
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "prompt": self.prompt,
            "completion": self.completion,
        }
        if self.tags:
            payload["tags"] = list(self.tags)
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class FineTuneBatch:
    """Batch of examples with snapshot statistics."""

    examples: Tuple[FineTuneExample, ...]
    created_at: datetime = field(default_factory=_utcnow)
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "created_at": self.created_at.isoformat(),
            "examples": [example.to_dict() for example in self.examples],
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        payload["size"] = len(self.examples)
        return payload


class DynamicFineTuneDataset:
    """Rolling dataset builder for Dynamic AGI fine-tuning."""

    def __init__(self, *, capacity: int = 512) -> None:
        if capacity <= 0:
            raise ValueError("capacity must be positive")
        self.capacity = capacity
        self._examples: Deque[FineTuneExample] = deque(maxlen=capacity)

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._examples)

    def __iter__(self) -> Iterator[FineTuneExample]:  # pragma: no cover - trivial
        return iter(self._examples)

    def add(self, example: FineTuneExample) -> None:
        self._examples.append(example)

    def extend(self, examples: Iterable[FineTuneExample]) -> None:
        for example in examples:
            self.add(example)

    def snapshot(self) -> Tuple[FineTuneExample, ...]:
        return tuple(self._examples)

    def export(self) -> List[Dict[str, Any]]:
        return [example.to_dict() for example in self._examples]

    def stats(self) -> Dict[str, Any]:
        lengths = [len(example.prompt) + len(example.completion) for example in self._examples]
        average_tokens = mean(lengths) if lengths else 0.0
        return {
            "count": len(self._examples),
            "capacity": self.capacity,
            "average_characters": average_tokens,
        }


class DynamicAGIFineTuner:
    """Transforms self-improvement telemetry into fine-tuning datasets."""

    def __init__(
        self,
        *,
        dataset: Optional[DynamicFineTuneDataset] = None,
        default_tags: Optional[Sequence[str]] = None,
    ) -> None:
        self.dataset = dataset or DynamicFineTuneDataset()
        self.default_tags = tuple(default_tags) if default_tags else ()

    def ingest_snapshots(self, snapshots: Iterable[LearningSnapshot]) -> int:
        added = 0
        for snapshot in snapshots:
            example = self._example_from_snapshot(snapshot)
            self.dataset.add(example)
            added += 1
        return added

    def build_batches(self, *, batch_size: int = 16, notes: Optional[str] = None) -> List[FineTuneBatch]:
        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        examples = list(self.dataset.snapshot())
        batches: List[FineTuneBatch] = []
        for start in range(0, len(examples), batch_size):
            batch_examples = tuple(examples[start : start + batch_size])
            batches.append(FineTuneBatch(examples=batch_examples, notes=notes))
        return batches

    def dataset_summary(self) -> Dict[str, Any]:
        summary = self.dataset.stats()
        summary["tags"] = list(self.default_tags)
        return summary

    def _example_from_snapshot(self, snapshot: LearningSnapshot) -> FineTuneExample:
        prompt = _render_prompt(snapshot)
        completion = _render_completion(snapshot)
        metadata = {
            "timestamp": snapshot.timestamp.astimezone(timezone.utc).isoformat(),
            "performance_score": mean(snapshot.performance.values()) if snapshot.performance else 0.0,
            "signals": [signal.to_dict() for signal in snapshot.signals],
        }
        tags: Tuple[str, ...]
        if self.default_tags:
            tags = self.default_tags
        else:
            tags = tuple({signal.metric for signal in snapshot.signals})
        return FineTuneExample(prompt=prompt, completion=completion, tags=tags, metadata=metadata)

