"""Signal fusion logic for orchestrating AI-driven trade decisions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional


VALID_SIGNALS = {"BUY", "SELL", "HOLD", "NEUTRAL"}

ACTION_THRESHOLD = 0.2
ACTION_TOLERANCE = 1e-6

_ACTION_TO_SCORE = {"BUY": 1.0, "SELL": -1.0}


def score_to_action(
    score: float,
    *,
    neutral_action: str = "NEUTRAL",
    threshold: float = ACTION_THRESHOLD,
    tolerance: float = ACTION_TOLERANCE,
) -> str:
    """Return the discrete action corresponding to a blended ``score``.

    The helper mirrors the tolerances used by the real-time Dynamic Algos so
    that boundary scores (for example 0.1999999) resolve in the same
    direction.  A small symmetric ``tolerance`` keeps floating point error from
    flipping BUY/SELL intents when human overrides blend with automation.
    """

    upper_threshold = threshold - tolerance
    lower_threshold = -threshold + tolerance

    if score >= upper_threshold:
        return "BUY"
    if score <= lower_threshold:
        return "SELL"
    return neutral_action


@dataclass
class AISignal:
    """Container for AI-refined trading guidance."""

    action: str
    confidence: float
    reasoning: str
    original_signal: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Represent the signal as a serialisable dictionary."""

        return {
            "action": self.action,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "original_signal": self.original_signal,
        }


class DynamicFusionAlgo:
    """Fuse raw TradingView alerts with lightweight AI heuristics."""

    def __init__(self, *, neutral_confidence: float = 0.55, boost_topics: Optional[Iterable[str]] = None) -> None:
        self.neutral_confidence = neutral_confidence
        self.boost_topics: List[str] = [topic.lower() for topic in boost_topics] if boost_topics else []

    def generate_signal(self, market_data: Dict[str, Any]) -> AISignal:
        """Derive an actionable signal from the provided market payload."""

        raw_signal = str(market_data.get("signal", "NEUTRAL")).upper()
        if raw_signal not in VALID_SIGNALS:
            raw_signal = "NEUTRAL"

        extra_notes: List[str] = []

        ai_action = self._refine_action(raw_signal, market_data)
        confidence = self._calculate_confidence(raw_signal, market_data)

        ai_action, confidence, risk_note = self._apply_risk_overrides(
            ai_action,
            confidence,
            market_data,
        )
        if risk_note:
            extra_notes.append(risk_note)

        ai_action, confidence, human_note = self._blend_with_human_bias(
            ai_action,
            confidence,
            market_data,
        )
        if human_note:
            extra_notes.append(human_note)

        ai_action, confidence, post_human_risk_note = self._apply_risk_overrides(
            ai_action,
            confidence,
            market_data,
        )
        if post_human_risk_note and post_human_risk_note not in extra_notes:
            extra_notes.append(post_human_risk_note)

        reasoning = self._build_reasoning(ai_action, confidence, market_data, extra_notes)

        return AISignal(action=ai_action, confidence=confidence, reasoning=reasoning, original_signal=raw_signal)

    def _refine_action(self, raw_signal: str, market_data: Dict[str, Any]) -> str:
        composite_score = self._derive_composite_score(raw_signal, market_data)
        if composite_score is not None:
            composite_action = self._score_to_action(composite_score)
            if composite_action != "NEUTRAL" or raw_signal in {"BUY", "SELL"}:
                return composite_action

        momentum = self._coerce_float(market_data.get("momentum"), default=0.0)
        trend = str(market_data.get("trend", "")).lower()

        if momentum > 0.6 and raw_signal == "BUY":
            return "BUY"
        if momentum < -0.6 and raw_signal == "SELL":
            return "SELL"

        if trend in {"bullish", "uptrend"} and raw_signal in {"BUY", "HOLD", "NEUTRAL"}:
            return "BUY"
        if trend in {"bearish", "downtrend"} and raw_signal in {"SELL", "HOLD", "NEUTRAL"}:
            return "SELL"

        return raw_signal

    def _derive_composite_score(self, raw_signal: str, market_data: Dict[str, Any]) -> float | None:
        """Blend structured indicators into a directional score in ``[-1, 1]``.

        The method allows the fusion algo to react to richer payloads such as
        quantitative model outputs or curated analyst sentiment without forcing
        callers to pre-compute the final action. When no meaningful inputs are
        present the method returns ``None`` to preserve prior behaviour.
        """

        contributions: List[tuple[float, float]] = []

        def add_component(value: Optional[float], weight: float) -> None:
            if value is None or weight <= 0:
                return
            clamped = max(-1.0, min(1.0, value))
            contributions.append((clamped, weight))

        add_component(self._action_to_score(raw_signal), 0.4)

        momentum = market_data.get("momentum")
        add_component(self._safe_float(momentum), 0.35)

        sentiment_value = self._sentiment_to_scalar(market_data.get("sentiment"))
        add_component(sentiment_value, 0.25)

        alignment = self._safe_float(market_data.get("signal_alignment"))
        if alignment is not None:
            add_component(alignment, 0.2)

        composite_inputs = market_data.get("composite_scores") or market_data.get("model_scores")
        if isinstance(composite_inputs, Iterable) and not isinstance(composite_inputs, (str, bytes, bytearray)):
            aggregated = [self._safe_float(value) for value in composite_inputs]
            valid_scores = [value for value in aggregated if value is not None]
            if valid_scores:
                add_component(sum(valid_scores) / len(valid_scores), 0.3)

        if not contributions:
            return None

        numerator = sum(value * weight for value, weight in contributions)
        denominator = sum(weight for _, weight in contributions)
        if denominator == 0:
            return None

        return numerator / denominator

    def _calculate_confidence(self, raw_signal: str, market_data: Dict[str, Any]) -> float:
        base_confidence = self._coerce_float(market_data.get("confidence"), default=self.neutral_confidence)
        volatility = self._coerce_float(market_data.get("volatility"), default=0.0)
        news_topics = [str(topic).lower() for topic in self._normalise_news_topics(market_data.get("news"))]

        confidence = max(0.0, min(1.0, base_confidence))

        if any(topic in self.boost_topics for topic in news_topics):
            confidence = min(1.0, confidence + 0.1)

        if volatility > 1.5:
            confidence = max(0.0, confidence - 0.15)
        elif volatility < 0.5:
            confidence = min(1.0, confidence + 0.05)

        alignment = market_data.get("signal_alignment")
        if alignment is not None:
            alignment_value = max(-1.0, min(1.0, self._coerce_float(alignment, default=0.0)))
            if alignment_value > 0:
                confidence = min(1.0, confidence + min(0.2, alignment_value * 0.15))
            elif alignment_value < 0:
                confidence = max(0.0, confidence + max(-0.2, alignment_value * 0.2))

        data_quality = market_data.get("data_quality")
        if data_quality is not None:
            quality_score = max(0.0, min(1.0, self._coerce_float(data_quality, default=1.0)))
            if quality_score < 0.5:
                confidence = max(0.0, confidence - (0.5 - quality_score) * 0.3)

        risk_score = market_data.get("risk_score")
        if risk_score is not None:
            risk_value = max(0.0, min(1.0, self._coerce_float(risk_score, default=0.0)))
            confidence = max(0.0, confidence - risk_value * 0.2)

        drawdown = market_data.get("drawdown")
        if drawdown is not None:
            drawdown_value = abs(self._coerce_float(drawdown, default=0.0))
            if drawdown_value > 5:
                confidence = max(0.0, confidence - min(0.25, (drawdown_value - 5) * 0.01))

        if raw_signal == "NEUTRAL":
            confidence = min(confidence, 0.5)

        return round(confidence, 2)

    def _build_reasoning(
        self,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
        annotations: Iterable[str] | None,
    ) -> str:
        comments: List[str] = []

        trend = market_data.get("trend")
        momentum = market_data.get("momentum")
        support = market_data.get("support_level")
        resistance = market_data.get("resistance_level")

        if trend:
            comments.append(f"Trend analysis points to {trend} conditions.")
        if momentum is not None:
            comments.append(f"Momentum score at {momentum} influenced the decision.")
        if support and action == "BUY":
            comments.append(f"Support level near {support} provides downside protection.")
        if resistance and action == "SELL":
            comments.append(f"Resistance near {resistance} caps upside potential.")

        if confidence >= 0.75:
            comments.append("High confidence due to signal alignment across indicators.")
        elif confidence <= 0.35:
            comments.append("Low confidence – risk controls recommended before execution.")

        if annotations:
            comments.extend(note for note in annotations if note)

        if not comments:
            comments.append("Signal defaulted to neutral heuristics due to limited context.")

        return " ".join(comments)

    def mm_parameters(
        self,
        market_data: Dict[str, Any],
        treasury: Dict[str, Any],
        inventory: float,
    ) -> Dict[str, float]:
        """Return adaptive market-making parameters based on risk context."""

        sigma = self._coerce_float(market_data.get("volatility"), default=0.01)
        treasury_balance = self._coerce_float(treasury.get("balance"), default=100_000.0)

        params: Dict[str, float] = {
            "gamma": 0.1,
            "kappa": 1.0,
            "T": 60.0,
            "spread_floor": 0.001,
        }

        if treasury_balance > 500_000:
            params["gamma"] = 0.05

        if sigma > 0.05:
            params["spread_floor"] = 0.005

        if abs(inventory) > 1_000:
            params["gamma"] = max(params["gamma"], 0.2)

        return params

    @staticmethod
    def _coerce_float(value: Any, *, default: float) -> float:
        """Attempt to cast a value to float, falling back to a default on failure."""

        if value is None:
            return default

        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _normalise_news_topics(raw_topics: Any) -> Iterable[Any]:
        """Return an iterable of news topics regardless of the incoming payload shape."""

        if raw_topics is None:
            return []
        if isinstance(raw_topics, str):
            return [raw_topics]
        if isinstance(raw_topics, (bytes, bytearray)):
            return [raw_topics]
        if isinstance(raw_topics, Iterable):
            return raw_topics
        return [raw_topics]

    def _blend_with_human_bias(
        self,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
    ) -> tuple[str, float, str | None]:
        human_bias_raw = (
            market_data.get("human_bias")
            or market_data.get("analyst_bias")
            or market_data.get("human_analysis")
        )
        if not human_bias_raw:
            return action, confidence, None

        human_bias = str(human_bias_raw).upper()
        if human_bias not in VALID_SIGNALS:
            return action, confidence, None

        default_weight = 0.25 if human_bias in {"BUY", "SELL"} else 0.0
        human_weight = self._coerce_float(
            market_data.get("human_weight"),
            default=default_weight,
        )
        human_weight = max(0.0, min(1.0, human_weight))
        if human_weight == 0.0:
            return action, confidence, None

        base_score = self._action_to_score(action)
        human_score = self._action_to_score(human_bias)
        combined = (base_score * (1.0 - human_weight)) + (human_score * human_weight)

        divergence = base_score * human_score < 0
        if divergence and human_weight >= 0.5:
            fused_action = human_bias
            combined = human_score * human_weight
        else:
            fused_action = self._score_to_action(combined)

        influence = max(abs(combined), human_weight if divergence else 0.0)
        boosted_confidence = max(
            confidence,
            min(1.0, round(confidence + human_weight * 0.25 + influence * 0.25, 2)),
        )

        if fused_action != action:
            note = (
                f"Human analysis ({human_bias}) adjusted action to {fused_action}"
                f" with weight {human_weight:.2f}."
            )
        else:
            note = (
                f"Human analysis ({human_bias}) aligned with automation"
                f" at weight {human_weight:.2f}."
            )

        return fused_action, boosted_confidence, note

    @staticmethod
    def _action_to_score(action: str) -> float:
        return _ACTION_TO_SCORE.get(action, 0.0)

    @staticmethod
    def _score_to_action(score: float) -> str:
        return score_to_action(score)

    @staticmethod
    def _safe_float(value: Any) -> Optional[float]:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _sentiment_to_scalar(sentiment: Any) -> Optional[float]:
        if sentiment is None:
            return None
        sentiment_str = str(sentiment).strip().lower()
        if not sentiment_str:
            return None
        if sentiment_str in {"bullish", "positive", "up"}:
            return 1.0
        if sentiment_str in {"bearish", "negative", "down"}:
            return -1.0
        if sentiment_str in {"neutral", "sideways"}:
            return 0.0
        try:
            value = float(sentiment_str)
        except ValueError:
            return None
        return max(-1.0, min(1.0, value))

    def _apply_risk_overrides(
        self,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
    ) -> tuple[str, float, str | None]:
        risk_score = self._safe_float(market_data.get("risk_score"))
        circuit_breaker = bool(market_data.get("circuit_breaker"))
        drawdown = self._safe_float(market_data.get("drawdown"))

        updated_action = action
        updated_confidence = confidence
        note: Optional[str] = None

        if circuit_breaker:
            updated_action = "NEUTRAL"
            updated_confidence = min(updated_confidence, 0.35)
            note = "Circuit breaker active – automation constrained to neutral."

        elif risk_score is not None and risk_score >= 0.75:
            updated_action = "HOLD" if action in {"BUY", "SELL"} else "NEUTRAL"
            updated_confidence = min(updated_confidence, 0.4)
            note = "High systemic risk reduced aggressiveness of the trade call."

        if drawdown is not None and drawdown <= -10:
            updated_action = "NEUTRAL"
            updated_confidence = min(updated_confidence, 0.4)
            drawdown_note = "Recent drawdown triggered capital preservation mode."
            note = drawdown_note if note is None else f"{note} {drawdown_note}"

        return updated_action, round(updated_confidence, 2), note
