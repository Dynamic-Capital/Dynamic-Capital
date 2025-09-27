"""Signal fusion logic for orchestrating AI-driven trade decisions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any, Dict, Iterable, List, Optional, Sequence

if TYPE_CHECKING:  # pragma: no cover - imported lazily at runtime to avoid cycles
    from core.strategies.lorentzian import LorentzianSignalState


VALID_SIGNALS = {"BUY", "SELL", "HOLD", "NEUTRAL"}


@dataclass
class FusionComponent:
    """Normalised representation of an upstream trading signal."""

    name: str
    signal: str
    confidence: float
    score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def direction(self) -> float:
        signal_key = self.signal.upper()
        if signal_key == "BUY":
            return 1.0
        if signal_key == "SELL":
            return -1.0
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        payload = {
            "name": self.name,
            "signal": self.signal,
            "confidence": round(float(self.confidence), 4),
        }
        if self.score is not None:
            payload["score"] = float(self.score)
        if self.metadata:
            payload["metadata"] = self.metadata
        return payload


@dataclass
class AISignal:
    """Container for AI-refined trading guidance."""

    action: str
    confidence: float
    reasoning: str
    original_signal: Optional[str] = None
    components: Optional[List[Dict[str, Any]]] = None
    score: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        """Represent the signal as a serialisable dictionary."""

        return {
            "action": self.action,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "original_signal": self.original_signal,
            "components": self.components,
            "score": self.score,
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

        momentum = self._coerce_float(market_data.get("momentum"), default=0.0)
        trend = str(market_data.get("trend", "")).lower()
        ai_action = self._refine_action(raw_signal, momentum, trend)
        confidence = self._calculate_confidence(raw_signal, market_data)
        reasoning = self._build_reasoning(ai_action, confidence, market_data)

        component = FusionComponent(
            name="heuristic",
            signal=ai_action,
            confidence=confidence,
            metadata={"momentum": momentum, "trend": trend},
        )

        return AISignal(
            action=ai_action,
            confidence=confidence,
            reasoning=reasoning,
            original_signal=raw_signal,
            components=[component.to_dict()],
        )

    def _refine_action(self, raw_signal: str, momentum: float, trend: str) -> str:
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

    def _build_reasoning(self, action: str, confidence: float, market_data: Dict[str, Any]) -> str:
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

        if not comments:
            comments.append("Signal defaulted to neutral heuristics due to limited context.")

        return " ".join(comments)

    def dai_lorentzian_params(
        self, vol: float, news_bias: float, session: Optional[str]
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {
            "window": 50,
            "alpha": 0.5,
            "mode": "cauchy",
            "enter_z": 2.0,
            "exit_z": 0.5,
            "style": "mean_rev",
        }

        if vol > 0.03:
            params["alpha"] = 1.0
            params["enter_z"] = 2.5

        if news_bias > 0:
            params["style"] = "trend"

        session_key = (session or "").strip()
        if session_key in {"Asia-open", "London-open"}:
            params["enter_z"] += 0.3

        return params

    def build_lorentzian_component(
        self, prices: Sequence[float], params: Dict[str, Any]
    ) -> Optional[FusionComponent]:
        if not prices:
            return None

        from core.strategies.lorentzian import rolling_signal  # Local import avoids circular deps

        window = int(params.get("window", 50))
        alpha = float(params.get("alpha", 0.5))
        mode = str(params.get("mode", "cauchy")).lower()
        if mode not in {"cauchy", "l1"}:
            mode = "cauchy"
        style_param = str(params.get("style", "mean_rev")).lower()
        style = "trend" if style_param == "trend" else "mean_rev"
        enter_z = float(params.get("enter_z", 2.0))
        exit_z = float(params.get("exit_z", 0.5))

        state = rolling_signal(
            prices,
            window=window,
            alpha=alpha,
            mode=mode,
            style=style,  # type: ignore[arg-type]
            enter_z=enter_z,
            exit_z=exit_z,
        )

        if state is None:
            return None

        signal = state.signal
        if signal == "HOLD":
            signal = "NEUTRAL"

        confidence = min(1.0, max(0.0, abs(state.score) / 3.0))

        metadata = state.to_dict()
        metadata["style"] = style

        return FusionComponent(
            name="lorentzian",
            signal=signal,
            confidence=confidence,
            score=state.score,
            metadata=metadata,
        )

    def combine(
        self,
        components: Sequence[FusionComponent | Dict[str, Any]],
        *,
        default_signal: str = "NEUTRAL",
    ) -> AISignal:
        normalised = self._coerce_components(components)
        if not normalised:
            return AISignal(
                action="NEUTRAL",
                confidence=0.0,
                reasoning="No actionable signals provided.",
                original_signal=default_signal,
                components=[],
                score=None,
            )

        total_conf = sum(max(comp.confidence, 0.0) for comp in normalised)
        weighted = sum(comp.direction() * max(comp.confidence, 0.0) for comp in normalised)

        if total_conf <= 0:
            final_action = "NEUTRAL"
            final_confidence = 0.0
        else:
            ratio = weighted / total_conf
            if ratio > 0:
                final_action = "BUY"
            elif ratio < 0:
                final_action = "SELL"
            else:
                final_action = "NEUTRAL"
            final_confidence = min(1.0, abs(ratio))

        reasoning = self._compose_component_reasoning(
            normalised, final_action, final_confidence
        )

        return AISignal(
            action=final_action,
            confidence=round(final_confidence, 2),
            reasoning=reasoning,
            original_signal=default_signal,
            components=[component.to_dict() for component in normalised],
            score=round(weighted, 4),
        )

    def _coerce_components(
        self, components: Sequence[FusionComponent | Dict[str, Any]]
    ) -> List[FusionComponent]:
        normalised: List[FusionComponent] = []
        for index, component in enumerate(components):
            if component is None:
                continue
            if isinstance(component, FusionComponent):
                normalised.append(component)
                continue
            if not isinstance(component, dict):
                continue
            name = str(component.get("name") or f"component-{index+1}")
            signal = str(component.get("signal", "NEUTRAL")).upper()
            confidence = float(component.get("confidence", 0.0))
            score = component.get("score")
            metadata = component.get("metadata") or {}
            if signal not in VALID_SIGNALS:
                signal = "NEUTRAL"
            normalised.append(
                FusionComponent(
                    name=name,
                    signal=signal,
                    confidence=max(0.0, confidence),
                    score=float(score) if score is not None else None,
                    metadata=dict(metadata),
                )
            )
        return normalised

    def _compose_component_reasoning(
        self,
        components: Sequence[FusionComponent],
        final_action: str,
        final_confidence: float,
    ) -> str:
        fragments: List[str] = []
        for component in components:
            fragments.append(
                f"{component.name}: {component.signal} ({component.confidence:.2f})"
            )

        if final_action == "NEUTRAL":
            summary = "Fusion neutral after balancing component votes."
        else:
            summary = (
                f"Combined vote favours {final_action} with {final_confidence:.2f} confidence."
            )
        fragments.append(summary)
        return " ".join(fragments)

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
