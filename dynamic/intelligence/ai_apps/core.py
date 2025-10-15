"""Signal fusion logic for orchestrating AI-driven trade decisions."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
import json
from statistics import fmean
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Dict,
    Iterable,
    List,
    Mapping,
    Optional,
    Protocol,
    Sequence,
    Set,
    Tuple,
)

from .dolphin_adapter import LLMIntegrationError

if TYPE_CHECKING:  # pragma: no cover - used for typing only
    from .dolphin_adapter import DolphinLlamaCppAdapter
    from .ollama_adapter import OllamaAdapter


class ReasoningAdapter(Protocol):
    """Protocol describing the LLM adapter interface used by the fusion core."""

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Dict[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        ...


VALID_SIGNALS = {"BUY", "SELL", "HOLD", "NEUTRAL"}

ACTION_THRESHOLD = 0.2
ACTION_TOLERANCE = 1e-6

_ACTION_TO_SCORE = {"BUY": 1.0, "SELL": -1.0}

_DRAWDOWN_CONFIDENCE_THRESHOLD = 0.04
_DRAWDOWN_CONFIDENCE_MAX_PENALTY = 0.3
_DRAWDOWN_CONFIDENCE_EXTRA = 0.05
_DRAWDOWN_CONFIDENCE_CAP = 0.35
_DRAWDOWN_HOLD_THRESHOLD = 0.09
_DRAWDOWN_NEUTRAL_THRESHOLD = 0.12

_CRYPTO_TICKER_HINTS = (
    "BTC",
    "XBT",
    "ETH",
    "XRP",
    "BNB",
    "SOL",
    "ADA",
    "DOGE",
    "DOT",
    "LTC",
    "XLM",
    "TON",
    "AVAX",
    "SHIB",
    "MATIC",
    "USDT",
    "USDC",
    "BUSD",
    "DAI",
    "BCH",
    "XMR",
    "LINK",
    "ATOM",
    "NEAR",
    "APT",
    "ARB",
    "OP",
    "PERP",
)

_CRYPTO_TICKER_HINTS_SET: Set[str] = frozenset(_CRYPTO_TICKER_HINTS)

_COMMON_QUOTE_TOKENS = {
    "USD",
    "USDT",
    "USDC",
    "USDK",
    "USDD",
    "USDP",
    "USDX",
    "EUR",
    "GBP",
    "JPY",
    "CNY",
    "KRW",
    "TRY",
    "AUD",
    "CAD",
    "CHF",
    "SGD",
    "HKD",
    "NZD",
    "ZAR",
    "BRL",
    "MXN",
    "IDR",
    "RUB",
    "INR",
    "BTC",
    "ETH",
    "BNB",
    "BUSD",
    "DAI",
    "PERP",
}


_DERIVATIVE_SUFFIXES: Tuple[str, ...] = (
    "PERP",
    "SWAP",
    "THISWEEK",
    "NEXTWEEK",
    "QUARTER",
    "F0",
    "F1",
    "F2",
    "F3",
    "F4",
    "F5",
    "F6",
    "F7",
    "F8",
    "F9",
    "1S",
    "2S",
    "3S",
    "4S",
    "5S",
    "10S",
    "1L",
    "2L",
    "3L",
    "4L",
    "5L",
    "10L",
    "UP",
    "DOWN",
    "BULL",
    "BEAR",
    "LONG",
    "SHORT",
    "M",
    "H",
)


def _strip_quote_suffix(token: str) -> str:
    """Remove derivative suffixes and numeric settlements from quote tokens."""

    candidate = token
    while candidate:
        stripped = False
        for suffix in _DERIVATIVE_SUFFIXES:
            if candidate.endswith(suffix):
                next_candidate = candidate[: -len(suffix)]
                # Keep recognised quote tokens such as "PERP" intact instead of
                # stripping them down to an empty string.
                if not next_candidate and candidate in _COMMON_QUOTE_TOKENS:
                    return candidate
                candidate = next_candidate
                stripped = True
                break
        if stripped:
            continue

        truncated = candidate.rstrip("0123456789")
        if truncated != candidate:
            candidate = truncated
            continue
        break

    return candidate


@dataclass(frozen=True)
class CompositeComponent:
    """Weighted contributor participating in the composite score blend."""

    name: str
    value: float
    weight: float

    @property
    def contribution(self) -> float:
        """Return the weighted influence of the component."""

        return self.value * self.weight

    def to_dict(self, *, total_weight: float | None = None) -> Dict[str, Any]:
        """Serialise the component for downstream diagnostics."""

        payload: Dict[str, Any] = {
            "name": self.name,
            "value": round(self.value, 4),
            "weight": round(self.weight, 4),
            "contribution": round(self.contribution, 4),
        }
        if total_weight and total_weight > 0:
            payload["weight_share"] = round(self.weight / total_weight, 4)
        return payload


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


@dataclass(frozen=True)
class PreparedMarketContext:
    """Normalised view of the raw ``market_data`` payload."""

    source_signal: str
    resolved_signal: str
    momentum: Optional[float]
    trend: Optional[str]
    sentiment_value: Optional[float]
    composite_scores: Tuple[float, ...]
    composite_trimmed_mean: Optional[float]
    indicator_panel: Tuple[Tuple[str, float], ...]
    volatility: float
    news_topics: Tuple[str, ...]
    alignment: Optional[float]
    data_quality: Optional[float]
    risk_score: Optional[float]
    drawdown: Optional[float]
    base_confidence: float
    support_level: Any
    resistance_level: Any
    human_bias: Optional[str]
    human_weight: Optional[float]
    symbol: Optional[str]
    asset_class: Optional[str]
    circuit_breaker: bool

    def __post_init__(self) -> None:
        if self.resolved_signal not in VALID_SIGNALS:
            raise ValueError(f"PreparedMarketContext requires a valid signal, got {self.resolved_signal}")


def _normalise_topic(topic: Any) -> str:
    return str(topic).strip().lower()


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


class DynamicFusionAlgo:
    """Fuse raw TradingView alerts with lightweight AI heuristics."""

    def __init__(
        self,
        *,
        neutral_confidence: float = 0.55,
        boost_topics: Optional[Iterable[str]] = None,
        llm_adapter: Optional[ReasoningAdapter] = None,
        reasoning_cache_size: int = 16,
    ) -> None:
        self.neutral_confidence = neutral_confidence
        self.boost_topics: Set[str] = {topic.lower() for topic in boost_topics} if boost_topics else set()
        self.llm_adapter: Optional[ReasoningAdapter] = llm_adapter
        self.reasoning_cache_size = max(0, reasoning_cache_size)
        self._reasoning_cache: "OrderedDict[str, str]" = OrderedDict()

    def prepare_context(self, market_data: Mapping[str, Any]) -> "PreparedMarketContext":
        """Public helper exposing the normalised market context."""

        return self._prepare_context(dict(market_data))

    def generate_signal(
        self,
        market_data: Mapping[str, Any],
        *,
        context: "PreparedMarketContext" | None = None,
    ) -> AISignal:
        """Derive an actionable signal from the provided market payload.

        Callers that already computed a :class:`PreparedMarketContext` can
        reuse it via the ``context`` keyword to avoid recomputing the
        normalisation pipeline.
        """

        payload = dict(market_data)
        prepared = context or self._prepare_context(payload)
        raw_signal = prepared.resolved_signal

        extra_notes: List[str] = []

        consensus_lookup = self._build_consensus_provider(prepared)

        ai_action, strategy_note = self._refine_action(prepared)
        if strategy_note:
            extra_notes.append(strategy_note)
        confidence, consensus = self._calculate_confidence(prepared, ai_action, consensus_lookup)
        consensus_action = ai_action

        ai_action, confidence, risk_note = self._apply_risk_overrides(ai_action, confidence, prepared)
        if risk_note:
            extra_notes.append(risk_note)

        ai_action, confidence, human_note = self._blend_with_human_bias(ai_action, confidence, prepared)
        if human_note:
            extra_notes.append(human_note)

        ai_action, confidence, post_human_risk_note = self._apply_risk_overrides(ai_action, confidence, prepared)
        if post_human_risk_note and post_human_risk_note not in extra_notes:
            extra_notes.append(post_human_risk_note)

        if ai_action != consensus_action:
            consensus = consensus_lookup(ai_action)
            consensus_action = ai_action

        reasoning = self._build_reasoning(ai_action, confidence, prepared, extra_notes, consensus)
        reasoning = self._maybe_enhance_reasoning(
            action=ai_action,
            confidence=confidence,
            market_data=payload,
            base_reasoning=reasoning,
        )

        return AISignal(action=ai_action, confidence=confidence, reasoning=reasoning, original_signal=raw_signal)

    def prepare_training_example(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return feature payloads describing how a signal decision was derived."""

        context = self._prepare_context(market_data)
        composite_score = self._derive_composite_score(context)
        consensus_lookup = self._build_consensus_provider(context)

        base_action, strategy_note = self._refine_action(context)
        base_confidence, base_consensus = self._calculate_confidence(
            context, base_action, consensus_lookup
        )

        annotations: List[str] = []
        if strategy_note:
            annotations.append(strategy_note)
        final_action = base_action
        final_confidence = base_confidence

        final_action, final_confidence, risk_note = self._apply_risk_overrides(
            final_action, final_confidence, context
        )
        if risk_note:
            annotations.append(risk_note)

        final_action, final_confidence, human_note = self._blend_with_human_bias(
            final_action, final_confidence, context
        )
        if human_note:
            annotations.append(human_note)

        final_action, final_confidence, post_human_risk_note = self._apply_risk_overrides(
            final_action, final_confidence, context
        )
        if post_human_risk_note and post_human_risk_note not in annotations:
            annotations.append(post_human_risk_note)

        final_consensus = consensus_lookup(final_action)

        features = self._training_features_from_context(context)

        consensus_by_action = {
            action: consensus_lookup(action) for action in sorted(VALID_SIGNALS)
        }

        return {
            "features": features,
            "source_signal": context.source_signal,
            "resolved_signal": context.resolved_signal,
            "composite_score": composite_score,
            "composite_trimmed_mean": context.composite_trimmed_mean,
            "base_action": base_action,
            "base_confidence": base_confidence,
            "base_consensus": base_consensus,
            "final_action": final_action,
            "final_confidence": final_confidence,
            "final_consensus": final_consensus,
            "consensus_by_action": consensus_by_action,
            "annotations": annotations,
        }

    def _prepare_context(self, market_data: Dict[str, Any]) -> PreparedMarketContext:
        raw_signal = str(market_data.get("signal", "NEUTRAL")).upper()
        resolved_signal = raw_signal if raw_signal in VALID_SIGNALS else "NEUTRAL"

        symbol = self._resolve_symbol(market_data)
        asset_class = self._resolve_asset_class(market_data, symbol)

        momentum = self._safe_float(market_data.get("momentum"))
        trend_value = market_data.get("trend")
        trend = str(trend_value).lower() if trend_value is not None else None
        sentiment_value = self._sentiment_to_scalar(market_data.get("sentiment"))

        composite_source = market_data.get("composite_scores") or market_data.get("model_scores")
        composite_scores: Tuple[float, ...] = ()

        iterable_source: Iterable[Any] | None = None
        if isinstance(composite_source, Mapping):
            iterable_source = composite_source.values()
        elif isinstance(composite_source, Iterable) and not isinstance(
            composite_source, (str, bytes, bytearray)
        ):
            iterable_source = composite_source

        if iterable_source is not None:
            scores: List[float] = []
            for value in iterable_source:
                coerced = self._safe_float(value)
                if coerced is not None:
                    scores.append(_clamp(coerced, -1.0, 1.0))
            composite_scores = tuple(scores)

        composite_trimmed_mean: Optional[float] = None
        if composite_scores:
            composite_trimmed_mean = self._trimmed_mean(composite_scores)

        alignment_raw = self._safe_float(market_data.get("signal_alignment"))
        alignment = _clamp(alignment_raw, -1.0, 1.0) if alignment_raw is not None else None

        indicator_panel: List[Tuple[str, float]] = [
            ("resolved_signal_bias", self._action_to_score(resolved_signal))
        ]

        if momentum is not None:
            indicator_panel.append(("momentum", _clamp(momentum, -1.0, 1.0)))

        if sentiment_value is not None:
            indicator_panel.append(("sentiment_value", _clamp(sentiment_value, -1.0, 1.0)))

        if alignment is not None:
            indicator_panel.append(("alignment", alignment))

        if composite_trimmed_mean is not None:
            indicator_panel.append(("composite_trimmed_mean", composite_trimmed_mean))

        volatility = self._coerce_float(market_data.get("volatility"), default=0.0)
        news_topics = tuple(
            _normalise_topic(topic)
            for topic in self._normalise_news_topics(market_data.get("news"))
            if str(topic).strip()
        )

        data_quality_raw = self._safe_float(market_data.get("data_quality"))
        data_quality = _clamp(data_quality_raw, 0.0, 1.0) if data_quality_raw is not None else None

        risk_score_raw = self._safe_float(market_data.get("risk_score"))
        risk_score = _clamp(risk_score_raw, 0.0, 1.0) if risk_score_raw is not None else None

        drawdown = self._safe_float(market_data.get("drawdown"))
        base_confidence = self._coerce_float(market_data.get("confidence"), default=self.neutral_confidence)

        support_level = market_data.get("support_level")
        resistance_level = market_data.get("resistance_level")

        human_bias_raw = (
            market_data.get("human_bias")
            or market_data.get("analyst_bias")
            or market_data.get("human_analysis")
        )
        human_bias = None
        if human_bias_raw:
            candidate = str(human_bias_raw).upper()
            if candidate in VALID_SIGNALS:
                human_bias = candidate

        human_weight: Optional[float] = None
        if human_bias is not None:
            default_weight = 0.25 if human_bias in {"BUY", "SELL"} else 0.0
            weight_value = market_data.get("human_weight")
            human_weight = self._coerce_float(weight_value, default=default_weight)
            human_weight = _clamp(human_weight, 0.0, 1.0)

        circuit_breaker = bool(market_data.get("circuit_breaker"))

        return PreparedMarketContext(
            source_signal=raw_signal,
            resolved_signal=resolved_signal,
            momentum=momentum,
            trend=trend,
            sentiment_value=sentiment_value,
            composite_scores=composite_scores,
            composite_trimmed_mean=composite_trimmed_mean,
            indicator_panel=tuple(indicator_panel),
            volatility=volatility,
            news_topics=news_topics,
            alignment=alignment,
            data_quality=data_quality,
            risk_score=risk_score,
            drawdown=drawdown,
            base_confidence=base_confidence,
            support_level=support_level,
            resistance_level=resistance_level,
            human_bias=human_bias,
            human_weight=human_weight,
            symbol=symbol,
            asset_class=asset_class,
            circuit_breaker=circuit_breaker,
        )

    @staticmethod
    def _resolve_symbol(market_data: Mapping[str, Any]) -> str | None:
        for key in ("symbol", "ticker", "instrument", "pair", "market_symbol"):
            candidate = market_data.get(key)
            if candidate is None:
                continue
            text = str(candidate).strip().upper()
            if text:
                return text
        return None

    @classmethod
    def _resolve_asset_class(
        cls, market_data: Mapping[str, Any], symbol: str | None
    ) -> str | None:
        for key in (
            "asset_class",
            "assetClass",
            "asset_type",
            "assetType",
            "asset_category",
            "assetCategory",
            "category",
            "instrument_class",
            "market",
        ):
            candidate = market_data.get(key)
            if candidate is None:
                continue
            text = str(candidate).strip().lower()
            if text:
                return text
        if cls._is_crypto_symbol(symbol):
            return "crypto"
        return None

    @staticmethod
    def _symbol_token(symbol: str | None) -> str:
        if not symbol:
            return ""
        token = str(symbol).upper()
        for char in ("/", "-", "_", ":", ".", " ", "!"):
            token = token.replace(char, "")
        return token

    @classmethod
    def _is_crypto_symbol(cls, symbol: str | None) -> bool:
        token = cls._symbol_token(symbol)
        if not token:
            return False

        hints = _CRYPTO_TICKER_HINTS_SET
        if token in hints:
            return True

        segments: List[str] = []
        current = []
        for char in token:
            if char.isalpha():
                current.append(char)
            else:
                if current:
                    segments.append("".join(current))
                    current = []
        if current:
            segments.append("".join(current))

        if segments:
            for segment in segments:
                if segment in hints:
                    return True

        for hint in hints:
            if token.startswith(hint):
                suffix = token[len(hint) :]
                if suffix and cls._token_looks_like_quote(suffix):
                    return True
            if token.endswith(hint):
                prefix = token[: -len(hint)]
                if prefix and cls._token_looks_like_quote(prefix):
                    return True

        return False

    @staticmethod
    def _token_looks_like_quote(token: str) -> bool:
        if not token or token.isdigit():
            return False
        candidate = _strip_quote_suffix(token)
        if not candidate:
            return False
        return candidate in _COMMON_QUOTE_TOKENS

    def _is_crypto_context(self, context: "PreparedMarketContext") -> bool:
        if context.asset_class and context.asset_class.lower() == "crypto":
            return True
        if self._is_crypto_symbol(context.symbol):
            return True
        return False

    def _refine_action(self, context: "PreparedMarketContext") -> tuple[str, Optional[str]]:
        strategy_note: Optional[str] = None
        action = context.resolved_signal

        composite_score = self._derive_composite_score(context)
        if composite_score is not None:
            composite_action = self._score_to_action(composite_score)
            if composite_action != "NEUTRAL" or context.resolved_signal in {"BUY", "SELL"}:
                action = composite_action

        momentum = context.momentum or 0.0
        trend = context.trend or ""

        if momentum > 0.6 and context.resolved_signal == "BUY":
            action = "BUY"
        if momentum < -0.6 and context.resolved_signal == "SELL":
            action = "SELL"

        if trend in {"bullish", "uptrend"} and context.resolved_signal in {"BUY", "HOLD", "NEUTRAL"}:
            action = "BUY"
        if trend in {"bearish", "downtrend"} and context.resolved_signal in {"SELL", "HOLD", "NEUTRAL"}:
            action = "SELL"

        action, dip_note = self._apply_crypto_buy_the_dip(action, context)
        if dip_note:
            strategy_note = dip_note

        return action, strategy_note

    def _apply_crypto_buy_the_dip(
        self, action: str, context: "PreparedMarketContext"
    ) -> tuple[str, Optional[str]]:
        if not self._is_crypto_context(context):
            return action, None
        if context.circuit_breaker:
            return action, None

        drawdown = context.drawdown
        if drawdown is None or drawdown >= -0.03:
            return action, None

        dip_magnitude = abs(drawdown)
        if dip_magnitude < 0.04:
            return action, None

        long_term_bias = 0.0
        if context.trend in {"bullish", "uptrend"}:
            long_term_bias += 0.4
        if context.composite_trimmed_mean is not None and context.composite_trimmed_mean > 0:
            long_term_bias += min(0.3, context.composite_trimmed_mean)
        if context.sentiment_value is not None and context.sentiment_value > 0:
            long_term_bias += min(0.2, context.sentiment_value)
        if context.alignment is not None and context.alignment > 0:
            long_term_bias += min(0.15, context.alignment * 0.5)
        if context.support_level:
            long_term_bias += 0.1

        short_term_pressure = 0.0
        if context.momentum is not None and context.momentum < 0:
            short_term_pressure += min(0.3, abs(context.momentum))
        if context.sentiment_value is not None and context.sentiment_value < 0:
            short_term_pressure += min(0.2, abs(context.sentiment_value))

        conviction = long_term_bias - short_term_pressure
        if conviction < 0.15:
            return action, None

        if action == "SELL" and conviction < 0.25:
            return action, None

        if action != "BUY":
            note = (
                f"Crypto buy-the-dip heuristic promoted BUY after {dip_magnitude:.1%} drawdown."
            )
            return "BUY", note

        return action, None

    def _composite_components(self, context: "PreparedMarketContext") -> Tuple[CompositeComponent, ...]:
        components: List[CompositeComponent] = []

        def add(name: str, value: Optional[float], weight: float) -> None:
            if value is None or weight <= 0:
                return
            components.append(
                CompositeComponent(
                    name=name,
                    value=_clamp(value, -1.0, 1.0),
                    weight=weight,
                )
            )

        add("resolved_signal_bias", self._action_to_score(context.resolved_signal), 0.4)
        add("momentum", context.momentum, 0.35)
        add("sentiment_value", context.sentiment_value, 0.25)

        if context.alignment is not None:
            add("alignment", context.alignment, 0.2)

        if context.composite_trimmed_mean is not None:
            add("composite_trimmed_mean", context.composite_trimmed_mean, 0.3)

        return tuple(components)

    def _derive_composite_score(self, context: "PreparedMarketContext") -> float | None:
        """Blend structured indicators into a directional score in ``[-1, 1]``.

        The method allows the fusion algo to react to richer payloads such as
        quantitative model outputs or curated analyst sentiment without forcing
        callers to pre-compute the final action. When no meaningful inputs are
        present the method returns ``None`` to preserve prior behaviour.
        """

        components = self._composite_components(context)

        if not components:
            return None

        numerator = sum(component.contribution for component in components)
        denominator = sum(component.weight for component in components)
        if denominator == 0:
            return None

        return numerator / denominator

    def composite_diagnostics(self, context: "PreparedMarketContext") -> Dict[str, Any]:
        """Return a structured breakdown of the composite blend."""

        components = self._composite_components(context)
        total_weight = sum(component.weight for component in components)
        numerator = sum(component.contribution for component in components)
        score = numerator / total_weight if total_weight else None

        component_payload = [
            component.to_dict(total_weight=total_weight) for component in components
        ]
        dominant = None
        if component_payload:
            dominant = max(component_payload, key=lambda item: abs(item["contribution"]))
            dominant = dict(dominant)

        return {
            "score": round(score, 4) if score is not None else None,
            "components": component_payload,
            "total_weight": round(total_weight, 4),
            "dominant_component": dominant,
        }

    def _calculate_confidence(
        self,
        context: "PreparedMarketContext",
        action: str,
        consensus_provider: Callable[[str], float] | None = None,
    ) -> tuple[float, float]:
        base_confidence = context.base_confidence
        volatility = context.volatility
        news_topics = context.news_topics

        confidence = max(0.0, min(1.0, base_confidence))

        if any(topic in self.boost_topics for topic in news_topics):
            confidence = min(1.0, confidence + 0.1)

        if volatility > 1.5:
            confidence = max(0.0, confidence - 0.15)
        elif volatility < 0.5:
            confidence = min(1.0, confidence + 0.05)

        if context.alignment is not None:
            alignment_value = context.alignment
            if alignment_value > 0:
                confidence = min(1.0, confidence + min(0.2, alignment_value * 0.15))
            elif alignment_value < 0:
                confidence = max(0.0, confidence + max(-0.2, alignment_value * 0.2))

        if context.data_quality is not None and context.data_quality < 0.5:
            confidence = max(0.0, confidence - (0.5 - context.data_quality) * 0.3)
            if context.data_quality < 0.3:
                confidence = max(0.0, confidence - (0.3 - context.data_quality) * 0.5)

        if context.risk_score is not None:
            confidence = max(0.0, confidence - context.risk_score * 0.2)

        if context.drawdown is not None:
            drawdown_value = abs(context.drawdown)
            if drawdown_value > _DRAWDOWN_CONFIDENCE_THRESHOLD:
                neutral_cutoff = max(
                    _DRAWDOWN_CONFIDENCE_THRESHOLD + 1e-6,
                    _DRAWDOWN_NEUTRAL_THRESHOLD,
                )
                severity = (drawdown_value - _DRAWDOWN_CONFIDENCE_THRESHOLD) / (
                    neutral_cutoff - _DRAWDOWN_CONFIDENCE_THRESHOLD
                )
                severity = _clamp(severity, 0.0, 1.0)
                reduction = severity * _DRAWDOWN_CONFIDENCE_MAX_PENALTY
                if drawdown_value >= _DRAWDOWN_HOLD_THRESHOLD:
                    reduction += _DRAWDOWN_CONFIDENCE_EXTRA
                reduction = min(_DRAWDOWN_CONFIDENCE_CAP, reduction)
                confidence = max(0.0, confidence - reduction)

        dip_recovery = (
            action == "BUY"
            and context.drawdown is not None
            and context.drawdown < -0.04
            and self._is_crypto_context(context)
            and context.resolved_signal != "BUY"
        )
        if dip_recovery:
            bonus = min(0.2, abs(context.drawdown) * 0.6)
            if context.trend in {"bullish", "uptrend"}:
                bonus += 0.05
            confidence = min(1.0, confidence + bonus)

        if consensus_provider is None:
            consensus = self._indicator_consensus(context, action)
        else:
            consensus = consensus_provider(action)
        if consensus > 0.5:
            confidence = min(1.0, confidence + min(0.12, consensus * 0.1))
        elif consensus < -0.5:
            confidence = max(0.0, confidence + max(-0.18, consensus * 0.12))

        if context.resolved_signal == "NEUTRAL":
            confidence = min(confidence, 0.5)

        return round(confidence, 2), consensus

    def _training_features_from_context(self, context: "PreparedMarketContext") -> Dict[str, float]:
        """Return numeric features suitable for dataset construction."""

        features = {name: float(value) for name, value in context.indicator_panel}

        features["volatility"] = float(context.volatility)
        features["base_confidence"] = float(context.base_confidence)
        features["news_topic_count"] = float(len(context.news_topics))
        features["circuit_breaker"] = 1.0 if context.circuit_breaker else 0.0

        if context.data_quality is not None:
            features["data_quality"] = float(context.data_quality)
        else:
            features.setdefault("data_quality", 0.5)

        if context.risk_score is not None:
            features["risk_score"] = float(context.risk_score)
        else:
            features.setdefault("risk_score", 0.0)

        if context.drawdown is not None:
            features["drawdown"] = float(context.drawdown)
        else:
            features.setdefault("drawdown", 0.0)

        if context.human_weight is not None:
            features["human_weight"] = float(context.human_weight)
        else:
            features.setdefault("human_weight", 0.0)

        if context.human_bias is not None:
            features["human_bias_alignment"] = self._action_to_score(context.human_bias)
        else:
            features.setdefault("human_bias_alignment", 0.0)

        return features

    def _maybe_enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
        base_reasoning: str,
    ) -> str:
        if not self.llm_adapter:
            return base_reasoning

        cache_key = self._reasoning_cache_key(
            action=action,
            confidence=confidence,
            market_data=market_data,
            base_reasoning=base_reasoning,
        )
        if cache_key is not None:
            cached = self._reasoning_cache.get(cache_key)
            if cached is not None:
                self._reasoning_cache.move_to_end(cache_key)
                return cached

        try:
            enhanced = self.llm_adapter.enhance_reasoning(
                action=action,
                confidence=confidence,
                base_reasoning=base_reasoning,
                market_context=market_data,
            )
        except LLMIntegrationError:
            return base_reasoning

        if cache_key is not None:
            self._reasoning_cache[cache_key] = enhanced
            if len(self._reasoning_cache) > self.reasoning_cache_size:
                self._reasoning_cache.popitem(last=False)

        return enhanced

    def _reasoning_cache_key(
        self,
        *,
        action: str,
        confidence: float,
        market_data: Dict[str, Any],
        base_reasoning: str,
    ) -> str | None:
        if self.reasoning_cache_size <= 0:
            return None

        payload = {
            "action": action,
            "confidence": round(confidence, 4),
            "base_reasoning": base_reasoning,
            "market_data": market_data,
        }

        try:
            return json.dumps(payload, sort_keys=True, default=self._serialise_cache_value)
        except TypeError:
            return None

    @staticmethod
    def _serialise_cache_value(value: Any) -> str:
        return str(value)

    def _build_reasoning(
        self,
        action: str,
        confidence: float,
        context: "PreparedMarketContext",
        annotations: Iterable[str] | None,
        consensus: float,
    ) -> str:
        comments: List[str] = []

        trend = context.trend
        momentum = context.momentum
        support = context.support_level
        resistance = context.resistance_level

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
        if consensus > 0.5:
            comments.append("Multiple indicators reinforced the action bias.")
        elif consensus < -0.5:
            comments.append("Indicators diverged materially, keeping conviction restrained.")

        if context.data_quality is not None and context.data_quality < 0.5:
            comments.append("Data quality concerns prompted tighter safeguards.")

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
        context: "PreparedMarketContext",
    ) -> tuple[str, float, str | None]:
        human_bias = context.human_bias
        if not human_bias:
            return action, confidence, None

        human_weight = context.human_weight
        if human_weight is None:
            human_weight = 0.25 if human_bias in {"BUY", "SELL"} else 0.0
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
    def _trimmed_mean(values: Sequence[float], *, trim_ratio: float = 0.2) -> float:
        """Return a trimmed mean to reduce outlier influence."""

        if not values:
            raise ValueError("_trimmed_mean requires at least one value")

        bounded = [max(-1.0, min(1.0, value)) for value in values]
        ordered = sorted(bounded)
        trim_count = int(len(ordered) * trim_ratio)
        if trim_count:
            trimmed = ordered[trim_count:-trim_count] or ordered
        else:
            trimmed = ordered

        return fmean(trimmed)

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

    def _indicator_consensus(self, context: "PreparedMarketContext", action: str) -> float:
        """Quantify how well independent indicators agree with the action."""

        if not context.indicator_panel:
            return 0.0

        indicator_values = [
            value
            for name, value in context.indicator_panel
            if name != "resolved_signal_bias"
        ]

        if not indicator_values:
            return 0.0

        action_score = self._action_to_score(action)
        threshold = 0.15

        if action_score == 0.0:
            strong_bias = sum(1 for value in indicator_values if abs(value) > 0.4)
            neutral_support = sum(
                1 for value in indicator_values if abs(value) <= threshold
            )
            return (neutral_support - strong_bias) / len(indicator_values)

        aligned = sum(
            1 for value in indicator_values if value * action_score > threshold
        )
        conflicting = sum(
            1 for value in indicator_values if value * action_score < -threshold
        )

        return (aligned - conflicting) / len(indicator_values)

    def _build_consensus_provider(
        self, context: "PreparedMarketContext"
    ) -> Callable[[str], float]:
        """Return a cached lookup to reuse consensus calculations during a run."""

        cache: Dict[str, float] = {}

        def lookup(action: str) -> float:
            key = action.upper()
            if key not in VALID_SIGNALS:
                key = "NEUTRAL"
            cached = cache.get(key)
            if cached is not None:
                return cached
            value = self._indicator_consensus(context, key)
            cache[key] = value
            return value

        return lookup

    def consensus_matrix(self, context: "PreparedMarketContext") -> Dict[str, float]:
        """Return consensus scores for all valid signals."""

        lookup = self._build_consensus_provider(context)
        return {action: round(lookup(action), 4) for action in sorted(VALID_SIGNALS)}

    def _apply_risk_overrides(
        self,
        action: str,
        confidence: float,
        context: "PreparedMarketContext",
    ) -> tuple[str, float, str | None]:
        risk_score = context.risk_score
        circuit_breaker = context.circuit_breaker
        drawdown = context.drawdown

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

        if drawdown is not None:
            drawdown_magnitude = abs(drawdown)
            if drawdown_magnitude >= _DRAWDOWN_NEUTRAL_THRESHOLD:
                updated_action = "NEUTRAL"
                updated_confidence = min(updated_confidence, 0.35)
                drawdown_note = "Recent drawdown triggered capital preservation mode."
                note = drawdown_note if note is None else f"{note} {drawdown_note}"
            elif drawdown_magnitude >= _DRAWDOWN_HOLD_THRESHOLD and action in {"BUY", "SELL"}:
                updated_action = "HOLD"
                updated_confidence = min(updated_confidence, 0.45)
                drawdown_note = "Extended drawdown shifted automation posture to HOLD."
                note = drawdown_note if note is None else f"{note} {drawdown_note}"

        return updated_action, round(updated_confidence, 2), note
