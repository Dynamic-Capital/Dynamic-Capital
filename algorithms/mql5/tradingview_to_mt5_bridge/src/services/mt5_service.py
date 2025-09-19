"""Wrapper around the MetaTrader5 package with a simulation fallback."""
from __future__ import annotations

import logging
import random
import time
from dataclasses import dataclass

try:  # pragma: no cover - MetaTrader5 only available on Windows
    import MetaTrader5 as mt5  # type: ignore
except Exception:  # pragma: no cover
    mt5 = None

from src.config.settings import Settings
from src.services.risk import ExecutionPlan

logger = logging.getLogger(__name__)


@dataclass
class ExecutionResult:
    ticket: str
    price: float
    volume: float


class MT5Service:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.initialized = False

    def initialize(self) -> None:
        if self.initialized:
            return
        if self.settings.mt5_demo_mode or mt5 is None:
            logger.info("MT5 service running in demo mode – trades are simulated")
            self.initialized = True
            return
        if not mt5.initialize(path=self.settings.mt5_path):
            raise RuntimeError(f"Failed to initialize MT5: {mt5.last_error()}")
        if self.settings.mt5_login and self.settings.mt5_password:
            authorized = mt5.login(
                int(self.settings.mt5_login),
                password=self.settings.mt5_password,
                server=self.settings.mt5_server,
            )
            if not authorized:
                error = mt5.last_error()
                raise RuntimeError(f"Unable to login to MT5: {error}")
        self.initialized = True
        logger.info("MT5 terminal initialized")

    def shutdown(self) -> None:
        if mt5 and not self.settings.mt5_demo_mode:
            mt5.shutdown()
        self.initialized = False

    def execute(self, plan: ExecutionPlan) -> ExecutionResult:
        self.initialize()
        signal = plan.signal
        side = (signal.get("side") or "buy").lower()
        symbol = signal.get("symbol") or signal.get("ticker")
        if not symbol:
            raise RuntimeError("Signal missing symbol")

        if self.settings.mt5_demo_mode or mt5 is None:
            price = float(signal.get("entry") or signal.get("price") or 0.0)
            if price == 0:
                price = round(random.uniform(1.0, 2.0), 5)
            ticket = f"SIM-{int(time.time() * 1000)}"
            logger.info(
                "Simulated %s order for %s volume %.2f at %.5f", side, symbol, plan.volume, price
            )
            return ExecutionResult(ticket=ticket, price=price, volume=plan.volume)

        order_type = mt5.ORDER_TYPE_BUY if side == "buy" else mt5.ORDER_TYPE_SELL
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": plan.volume,
            "type": order_type,
            "price": mt5.symbol_info_tick(symbol).ask if side == "buy" else mt5.symbol_info_tick(symbol).bid,
            "deviation": int(signal.get("slippage", 20)),
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        if plan.stop_loss is not None:
            request["sl"] = plan.stop_loss
        if plan.take_profit is not None:
            request["tp"] = plan.take_profit

        logger.debug("Sending MT5 order: %s", request)
        result = mt5.order_send(request)
        if result is None:
            raise RuntimeError(f"order_send returned None: {mt5.last_error()}")
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise RuntimeError(f"order_send failed: {result.retcode} - {result.comment}")
        return ExecutionResult(ticket=str(result.order), price=float(result.price), volume=plan.volume)


__all__ = ["MT5Service", "ExecutionResult"]
