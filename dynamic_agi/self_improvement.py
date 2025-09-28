"""Self-improvement loop for the Dynamic AGI orchestrator."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import mean
from typing import Any, Deque, Dict, Iterable, Mapping, Optional, Sequence

from dynamic_self_awareness.engine import AwarenessContext, DynamicSelfAwareness
from dynamic_metacognition.engine import DynamicMetacognition, ReflectionContext

__all__ = [
    "ImprovementSignal",
    "LearningSnapshot",
    "ImprovementPlan",
    "DynamicSelfImprovement",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _coerce_mapping(payload: Mapping[str, Any] | None) -> Dict[str, Any]:
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    return dict(payload)


def _to_awareness_context(
    context: AwarenessContext | Mapping[str, Any] | None,
) -> AwarenessContext | None:
    if context is None:
        return None
    if isinstance(context, AwarenessContext):
        return context
    if isinstance(context, Mapping):
        return AwarenessContext(**dict(context))  # type: ignore[arg-type]
    raise TypeError("awareness context must be AwarenessContext or mapping")


def _to_reflection_context(
    context: ReflectionContext | Mapping[str, Any] | None,
) -> ReflectionContext | None:
    if context is None:
        return None
    if isinstance(context, ReflectionContext):
        return context
    if isinstance(context, Mapping):
        return ReflectionContext(**dict(context))  # type: ignore[arg-type]
    raise TypeError("reflection context must be ReflectionContext or mapping")


@dataclass(slots=True)
class ImprovementSignal:
    """Directional signal describing how the AGI should adapt."""

    metric: str
    value: float
    direction: str = "neutral"
    weight: float = 1.0
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        self.metric = self.metric.strip() or "general"
        self.value = float(self.value)
        self.direction = (self.direction or "neutral").strip().lower()
        if self.direction not in {"positive", "negative", "neutral"}:
            raise ValueError("direction must be positive, negative, or neutral")
        self.weight = max(float(self.weight), 0.0)
        if self.notes is not None:
            cleaned = self.notes.strip()
            self.notes = cleaned if cleaned else None

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "metric": self.metric,
            "value": self.value,
            "direction": self.direction,
            "weight": self.weight,
        }
        if self.notes is not None:
            payload["notes"] = self.notes
        return payload

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "ImprovementSignal":
        return cls(**dict(payload))  # type: ignore[arg-type]


@dataclass(slots=True)
class LearningSnapshot:
    """Snapshot of an AGI evaluation cycle and its telemetry."""

    output: Dict[str, Any]
    performance: Dict[str, float]
    feedback: tuple[str, ...]
    signals: tuple[ImprovementSignal, ...]
    awareness_report: Optional[Dict[str, Any]] = None
    metacognition_report: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=_utcnow)

    def to_dict(self) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "output": self.output,
            "performance": self.performance,
            "feedback": list(self.feedback),
            "signals": [signal.to_dict() for signal in self.signals],
            "timestamp": self.timestamp.isoformat(),
        }
        if self.awareness_report is not None:
            payload["awareness_report"] = self.awareness_report
        if self.metacognition_report is not None:
            payload["metacognition_report"] = self.metacognition_report
        return payload

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "LearningSnapshot":
        output = dict(payload.get("output", {}))
        performance = {
            key: float(value)
            for key, value in dict(payload.get("performance", {})).items()
        }
        feedback = tuple(str(item) for item in payload.get("feedback", []))
        signals_payload = payload.get("signals", [])
        signals = tuple(
            signal
            if isinstance(signal, ImprovementSignal)
            else ImprovementSignal.from_dict(signal)
            for signal in signals_payload
        )
        awareness_report = payload.get("awareness_report")
        metacognition_report = payload.get("metacognition_report")
        timestamp_raw = payload.get("timestamp")
        if isinstance(timestamp_raw, str):
            timestamp = datetime.fromisoformat(timestamp_raw)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            else:
                timestamp = timestamp.astimezone(timezone.utc)
        else:
            timestamp = _utcnow()
        return cls(
            output=output,
            performance=performance,
            feedback=feedback,
            signals=signals,
            awareness_report=awareness_report,
            metacognition_report=metacognition_report,
            timestamp=timestamp,
        )


@dataclass(slots=True)
class ImprovementPlan:
    """Synthesised strategy for improving the AGI across sessions."""

    focus: tuple[str, ...]
    metrics: Dict[str, float]
    actions: tuple[str, ...]
    feedback: tuple[str, ...]
    introspection: Dict[str, Any]
    summary: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "focus": list(self.focus),
            "metrics": self.metrics,
            "actions": list(self.actions),
            "feedback": list(self.feedback),
            "introspection": self.introspection,
            "summary": self.summary,
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "ImprovementPlan":
        return cls(
            focus=tuple(payload.get("focus", ())),
            metrics=dict(payload.get("metrics", {})),
            actions=tuple(payload.get("actions", ())),
            feedback=tuple(payload.get("feedback", ())),
            introspection=dict(payload.get("introspection", {})),
            summary=dict(payload.get("summary", {})),
        )


class DynamicSelfImprovement:
    """Collects run telemetry and formulates iterative improvement plans."""

    def __init__(
        self,
        *,
        history: int = 30,
        self_awareness: Optional[DynamicSelfAwareness] = None,
        metacognition: Optional[DynamicMetacognition] = None,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._history: Deque[LearningSnapshot] = deque(maxlen=history)
        self.self_awareness = self_awareness
        self.metacognition = metacognition

    def reset(self) -> None:
        self._history.clear()

    @property
    def snapshot_count(self) -> int:
        return len(self._history)

    def record_session(
        self,
        *,
        output: Mapping[str, Any] | Any,
        performance: Optional[Mapping[str, Any]] = None,
        feedback_notes: Optional[Iterable[str]] = None,
        introspection_inputs: Optional[Mapping[str, Any]] = None,
    ) -> LearningSnapshot:
        output_payload = self._serialise_output(output)
        performance_payload = {
            key: float(value)
            for key, value in _coerce_mapping(performance).items()
            if _is_number(value)
        }
        feedback = tuple(note.strip() for note in feedback_notes or () if note.strip())
        signals = self._derive_signals(performance_payload, feedback)

        awareness_report: Optional[Dict[str, Any]] = None
        metacog_report: Optional[Dict[str, Any]] = None

        if introspection_inputs:
            awareness_ctx = _to_awareness_context(introspection_inputs.get("awareness"))
            reflection_ctx = _to_reflection_context(introspection_inputs.get("reflection"))

            if awareness_ctx and self.self_awareness:
                try:
                    awareness_report = dict(
                        self.self_awareness.generate_report(awareness_ctx).as_dict()
                    )
                except RuntimeError:
                    awareness_report = None

            if reflection_ctx and self.metacognition:
                try:
                    metacog_report = dict(
                        self.metacognition.generate_report(reflection_ctx).as_dict()
                    )
                except RuntimeError:
                    metacog_report = None

        snapshot = LearningSnapshot(
            output=output_payload,
            performance=performance_payload,
            feedback=feedback,
            signals=signals,
            awareness_report=awareness_report,
            metacognition_report=metacog_report,
        )
        self._history.append(snapshot)
        return snapshot

    def generate_plan(
        self,
        *,
        window: Optional[int] = None,
    ) -> ImprovementPlan:
        if not self._history:
            raise RuntimeError("no sessions recorded")

        snapshots = list(self._history)[-window:] if window else list(self._history)
        aggregated_metrics = self._aggregate_metrics(snapshots)
        focus = self._rank_focus(aggregated_metrics)
        actions = self._actions_for_focus(focus, aggregated_metrics)
        feedback = self._collate_feedback(snapshots)
        introspection = self._latest_introspection(snapshots)

        summary = {
            "sessions_considered": len(snapshots),
            "snapshot_range": [snapshots[0].timestamp.isoformat(), snapshots[-1].timestamp.isoformat()],
            "average_metric_score": mean(aggregated_metrics.values()) if aggregated_metrics else 0.0,
        }

        return ImprovementPlan(
            focus=focus,
            metrics=aggregated_metrics,
            actions=actions,
            feedback=feedback,
            introspection=introspection,
            summary=summary,
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "history": [snapshot.to_dict() for snapshot in self._history],
        }

    @classmethod
    def from_dict(
        cls,
        payload: Mapping[str, Any],
        *,
        history: int = 30,
        self_awareness: Optional[DynamicSelfAwareness] = None,
        metacognition: Optional[DynamicMetacognition] = None,
    ) -> "DynamicSelfImprovement":
        manager = cls(
            history=history,
            self_awareness=self_awareness,
            metacognition=metacognition,
        )
        for snapshot_payload in payload.get("history", []):
            snapshot = (
                snapshot_payload
                if isinstance(snapshot_payload, LearningSnapshot)
                else LearningSnapshot.from_dict(snapshot_payload)
            )
            manager._history.append(snapshot)
        return manager

    # ----------------------------------------------------------------- helpers
    def _serialise_output(self, output: Mapping[str, Any] | Any) -> Dict[str, Any]:
        if hasattr(output, "to_dict") and callable(output.to_dict):  # type: ignore[attr-defined]
            resolved = output.to_dict()  # type: ignore[call-arg]
            if isinstance(resolved, Mapping):
                return dict(resolved)
        if isinstance(output, Mapping):
            return dict(output)
        raise TypeError("output must be mapping-like or provide to_dict()")

    def _derive_signals(
        self,
        performance: Mapping[str, float],
        feedback: Sequence[str],
    ) -> tuple[ImprovementSignal, ...]:
        signals: list[ImprovementSignal] = []
        for metric, value in performance.items():
            direction = "positive" if value >= 0 else "negative"
            notes = None
            if direction == "negative":
                notes = f"Performance under target for {metric}"
            signals.append(
                ImprovementSignal(
                    metric=metric,
                    value=value,
                    direction=direction,
                    weight=1.0 + abs(value) * 0.1,
                    notes=notes,
                )
            )

        if feedback:
            signals.append(
                ImprovementSignal(
                    metric="feedback_sentiment",
                    value=-1.0,
                    direction="negative",
                    weight=1.0 + 0.1 * len(feedback),
                    notes="Human feedback suggests refinement",
                )
            )
        return tuple(signals)

    def _aggregate_metrics(
        self, snapshots: Sequence[LearningSnapshot]
    ) -> Dict[str, float]:
        totals: Dict[str, float] = {}
        counts: Dict[str, int] = {}
        for snapshot in snapshots:
            for signal in snapshot.signals:
                metric = signal.metric
                totals[metric] = totals.get(metric, 0.0) + signal.value
                counts[metric] = counts.get(metric, 0) + 1
        return {
            metric: totals[metric] / counts[metric]
            for metric in totals
            if counts[metric]
        }

    def _rank_focus(self, metrics: Mapping[str, float]) -> tuple[str, ...]:
        if not metrics:
            return ()
        sorted_metrics = sorted(metrics.items(), key=lambda item: item[1])
        return tuple(metric for metric, _ in sorted_metrics[:3])

    def _actions_for_focus(
        self,
        focus: Sequence[str],
        metrics: Mapping[str, float],
    ) -> tuple[str, ...]:
        actions: list[str] = []
        for metric in focus:
            score = metrics.get(metric, 0.0)
            if metric == "feedback_sentiment":
                actions.append("Review human feedback and integrate adjustments into prompts")
            elif score < 0:
                actions.append(f"Investigate root cause for negative {metric} trend")
            else:
                actions.append(f"Amplify strategies driving positive {metric} results")
        if not actions:
            actions.append("Maintain current strategy while monitoring for drift")
        return tuple(actions)

    def _collate_feedback(
        self, snapshots: Sequence[LearningSnapshot]
    ) -> tuple[str, ...]:
        notes: list[str] = []
        for snapshot in snapshots:
            notes.extend(snapshot.feedback)
        return tuple(notes)

    def _latest_introspection(
        self, snapshots: Sequence[LearningSnapshot]
    ) -> Dict[str, Any]:
        awareness = None
        metacognition = None
        for snapshot in reversed(snapshots):
            if awareness is None and snapshot.awareness_report is not None:
                awareness = snapshot.awareness_report
            if metacognition is None and snapshot.metacognition_report is not None:
                metacognition = snapshot.metacognition_report
            if awareness is not None and metacognition is not None:
                break
        payload: Dict[str, Any] = {}
        if awareness is not None:
            payload["self_awareness"] = awareness
        if metacognition is not None:
            payload["metacognition"] = metacognition
        return payload


def _is_number(value: Any) -> bool:
    try:
        float(value)
    except (TypeError, ValueError):
        return False
    return True

