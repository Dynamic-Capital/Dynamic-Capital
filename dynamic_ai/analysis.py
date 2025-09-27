"""Dynamic Analysis module aggregating multi-source research signals.

This module implements the Dynamic Analysis Algo (DAA) which combines
technical, fundamental, sentiment, and macro context into a coherent
trade insight.  The heuristics are intentionally lightweight so they can
operate on partial data snapshots while remaining deterministic for the
unit tests.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional


def _coerce_float(value: Any, default: float = 0.0) -> float:
    """Best-effort conversion to ``float`` with graceful fallbacks.

    The Dynamic Analysis pipeline ingests heterogeneous payloads so this
    helper ensures that strings, ``None`` values, or unexpected objects do
    not propagate ``ValueError``/``TypeError`` exceptions.  The helper is
    intentionally permissive – invalid inputs simply collapse to
    ``default``.
    """

    if value is None:
        return default
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _clamp(value: float, lower: float, upper: float) -> float:
    """Clamp ``value`` into ``[lower, upper]``."""

    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


@dataclass
class AnalysisComponent:
    """Normalised output for an individual research pillar."""

    name: str
    score: float
    confidence: float
    rationale: str
    signals: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "score": round(self.score, 4),
            "confidence": round(_clamp(self.confidence, 0.0, 1.0), 4),
            "rationale": self.rationale,
            "signals": self.signals,
        }


class DynamicAnalysis:
    """Fuse heterogeneous research pillars into a unified insight."""

    DEFAULT_WEIGHTS: Dict[str, float] = {
        "technical": 0.35,
        "fundamental": 0.3,
        "sentiment": 0.2,
        "macro": 0.15,
    }

    def __init__(
        self,
        *,
        weights: Optional[Mapping[str, float]] = None,
        neutral_band: float = 0.15,
    ) -> None:
        self.neutral_band = max(0.0, neutral_band)
        self.weights = dict(self.DEFAULT_WEIGHTS)
        if weights:
            self.weights.update({k: float(v) for k, v in weights.items()})
        self._normalise_weights()

    def analyse(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        """Return a structured analysis for the supplied ``payload``.

        ``payload`` may omit any section; absent components are ignored but
        the engine still returns a deterministic result.  All component
        scores live in ``[-1, 1]`` where positive values imply bullish bias
        and negatives imply bearish bias.
        """

        components: list[AnalysisComponent] = []

        technical = payload.get("technical")
        fundamental = payload.get("fundamental")
        sentiment = payload.get("sentiment")
        macro = payload.get("macro")

        if isinstance(technical, Mapping):
            components.append(self._analyse_technical(technical))
        if isinstance(fundamental, Mapping):
            components.append(self._analyse_fundamental(fundamental))
        if isinstance(sentiment, Mapping):
            components.append(self._analyse_sentiment(sentiment))
        if isinstance(macro, Mapping):
            components.append(self._analyse_macro(macro))

        if not components:
            # Fallback neutral response to keep downstream consumers happy.
            return {
                "action": "HOLD",
                "score": 0.0,
                "confidence": 0.0,
                "components": [],
                "notes": ["No analysable components supplied."],
            }

        weighted_score = 0.0
        weighted_confidence = 0.0
        total_weight = 0.0
        component_dicts: list[Dict[str, Any]] = []

        for component in components:
            weight = self.weights.get(component.name, 0.0)
            component_dicts.append(component.as_dict())
            total_weight += weight
            weighted_score += component.score * weight
            weighted_confidence += component.confidence * weight

        if total_weight <= 0:
            total_weight = float(len(components))

        aggregate_score = _clamp(weighted_score / total_weight, -1.0, 1.0)
        aggregate_confidence = _clamp(weighted_confidence / total_weight, 0.0, 1.0)

        result: Dict[str, Any] = {
            "action": self._score_to_action(aggregate_score),
            "score": round(aggregate_score, 4),
            "confidence": round(max(aggregate_confidence, 0.2), 4),
            "components": component_dicts,
            "notes": [],
        }

        risk_data = payload.get("risk")
        if isinstance(risk_data, Mapping):
            self._apply_risk_adjustments(result, risk_data)

        result["primary_driver"] = self._determine_primary_driver(components)
        return result

    # ------------------------------------------------------------------
    # Component evaluators
    # ------------------------------------------------------------------
    def _analyse_technical(self, data: Mapping[str, Any]) -> AnalysisComponent:
        trend = str(data.get("trend", "neutral")).lower()
        momentum = _coerce_float(data.get("momentum"), 0.0)
        volatility = _coerce_float(data.get("volatility"), 1.0)
        support = _coerce_float(data.get("support_strength"), 0.0)
        resistance = _coerce_float(data.get("resistance_pressure"), 0.0)
        ma_alignment = data.get("moving_average_alignment")

        score = 0.0
        rationale_parts: list[str] = []

        if trend in {"bullish", "uptrend"}:
            score += 0.4
            rationale_parts.append("Trend bias bullish.")
        elif trend in {"bearish", "downtrend"}:
            score -= 0.4
            rationale_parts.append("Trend bias bearish.")
        else:
            rationale_parts.append("Trend neutral.")

        score += _clamp(momentum, -1.0, 1.0) * 0.4
        if momentum:
            rationale_parts.append(f"Momentum contribution {momentum:.2f}.")

        if ma_alignment:
            if isinstance(ma_alignment, Iterable) and not isinstance(ma_alignment, (str, bytes)):
                alignments = list(ma_alignment)
                total = max(len(alignments), 1)
                aligned = sum(
                    1 for entry in alignments if str(entry).lower() in {"bullish", "up"}
                )
                score += (aligned / total - 0.5) * 0.3
                rationale_parts.append("Moving averages alignment processed.")
            elif isinstance(ma_alignment, str):
                if ma_alignment.lower() in {"bullish", "up"}:
                    score += 0.2
                elif ma_alignment.lower() in {"bearish", "down"}:
                    score -= 0.2
                rationale_parts.append("Moving average alignment signal applied.")

        score += support * 0.15
        score -= resistance * 0.15

        confidence = 0.55 + min(0.35, abs(momentum) * 0.3) - max(0.0, (volatility - 1.0) * 0.2)
        confidence = _clamp(confidence, 0.3, 0.95)

        rationale = " ".join(rationale_parts)
        return AnalysisComponent(
            name="technical",
            score=_clamp(score, -1.0, 1.0),
            confidence=confidence,
            rationale=rationale,
            signals={
                "trend": trend,
                "momentum": round(momentum, 4),
                "volatility": round(volatility, 4),
                "support_strength": round(support, 4),
                "resistance_pressure": round(resistance, 4),
            },
        )

    def _analyse_fundamental(self, data: Mapping[str, Any]) -> AnalysisComponent:
        growth = _coerce_float(data.get("growth_score"), 0.0)
        valuation = _coerce_float(data.get("valuation_score"), 0.0)
        profitability = _coerce_float(data.get("profitability"), 0.0)
        debt = _coerce_float(data.get("debt_ratio"), 0.0)
        cash_flow = _coerce_float(data.get("cash_flow_trend"), 0.0)

        score = 0.0
        score += growth * 0.35
        score += profitability * 0.25
        score += cash_flow * 0.2
        score -= valuation * 0.2
        score -= max(0.0, debt - 0.5) * 0.3

        signals = {
            "growth_score": round(growth, 4),
            "valuation_score": round(valuation, 4),
            "profitability": round(profitability, 4),
            "debt_ratio": round(debt, 4),
            "cash_flow_trend": round(cash_flow, 4),
        }

        sample_size = int(_coerce_float(data.get("sample_size"), 0.0))
        confidence = 0.5 + min(0.3, sample_size / 1000.0)
        confidence += min(0.2, max(0.0, profitability))
        confidence = _clamp(confidence, 0.35, 0.95)

        rationale = (
            "Fundamental mix with growth, profitability, valuation, and debt inputs."
        )

        return AnalysisComponent(
            name="fundamental",
            score=_clamp(score, -1.0, 1.0),
            confidence=confidence,
            rationale=rationale,
            signals=signals,
        )

    def _analyse_sentiment(self, data: Mapping[str, Any]) -> AnalysisComponent:
        feeds_source: Any = data.get("feeds")
        if not feeds_source:
            feeds_source = data.get("sources")

        normalised_feeds: list[Mapping[str, Any]] = []
        if isinstance(feeds_source, Mapping):
            normalised_feeds = [feeds_source]
        elif isinstance(feeds_source, Iterable) and not isinstance(feeds_source, (str, bytes)):
            normalised_feeds = [feed for feed in feeds_source if isinstance(feed, Mapping)]

        aggregate_score = 0.0
        aggregate_confidence = 0.0
        count = 0

        for feed in normalised_feeds:
            count += 1
            score = _clamp(_coerce_float(feed.get("score"), 0.0), -1.0, 1.0)
            confidence = _clamp(_coerce_float(feed.get("confidence"), 0.5), 0.0, 1.0)
            aggregate_score += score * confidence
            aggregate_confidence += confidence

        social = _coerce_float(data.get("social_score"), 0.0)
        news = _coerce_float(data.get("news_bias"), 0.0)
        analyst = _coerce_float(data.get("analyst_consensus"), 0.0)

        score = aggregate_score
        weight_total = aggregate_confidence

        if social:
            score += social * 0.6
            weight_total += 0.6
        if news:
            score += news * 0.5
            weight_total += 0.5
        if analyst:
            score += analyst * 0.4
            weight_total += 0.4

        if weight_total:
            score /= weight_total

        confidence = _clamp((aggregate_confidence + weight_total) / (count + 1.0), 0.2, 0.9)

        rationale = "Sentiment blended from structured feeds and discretionary signals."

        return AnalysisComponent(
            name="sentiment",
            score=_clamp(score, -1.0, 1.0),
            confidence=confidence,
            rationale=rationale,
            signals={
                "feed_count": count,
                "social_score": round(social, 4),
                "news_bias": round(news, 4),
                "analyst_consensus": round(analyst, 4),
            },
        )

    def _analyse_macro(self, data: Mapping[str, Any]) -> AnalysisComponent:
        regime = str(data.get("regime", "neutral")).lower()
        inflation = _coerce_float(data.get("inflation_trend"), 0.0)
        growth = _coerce_float(data.get("growth_outlook"), 0.0)
        policy = _coerce_float(data.get("policy_support"), 0.0)
        liquidity = _coerce_float(data.get("liquidity"), 0.0)

        score = 0.0
        notes: list[str] = []

        if regime in {"risk-on", "expansion"}:
            score += 0.3
            notes.append("Regime risk-on.")
        elif regime in {"risk-off", "contraction"}:
            score -= 0.3
            notes.append("Regime risk-off.")

        score += growth * 0.25
        score += policy * 0.2
        score += liquidity * 0.15
        score -= inflation * 0.25

        confidence = 0.45 + min(0.35, max(0.0, liquidity))
        confidence = _clamp(confidence, 0.3, 0.85)

        rationale = " ".join(notes) if notes else "Macro drivers balanced."

        return AnalysisComponent(
            name="macro",
            score=_clamp(score, -1.0, 1.0),
            confidence=confidence,
            rationale=rationale,
            signals={
                "regime": regime,
                "inflation_trend": round(inflation, 4),
                "growth_outlook": round(growth, 4),
                "policy_support": round(policy, 4),
                "liquidity": round(liquidity, 4),
            },
        )

    # ------------------------------------------------------------------
    # Support utilities
    # ------------------------------------------------------------------
    def _apply_risk_adjustments(self, result: MutableMapping[str, Any], risk: Mapping[str, Any]) -> None:
        drawdown = _coerce_float(risk.get("drawdown"), 0.0)
        utilisation = _coerce_float(risk.get("treasury_utilisation"), 0.0)
        stress = _coerce_float(risk.get("stress_index"), 0.0)
        halt = bool(risk.get("halt"))

        adjustments: list[str] = []
        score = float(result.get("score", 0.0))
        confidence = float(result.get("confidence", 0.0))

        if halt:
            result["action"] = "HOLD"
            score = 0.0
            confidence = min(confidence, 0.3)
            adjustments.append("Risk halt enforced.")
        else:
            if drawdown <= -0.08:
                score *= 0.5
                confidence = min(confidence, 0.45)
                result["action"] = self._score_to_action(score)
                adjustments.append("Score tempered by drawdown.")

            if utilisation >= 0.8:
                score *= 0.7
                confidence = min(confidence, 0.5)
                result["action"] = self._score_to_action(score)
                adjustments.append("Treasury utilisation elevated.")

            if stress >= 0.6:
                confidence = min(confidence, 0.4)
                adjustments.append("Market stress high.")

        result["score"] = round(_clamp(score, -1.0, 1.0), 4)
        result["confidence"] = round(_clamp(confidence, 0.0, 1.0), 4)
        if adjustments:
            result.setdefault("notes", []).extend(adjustments)

    def _determine_primary_driver(self, components: Iterable[AnalysisComponent]) -> Optional[str]:
        best_component: Optional[AnalysisComponent] = None
        best_weighted = -1.0

        for component in components:
            weight = abs(component.score) * component.confidence
            if weight > best_weighted:
                best_weighted = weight
                best_component = component

        return best_component.name if best_component else None

    def _score_to_action(self, score: float) -> str:
        if score > self.neutral_band:
            return "BUY"
        if score < -self.neutral_band:
            return "SELL"
        return "HOLD"

    def _normalise_weights(self) -> None:
        total = sum(v for v in self.weights.values() if v > 0)
        if total <= 0:
            total = float(len(self.weights))
            for key in list(self.weights.keys()):
                self.weights[key] = 1.0 / total
            return

        for key, value in list(self.weights.items()):
            if value <= 0:
                self.weights[key] = 0.0
            else:
                self.weights[key] = value / total
