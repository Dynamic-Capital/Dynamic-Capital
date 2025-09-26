"""Heuristic market advisory generator for Dynamic Capital desks."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict, List, Mapping, Sequence

from .trade_logic import ActivePosition, MarketSnapshot

__all__ = [
    "MarketAdvisoryRequest",
    "MarketAdvisoryReport",
    "MarketAdvisoryEngine",
]

RiskAppetite = str
TimeHorizon = str


@dataclass(slots=True)
class MarketAdvisoryRequest:
    """Inputs required to craft a tactical market advisory."""

    snapshot: MarketSnapshot
    risk_appetite: RiskAppetite = "balanced"
    horizon: TimeHorizon = "intraday"
    open_positions: Sequence[ActivePosition] = field(default_factory=tuple)
    macro_thesis: Sequence[str] = field(default_factory=tuple)
    key_levels: Mapping[str, float] = field(default_factory=dict)
    risk_signals: Mapping[str, float] = field(default_factory=dict)
    watchlist: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class MarketAdvisoryReport:
    """Structured market guidance produced by :class:`MarketAdvisoryEngine`."""

    symbol: str
    headline: str
    stance: str
    conviction: float
    actions: List[str]
    hedges: List[str]
    risk_notes: List[str]
    macro_context: List[str]
    telemetry: Dict[str, object]


@dataclass(slots=True)
class MarketAdvisoryEngine:
    """Derives market stance, conviction, and action items from telemetry."""

    bullish_threshold: float = 0.25
    bearish_threshold: float = -0.25
    adx_trend_threshold: float = 22.0
    risk_signal_threshold: float = 0.6
    risk_signal_critical: float = 0.8
    max_actions: int = 5

    def generate(self, request: MarketAdvisoryRequest) -> MarketAdvisoryReport:
        """Return a market advisory for the supplied request."""

        snapshot = request.snapshot
        bias_score = self._bias_score(snapshot)
        stance = self._stance_from_score(bias_score)
        conviction = self._conviction(snapshot, bias_score, request)
        unique_watchlist = list(dict.fromkeys(request.watchlist))
        net_exposure = sum(
            position.direction * position.size for position in request.open_positions
        )
        gross_exposure = sum(abs(position.size) for position in request.open_positions)

        actions = self._build_actions(request, stance, conviction)
        hedges = self._build_hedges(request, stance, conviction, net_exposure)
        risk_notes = self._build_risk_notes(request, net_exposure)
        macro_context = self._build_macro_context(request, unique_watchlist)
        headline = self._build_headline(snapshot.symbol, stance, conviction)
        telemetry = self._build_telemetry(
            snapshot,
            bias_score,
            net_exposure,
            gross_exposure,
            unique_watchlist,
            request,
        )

        return MarketAdvisoryReport(
            symbol=snapshot.symbol,
            headline=headline,
            stance=stance,
            conviction=conviction,
            actions=actions,
            hedges=hedges,
            risk_notes=risk_notes,
            macro_context=macro_context,
            telemetry=telemetry,
        )

    # ------------------------------------------------------------------
    # Core scoring
    # ------------------------------------------------------------------

    def _bias_score(self, snapshot: MarketSnapshot) -> float:
        score = 0.0
        score += (snapshot.rsi_fast - 50.0) / 15.0
        score += (snapshot.rsi_slow - 50.0) / 20.0
        if snapshot.seasonal_bias is not None and snapshot.seasonal_confidence:
            score += 0.6 * snapshot.seasonal_bias * snapshot.seasonal_confidence
        if snapshot.mechanical_state is not None:
            score += 0.1 * snapshot.mechanical_state_score()
        if snapshot.mechanical_velocity is not None:
            score += 0.05 * math.tanh(snapshot.mechanical_velocity / 5.0)
        return score

    def _stance_from_score(self, score: float) -> str:
        if score >= self.bullish_threshold:
            return "Bullish"
        if score <= self.bearish_threshold:
            return "Bearish"
        return "Neutral"

    def _conviction(
        self,
        snapshot: MarketSnapshot,
        bias_score: float,
        request: MarketAdvisoryRequest,
    ) -> float:
        trend_strength = max(snapshot.adx_fast, snapshot.adx_slow)
        base = max(0.1, min(1.0, trend_strength / 40.0))
        if trend_strength < self.adx_trend_threshold:
            base *= 0.8
        seasonal_confidence = snapshot.seasonal_confidence or 0.0
        if seasonal_confidence:
            base += 0.1 * seasonal_confidence * (1.0 if abs(bias_score) >= 0.2 else 0.5)
        mechanical_energy = snapshot.mechanical_energy or 0.0
        if mechanical_energy:
            base += 0.05 * math.tanh(mechanical_energy / 10.0)

        risk_modifier = {
            "defensive": 0.85,
            "balanced": 1.0,
            "aggressive": 1.12,
        }.get(request.risk_appetite, 1.0)
        horizon_modifier = {
            "intraday": 0.95,
            "swing": 1.05,
            "position": 1.1,
        }.get(request.horizon, 1.0)
        conviction = base * risk_modifier * horizon_modifier
        return float(max(0.05, min(conviction, 1.0)))

    # ------------------------------------------------------------------
    # Narrative assembly
    # ------------------------------------------------------------------

    def _build_actions(
        self,
        request: MarketAdvisoryRequest,
        stance: str,
        conviction: float,
    ) -> List[str]:
        snapshot = request.snapshot
        support = request.key_levels.get("support")
        resistance = request.key_levels.get("resistance")
        midpoint = request.key_levels.get("midpoint")
        pip = snapshot.pip_size or 0.0001
        fallback_support = snapshot.close - 15 * pip
        fallback_resistance = snapshot.close + 15 * pip
        support_text = self._format_price(support or fallback_support, snapshot)
        resistance_text = self._format_price(resistance or fallback_resistance, snapshot)

        actions: List[str] = []
        if stance == "Bullish":
            actions.append(
                f"Bias remains constructive; accumulate {snapshot.symbol} on pullbacks into {support_text}."
            )
            actions.append(
                f"Upside objectives sit near {resistance_text}; scale risk as conviction holds at {conviction:.0%}."
            )
        elif stance == "Bearish":
            actions.append(
                f"Maintain tactical shorts while price is capped below {resistance_text}."
            )
            actions.append(
                f"Next downside magnet resides near {support_text}; trail risk aggressively." 
            )
        else:
            range_floor = support or fallback_support
            range_ceiling = resistance or fallback_resistance
            actions.append(
                f"Adopt market-neutral posture; fade extremes between {self._format_price(range_floor, snapshot)} and {self._format_price(range_ceiling, snapshot)}."
            )
            actions.append(
                "Deploy staggered orders with tight stops until a directional break confirms."
            )

        if midpoint is not None:
            actions.append(
                f"Use {self._format_price(midpoint, snapshot)} as a pivot to judge balance of flows."
            )

        if request.macro_thesis:
            actions.append(
                f"Align position sizing with macro thesis: {request.macro_thesis[0]}."
            )

        if len(actions) > self.max_actions:
            return actions[: self.max_actions]
        return actions

    def _build_hedges(
        self,
        request: MarketAdvisoryRequest,
        stance: str,
        conviction: float,
        net_exposure: float,
    ) -> List[str]:
        snapshot = request.snapshot
        support = request.key_levels.get("support") or snapshot.close - 10 * snapshot.pip_size
        resistance = request.key_levels.get("resistance") or snapshot.close + 10 * snapshot.pip_size
        hedges: List[str] = []

        if stance == "Bullish":
            hedges.append(
                f"Hedge downside via protective structures below {self._format_price(support, snapshot)} while conviction is {conviction:.0%}."
            )
        elif stance == "Bearish":
            hedges.append(
                f"Guard against squeeze risk above {self._format_price(resistance, snapshot)} using call spreads or reduced sizing."
            )
        else:
            hedges.append(
                "Deploy delta-neutral hedges or stay flat until price resolves the range." 
            )

        if abs(net_exposure) >= 0.75:
            direction = "long" if net_exposure > 0 else "short"
            hedges.append(
                f"Net {direction} exposure of {abs(net_exposure):.2f} lots warrants staggered profit-taking."
            )
        return hedges

    def _build_risk_notes(
        self,
        request: MarketAdvisoryRequest,
        net_exposure: float,
    ) -> List[str]:
        notes: List[str] = []
        sorted_signals = sorted(
            request.risk_signals.items(), key=lambda item: item[1], reverse=True
        )
        for label, value in sorted_signals:
            if value >= self.risk_signal_critical:
                notes.append(f"Critical {label} reading at {value:.2f}; cap position size.")
            elif value >= self.risk_signal_threshold:
                notes.append(f"Elevated {label} risk at {value:.2f}; enforce tighter stops.")
        if not notes and request.risk_signals:
            notes.append("Risk signals benign; maintain base risk controls.")

        if abs(net_exposure) > 0.01:
            direction = "long" if net_exposure > 0 else "short"
            notes.append(
                f"Portfolio net {direction} {request.snapshot.symbol} exposure at {abs(net_exposure):.2f} lots."
            )
        return notes

    def _build_macro_context(
        self,
        request: MarketAdvisoryRequest,
        watchlist: Sequence[str],
    ) -> List[str]:
        context: List[str] = [item for item in request.macro_thesis if item.strip()]
        if watchlist:
            context.append(
                f"Monitor confirmation across {', '.join(watchlist)} for signal validation."
            )
        if request.horizon:
            context.append(f"Plan framed for {request.horizon} horizon with {request.risk_appetite} profile.")
        return context

    def _build_headline(self, symbol: str, stance: str, conviction: float) -> str:
        return f"{symbol} {stance.lower()} advisory with {conviction:.0%} conviction"

    def _build_telemetry(
        self,
        snapshot: MarketSnapshot,
        bias_score: float,
        net_exposure: float,
        gross_exposure: float,
        watchlist: Sequence[str],
        request: MarketAdvisoryRequest,
    ) -> Dict[str, object]:
        telemetry: Dict[str, object] = {
            "bias_score": round(bias_score, 4),
            "net_exposure": round(net_exposure, 4),
            "gross_exposure": round(gross_exposure, 4),
            "risk_appetite": request.risk_appetite,
            "horizon": request.horizon,
            "watchlist": list(watchlist),
            "risk_signals": dict(request.risk_signals),
        }
        if request.key_levels:
            telemetry["key_levels"] = dict(request.key_levels)
        telemetry["seasonal_bias"] = snapshot.seasonal_bias
        telemetry["seasonal_confidence"] = snapshot.seasonal_confidence
        return telemetry

    # ------------------------------------------------------------------
    # Utility helpers
    # ------------------------------------------------------------------

    def _format_price(self, value: float, snapshot: MarketSnapshot) -> str:
        pip = snapshot.pip_size or 0.0001
        if pip <= 0:
            return f"{value:.5f}"
        decimals = max(2, min(6, int(round(-math.log10(pip)))))
        return f"{value:.{decimals}f}"
