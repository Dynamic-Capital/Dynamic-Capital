"""Utilities for tracking directional market flow across executed trades."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Iterator, Literal, Mapping, Optional

from .trading_core import TradeExecutionResult

Action = Literal["BUY", "SELL"]


def _coerce_timestamp(value: Optional[datetime | str] = None) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*.

    ``value`` may be ``None`` (which results in ``datetime.now(timezone.utc)``), a
    :class:`datetime`, or an ISO-8601 string.  Naive datetimes are assumed to be
    UTC.
    """

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive guardrail
            raise ValueError(f"Invalid ISO timestamp: {value!r}") from exc
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp value must be datetime, ISO string, or None")


@dataclass(slots=True)
class MarketFlowTrade:
    """Normalised representation of a filled order.

    The *volume* is expected to be positive.  Directional information is encoded
    via the :class:`Action` type.
    """

    symbol: str
    action: Action
    volume: float
    price: Optional[float] = None
    profit: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        self.symbol = str(self.symbol)
        normalised_action = str(self.action).upper()
        if normalised_action not in {"BUY", "SELL"}:
            raise ValueError(f"Unsupported action: {self.action!r}")
        self.action = normalised_action  # type: ignore[assignment]

        try:
            self.volume = float(self.volume)
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
            raise ValueError("volume must be numeric") from exc

        if self.volume <= 0:
            raise ValueError("volume must be positive")

        if self.price is not None:
            self.price = float(self.price)
        self.profit = float(self.profit)

        self.timestamp = _coerce_timestamp(self.timestamp)


@dataclass(slots=True)
class MarketFlowSnapshot:
    """Aggregated market flow metrics for a symbol."""

    symbol: str
    trade_count: int
    buy_volume: float
    sell_volume: float
    net_volume: float
    gross_volume: float
    realised_pnl: float
    average_buy_price: Optional[float]
    average_sell_price: Optional[float]
    last_trade_at: Optional[datetime]
    pressure: float
    bias: str

    @property
    def flow_score(self) -> float:
        """Return the directional pressure rescaled to ±100."""

        return round(self.pressure * 100, 2)


class DynamicMarketFlow:
    """Maintain rolling market flow statistics per instrument."""

    def __init__(
        self,
        *,
        window_size: Optional[int] = 200,
        window_duration: Optional[timedelta] = None,
    ) -> None:
        self.window_size = window_size
        self.window_duration = window_duration
        self._trades: Dict[str, Deque[MarketFlowTrade]] = {}

    # ------------------------------------------------------------------ helpers
    def _get_history(self, symbol: str) -> Deque[MarketFlowTrade]:
        key = symbol.upper()
        if key not in self._trades:
            self._trades[key] = deque()
        return self._trades[key]

    def _prune(
        self,
        history: Deque[MarketFlowTrade],
        *,
        reference: Optional[datetime] = None,
    ) -> None:
        if self.window_size is not None:
            while len(history) > self.window_size:
                history.popleft()

        if self.window_duration is not None and history:
            base_time = reference or history[-1].timestamp
            cutoff = base_time - self.window_duration
            while history and history[0].timestamp < cutoff:
                history.popleft()

    # ----------------------------------------------------------------- recording
    def record(
        self,
        symbol: str,
        action: Action,
        volume: float,
        *,
        price: Optional[float] = None,
        profit: float = 0.0,
        timestamp: Optional[datetime | str] = None,
    ) -> MarketFlowTrade:
        """Append a trade to the rolling history for *symbol*."""

        trade = MarketFlowTrade(
            symbol=symbol,
            action=action,
            volume=volume,
            price=price,
            profit=profit,
            timestamp=_coerce_timestamp(timestamp),
        )

        history = self._get_history(symbol)
        history.append(trade)
        self._prune(history, reference=trade.timestamp)

        return trade

    def ingest_execution(
        self,
        execution: TradeExecutionResult,
        *,
        action: Optional[str] = None,
        symbol: Optional[str] = None,
        volume: Optional[float] = None,
        price: Optional[float] = None,
        timestamp: Optional[datetime | str] = None,
    ) -> bool:
        """Record ``execution`` if the required attributes can be resolved.

        Returns ``True`` when the execution was ingested.  The helper tolerates
        incomplete payloads—when the minimum information cannot be resolved the
        execution is ignored and ``False`` is returned.
        """

        resolved_symbol = symbol or getattr(execution, "symbol", None)
        resolved_volume = volume or getattr(execution, "lot", None)
        resolved_price = price if price is not None else getattr(execution, "price", None)
        resolved_profit = getattr(execution, "profit", 0.0)
        resolved_action = action or getattr(execution, "action", None)
        resolved_timestamp = timestamp or getattr(execution, "timestamp", None)

        if not resolved_symbol or not resolved_volume or not resolved_action:
            return False

        try:
            self.record(
                symbol=str(resolved_symbol),
                action=str(resolved_action).upper(),
                volume=float(resolved_volume),
                price=resolved_price,
                profit=float(resolved_profit or 0.0),
                timestamp=resolved_timestamp,
            )
        except (TypeError, ValueError):
            return False

        return True

    # ----------------------------------------------------------------- snapshots
    def snapshot(self, symbol: str) -> MarketFlowSnapshot:
        """Return the aggregated state for *symbol*."""

        history = self._get_history(symbol)
        self._prune(history)
        if not history:
            return MarketFlowSnapshot(
                symbol=symbol.upper(),
                trade_count=0,
                buy_volume=0.0,
                sell_volume=0.0,
                net_volume=0.0,
                gross_volume=0.0,
                realised_pnl=0.0,
                average_buy_price=None,
                average_sell_price=None,
                last_trade_at=None,
                pressure=0.0,
                bias="balanced",
            )

        buy_volume = 0.0
        sell_volume = 0.0
        buy_notional = 0.0
        sell_notional = 0.0
        realised_pnl = 0.0
        last_trade_at = None

        for trade in history:
            if trade.action == "BUY":
                buy_volume += trade.volume
                if trade.price is not None:
                    buy_notional += trade.volume * trade.price
            else:
                sell_volume += trade.volume
                if trade.price is not None:
                    sell_notional += trade.volume * trade.price

            realised_pnl += trade.profit
            if last_trade_at is None or trade.timestamp > last_trade_at:
                last_trade_at = trade.timestamp

        gross_volume = buy_volume + sell_volume
        net_volume = buy_volume - sell_volume
        pressure = net_volume / gross_volume if gross_volume else 0.0

        average_buy_price = (
            buy_notional / buy_volume if buy_volume and buy_notional else None
        )
        average_sell_price = (
            sell_notional / sell_volume if sell_volume and sell_notional else None
        )

        bias: str
        if pressure > 0.15:
            bias = "buy"
        elif pressure < -0.15:
            bias = "sell"
        else:
            bias = "balanced"

        return MarketFlowSnapshot(
            symbol=symbol.upper(),
            trade_count=len(history),
            buy_volume=buy_volume,
            sell_volume=sell_volume,
            net_volume=net_volume,
            gross_volume=gross_volume,
            realised_pnl=realised_pnl,
            average_buy_price=average_buy_price,
            average_sell_price=average_sell_price,
            last_trade_at=last_trade_at,
            pressure=round(pressure, 4),
            bias=bias,
        )

    def snapshot_all(self) -> Dict[str, MarketFlowSnapshot]:
        """Return snapshots for every tracked symbol."""

        return {symbol: self.snapshot(symbol) for symbol in self._trades.keys()}

    def flow_state(self, symbol: str) -> Mapping[str, object]:
        """Return a serialisable mapping describing the flow state."""

        snap = self.snapshot(symbol)
        last_trade = snap.last_trade_at.isoformat() if snap.last_trade_at else None

        return {
            "symbol": snap.symbol,
            "trade_count": snap.trade_count,
            "buy_volume": snap.buy_volume,
            "sell_volume": snap.sell_volume,
            "net_volume": snap.net_volume,
            "gross_volume": snap.gross_volume,
            "pressure": snap.pressure,
            "bias": snap.bias,
            "realised_pnl": snap.realised_pnl,
            "average_buy_price": snap.average_buy_price,
            "average_sell_price": snap.average_sell_price,
            "last_trade_at": last_trade,
            "flow_score": snap.flow_score,
        }

    # ---------------------------------------------------------------- maintenance
    def clear(self, symbol: Optional[str] = None) -> None:
        """Clear tracked trades for *symbol* or all symbols if omitted."""

        if symbol is None:
            self._trades.clear()
        else:
            self._trades.pop(symbol.upper(), None)

    # ------------------------------------------------------------ iteration utils
    def symbols(self) -> Iterable[str]:
        """Return an iterable of tracked symbols."""

        return tuple(self._trades.keys())

    def trades(self, symbol: str) -> Iterator[MarketFlowTrade]:
        """Yield the tracked trades for *symbol* in chronological order."""

        return iter(self._get_history(symbol))
