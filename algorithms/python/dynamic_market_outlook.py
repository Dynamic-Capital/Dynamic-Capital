"""Dynamic market outlook engine blending macro, flow, and sentiment telemetry."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Sequence

__all__ = [
    "OutlookSignal",
    "MarketOutlookTelemetry",
    "MarketOutlookReport",
    "DynamicMarketOutlookEngine",
]


@dataclass(slots=True)
class OutlookSignal:
    """Single telemetry input contributing to the market outlook score."""

    name: str
    score: float
    weight: float = 1.0
    rationale: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def clamped_score(self) -> float:
        """Return the score capped to the [0, 100] range."""

        return max(min(self.score, 100.0), 0.0)

    def to_dict(self) -> dict[str, Any]:
        """Serialise the signal for downstream consumers."""

        return {
            "name": self.name,
            "score": round(self.clamped_score(), 4),
            "weight": round(self.weight, 4),
            "rationale": self.rationale,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class MarketOutlookTelemetry:
    """Grouped telemetry inputs that describe the current market regime."""

    macro: Sequence[OutlookSignal] = field(default_factory=tuple)
    flow: Sequence[OutlookSignal] = field(default_factory=tuple)
    sentiment: Sequence[OutlookSignal] = field(default_factory=tuple)
    regime_hint: str | None = None
    horizon: str = "daily"
    timestamp: datetime = field(default_factory=lambda: datetime.now(tz=timezone.utc))


@dataclass(slots=True)
class MarketOutlookReport:
    """Structured market outlook produced by :class:`DynamicMarketOutlookEngine`."""

    score: float
    tier: str
    conviction: float
    macro_score: float
    flow_score: float
    sentiment_score: float
    drivers: list[str]
    cautions: list[str]
    hedging_actions: list[str]
    summary: str
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        """Serialise the report for dashboards or downstream automations."""

        payload = {
            "score": round(self.score, 2),
            "tier": self.tier,
            "conviction": round(self.conviction, 3),
            "macroScore": round(self.macro_score, 2),
            "flowScore": round(self.flow_score, 2),
            "sentimentScore": round(self.sentiment_score, 2),
            "drivers": self.drivers,
            "cautions": self.cautions,
            "hedgingActions": self.hedging_actions,
            "summary": self.summary,
            "metadata": {
                **self.metadata,
                "timestamp": self.metadata.get("timestamp"),
            },
        }
        return payload


@dataclass(slots=True)
class DynamicMarketOutlookEngine:
    """Compute a composite market outlook from heterogeneous telemetry feeds."""

    macro_weight: float = 0.4
    flow_weight: float = 0.35
    sentiment_weight: float = 0.25
    driver_threshold: float = 60.0
    caution_threshold: float = 40.0
    risk_on_floor: float = 60.0
    hedge_ceiling: float = 40.0

    def generate(self, telemetry: MarketOutlookTelemetry) -> MarketOutlookReport:
        """Return a structured market outlook for the supplied telemetry."""

        macro_score, macro_drivers, macro_cautions = self._collapse_bucket(telemetry.macro)
        flow_score, flow_drivers, flow_cautions = self._collapse_bucket(telemetry.flow)
        sentiment_score, sentiment_drivers, sentiment_cautions = self._collapse_bucket(
            telemetry.sentiment
        )

        composite_score = self._composite_score(
            macro_score,
            flow_score,
            sentiment_score,
        )
        tier = self._resolve_tier(composite_score, telemetry.regime_hint)
        filled_buckets = sum(bool(bucket) for bucket in (telemetry.macro, telemetry.flow, telemetry.sentiment))
        conviction = self._compute_conviction(
            (macro_score, flow_score, sentiment_score),
            filled_buckets,
        )

        drivers = macro_drivers + flow_drivers + sentiment_drivers
        cautions = macro_cautions + flow_cautions + sentiment_cautions
        hedging_actions = self._hedging_actions(tier)

        summary = (
            f"{tier.replace('_', ' ').title()} stance with composite score {composite_score:.1f} "
            f"(macro {macro_score:.1f}, flow {flow_score:.1f}, sentiment {sentiment_score:.1f})."
        )

        metadata = {
            "timestamp": telemetry.timestamp,
            "horizon": telemetry.horizon,
            "regime_hint": telemetry.regime_hint,
            "weights": {
                "macro": self.macro_weight,
                "flow": self.flow_weight,
                "sentiment": self.sentiment_weight,
            },
            "coverage": filled_buckets / 3 if filled_buckets else 0.0,
            "inputs": {
                "macro": [signal.to_dict() for signal in telemetry.macro],
                "flow": [signal.to_dict() for signal in telemetry.flow],
                "sentiment": [signal.to_dict() for signal in telemetry.sentiment],
            },
            "executor": "DynamicTradingAlgo",
        }

        return MarketOutlookReport(
            score=round(composite_score, 2),
            tier=tier,
            conviction=conviction,
            macro_score=round(macro_score, 2),
            flow_score=round(flow_score, 2),
            sentiment_score=round(sentiment_score, 2),
            drivers=drivers,
            cautions=cautions,
            hedging_actions=hedging_actions,
            summary=summary,
            metadata=metadata,
        )

    def _collapse_bucket(
        self, signals: Sequence[OutlookSignal]
    ) -> tuple[float, list[str], list[str]]:
        if not signals:
            return (50.0, [], [])

        weights = [max(signal.weight, 0.0) for signal in signals]
        total_weight = sum(weights)
        if total_weight == 0:
            total_weight = float(len(signals))
            weights = [1.0 for _ in signals]

        weighted_sum = sum(signal.clamped_score() * weight for signal, weight in zip(signals, weights))
        aggregate = weighted_sum / total_weight

        drivers = [
            signal.rationale or signal.name
            for signal in signals
            if signal.clamped_score() >= self.driver_threshold
        ]
        cautions = [
            signal.rationale or signal.name
            for signal in signals
            if signal.clamped_score() <= self.caution_threshold
        ]

        return (aggregate, drivers, cautions)

    def _composite_score(
        self,
        macro_score: float,
        flow_score: float,
        sentiment_score: float,
    ) -> float:
        return (
            macro_score * self.macro_weight
            + flow_score * self.flow_weight
            + sentiment_score * self.sentiment_weight
        )

    def _resolve_tier(self, score: float, regime_hint: str | None) -> str:
        if score >= self.risk_on_floor:
            tier = "risk_on"
        elif score <= self.hedge_ceiling:
            tier = "hedge"
        else:
            tier = "neutral"

        if regime_hint:
            hint = regime_hint.strip().lower().replace(" ", "_")
            if hint in {"risk_on", "neutral", "hedge"}:
                tier = hint
        return tier

    def _compute_conviction(self, bucket_scores: Iterable[float], filled_buckets: int) -> float:
        scores = list(bucket_scores)
        if not filled_buckets:
            return 0.0
        dispersion = max(scores) - min(scores)
        stability = max(0.0, 1.0 - dispersion / 100.0)
        coverage_ratio = min(filled_buckets / 3, 1.0)
        conviction = 0.25 + 0.5 * coverage_ratio + 0.25 * stability
        return round(min(max(conviction, 0.0), 1.0), 3)

    def _hedging_actions(self, tier: str) -> list[str]:
        if tier == "risk_on":
            return [
                "Scale into priority longs as confirmation triggers",
                "Trail stops to protect gains while letting winners run",
            ]
        if tier == "hedge":
            return [
                "Reduce gross exposure and raise cash buffers",
                "Deploy delta-neutral hedges on vulnerable sectors",
            ]
        return [
            "Maintain core exposure with tight risk controls",
            "Focus on mean-reversion opportunities until conviction improves",
        ]
