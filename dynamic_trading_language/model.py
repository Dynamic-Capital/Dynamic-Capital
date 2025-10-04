"""Language modelling utilities that narrate Dynamic Capital trade ideas."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Mapping, Sequence

from dynamic_orderflow.engine import OrderFlowImbalance
from .fields import TradingDiscipline, get_trading_discipline

__all__ = [
    "TradeIntent",
    "DeskEnvironment",
    "MarketNarrative",
    "OrderFlowSignal",
    "DynamicTradingLanguageModel",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    cleaned = " ".join(value.split())
    if cleaned:
        return cleaned
    if allow_empty:
        return ""
    raise ValueError("text value must not be empty")


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(value.split())
    return cleaned or None


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = " ".join(str(value).split())
        if cleaned and cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, float] | None) -> Mapping[str, float] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metrics must be a mapping")
    cleaned: dict[str, float] = {}
    for key, value in mapping.items():
        text_key = _normalise_text(str(key))
        cleaned[text_key] = float(value)
    return cleaned


def _normalise_optional_float(value: float | int | None) -> float | None:
    if value is None:
        return None
    return max(float(value), 0.0)


def _normalise_optional_int(value: int | None) -> int | None:
    if value is None:
        return None
    return max(int(value), 0)


@dataclass(slots=True)
class OrderFlowSignal:
    """Encapsulates order flow pressure for narrative optimisation."""

    dominant_side: str
    intensity: float
    bias: float
    average_latency: float | None = None
    sample_size: int | None = None
    commentary: str | None = None

    def __post_init__(self) -> None:
        self.dominant_side = _normalise_text(self.dominant_side).lower()
        if self.dominant_side not in {"buy", "sell", "neutral"}:
            raise ValueError("dominant_side must be 'buy', 'sell', or 'neutral'")
        self.intensity = _clamp(float(self.intensity))
        self.bias = _clamp(float(self.bias))
        self.average_latency = _normalise_optional_float(self.average_latency)
        self.sample_size = _normalise_optional_int(self.sample_size)
        self.commentary = _normalise_optional_text(self.commentary)


@dataclass(slots=True)
class TradeIntent:
    """Structured representation of a potential trade expression."""

    instrument: str
    direction: str
    conviction: float
    timeframe: str
    catalysts: Sequence[str] | None = None
    entry: float | None = None
    target: float | None = None
    stop: float | None = None
    reasoning: str | None = None
    risk_notes: Sequence[str] | None = None
    metrics: Mapping[str, float] | None = None
    style: str = "discretionary"
    created_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.instrument = _normalise_text(self.instrument)
        self.direction = _normalise_text(self.direction).lower()
        if self.direction not in {"long", "short", "flat"}:
            raise ValueError("direction must be 'long', 'short', or 'flat'")
        self.conviction = _clamp(float(self.conviction))
        self.timeframe = _normalise_text(self.timeframe)
        self.catalysts = _normalise_tuple(self.catalysts)
        self.reasoning = _normalise_optional_text(self.reasoning)
        self.risk_notes = _normalise_tuple(self.risk_notes)
        self.metrics = _coerce_mapping(self.metrics)
        self.style = _normalise_text(self.style)
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)
        if self.entry is not None:
            self.entry = self._validate_level(self.entry, "entry")
        if self.target is not None:
            self.target = self._validate_level(self.target, "target")
        if self.stop is not None:
            self.stop = self._validate_level(self.stop, "stop")

    @staticmethod
    def _validate_level(value: float | int, field_name: str) -> float:
        level = float(value)
        if not math.isfinite(level):
            raise ValueError(f"{field_name} must be finite")
        if level <= 0:
            raise ValueError(f"{field_name} must be positive")
        return level

    @property
    def narrative_direction(self) -> str:
        if self.direction == "flat":
            return "range-bound"
        return self.direction

    @property
    def has_levels(self) -> bool:
        return self.entry is not None or self.target is not None or self.stop is not None


@dataclass(slots=True)
class DeskEnvironment:
    """Desk posture that influences how language should be framed."""

    regime: str
    risk_appetite: float
    volatility: float
    liquidity: float
    macro_backdrop: str
    narrative_bias: float = 0.0
    communication_style: str = "institutional"

    def __post_init__(self) -> None:
        self.regime = _normalise_text(self.regime)
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.volatility = max(0.0, float(self.volatility))
        self.liquidity = _clamp(float(self.liquidity))
        self.macro_backdrop = _normalise_text(self.macro_backdrop)
        self.narrative_bias = _clamp(float(self.narrative_bias), lower=-1.0, upper=1.0)
        self.communication_style = _normalise_text(self.communication_style)

    @property
    def volatility_regime(self) -> str:
        if self.volatility < 0.35:
            return "calm"
        if self.volatility < 0.75:
            return "balanced"
        return "stressed"

    @property
    def tone_modifier(self) -> float:
        if self.volatility_regime == "stressed":
            return 0.85
        if self.risk_appetite < 0.45:
            return 0.9
        return 1.05


@dataclass(slots=True)
class MarketNarrative:
    """Language model output summarising the trade idea."""

    headline: str
    thesis: str
    key_levels: Sequence[str]
    risk_mitigation: Sequence[str]
    call_to_action: str
    confidence: float
    style: str
    insights: Sequence[str] = field(default_factory=tuple)
    tags: Sequence[str] = field(default_factory=tuple)
    discipline: TradingDiscipline | None = None
    discipline_subjects: Sequence[str] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.headline = _normalise_text(self.headline)
        self.thesis = _normalise_text(self.thesis)
        self.call_to_action = _normalise_text(self.call_to_action)
        self.style = _normalise_text(self.style)
        self.confidence = _clamp(float(self.confidence))
        self.key_levels = _normalise_tuple(self.key_levels)
        self.risk_mitigation = _normalise_tuple(self.risk_mitigation)
        self.insights = _normalise_tuple(self.insights)
        self.tags = _normalise_tuple(self.tags)
        if self.discipline is not None and not isinstance(self.discipline, TradingDiscipline):
            raise TypeError("discipline must be a TradingDiscipline instance or None")
        self.discipline_subjects = _normalise_tuple(self.discipline_subjects)
        if self.discipline_subjects and self.discipline is None:
            raise ValueError("discipline_subjects cannot be set without a discipline")
        if self.discipline and self.discipline_subjects:
            allowed = {subject.casefold() for subject in self.discipline.subjects}
            invalid = [
                subject for subject in self.discipline_subjects if subject.casefold() not in allowed
            ]
            if invalid:
                raise ValueError(
                    "discipline_subjects must be members of the provided discipline"
                )
        if self.discipline and not self.discipline_subjects:
            self.discipline_subjects = self.discipline.subjects

    def to_markdown(self) -> str:
        """Render the narrative as a markdown deck for distribution."""

        lines: list[str] = [f"# {self.headline}", "", "## Thesis", self.thesis]

        lines.extend(["", "## Key Levels"])
        if self.key_levels:
            lines.extend(f"- {level}" for level in self.key_levels)
        else:  # pragma: no cover - defensive branch
            lines.append("- None specified")

        lines.extend(["", "## Risk Mitigation"])
        if self.risk_mitigation:
            lines.extend(f"- {item}" for item in self.risk_mitigation)
        else:  # pragma: no cover - defensive branch
            lines.append("- Maintain disciplined execution")

        lines.extend(["", "## Call To Action", self.call_to_action])

        lines.extend(
            [
                "",
                "## Meta",
                f"- Style: {self.style}",
                f"- Confidence: {self.confidence:.0%}",
            ]
        )

        if self.insights:
            lines.extend(["", "## Desk Insights"])
            lines.extend(f"- {insight}" for insight in self.insights)

        if self.tags:
            lines.extend(["", "## Tags", ", ".join(self.tags)])

        if self.discipline:
            lines.extend(["", "## Discipline Context", f"- Field: {self.discipline.name}"])
            if self.discipline_subjects:
                lines.append("- Subjects: " + ", ".join(self.discipline_subjects))

        return "\n".join(lines) + "\n"


class DynamicTradingLanguageModel:
    """Crafts institutional-grade narratives for Dynamic Capital trade ideas."""

    __slots__ = ("_tone", "_tone_upper", "_guardrails")

    def __init__(self, *, tone: str = "institutional", guardrails: Sequence[str] | None = None) -> None:
        self._tone = _normalise_text(tone)
        self._tone_upper = self._tone.upper()
        self._guardrails = _normalise_tuple(guardrails)

    def _coerce_orderflow(
        self,
        order_flow: OrderFlowSignal | OrderFlowImbalance | Mapping[str, float] | None,
    ) -> OrderFlowSignal | None:
        if order_flow is None:
            return None
        if isinstance(order_flow, OrderFlowSignal):
            return order_flow
        if isinstance(order_flow, OrderFlowImbalance):
            dominant_side = order_flow.dominant_side
            intensity = order_flow.intensity
            bias = order_flow.bias
            return OrderFlowSignal(
                dominant_side=dominant_side,
                intensity=intensity,
                bias=bias,
                commentary="Orderflow imbalance derived from desk telemetry",
            )
        if isinstance(order_flow, Mapping):
            lowered: dict[str, object] = {}
            for key, value in order_flow.items():
                lowered[key.lower()] = value

            if {"buy_notional", "sell_notional"}.issubset(lowered):
                imbalance = OrderFlowImbalance(
                    buy_notional=float(lowered.get("buy_notional", 0.0)),
                    sell_notional=float(lowered.get("sell_notional", 0.0)),
                    total_notional=float(lowered.get("total_notional", 0.0)),
                )
                return self._coerce_orderflow(imbalance)

            dominant = lowered.get("dominant_side")
            intensity_value = lowered.get("intensity")
            bias_value = lowered.get("bias")

            if dominant is None or intensity_value is None or bias_value is None:
                raise ValueError(
                    "order_flow mapping must include dominant_side, intensity, and bias keys"
                )

            commentary_value = lowered.get("commentary")
            commentary_text = (
                _normalise_optional_text(str(commentary_value))
                if commentary_value is not None
                else None
            )

            return OrderFlowSignal(
                dominant_side=str(dominant),
                intensity=float(intensity_value),
                bias=float(bias_value),
                average_latency=_normalise_optional_float(lowered.get("average_latency")),
                sample_size=_normalise_optional_int(lowered.get("sample_size")),
                commentary=commentary_text,
            )
        raise TypeError("order_flow must be OrderFlowSignal, OrderFlowImbalance, mapping, or None")

    @property
    def tone(self) -> str:
        return self._tone

    @property
    def guardrails(self) -> tuple[str, ...]:
        return self._guardrails

    def _extend_unique(self, target: list[str], values: Sequence[str] | None, seen: set[str]) -> None:
        if not values:
            return
        for value in values:
            cleaned = (value or "").strip()
            if not cleaned:
                continue
            lowered = cleaned.casefold()
            if lowered not in seen:
                seen.add(lowered)
                target.append(cleaned)

    def _desired_flow_direction(self, intent: TradeIntent) -> str:
        direction_map = {"long": "buy", "short": "sell", "flat": "neutral"}
        return direction_map.get(intent.direction, "neutral")

    def _score_confidence(
        self,
        intent: TradeIntent,
        environment: DeskEnvironment | None,
        order_flow_signal: OrderFlowSignal | None,
    ) -> tuple[float, list[str], list[str]]:
        base_confidence = 0.35 + intent.conviction * 0.5
        guidance: list[str] = []
        flow_risk: list[str] = []

        if environment:
            base_confidence *= environment.tone_modifier
            base_confidence += environment.risk_appetite * 0.1
            base_confidence += environment.narrative_bias * 0.05
        else:
            base_confidence += 0.02  # encourage a minimum level of conviction

        desired_flow_direction = self._desired_flow_direction(intent)

        if order_flow_signal:
            signal_direction = order_flow_signal.dominant_side
            impact_scale = min(0.25, order_flow_signal.intensity * 0.3 + order_flow_signal.bias * 0.15)

            if desired_flow_direction == signal_direction and desired_flow_direction != "neutral":
                base_confidence += impact_scale
                guidance.append(
                    "Lean into aggressive liquidity pockets while programs support the tape."
                )
            elif desired_flow_direction != "neutral" and signal_direction != "neutral":
                base_confidence -= min(0.3, impact_scale + 0.05)
                guidance.append(
                    "Execute patiently via passive clips to respect opposing flow."
                )
                flow_risk.append(
                    "Manage participation carefully given opposing flow pressure"
                )
            else:
                guidance.append("Monitor order book shifts for confirmation before sizing aggressively.")
        else:
            guidance.append("Scale risk only once liquidity validation confirms the setup.")

        return _clamp(base_confidence), guidance, flow_risk

    def _compose_thesis(
        self,
        intent: TradeIntent,
        environment: DeskEnvironment | None,
        context_insights: tuple[str, ...],
        sentiment_text: str | None,
        order_flow_signal: OrderFlowSignal | None,
        discipline_summary: str | None,
    ) -> str:
        thesis_parts: list[str] = []
        thesis_parts.append(
            f"Dynamic desk sees a {intent.narrative_direction} opportunity in {intent.instrument}."
        )

        if intent.reasoning:
            thesis_parts.append(f"Rationale: {intent.reasoning}.")

        if intent.catalysts:
            catalysts = ", ".join(intent.catalysts)
            thesis_parts.append(f"Catalysts: {catalysts}.")

        if context_insights:
            thesis_parts.append("Supplementary insights: " + "; ".join(context_insights) + ".")

        if environment:
            thesis_parts.append(
                "Desk context: "
                f"Regime {environment.regime} with {environment.volatility_regime} volatility and "
                f"liquidity at {environment.liquidity:.0%}."
            )
            thesis_parts.append(f"Macro backdrop: {environment.macro_backdrop}.")

        if sentiment_text:
            thesis_parts.append(f"Sentiment lens: {sentiment_text}.")

        if order_flow_signal:
            thesis_parts.append(
                "Order flow skew: "
                f"{order_flow_signal.dominant_side.upper()} bias at {order_flow_signal.bias:.0%} "
                f"with intensity {order_flow_signal.intensity:.0%}."
            )
            if order_flow_signal.average_latency is not None:
                thesis_parts.append(
                    f"Execution latency: {order_flow_signal.average_latency:.2f}s average response."
                )
            if order_flow_signal.commentary:
                commentary = order_flow_signal.commentary
                if commentary and commentary[-1] not in ".!?":
                    commentary += "."
                thesis_parts.append(commentary)

        if discipline_summary:
            thesis_parts.append(discipline_summary)

        return " ".join(thesis_parts)

    def _compose_key_levels(
        self,
        intent: TradeIntent,
        order_flow_signal: OrderFlowSignal | None,
    ) -> list[str]:
        key_levels: list[str] = []
        if intent.entry is not None:
            key_levels.append(f"Entry: {intent.entry:.4f}")
        if intent.target is not None:
            key_levels.append(f"Target: {intent.target:.4f}")
        if intent.stop is not None:
            key_levels.append(f"Risk invalidation: {intent.stop:.4f}")
        if intent.metrics:
            metrics_snippet = ", ".join(f"{k}: {v:.2f}" for k, v in intent.metrics.items())
            key_levels.append(f"Quant metrics — {metrics_snippet}")
        if order_flow_signal:
            key_levels.append(
                "Order flow dominance: "
                f"{order_flow_signal.dominant_side.upper()} ({order_flow_signal.bias:.0%} bias, "
                f"intensity {order_flow_signal.intensity:.0%})"
            )
            if order_flow_signal.sample_size:
                key_levels.append(f"Order flow sample size: {order_flow_signal.sample_size} prints")

        if not key_levels:
            key_levels.append("No explicit levels provided — lean on liquidity zones and volatility bands")
        return key_levels

    def _compose_risk_items(
        self,
        environment: DeskEnvironment | None,
        order_flow_risk: Sequence[str],
        intent: TradeIntent,
    ) -> list[str]:
        risk_items = list(self._guardrails)
        seen = {item.casefold() for item in risk_items}

        self._extend_unique(risk_items, intent.risk_notes, seen)

        if environment and environment.volatility_regime == "stressed":
            self._extend_unique(
                risk_items,
                ("Size positions defensively given stressed volatility regime",),
                seen,
            )
        if not intent.has_levels:
            self._extend_unique(
                risk_items,
                ("Define entry, target, and risk levels before allocating capital",),
                seen,
            )
        self._extend_unique(risk_items, order_flow_risk, seen)

        if not risk_items:
            risk_items.append("Maintain disciplined execution and validate liquidity before entry")
        return risk_items

    def _compose_call_to_action(
        self,
        intent: TradeIntent,
        timeframe_text: str,
        execution_guidance: Sequence[str],
    ) -> str:
        base = (
            f"Structure the {intent.direction} expression over the {timeframe_text} horizon, "
            "staging entries around outlined levels and synchronising with desk risk checks."
        )
        if not intent.has_levels:
            base += " Anchor sizing to real-time liquidity signposts until levels are defined."
        if execution_guidance:
            base += " " + " ".join(execution_guidance)
        return base

    def _compose_tags(
        self,
        intent: TradeIntent,
        environment: DeskEnvironment | None,
        order_flow_signal: OrderFlowSignal | None,
        discipline: TradingDiscipline | None,
        discipline_subjects: Sequence[str],
    ) -> tuple[str, ...]:
        tags = {
            intent.instrument.upper(),
            intent.direction.upper(),
            intent.timeframe.upper(),
            self._tone_upper,
        }
        if environment:
            tags.add(environment.volatility_regime.upper())
        if order_flow_signal:
            tags.add("ORDERFLOW")
            tags.add(f"FLOW_{order_flow_signal.dominant_side.upper()}")
            if order_flow_signal.intensity >= 0.65:
                tags.add("FLOW_STRONG")
        if discipline:
            tags.add(discipline.name.upper())
            tags.update(subject.upper() for subject in discipline_subjects)
        return tuple(sorted(tags))

    def _resolve_discipline_context(
        self,
        discipline: TradingDiscipline | str | None,
        focus_subjects: Sequence[str] | None,
    ) -> tuple[TradingDiscipline | None, tuple[str, ...]]:
        if discipline is None:
            if focus_subjects:
                raise ValueError("discipline focus subjects require a discipline")
            return None, ()

        resolved = (
            discipline if isinstance(discipline, TradingDiscipline) else get_trading_discipline(discipline)
        )

        if not focus_subjects:
            return resolved, resolved.subjects

        allowed: dict[str, str] = {subject.casefold(): subject for subject in resolved.subjects}
        selected: list[str] = []
        seen: set[str] = set()
        for subject in focus_subjects:
            cleaned = " ".join(str(subject).split())
            if not cleaned:
                continue
            key = cleaned.casefold()
            if key not in allowed:
                raise ValueError(
                    f"Unknown subject '{subject}' for trading discipline {resolved.name}"
                )
            canonical = allowed[key]
            if canonical not in seen:
                seen.add(canonical)
                selected.append(canonical)

        if not selected:
            return resolved, resolved.subjects

        return resolved, tuple(selected)

    def generate_narrative(
        self,
        intent: TradeIntent,
        *,
        environment: DeskEnvironment | None = None,
        insights: Sequence[str] | None = None,
        sentiment: str | None = None,
        order_flow: OrderFlowSignal | OrderFlowImbalance | Mapping[str, float] | None = None,
        discipline: TradingDiscipline | str | None = None,
        discipline_focus: Sequence[str] | None = None,
    ) -> MarketNarrative:
        """Translate a structured intent into a trading narrative."""

        context_insights = _normalise_tuple(insights)
        sentiment_text = _normalise_optional_text(sentiment)
        order_flow_signal = self._coerce_orderflow(order_flow)
        discipline_context, discipline_subjects = self._resolve_discipline_context(
            discipline, discipline_focus
        )

        confidence, execution_guidance, order_flow_risk = self._score_confidence(
            intent, environment, order_flow_signal
        )

        direction_phrase = intent.narrative_direction.upper()
        timeframe_text = intent.timeframe.lower()
        headline = f"{direction_phrase} {intent.instrument} setup — {timeframe_text} focus"

        discipline_summary = None
        if discipline_context:
            if discipline_subjects:
                subjects = ", ".join(discipline_subjects)
                discipline_summary = (
                    f"Discipline focus: {discipline_context.name} emphasising {subjects}."
                )
            else:
                discipline_summary = f"Discipline focus: {discipline_context.name}."

        thesis = self._compose_thesis(
            intent,
            environment,
            context_insights,
            sentiment_text,
            order_flow_signal,
            discipline_summary,
        )

        key_levels = self._compose_key_levels(intent, order_flow_signal)

        risk_items = self._compose_risk_items(environment, order_flow_risk, intent)

        call_to_action = self._compose_call_to_action(intent, timeframe_text, execution_guidance)

        tags = self._compose_tags(
            intent, environment, order_flow_signal, discipline_context, discipline_subjects
        )

        narrative = MarketNarrative(
            headline=headline,
            thesis=thesis,
            key_levels=key_levels,
            risk_mitigation=risk_items,
            call_to_action=call_to_action,
            confidence=confidence,
            style=environment.communication_style if environment else self._tone,
            insights=context_insights,
            tags=tags,
            discipline=discipline_context,
            discipline_subjects=discipline_subjects,
        )
        return narrative
