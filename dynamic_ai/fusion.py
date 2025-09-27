"""Multi-lobe fusion logic for Dynamic AI signal orchestration."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Protocol, Sequence

from .core import ACTION_THRESHOLD, ACTION_TOLERANCE, score_to_action


SignalAction = str


@dataclass
class RegimeContext:
    """Macro context describing the current market regime."""

    volatility: float = 0.0
    sentiment: float = 0.0
    session: str = "global"
    risk_off: bool = False


@dataclass
class LobeSignal:
    """Normalised signal emitted by a lobe in the range [-1, 1]."""

    lobe: str
    score: float
    confidence: float
    rationale: str = ""
    context: Dict[str, Any] = field(default_factory=dict)

    def bounded_score(self) -> float:
        """Clamp the score to the supported range."""

        return max(-1.0, min(1.0, self.score))

    def bounded_confidence(self) -> float:
        """Clamp the confidence into [0, 1]."""

        return max(0.0, min(1.0, self.confidence))


class SignalLobe(Protocol):
    """Protocol implemented by all signal lobes."""

    name: str

    def evaluate(self, data: Mapping[str, Any]) -> LobeSignal:
        """Return the lobe's signal for the supplied data snapshot."""


@dataclass
class LorentzianDistanceLobe:
    """Measures deviation from a reference path using Lorentzian distance."""

    name: str = "lorentzian"
    sensitivity: float = 1.0

    def evaluate(self, data: Mapping[str, Any]) -> LobeSignal:
        price = float(data.get("price", 0.0))
        reference = float(data.get("reference_price", price))
        dispersion = float(data.get("dispersion", 0.0))

        # Lorentzian distance emphasises large deviations while remaining smooth.
        diff = price - reference
        lorentzian = math.log1p((diff**2) / (1 + dispersion))
        score = -1.0 if lorentzian > self.sensitivity else 1.0 - lorentzian / (self.sensitivity + 1e-6)
        score = max(-1.0, min(1.0, score))

        rationale = (
            f"Price deviation of {diff:.4f} versus reference with Lorentzian metric {lorentzian:.4f}."
        )
        confidence = max(0.1, 1.0 - min(1.0, lorentzian / (self.sensitivity + 1e-6)))

        return LobeSignal(lobe=self.name, score=score, confidence=confidence, rationale=rationale)


@dataclass
class TrendMomentumLobe:
    """Combines trend direction and momentum strength into a signal."""

    name: str = "trend_momentum"
    momentum_threshold: float = 0.4

    def evaluate(self, data: Mapping[str, Any]) -> LobeSignal:
        trend = str(data.get("trend", "neutral")).lower()
        momentum = float(data.get("momentum", 0.0))

        if trend in {"bullish", "uptrend"}:
            base = 1.0
        elif trend in {"bearish", "downtrend"}:
            base = -1.0
        else:
            base = 0.0

        intensity = min(1.0, abs(momentum) / max(self.momentum_threshold, 1e-6))
        score = base * intensity if base != 0 else momentum
        score = max(-1.0, min(1.0, score))

        rationale = f"Trend {trend} with momentum {momentum:.2f} yields score {score:.2f}."
        confidence = max(0.2, min(1.0, abs(momentum)))

        return LobeSignal(lobe=self.name, score=score, confidence=confidence, rationale=rationale)


@dataclass
class SentimentLobe:
    """Aggregates sentiment feeds into a directional stance."""

    name: str = "sentiment"
    positive_keywords: Sequence[str] = ("growth", "upgrade", "bullish")
    negative_keywords: Sequence[str] = ("downgrade", "bearish", "risk")

    def evaluate(self, data: Mapping[str, Any]) -> LobeSignal:
        feeds: Iterable[Mapping[str, Any]] = data.get("sentiment_feeds", [])  # type: ignore[assignment]
        feed_list = list(feeds or [])

        positive_hits = 0
        negative_hits = 0
        aggregate_score = 0.0

        for feed in feed_list:
            score = float(feed.get("score", 0.0))
            aggregate_score += score
            text = str(feed.get("summary", "")).lower()
            if any(keyword in text for keyword in self.positive_keywords):
                positive_hits += 1
            if any(keyword in text for keyword in self.negative_keywords):
                negative_hits += 1

        count = max(len(feed_list), 1)
        avg_score = aggregate_score / count
        keyword_bias = positive_hits - negative_hits
        score = max(-1.0, min(1.0, avg_score + 0.2 * keyword_bias))

        confidence = max(0.2, min(1.0, abs(score)))
        rationale = (
            f"Sentiment average {avg_score:.2f} with keyword bias {keyword_bias} implies score {score:.2f}."
        )

        return LobeSignal(lobe=self.name, score=score, confidence=confidence, rationale=rationale)


@dataclass
class TreasuryLobe:
    """Evaluates treasury health to determine risk appetite."""

    name: str = "treasury"
    buffer_ratio: float = 0.2

    def evaluate(self, data: Mapping[str, Any]) -> LobeSignal:
        treasury = data.get("treasury", {})
        balance = float(treasury.get("balance", 0.0))
        liabilities = float(treasury.get("liabilities", 1.0))
        utilisation = float(treasury.get("utilisation", 0.0))

        health_ratio = balance / max(liabilities, 1e-6)
        score = 1.0 if health_ratio > (1 + self.buffer_ratio) else -1.0 + health_ratio
        score = max(-1.0, min(1.0, score - utilisation))

        rationale = (
            f"Treasury health ratio {health_ratio:.2f} with utilisation {utilisation:.2f} yields {score:.2f}."
        )
        confidence = max(0.3, min(1.0, 1 - min(1.0, utilisation)))

        return LobeSignal(lobe=self.name, score=score, confidence=confidence, rationale=rationale)


class FusionEngine:
    """Combine multiple lobes into a single discrete trading action."""

    def __init__(self, lobes: Sequence[SignalLobe]) -> None:
        self._lobes = list(lobes)

    def combine(self, data: Mapping[str, Any], regime: RegimeContext | None = None) -> Dict[str, Any]:
        """Fuse the lobe signals into a final recommendation."""

        regime = regime or RegimeContext()
        signals = [lobe.evaluate(data) for lobe in self._lobes]

        weights = [self._regime_weight(signal, regime) for signal in signals]
        weighted_scores = [signal.bounded_score() * weights[i] for i, signal in enumerate(signals)]
        weighted_confidence = [signal.bounded_confidence() * weights[i] for i, signal in enumerate(signals)]

        score_total = sum(weighted_scores)
        weight_total = sum(weights) or 1.0
        confidence_total = sum(weighted_confidence) / weight_total

        normalised_score = score_total / weight_total
        action = self._score_to_action(normalised_score)
        action_confidence = max(0.0, min(1.0, 0.5 + 0.5 * abs(normalised_score)))
        action_confidence = max(action_confidence, confidence_total)

        return {
            "action": action,
            "score": round(normalised_score, 4),
            "confidence": round(action_confidence, 4),
            "lobes": [signal.__dict__ for signal in signals],
            "weights": weights,
        }

    def _regime_weight(self, signal: LobeSignal, regime: RegimeContext) -> float:
        base_weight = 1.0

        if signal.lobe == "lorentzian" and regime.volatility > 1.0:
            base_weight *= 1.4
        if signal.lobe == "sentiment" and regime.sentiment < -0.5:
            base_weight *= 0.7
        if signal.lobe == "treasury" and (regime.risk_off or regime.volatility > 1.2):
            base_weight *= 1.5
        if signal.lobe == "trend_momentum" and regime.session in {"asia", "london"}:
            base_weight *= 1.1

        return base_weight * signal.bounded_confidence()

    @staticmethod
    def _score_to_action(score: float) -> SignalAction:
        return score_to_action(
            score,
            neutral_action="NEUTRAL",
            threshold=ACTION_THRESHOLD,
            tolerance=ACTION_TOLERANCE,
        )
