"""Domain-focused Q&A sessions powered by the AGI knowledge base."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Iterable, Mapping, Sequence

from .knowledge_base import resolve_domain_snapshots
from .self_improvement import ImprovementSignal, LearningSnapshot

__all__ = [
    "QAExchange",
    "QASession",
    "build_domain_qa_session",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _aggregate_performance(snapshots: Sequence[LearningSnapshot]) -> dict[str, float]:
    metrics: dict[str, list[float]] = {}
    for snapshot in snapshots:
        for metric, value in snapshot.performance.items():
            metrics.setdefault(metric, []).append(float(value))
    return {metric: fmean(values) for metric, values in metrics.items() if values}


def _collect_signals(
    snapshots: Sequence[LearningSnapshot],
    *,
    direction: str | None = None,
) -> tuple[ImprovementSignal, ...]:
    items: list[ImprovementSignal] = []
    for snapshot in snapshots:
        for signal in snapshot.signals:
            if direction and signal.direction != direction:
                continue
            items.append(signal)
    items.sort(key=lambda signal: (signal.weight, signal.value), reverse=True)
    return tuple(items)


def _collect_feedback(snapshots: Sequence[LearningSnapshot]) -> tuple[str, ...]:
    feedback: list[str] = []
    for snapshot in snapshots:
        for item in snapshot.feedback:
            if item not in feedback:
                feedback.append(item)
    return tuple(feedback)


def _collect_capabilities(snapshots: Sequence[LearningSnapshot]) -> list[tuple[str, str]]:
    capabilities: list[tuple[str, str]] = []
    for snapshot in snapshots:
        capability = str(snapshot.output.get("capability", "")).strip()
        summary = str(snapshot.output.get("summary", "")).strip()
        if capability:
            capabilities.append((capability, summary))
    return capabilities


def _format_capability_lines(capabilities: Iterable[tuple[str, str]]) -> str:
    lines: list[str] = []
    for capability, summary in capabilities:
        if summary:
            lines.append(f"- {capability}: {summary}")
        else:
            lines.append(f"- {capability}")
    return "\n".join(lines) if lines else "- (capabilities not documented)"


def _format_signal(signal: ImprovementSignal) -> str:
    label = signal.metric
    detail = f"{signal.direction} @ {signal.value:.2f} (w={signal.weight:.2f})"
    notes = f" — {signal.notes}" if signal.notes else ""
    return f"- {label}: {detail}{notes}"


def _format_signal_lines(signals: Sequence[ImprovementSignal]) -> str:
    if not signals:
        return "- No directional signals recorded"
    return "\n".join(_format_signal(signal) for signal in signals)


def _collect_awareness_sections(
    snapshots: Sequence[LearningSnapshot],
) -> tuple[str, ...]:
    sections: list[str] = []
    for snapshot in snapshots:
        if snapshot.awareness_report:
            insight = snapshot.awareness_report.get("insight")
            if insight:
                sections.append(str(insight))
            next_actions = snapshot.awareness_report.get("next_actions")
            if isinstance(next_actions, Sequence):
                for action in next_actions:
                    sections.append(str(action))
            recommended = snapshot.awareness_report.get("recommended_experiments")
            if isinstance(recommended, Sequence):
                for experiment in recommended:
                    sections.append(str(experiment))
    return tuple(dict.fromkeys(sections))


def _collect_metacognition_sections(
    snapshots: Sequence[LearningSnapshot],
) -> tuple[str, ...]:
    sections: list[str] = []
    for snapshot in snapshots:
        if snapshot.metacognition_report:
            prompt = snapshot.metacognition_report.get("prompt")
            if prompt:
                sections.append(str(prompt))
            reflection = snapshot.metacognition_report.get("reflection")
            if reflection:
                sections.append(str(reflection))
    return tuple(dict.fromkeys(sections))


@dataclass(slots=True)
class QAExchange:
    """Single question and answer pair with optional highlights."""

    question: str
    answer: str
    highlights: tuple[str, ...] = ()

    def to_dict(self) -> dict[str, object]:
        payload: dict[str, object] = {
            "question": self.question,
            "answer": self.answer,
        }
        if self.highlights:
            payload["highlights"] = list(self.highlights)
        return payload


@dataclass(slots=True)
class QASession:
    """Structured Q&A conversation for an AGI domain."""

    domain: str
    exchanges: tuple[QAExchange, ...]
    created_at: datetime = field(default_factory=_utcnow)
    performance_summary: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)

    def to_dict(self) -> dict[str, object]:
        return {
            "domain": self.domain,
            "created_at": self.created_at.isoformat(),
            "performance_summary": dict(self.performance_summary),
            "exchanges": [exchange.to_dict() for exchange in self.exchanges],
        }

    def to_transcript(self) -> str:
        lines = [f"Domain: {self.domain}", f"Created: {self.created_at.isoformat()}\n"]
        for exchange in self.exchanges:
            lines.append(f"Q: {exchange.question}")
            lines.append(f"A: {exchange.answer}")
            if exchange.highlights:
                lines.append("Highlights:")
                lines.extend(f"  - {item}" for item in exchange.highlights)
            lines.append("")
        return "\n".join(lines).strip()


def build_domain_qa_session(
    domain: str,
    *,
    questions: Sequence[str] | None = None,
    knowledge_base: Mapping[str, Sequence[Mapping[str, object]]] | None = None,
) -> QASession:
    """Construct a Q&A session summarising the current state of ``domain``."""

    resolved = resolve_domain_snapshots([domain], knowledge_base=knowledge_base)
    snapshots = resolved[domain]

    performance_summary = _aggregate_performance(snapshots)
    capabilities = _collect_capabilities(snapshots)
    negative_signals = _collect_signals(snapshots, direction="negative")
    positive_signals = _collect_signals(snapshots, direction="positive")
    feedback = _collect_feedback(snapshots)
    awareness = _collect_awareness_sections(snapshots)
    metacognition = _collect_metacognition_sections(snapshots)

    if questions is None or not list(questions):
        questions = (
            f"What capabilities are active in the {domain} domain?",
            f"Which metrics require focus for {domain}?",
            f"How should humans guide the {domain} learning loop?",
        )

    exchanges: list[QAExchange] = []

    capability_lines = _format_capability_lines(capabilities)
    metric_parts = []
    for metric, value in sorted(performance_summary.items()):
        metric_parts.append(f"{metric} ≈ {value:.2f}")
    metrics_sentence = (
        "Average performance metrics highlight "
        + ", ".join(metric_parts)
        if metric_parts
        else "Performance metrics are not yet available"
    )
    exchanges.append(
        QAExchange(
            question=questions[0],
            answer=(
                f"{domain} currently operates {len(capabilities)} capabilities:\n"
                f"{capability_lines}\n\n{metrics_sentence}."
            ),
            highlights=tuple(metric_parts),
        )
    )

    focus_lines = _format_signal_lines(negative_signals)
    reinforcement_lines = _format_signal_lines(positive_signals)
    exchanges.append(
        QAExchange(
            question=questions[1],
            answer=(
                "Key focus areas based on negative signals:\n"
                f"{focus_lines}\n\n"
                "Signals to continue reinforcing:\n"
                f"{reinforcement_lines}"
            ),
            highlights=tuple(signal.notes or signal.metric for signal in negative_signals),
        )
    )

    oversight_sections = []
    if feedback:
        oversight_sections.append(
            "Feedback priorities:\n" + "\n".join(f"- {item}" for item in feedback)
        )
    if awareness:
        oversight_sections.append(
            "Awareness insights:\n" + "\n".join(f"- {item}" for item in awareness)
        )
    if metacognition:
        oversight_sections.append(
            "Metacognition prompts:\n" + "\n".join(f"- {item}" for item in metacognition)
        )
    if not oversight_sections:
        oversight_sections.append("No explicit human oversight guidance recorded.")

    exchanges.append(
        QAExchange(
            question=questions[2],
            answer="\n\n".join(oversight_sections),
            highlights=feedback + awareness + metacognition,
        )
    )

    return QASession(
        domain=domain,
        exchanges=tuple(exchanges),
        performance_summary=performance_summary,
    )
