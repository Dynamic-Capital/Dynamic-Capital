"""Signal fusion logic for orchestrating AI-driven trade decisions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional


VALID_SIGNALS = {"BUY", "SELL", "HOLD", "NEUTRAL"}


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

        ai_action = self._refine_action(raw_signal, market_data)
        confidence = self._calculate_confidence(raw_signal, market_data)
        ai_action, confidence, human_note = self._blend_with_human_bias(
            ai_action,
            confidence,
            market_data,
        )
        reasoning = self._build_reasoning(ai_action, confidence, market_data, human_note)

        return AISignal(action=ai_action, confidence=confidence, reasoning=reasoning, original_signal=raw_signal)

    def _refine_action(self, raw_signal: str, market_data: Dict[str, Any]) -> str:
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

        if raw_signal == "NEUTRAL":
            confidence = min(confidence, 0.5)

        return round(confidence, 2)

    def _build_reasoning(
        self,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
        human_note: str | None,
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

        if human_note:
            comments.append(human_note)

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
        fused_action = self._score_to_action(combined)

        influence = abs(combined)
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
        if action == "BUY":
            return 1.0
        if action == "SELL":
            return -1.0
        return 0.0

    @staticmethod
    def _score_to_action(score: float) -> str:
        if score > 0.2:
            return "BUY"
        if score < -0.2:
            return "SELL"
        return "NEUTRAL"
