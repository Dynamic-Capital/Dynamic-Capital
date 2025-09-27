"""Execution layer that bridges AI guidance with MT5/Exness trades."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Any, Dict, Optional

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


class DynamicTradingAlgo:
    """High-level trade executor that orchestrates MT5 or paper trades."""

    def __init__(self, connector: Optional[Any] = None) -> None:
        self.connector = connector or self._bootstrap_connector()

    def execute_trade(
        self,
        signal: Any,
        *,
        base_lot: float,
        symbol: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> TradeExecutionResult:
        action = self._extract_action(signal)

        if action not in {ORDER_ACTION_BUY, ORDER_ACTION_SELL}:
            return TradeExecutionResult(
                retcode=0,
                message="No trade executed for neutral signal",
                profit=0.0,
                symbol=symbol,
                lot=0.0,
            )

        if not self._should_execute(action, context):
            return TradeExecutionResult(
                retcode=0,
                message="Trade gated by risk controls",
                profit=0.0,
                symbol=symbol,
                lot=0.0,
            )

        lot = self._determine_lot(base_lot, signal, context)
        if lot <= 0:
            return TradeExecutionResult(
                retcode=0,
                message="Trade skipped due to insufficient conviction",
                profit=0.0,
                symbol=symbol,
                lot=0.0,
            )

        if action == ORDER_ACTION_BUY:
            return self._buy(symbol, lot)
        return self._sell(symbol, lot)

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

    def _determine_lot(
        self, base_lot: float, signal: Any, context: Optional[Dict[str, Any]]
    ) -> float:
        lot = float(base_lot)
        confidence = self._extract_confidence(signal)
        lorentzian = (context or {}).get("lorentzian", {})
        score = float(lorentzian.get("score", 0.0))
        enter_z = float(lorentzian.get("enter_z", 2.0))
        style = str(lorentzian.get("style", "mean_rev"))
        intensity = abs(score) / max(1.0, enter_z)

        if lorentzian:
            lot *= self._clamp(intensity, 0.3, 1.5)
        else:
            lot *= self._clamp(confidence or 0.5, 0.3, 1.5)

        vol = float((context or {}).get("volatility", 0.0))
        lot *= self._volatility_sizer(vol)

        action = self._extract_action(signal)
        score_direction = 1 if score >= 0 else -1
        aligned = True
        if lorentzian:
            if style == "trend":
                aligned = (score_direction > 0 and action == ORDER_ACTION_BUY) or (
                    score_direction < 0 and action == ORDER_ACTION_SELL
                )
            else:  # mean reversion
                aligned = (score_direction < 0 and action == ORDER_ACTION_BUY) or (
                    score_direction > 0 and action == ORDER_ACTION_SELL
                )
        if not aligned:
            lot *= 0.6

        return round(max(lot, 0.0), 3)

    def _should_execute(self, action: str, context: Optional[Dict[str, Any]]) -> bool:
        if action not in {ORDER_ACTION_BUY, ORDER_ACTION_SELL}:
            return False

        ctx = context or {}
        session_controls = ctx.get("session", {})
        if session_controls.get("halt"):
            return False

        lorentzian = ctx.get("lorentzian") or {}
        exit_z = float(lorentzian.get("exit_z", 0.5))
        score = float(lorentzian.get("score", 0.0))
        if lorentzian and abs(score) < exit_z:
            return False

        return True

    def _volatility_sizer(self, volatility: float) -> float:
        if volatility <= 0:
            return 1.0
        if volatility > 0.05:
            return 0.75
        if volatility < 0.02:
            return 1.2
        return 1.0

    def _extract_confidence(self, signal: Any) -> float:
        if hasattr(signal, "confidence"):
            try:
                return float(signal.confidence)
            except (TypeError, ValueError):
                return 0.0
        if isinstance(signal, dict) and "confidence" in signal:
            try:
                return float(signal["confidence"])
            except (TypeError, ValueError):
                return 0.0
        return 0.0

    @staticmethod
    def _clamp(value: float, lower: float, upper: float) -> float:
        return max(lower, min(upper, value))

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
