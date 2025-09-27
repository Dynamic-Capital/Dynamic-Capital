"""Thin wrapper around the MetaTrader5 Python API."""

from __future__ import annotations

import logging
from typing import Any

try:  # pragma: no cover - optional dependency
    import MetaTrader5 as mt5  # type: ignore
except Exception as exc:  # pragma: no cover
    mt5 = None  # type: ignore
    logging.getLogger(__name__).warning(
        "MetaTrader5 package unavailable: %s. Falling back to paper trading.",
        exc,
    )


class MT5Connector:
    """Encapsulate MT5 order placement for buy/sell operations."""

    def __init__(self) -> None:
        if mt5 is None:
            raise RuntimeError("MetaTrader5 library is not installed.")
        if not mt5.initialize():
            raise RuntimeError("MT5 initialization failed")

    def buy(self, symbol: str, lot: float) -> Any:
        request = self._build_request(
            symbol=symbol,
            lot=lot,
            order_type=mt5.ORDER_TYPE_BUY,
            comment_prefix="DynamicTradingAlgo BUY",
        )
        return mt5.order_send(request)

    def sell(self, symbol: str, lot: float) -> Any:
        request = self._build_request(
            symbol=symbol,
            lot=lot,
            order_type=mt5.ORDER_TYPE_SELL,
            comment_prefix="DynamicTradingAlgo SELL",
        )
        return mt5.order_send(request)

    def open_hedge(self, symbol: str, lot: float, side: str) -> Any:
        order_type = mt5.ORDER_TYPE_BUY if side.upper() == "LONG_HEDGE" else mt5.ORDER_TYPE_SELL
        request = self._build_request(
            symbol=symbol,
            lot=lot,
            order_type=order_type,
            type_filling=mt5.ORDER_FILLING_FOK,
            comment_prefix="DynamicHedge OPEN",
        )
        return mt5.order_send(request)

    def close_hedge(self, symbol: str, lot: float, side: str) -> Any:
        reverse_type = mt5.ORDER_TYPE_SELL if side.upper() == "LONG_HEDGE" else mt5.ORDER_TYPE_BUY
        request = self._build_request(
            symbol=symbol,
            lot=lot,
            order_type=reverse_type,
            type_filling=mt5.ORDER_FILLING_FOK,
            comment_prefix="DynamicHedge CLOSE",
        )
        return mt5.order_send(request)

    def _build_request(
        self,
        *,
        symbol: str,
        lot: float,
        order_type: int,
        type_filling: int | None = None,
        comment_prefix: str = "DynamicTradingAlgo",
    ) -> dict:
        tick = mt5.symbol_info_tick(symbol)
        price = tick.ask if order_type == mt5.ORDER_TYPE_BUY else tick.bid

        direction = "BUY" if order_type == mt5.ORDER_TYPE_BUY else "SELL"

        return {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": lot,
            "type": order_type,
            "price": price,
            "deviation": 20,
            "magic": 234_000,
            "comment": f"{comment_prefix} {direction}",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": type_filling or mt5.ORDER_FILLING_IOC,
        }
