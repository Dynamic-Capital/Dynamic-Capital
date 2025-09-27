"""Execution layer that bridges AI guidance with MT5/Exness trades."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any, Optional

try:  # pragma: no cover - optional dependency
    from integrations.mt5_connector import MT5Connector  # type: ignore
except Exception:  # pragma: no cover - keep module importable if MT5 deps missing
    MT5Connector = None  # type: ignore

ORDER_ACTION_BUY = "BUY"
ORDER_ACTION_SELL = "SELL"
SUCCESS_RETCODE = 10009


@dataclass
class TradeExecutionResult:
    """Normalised view of a trading execution attempt."""

    retcode: int
    message: str
    profit: float
    ticket: Optional[int] = None
    symbol: Optional[str] = None
    lot: Optional[float] = None
    price: Optional[float] = None
    raw_response: Any = None

    @property
    def ok(self) -> bool:
        return self.retcode == SUCCESS_RETCODE


class _PaperBroker:
    """Fallback connector that simulates fills when MT5 is unavailable."""

    def execute(self, action: str, symbol: str, lot: float) -> TradeExecutionResult:
        drift = random.uniform(-1.0, 1.0)
        base_profit = lot * 100
        profit = base_profit * (1 if action == ORDER_ACTION_BUY else 0.6) + drift
        message = f"Simulated {action} order executed"

        return TradeExecutionResult(
            retcode=SUCCESS_RETCODE,
            message=message,
            profit=round(profit, 2),
            ticket=random.randint(10_000, 99_999),
            symbol=symbol,
            lot=lot,
        )

    def open_hedge(self, symbol: str, lot: float, side: str) -> TradeExecutionResult:
        action = ORDER_ACTION_BUY if side.upper() == "LONG_HEDGE" else ORDER_ACTION_SELL
        return self.execute(action, symbol, lot)

    def close_hedge(self, symbol: str, lot: float, side: str) -> TradeExecutionResult:
        action = ORDER_ACTION_SELL if side.upper() == "LONG_HEDGE" else ORDER_ACTION_BUY
        return self.execute(action, symbol, lot)


class DynamicTradingAlgo:
    """High-level trade executor that orchestrates MT5 or paper trades."""

    def __init__(self, connector: Optional[Any] = None) -> None:
        self.connector = connector or self._bootstrap_connector()

    def execute_trade(self, signal: Any, *, lot: float, symbol: str) -> TradeExecutionResult:
        action = self._extract_action(signal)

        if action == ORDER_ACTION_BUY:
            return self._buy(symbol, lot)
        if action == ORDER_ACTION_SELL:
            return self._sell(symbol, lot)

        return TradeExecutionResult(
            retcode=0,
            message="No trade executed for neutral signal",
            profit=0.0,
            symbol=symbol,
            lot=lot,
        )

    def _buy(self, symbol: str, lot: float) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "buy"):
            response = self.connector.buy(symbol, lot)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        return self._paper_execute(ORDER_ACTION_BUY, symbol, lot)

    def _sell(self, symbol: str, lot: float) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "sell"):
            response = self.connector.sell(symbol, lot)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        return self._paper_execute(ORDER_ACTION_SELL, symbol, lot)

    def execute_hedge(
        self,
        *,
        symbol: str,
        lot: float,
        side: str,
        close: bool = False,
    ) -> TradeExecutionResult:
        """Execute a hedge open/close instruction."""

        if close:
            return self._close_hedge(symbol, lot, side)
        return self._open_hedge(symbol, lot, side)

    def _open_hedge(self, symbol: str, lot: float, side: str) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "open_hedge"):
            response = self.connector.open_hedge(symbol, lot, side)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        action = ORDER_ACTION_BUY if side.upper() == "LONG_HEDGE" else ORDER_ACTION_SELL
        return self._paper_execute(action, symbol, lot)

    def _close_hedge(self, symbol: str, lot: float, side: str) -> TradeExecutionResult:
        if self.connector and hasattr(self.connector, "close_hedge"):
            response = self.connector.close_hedge(symbol, lot, side)
            return self._normalise_response(response, symbol=symbol, lot=lot)

        action = ORDER_ACTION_SELL if side.upper() == "LONG_HEDGE" else ORDER_ACTION_BUY
        return self._paper_execute(action, symbol, lot)

    def _paper_execute(self, action: str, symbol: str, lot: float) -> TradeExecutionResult:
        broker = _PaperBroker()
        return broker.execute(action, symbol, lot)

    def _normalise_response(self, response: Any, *, symbol: str, lot: float) -> TradeExecutionResult:
        if isinstance(response, TradeExecutionResult):
            return response

        retcode = getattr(response, "retcode", 0)
        profit = getattr(response, "profit", 0.0)
        ticket = getattr(response, "order", None) or getattr(response, "ticket", None)
        price = getattr(response, "price", None)
        comment = getattr(response, "comment", "")

        return TradeExecutionResult(
            retcode=retcode,
            message=comment or "Trade executed",
            profit=profit,
            ticket=ticket,
            symbol=symbol,
            lot=lot,
            price=price,
            raw_response=response,
        )

    def _extract_action(self, signal: Any) -> str:
        if hasattr(signal, "action"):
            return str(signal.action).upper()
        if isinstance(signal, dict) and "action" in signal:
            return str(signal["action"]).upper()
        return str(signal).upper()

    def _bootstrap_connector(self) -> Any:
        if MT5Connector is None:
            return _PaperBroker()
        try:
            return MT5Connector()
        except Exception:
            return _PaperBroker()
