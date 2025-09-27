"""Mindset coaching engine that transforms telemetry into actionable rituals."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "MindsetSignal",
    "MindsetContext",
    "MindsetPlan",
    "MindsetCoach",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


@dataclass(slots=True)
class MindsetSignal:
    """Discrete qualitative observation about trader psychology."""

    category: str
    description: str
    intensity: int = 1
    weight: float = 1.0
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.category = self.category.strip().lower() or "general"
        self.description = self.description.strip()
        self.intensity = int(_clamp(float(self.intensity), low=1.0, high=5.0))
        self.weight = max(float(self.weight), 0.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)


@dataclass(slots=True)
class MindsetContext:
    """Structured telemetry about a trader's upcoming session."""

    session_energy: float
    focus_drift: float
    recent_drawdown: float
    market_volatility: float
    sleep_hours: float
    wins_in_row: int = 0
    losses_in_row: int = 0
    is_macro_day: bool = False
    journaling_complete: bool = True

    def normalised_energy(self) -> float:
        return _clamp(self.session_energy)

    def normalised_focus(self) -> float:
        return _clamp(1.0 - self.focus_drift)

    def pressure_factor(self) -> float:
        streak_delta = self.losses_in_row - self.wins_in_row
        streak_pressure = _clamp(max(streak_delta, 0) / 3.0)
        drawdown_pressure = _clamp(self.recent_drawdown / 3.0)
        macro_pressure = 0.15 if self.is_macro_day else 0.0
        return _clamp(drawdown_pressure + streak_pressure + macro_pressure, high=1.5)


@dataclass(slots=True)
class MindsetPlan:
    """Recommended rituals and cues for a trading session."""

    focus_score: float
    stability_score: float
    activation_level: float
    risk_posture: str
    pre_session: tuple[str, ...]
    in_session: tuple[str, ...]
    post_session: tuple[str, ...]
    reset_protocols: tuple[str, ...]
    affirmations: tuple[str, ...]

    @property
    def should_reduce_risk(self) -> bool:
        return self.risk_posture == "defensive"

    def as_dict(self) -> Mapping[str, object]:
        return {
            "focus_score": self.focus_score,
            "stability_score": self.stability_score,
            "activation_level": self.activation_level,
            "risk_posture": self.risk_posture,
            "pre_session": list(self.pre_session),
            "in_session": list(self.in_session),
            "post_session": list(self.post_session),
            "reset_protocols": list(self.reset_protocols),
            "affirmations": list(self.affirmations),
        }


class MindsetCoach:
    """Aggregate qualitative signals and craft a mindset ritual plan."""

    def __init__(self, *, history: int = 40) -> None:
        self._signals: Deque[MindsetSignal] = deque(maxlen=history)

    # ------------------------------------------------------------ signal intake
    def capture(self, signal: MindsetSignal | Mapping[str, object]) -> MindsetSignal:
        resolved = self._coerce_signal(signal)
        self._signals.append(resolved)
        return resolved

    def extend(self, signals: Iterable[MindsetSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.capture(signal)

    def _coerce_signal(self, signal: MindsetSignal | Mapping[str, object]) -> MindsetSignal:
        if isinstance(signal, MindsetSignal):
            return signal

        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return MindsetSignal(**payload)  # type: ignore[arg-type]

        raise TypeError("signal must be MindsetSignal or mapping")

    # ----------------------------------------------------------- plan building
    def build_plan(self, context: MindsetContext) -> MindsetPlan:
        focus_score = self._focus_score(context)
        stability_score = self._stability_score(context)
        activation_level = self._activation_level(context, focus_score)
        risk_posture = self._risk_posture(context, focus_score, stability_score)

        history_affirmations = self._affirmations()
        pre_session = self._pre_session_actions(context, focus_score)
        in_session = self._in_session_actions(context, risk_posture)
        post_session = self._post_session_actions(context)
        reset_protocols = self._reset_actions(stability_score)

        affirmations = tuple(history_affirmations or ("Today I trade the plan, not the emotion.",))

        return MindsetPlan(
            focus_score=focus_score,
            stability_score=stability_score,
            activation_level=activation_level,
            risk_posture=risk_posture,
            pre_session=tuple(pre_session),
            in_session=tuple(in_session),
            post_session=tuple(post_session),
            reset_protocols=tuple(reset_protocols),
            affirmations=affirmations,
        )

    # ----------------------------------------------------------------- helpers
    def _focus_score(self, context: MindsetContext) -> float:
        base = 0.6 * context.normalised_energy() + 0.4 * context.normalised_focus()
        penalty = 0.15 if not context.journaling_complete else 0.0
        signal_penalty = self._signal_pressure("focus", default=0.0)
        score = _clamp(base - penalty - signal_penalty)
        return round(score, 3)

    def _stability_score(self, context: MindsetContext) -> float:
        rest_bonus = _clamp(context.sleep_hours / 8.0, high=1.0)
        pressure = _clamp(context.pressure_factor() + self._signal_pressure("stress", default=0.0), high=1.5)
        base = _clamp(0.7 * rest_bonus + 0.3 * (1.0 - context.market_volatility))
        score = _clamp(base - 0.4 * pressure)
        return round(score, 3)

    def _activation_level(self, context: MindsetContext, focus_score: float) -> float:
        bias = 0.3 if context.wins_in_row >= 2 else 0.0
        fatigue = 0.25 if context.losses_in_row >= 2 else 0.0
        history_bias = self._signal_pressure("lethargy", default=0.0) * 0.5
        level = _clamp(focus_score + bias - fatigue - history_bias)
        return round(level, 3)

    def _risk_posture(self, context: MindsetContext, focus: float, stability: float) -> str:
        drawdown_flag = context.recent_drawdown >= 1.0 or context.losses_in_row >= 2
        macro_flag = context.is_macro_day and context.market_volatility > 0.6
        low_focus = focus < 0.45
        low_stability = stability < 0.4
        signal_flag = self._signal_pressure("fear", default=0.0) > 0.2

        if drawdown_flag or macro_flag or low_focus or low_stability or signal_flag:
            return "defensive"

        if focus > 0.75 and stability > 0.7 and context.wins_in_row >= 2:
            return "assertive"

        return "balanced"

    def _pre_session_actions(self, context: MindsetContext, focus: float) -> Sequence[str]:
        steps = ["Review top three process cues", "Breathe 4-7-8 for two cycles"]
        if focus < 0.5 or self._signal_pressure("focus") > 0.2:
            steps.append("Run 5-minute priming visualization")
        if context.recent_drawdown >= 1.0:
            steps.append("Rewrite risk guardrails and position limits")
        if not context.journaling_complete:
            steps.append("Close the loop on yesterday's journal before opening charts")
        return steps

    def _in_session_actions(self, context: MindsetContext, posture: str) -> Sequence[str]:
        steps = ["Check posture + breathing every 30 minutes"]
        if posture == "defensive":
            steps.append("Trade only A+ setups with half risk")
            steps.append("Use checklist verbalisation before entries")
        elif posture == "assertive":
            steps.append("Allow scale-ins when structure confirms")
        else:
            steps.append("Keep risk per trade at baseline allocation")
        if self._signal_pressure("tilt") > 0.2:
            steps.append("Set 2 trade max before mandatory break")
        return steps

    def _post_session_actions(self, context: MindsetContext) -> Sequence[str]:
        steps = ["Tag emotional state for each trade", "Record one gratitude note"]
        if context.losses_in_row >= 2 or context.recent_drawdown >= 1.5:
            steps.append("Message accountability partner with review summary")
        if self._signal_pressure("avoidance") > 0.0:
            steps.append("Ship journal entry within 30 minutes of close")
        return steps

    def _reset_actions(self, stability: float) -> Sequence[str]:
        if stability >= 0.6:
            return ["Maintain current recovery cadence"]
        if stability >= 0.4:
            return ["Schedule midday walk", "Hydrate before next session"]
        return ["Full reset: step away for 90 minutes", "Do nervous system downshift drill"]

    def _signal_pressure(self, category: str, *, default: float = 0.1) -> float:
        if not self._signals:
            return default
        weights = [signal.weight * signal.intensity for signal in self._signals if signal.category == category]
        if not weights:
            return default
        return round(_clamp(fmean(weights) / 5.0, high=1.5), 3)

    def _affirmations(self) -> Sequence[str]:
        if not self._signals:
            return ()
        counts = Counter(signal.category for signal in self._signals)
        affirmations: list[str] = []
        if counts.get("fear", 0) > 0:
            affirmations.append("I respect risk and execute without hesitation.")
        if counts.get("focus", 0) > 0:
            affirmations.append("My attention is anchored to the present trade.")
        if counts.get("confidence", 0) > 0:
            affirmations.append("Evidence from my prep backs my conviction today.")
        if not affirmations:
            return ()
        return affirmations
