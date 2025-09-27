"""Metacognitive reflection engine for Dynamic Capital."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "MetaSignal",
    "ReflectionContext",
    "MetacognitiveReport",
    "DynamicMetacognition",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


@dataclass(slots=True)
class MetaSignal:
    """Weighted reflection about how thinking unfolded."""

    domain: str
    insight: str
    impact: float = 0.5
    stability: float = 0.5
    friction: float = 0.0
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)
    source: str | None = None

    def __post_init__(self) -> None:
        self.domain = self.domain.strip().lower() or "general"
        self.insight = self.insight.strip()
        if not self.insight:
            raise ValueError("insight must not be empty")
        self.impact = _clamp(float(self.impact))
        self.stability = _clamp(float(self.stability))
        self.friction = _clamp(float(self.friction))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if self.source is not None:
            cleaned = self.source.strip()
            self.source = cleaned if cleaned else None


@dataclass(slots=True)
class ReflectionContext:
    """Snapshot of the practitioner's learning environment."""

    learning_goal: str
    time_available: float
    cognitive_load: float
    emotion_state: str
    support_available: float
    recent_breakthroughs: int = 0
    stuck_points: int = 0
    sleep_quality: float = 0.5
    energy_reserve: float = 0.5

    def __post_init__(self) -> None:
        self.learning_goal = self.learning_goal.strip()
        if not self.learning_goal:
            raise ValueError("learning_goal must not be empty")
        self.time_available = _clamp(float(self.time_available))
        self.cognitive_load = _clamp(float(self.cognitive_load))
        self.emotion_state = self.emotion_state.strip() or "neutral"
        self.support_available = _clamp(float(self.support_available))
        self.recent_breakthroughs = max(int(self.recent_breakthroughs), 0)
        self.stuck_points = max(int(self.stuck_points), 0)
        self.sleep_quality = _clamp(float(self.sleep_quality))
        self.energy_reserve = _clamp(float(self.energy_reserve))

    @property
    def is_depleted(self) -> bool:
        return self.energy_reserve <= 0.4 or self.sleep_quality <= 0.45


@dataclass(slots=True)
class MetacognitiveReport:
    """Structured guidance for the next reflection loop."""

    awareness_level: float
    learning_readiness: float
    stress_index: float
    dominant_domains: tuple[str, ...]
    reflection_prompts: tuple[str, ...]
    recommended_experiments: tuple[str, ...]
    support_actions: tuple[str, ...]
    narrative: str

    def as_dict(self) -> Mapping[str, object]:
        return {
            "awareness_level": self.awareness_level,
            "learning_readiness": self.learning_readiness,
            "stress_index": self.stress_index,
            "dominant_domains": list(self.dominant_domains),
            "reflection_prompts": list(self.reflection_prompts),
            "recommended_experiments": list(self.recommended_experiments),
            "support_actions": list(self.support_actions),
            "narrative": self.narrative,
        }


class DynamicMetacognition:
    """Aggregate metacognitive signals and generate a reflection report."""

    def __init__(self, *, history: int = 50) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._signals: Deque[MetaSignal] = deque(maxlen=history)

    # -------------------------------------------------------------- intake
    def capture(self, signal: MetaSignal | Mapping[str, object]) -> MetaSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[MetaSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def reset(self) -> None:
        self._signals.clear()

    def _coerce_signal(self, signal: MetaSignal | Mapping[str, object]) -> MetaSignal:
        if isinstance(signal, MetaSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MetaSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be MetaSignal or mapping")

    # ------------------------------------------------------------ reporting
    def generate_report(self, context: ReflectionContext) -> MetacognitiveReport:
        if not self._signals:
            raise RuntimeError("no metacognitive signals captured")

        awareness = self._awareness_level(context)
        readiness = self._learning_readiness(context)
        stress = self._stress_index(context)
        domains = self._dominant_domains()
        prompts = self._reflection_prompts(context, domains, awareness, stress)
        experiments = self._experiments(context)
        actions = self._support_actions(context, stress)
        narrative = self._narrative(context, awareness, readiness, stress, domains)

        return MetacognitiveReport(
            awareness_level=round(awareness, 3),
            learning_readiness=round(readiness, 3),
            stress_index=round(stress, 3),
            dominant_domains=domains,
            reflection_prompts=prompts,
            recommended_experiments=experiments,
            support_actions=actions,
            narrative=narrative,
        )

    # -------------------------------------------------------------- helpers
    def _weighted_metric(self, selector: Callable[[MetaSignal], float]) -> float:
        total_weight = sum(signal.weight for signal in self._signals)
        if total_weight <= 0:
            return 0.0
        aggregate = sum(selector(signal) * signal.weight for signal in self._signals)
        return _clamp(aggregate / total_weight)

    def _awareness_level(self, context: ReflectionContext) -> float:
        impact = self._weighted_metric(lambda signal: signal.impact)
        stability = self._weighted_metric(lambda signal: signal.stability)
        friction = self._weighted_metric(lambda signal: signal.friction)
        base = 0.5 * impact + 0.3 * stability - 0.2 * friction
        modifier = 0.1 * context.support_available - 0.05 * context.cognitive_load
        return _clamp(base + modifier)

    def _learning_readiness(self, context: ReflectionContext) -> float:
        stability = self._weighted_metric(lambda signal: signal.stability)
        friction = self._weighted_metric(lambda signal: signal.friction)
        base = 0.4 * context.energy_reserve + 0.25 * (1.0 - context.cognitive_load)
        base += 0.2 * stability - 0.2 * friction
        base += 0.15 * context.time_available + 0.1 * context.support_available
        return _clamp(base)

    def _stress_index(self, context: ReflectionContext) -> float:
        friction = self._weighted_metric(lambda signal: signal.friction)
        base = 0.55 * context.cognitive_load + 0.2 * friction
        fatigue = 0.15 * (1.0 - context.sleep_quality) + 0.1 * (1.0 - context.energy_reserve)
        return _clamp(base + fatigue)

    def _dominant_domains(self) -> tuple[str, ...]:
        counter: Counter[str] = Counter(signal.domain for signal in self._signals)
        if not counter:
            return ()
        return tuple(domain for domain, _ in counter.most_common(3))

    def _reflection_prompts(
        self,
        context: ReflectionContext,
        domains: tuple[str, ...],
        awareness: float,
        stress: float,
    ) -> tuple[str, ...]:
        prompts: list[str] = []
        for domain in domains:
            prompts.append(f"What pattern is emerging in {domain}?")
        if awareness < 0.5:
            prompts.append("Map assumptions versus observable evidence.")
        if stress >= 0.6:
            prompts.append("Name the stressors and design a release ritual.")
        if context.stuck_points >= 2:
            prompts.append("Identify one constraint you can relax or redesign.")
        if not prompts:
            prompts.append("Capture one learning insight before moving on.")
        return tuple(dict.fromkeys(prompts))

    def _experiments(self, context: ReflectionContext) -> tuple[str, ...]:
        stability = self._weighted_metric(lambda signal: signal.stability)
        friction = self._weighted_metric(lambda signal: signal.friction)
        experiments: list[str] = []
        if context.stuck_points >= 1 or friction >= 0.5:
            experiments.append("Run a 15-minute micro-experiment to test the next move.")
        if stability <= 0.4:
            experiments.append("Document failure modes and rehearse the recovery script.")
        if context.recent_breakthroughs == 0 and stability >= 0.6:
            experiments.append("Share one insight with your accountability partner.")
        if context.is_depleted:
            experiments.append("Schedule an active recovery block before the next sprint.")
        if not experiments:
            experiments.append("Log what worked and queue the next iteration.")
        return tuple(dict.fromkeys(experiments))

    def _support_actions(self, context: ReflectionContext, stress: float) -> tuple[str, ...]:
        actions: list[str] = []
        if context.support_available < 0.4:
            actions.append("Schedule mentor or peer check-in for feedback.")
        elif context.support_available < 0.7:
            actions.append("Share reflection highlights with a peer for perspective.")
        if context.is_depleted:
            actions.append("Plan a recovery ritual before committing to new goals.")
        if stress >= 0.65:
            actions.append("Block protected time for focused work without inputs.")
        if not actions:
            actions.append("Maintain current support cadence.")
        return tuple(dict.fromkeys(actions))

    def _narrative(
        self,
        context: ReflectionContext,
        awareness: float,
        readiness: float,
        stress: float,
        domains: tuple[str, ...],
    ) -> str:
        domain_summary = ", ".join(domains) if domains else "no dominant domains"
        return (
            f"Goal: {context.learning_goal}. "
            f"Awareness at {int(round(awareness * 100))}% and readiness {int(round(readiness * 100))}%. "
            f"Stress index at {int(round(stress * 100))}%. "
            f"Domains in focus: {domain_summary}. "
            f"Current emotional tone: {context.emotion_state}."
        )

