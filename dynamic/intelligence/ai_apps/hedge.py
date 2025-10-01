"""Dynamic hedging policy utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Literal, MutableMapping, Sequence

HedgeReason = Literal["ATR_SPIKE", "NEWS", "DD_LIMIT"]
HedgeSide = Literal["LONG_HEDGE", "SHORT_HEDGE"]
AccountMode = Literal["hedging", "netting"]


@dataclass
class ExposurePosition:
    """Represents an open directional exposure in the book."""

    symbol: str
    side: Literal["LONG", "SHORT"]
    quantity: float
    beta: float = 1.0
    price: float | None = None
    pip_value: float | None = None


@dataclass
class VolatilitySnapshot:
    """Volatility telemetry for a tradable instrument."""

    symbol: str
    atr: float
    close: float
    median_ratio: float
    pip_value: float | None = None

    @property
    def atr_ratio(self) -> float:
        if self.close <= 0:
            return 0.0
        return self.atr / self.close


@dataclass
class NewsEvent:
    """Upcoming macro event with potential impact on hedging."""

    symbol: str | None
    minutes_until: float
    severity: Literal["low", "medium", "high"] = "high"


@dataclass
class HedgePosition:
    """Existing hedge recorded in the ledger."""

    id: str
    symbol: str
    hedge_symbol: str
    side: HedgeSide
    qty: float
    reason: HedgeReason


@dataclass
class AggregatedExposure:
    """Internal representation combining duplicate exposures."""

    symbol: str
    net_quantity: float
    gross_quantity: float
    beta: float
    price: float | None
    pip_value: float | None


@dataclass
class AccountState:
    """Summary of account level guardrails and open positions."""

    mode: AccountMode = "hedging"
    exposures: Sequence[ExposurePosition] = ()
    hedges: Sequence[HedgePosition] = ()
    drawdown_r: float = 0.0
    risk_capital: float = 0.0
    max_basket_risk: float = 1.5


@dataclass
class MarketState:
    """Aggregated market context consumed by the hedge model."""

    volatility: Dict[str, VolatilitySnapshot]
    correlations: Dict[str, Dict[str, float]] | None = None
    news: Sequence[NewsEvent] = ()


@dataclass
class HedgeDecision:
    """Directive instructing the execution layer to open or close a hedge."""

    action: Literal["OPEN", "CLOSE"]
    symbol: str
    hedge_symbol: str
    side: HedgeSide
    quantity: float
    reason: HedgeReason
    score: float
    hedge_id: str | None = None
    notes: str | None = None


class DynamicHedgePolicy:
    """Evaluate risk telemetry and produce hedge directives."""

    def __init__(
        self,
        *,
        volatility_spike_multiplier: float = 1.3,
        volatility_recovery_buffer: float = 1.05,
        news_lead_minutes: float = 60.0,
        drawdown_r_trigger: float = 2.0,
    ) -> None:
        self.volatility_spike_multiplier = volatility_spike_multiplier
        self.volatility_recovery_buffer = volatility_recovery_buffer
        self.news_lead_minutes = news_lead_minutes
        self.drawdown_r_trigger = drawdown_r_trigger

    def evaluate(self, market: MarketState, account: AccountState) -> List[HedgeDecision]:
        """Return hedge directives based on the supplied telemetry."""

        correlations = market.correlations or {}
        news = list(market.news or ())
        aggregates = _aggregate_exposures(account.exposures)
        active = list(account.hedges or ())

        decisions: List[HedgeDecision] = []

        for symbol, exposure in aggregates.items():
            if abs(exposure.net_quantity) <= 1e-6:
                continue
            snapshot = market.volatility.get(symbol)
            trigger = self._evaluate_triggers(symbol, snapshot, account, news)
            if trigger is None:
                continue
            reason, score = trigger

            if any(
                hedge.symbol == symbol and hedge.reason == reason
                for hedge in active
            ):
                continue

            hedge_symbol = (
                symbol
                if account.mode == "hedging"
                else self._select_inverse_symbol(symbol, correlations)
            )
            side: HedgeSide = "SHORT_HEDGE" if exposure.net_quantity > 0 else "LONG_HEDGE"
            quantity = self._compute_quantity(reason, score, exposure, snapshot, account)
            notes = None
            if reason == "NEWS":
                minutes = _closest_news_minutes(news, symbol, self.news_lead_minutes)
                if minutes is not None:
                    notes = f"{minutes:.0f}m to high impact news"

            decisions.append(
                HedgeDecision(
                    action="OPEN",
                    symbol=symbol,
                    hedge_symbol=hedge_symbol,
                    side=side,
                    quantity=round(max(quantity, 0.0), 6),
                    reason=reason,
                    score=score,
                    notes=notes,
                )
            )

        for hedge in active:
            snapshot = market.volatility.get(hedge.symbol)
            if self._should_close(hedge, snapshot, account, news):
                decisions.append(
                    HedgeDecision(
                        action="CLOSE",
                        symbol=hedge.symbol,
                        hedge_symbol=hedge.hedge_symbol,
                        side=hedge.side,
                        quantity=round(max(hedge.qty, 0.0), 6),
                        reason=hedge.reason,
                        score=1.0,
                        hedge_id=hedge.id,
                    )
                )

        return decisions

    def _evaluate_triggers(
        self,
        symbol: str,
        snapshot: VolatilitySnapshot | None,
        account: AccountState,
        news: Sequence[NewsEvent],
    ) -> tuple[HedgeReason, float] | None:
        if snapshot and snapshot.median_ratio > 0:
            ratio = snapshot.atr_ratio
            if ratio > self.volatility_spike_multiplier * snapshot.median_ratio:
                vol_ratio = ratio / snapshot.median_ratio
                return "ATR_SPIKE", max(vol_ratio, 1.0)

        if abs(account.drawdown_r) >= self.drawdown_r_trigger:
            return "DD_LIMIT", abs(account.drawdown_r)

        relevant_scores = [
            self._news_score(event)
            for event in news
            if _news_relevant(event, symbol, self.news_lead_minutes)
        ]
        if relevant_scores:
            return "NEWS", max(relevant_scores)

        return None

    def _compute_quantity(
        self,
        reason: HedgeReason,
        score: float,
        exposure: AggregatedExposure,
        snapshot: VolatilitySnapshot | None,
        account: AccountState,
    ) -> float:
        base_exposure = abs(exposure.net_quantity)
        if base_exposure <= 0:
            return 0.0

        if reason == "ATR_SPIKE":
            qty = base_exposure * exposure.beta * max(1.0, score)
        elif reason == "DD_LIMIT":
            risk_cap = account.risk_capital or (exposure.price or 1.0) * base_exposure
            atr_value = snapshot.atr if snapshot else 1.0
            pip_value = snapshot.pip_value or exposure.pip_value or 1.0
            qty = risk_cap / max(atr_value * pip_value, 1e-6)
        else:  # NEWS
            qty = base_exposure * max(score, 1.0)

        max_multiplier = account.max_basket_risk if account.max_basket_risk > 0 else None
        if max_multiplier is not None:
            qty = min(qty, base_exposure * max_multiplier)

        return qty

    def _should_close(
        self,
        hedge: HedgePosition,
        snapshot: VolatilitySnapshot | None,
        account: AccountState,
        news: Sequence[NewsEvent],
    ) -> bool:
        if hedge.reason == "ATR_SPIKE":
            if not snapshot or snapshot.median_ratio <= 0:
                return False
            ratio = snapshot.atr_ratio
            return ratio <= self.volatility_recovery_buffer * snapshot.median_ratio

        if hedge.reason == "DD_LIMIT":
            return abs(account.drawdown_r) < max(1.0, self.drawdown_r_trigger * 0.5)

        # NEWS
        return not any(
            _news_relevant(event, hedge.symbol, self.news_lead_minutes)
            for event in news
        )

    def _select_inverse_symbol(
        self, symbol: str, correlations: Dict[str, Dict[str, float]]
    ) -> str:
        correlation_row = correlations.get(symbol) or {}
        best_symbol = symbol
        best_value = 1.0
        for candidate, value in correlation_row.items():
            if value is None:
                continue
            if value < best_value:
                best_value = value
                best_symbol = candidate
        if best_value <= -0.6:
            return best_symbol
        return symbol

    def _news_score(self, event: NewsEvent) -> float:
        base = {"low": 0.6, "medium": 1.0, "high": 1.3}.get(event.severity, 1.0)
        time_factor = max(0.5, (self.news_lead_minutes - event.minutes_until) / max(self.news_lead_minutes, 1.0))
        return max(0.5, base * time_factor)


def _aggregate_exposures(
    exposures: Sequence[ExposurePosition],
) -> Dict[str, AggregatedExposure]:
    aggregates: Dict[str, AggregatedExposure] = {}
    beta_weight: MutableMapping[str, float] = {}
    beta_sum: MutableMapping[str, float] = {}

    for position in exposures:
        qty = abs(position.quantity)
        if qty <= 0:
            continue
        direction = 1 if position.side.upper() == "LONG" else -1

        aggregate = aggregates.get(position.symbol)
        if aggregate is None:
            aggregate = AggregatedExposure(
                symbol=position.symbol,
                net_quantity=0.0,
                gross_quantity=0.0,
                beta=1.0,
                price=position.price,
                pip_value=position.pip_value,
            )
            aggregates[position.symbol] = aggregate
            beta_weight[position.symbol] = 0.0
            beta_sum[position.symbol] = 0.0

        aggregate.net_quantity += direction * qty
        aggregate.gross_quantity += qty
        if position.price is not None:
            aggregate.price = position.price
        if position.pip_value is not None:
            aggregate.pip_value = position.pip_value

        beta_weight[position.symbol] += qty
        beta_sum[position.symbol] += qty * (position.beta if position.beta else 1.0)

    for symbol, aggregate in aggregates.items():
        weight = beta_weight.get(symbol, 0.0)
        aggregate.beta = beta_sum.get(symbol, 0.0) / weight if weight > 0 else 1.0

    return aggregates


def _news_relevant(event: NewsEvent, symbol: str, horizon: float) -> bool:
    if event.minutes_until < 0 or event.minutes_until > horizon:
        return False
    if event.symbol is None:
        return True
    normalized = event.symbol.upper()
    if normalized in {symbol.upper(), "GLOBAL", "ALL"}:
        return True
    return False


def _closest_news_minutes(
    events: Iterable[NewsEvent], symbol: str, horizon: float
) -> float | None:
    mins: List[float] = [
        event.minutes_until
        for event in events
        if _news_relevant(event, symbol, horizon)
    ]
    if not mins:
        return None
    return min(mins)
