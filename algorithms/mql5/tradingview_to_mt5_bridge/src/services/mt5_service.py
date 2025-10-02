import asyncio
import logging
import os
import time
from datetime import datetime
from functools import partial
from pathlib import Path
from threading import Lock
from typing import Any, Callable, Dict, List, Optional, Tuple

import MetaTrader5 as mt5

from src.config.mt5_symbol_config import SymbolMapper
from src.utils.database_handler import DatabaseHandler
from src.utils.instrument_manager import InstrumentManager

logger = logging.getLogger("MT5Service")


def find_mt5_terminals() -> List[str]:
    """Find all MT5 terminals installed on the system."""
    terminals: List[str] = []
    roaming = Path(os.getenv("APPDATA", ""))

    if not roaming:
        return terminals

    for path in roaming.glob("**/terminal64.exe"):
        if "MetaTrader 5" in str(path) or "MT5" in str(path):
            terminals.append(str(path))

    return terminals


class MT5Service:
    """High-level service that wraps MT5 operations with resiliency helpers."""

    _SYMBOL_CACHE_TTL = 1.0  # seconds

    def __init__(
        self,
        account: int,
        password: str,
        server: str,
        db_handler: Optional[DatabaseHandler] = None,
    ) -> None:
        self.account = account
        self.password = password
        self.server = server
        self.db = db_handler

        self.loop: Optional[asyncio.AbstractEventLoop] = None
        self.symbol_mapper = SymbolMapper()
        self.instrument_manager = InstrumentManager()

        self.initialized = False
        self.last_init_time = 0.0
        self.init_cooldown = 1.0
        self.running = True

        self._init_lock = Lock()
        self._symbol_cache_lock = Lock()
        self._symbol_cache: Dict[str, Tuple[float, Any]] = {}

        self.terminal_path = os.getenv("MT5_TERMINAL_PATH")
        if not self.terminal_path:
            logger.warning("MT5_TERMINAL_PATH not set in .env file")
            terminals = find_mt5_terminals()
            if terminals:
                logger.info("Available MT5 terminals:")
                for i, path in enumerate(terminals, 1):
                    logger.info("%d. %s", i, path)
                logger.info("Set MT5_TERMINAL_PATH in .env to use a specific terminal")
        elif not os.path.exists(self.terminal_path):
            logger.error("MT5 terminal not found at: %s", self.terminal_path)
            for terminal in find_mt5_terminals():
                logger.info("Available terminal: %s", terminal)

    # ------------------------------------------------------------------
    # Event loop helpers
    # ------------------------------------------------------------------
    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Explicitly set the event loop used for async helpers."""
        self.loop = loop

    def _ensure_loop(self) -> asyncio.AbstractEventLoop:
        if not self.loop:
            self.loop = asyncio.get_event_loop()
        return self.loop

    async def _run_in_executor(self, func: Callable, *args, **kwargs):
        loop = self._ensure_loop()
        return await loop.run_in_executor(None, partial(func, *args, **kwargs))

    # ------------------------------------------------------------------
    # Initialization helpers
    # ------------------------------------------------------------------
    def _init(self) -> bool:
        """Perform the synchronous MT5 initialization sequence."""
        try:
            current_time = time.time()
            if current_time - self.last_init_time < self.init_cooldown:
                time.sleep(self.init_cooldown)

            if self.initialized and mt5.account_info() is not None:
                return True

            init_params: Dict[str, Any] = {
                "login": self.account,
                "password": self.password,
                "server": self.server,
            }
            if self.terminal_path and os.path.exists(self.terminal_path):
                init_params["path"] = self.terminal_path

            if not mt5.initialize(**init_params):
                logger.error("MT5 initialization failed: %s", mt5.last_error())
                self.initialized = False
                return False

            if not mt5.login(self.account, password=self.password, server=self.server):
                logger.error("MT5 login failed: %s", mt5.last_error())
                mt5.shutdown()
                self.initialized = False
                return False

            account_info = mt5.account_info()
            if not account_info:
                logger.error("Could not get account info")
                mt5.shutdown()
                self.initialized = False
                return False

            self.initialized = True
            self.last_init_time = current_time
            if self.terminal_path:
                logger.info("Using terminal: %s", self.terminal_path)
            logger.info("✅ MT5 Connected: %s (%s)", account_info.login, account_info.server)
            return True
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Error initializing MT5: %s", exc)
            self.initialized = False
            return False

    def _ensure_initialized(self) -> bool:
        """Ensure the terminal session is ready before executing an operation."""
        if self.initialized and mt5.account_info() is not None:
            return True

        with self._init_lock:
            if self.initialized and mt5.account_info() is not None:
                return True
            return self._init()

    async def async_initialize(self) -> bool:
        """Initialize MT5 connection with retries asynchronously."""
        return await self._retry_operation(
            lambda: self._run_in_executor(self._ensure_initialized)
        )

    async def _retry_operation(self, operation: Callable, max_retries: int = 3):
        for attempt in range(max_retries):
            try:
                return await operation()
            except Exception as exc:  # pragma: no cover - defensive logging
                if attempt == max_retries - 1:
                    logger.error("Operation failed after %d attempts: %s", max_retries, exc)
                    raise
                wait_time = (2 ** attempt) * 0.1
                logger.warning(
                    "Operation failed, attempt %d/%d. Retrying in %.2fs...",
                    attempt + 1,
                    max_retries,
                    wait_time,
                )
                await asyncio.sleep(wait_time)

    # ------------------------------------------------------------------
    # Symbol helpers
    # ------------------------------------------------------------------
    def map_symbol(self, tv_symbol: str) -> str:
        return self.symbol_mapper.map_symbol(tv_symbol)

    def _select_symbol(self, symbol: str) -> bool:
        if mt5.symbol_select(symbol, True):
            return True
        logger.error("Failed to select symbol %s", symbol)
        return False

    def _get_symbol_info(self, symbol: str, force_refresh: bool = False):
        now = time.time()
        if not force_refresh:
            with self._symbol_cache_lock:
                cached = self._symbol_cache.get(symbol)
                if cached and now - cached[0] < self._SYMBOL_CACHE_TTL:
                    return cached[1]

        info = mt5.symbol_info(symbol)
        if info:
            with self._symbol_cache_lock:
                self._symbol_cache[symbol] = (now, info)
        return info

    def _get_filling_type(self, symbol_info) -> Optional[int]:
        try:
            filling_modes = symbol_info.filling_mode
            if filling_modes == 1:
                return None
            if filling_modes & mt5.ORDER_FILLING_FOK:
                return mt5.ORDER_FILLING_FOK
            if filling_modes & mt5.ORDER_FILLING_IOC:
                return mt5.ORDER_FILLING_IOC
            if filling_modes & mt5.ORDER_FILLING_RETURN:
                return mt5.ORDER_FILLING_RETURN
        except Exception as exc:  # pragma: no cover - defensive logging
            logger.error("Error determining filling type: %s", exc)
        return None

    # ------------------------------------------------------------------
    # Trade operations (synchronous bodies)
    # ------------------------------------------------------------------
    def _execute_order(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._ensure_initialized():
            return {"error": "MT5 initialization failed"}

        execution_data = trade_data.get("execution_data", {})
        instrument = trade_data.get("instrument") or execution_data.get("instrument")
        side = (trade_data.get("side") or execution_data.get("side") or "").lower()
        quantity = float(trade_data.get("qty") or execution_data.get("qty") or 0)
        take_profit = trade_data.get("take_profit")
        stop_loss = trade_data.get("stop_loss")

        if not instrument or side not in {"buy", "sell"} or quantity <= 0:
            return {"error": "Missing required fields"}

        mt5_symbol = self.map_symbol(instrument)
        if not self._select_symbol(mt5_symbol):
            return {"error": f"Failed to select symbol {mt5_symbol}"}

        symbol_info = self._get_symbol_info(mt5_symbol, force_refresh=True)
        if not symbol_info:
            return {"error": f"Failed to get symbol info for {mt5_symbol}"}

        is_buy = side == "buy"
        order_type = mt5.ORDER_TYPE_BUY if is_buy else mt5.ORDER_TYPE_SELL
        price = symbol_info.ask if is_buy else symbol_info.bid
        position_id = execution_data.get("positionId", "unknown")

        request: Dict[str, Any] = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": mt5_symbol,
            "volume": quantity,
            "type": order_type,
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": f"TV#{position_id}",
            "type_time": mt5.ORDER_TIME_GTC,
        }

        filling_type = self._get_filling_type(symbol_info)
        if filling_type is not None:
            request["type_filling"] = filling_type

        if take_profit is not None:
            request["tp"] = float(take_profit)
        if stop_loss is not None:
            request["sl"] = float(stop_loss)

        result = mt5.order_send(request)
        if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
            error_msg = mt5.last_error() if not result else result.comment
            return {"error": f"Order failed: {error_msg}", "retcode": getattr(result, "retcode", None)}

        return {
            "mt5_ticket": str(result.order),
            "mt5_position": str(result.order),
            "volume": result.volume,
            "price": result.price or price,
            "symbol": mt5_symbol,
            "side": side,
            "take_profit": take_profit,
            "stop_loss": stop_loss,
            "comment": result.comment,
            "timestamp": datetime.now().isoformat(),
        }

    def _close_position(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._ensure_initialized():
            return {"error": "MT5 initialization failed"}

        mt5_ticket = trade_data.get("mt5_ticket")
        if not mt5_ticket:
            return {"error": "MT5 ticket not provided"}

        execution_data = trade_data.get("execution_data", {})
        instrument = trade_data.get("instrument") or execution_data.get("instrument")
        close_volume = float(trade_data.get("qty") or execution_data.get("qty") or 0)

        if not instrument or close_volume <= 0:
            return {"error": "Missing required fields"}

        mt5_symbol = self.map_symbol(instrument)
        if not self._select_symbol(mt5_symbol):
            return {"error": f"Failed to select symbol {mt5_symbol}"}

        symbol_info = self._get_symbol_info(mt5_symbol, force_refresh=True)
        if not symbol_info:
            return {"error": f"Failed to get symbol info for {mt5_symbol}"}

        positions = mt5.positions_get(ticket=int(mt5_ticket))
        if not positions:
            return {"error": f"Position #{mt5_ticket} not found"}

        position = positions[0]
        if close_volume > position.volume:
            return {"error": f"Close amount {close_volume} exceeds position size {position.volume}"}

        is_partial = close_volume < position.volume
        if position.type == mt5.POSITION_TYPE_BUY:
            order_type = mt5.ORDER_TYPE_SELL
            price = symbol_info.bid
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = symbol_info.ask

        position_id = execution_data.get("positionId", "unknown")
        request: Dict[str, Any] = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": mt5_symbol,
            "volume": close_volume,
            "type": order_type,
            "position": int(mt5_ticket),
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": f"TV#{position_id}",
            "type_time": mt5.ORDER_TIME_GTC,
        }

        filling_type = self._get_filling_type(symbol_info)
        if filling_type is not None:
            request["type_filling"] = filling_type

        result = mt5.order_send(request)
        if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
            error_msg = mt5.last_error() if not result else result.comment
            return {"error": f"Close failed: {error_msg}", "retcode": getattr(result, "retcode", None)}

        updated_positions = mt5.positions_get(ticket=int(mt5_ticket))
        remaining_volume = updated_positions[0].volume if updated_positions else 0.0

        return {
            "mt5_ticket": str(result.order),
            "volume": close_volume,
            "remaining_volume": remaining_volume,
            "price": result.price or price,
            "symbol": mt5_symbol,
            "side": "buy" if position.type == mt5.POSITION_TYPE_SELL else "sell",
            "comment": result.comment,
            "closed_position": str(position.ticket),
            "is_partial": is_partial,
            "timestamp": datetime.now().isoformat(),
        }

    def _update_position(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._ensure_initialized():
            return {"error": "MT5 initialization failed"}

        symbol = trade_data["instrument"]
        ticket = int(trade_data["mt5_ticket"])

        mt5_symbol = self.map_symbol(symbol)
        if not self._select_symbol(mt5_symbol):
            return {"error": f"Failed to select symbol {mt5_symbol}"}

        positions = mt5.positions_get(ticket=ticket)
        if not positions:
            return {"error": f"Position #{ticket} not found"}

        position = positions[0]
        if position.symbol != mt5_symbol:
            return {
                "error": f"Position #{ticket} exists but symbol mismatch: expected {mt5_symbol}, found {position.symbol}",
            }

        symbol_info = self._get_symbol_info(mt5_symbol, force_refresh=True)
        if not symbol_info:
            return {"error": f"Could not get symbol info for {mt5_symbol}"}

        digits = symbol_info.digits
        point = symbol_info.point

        take_profit = (
            float(trade_data["take_profit"]) if trade_data.get("take_profit") is not None else None
        )
        stop_loss = (
            float(trade_data["stop_loss"]) if trade_data.get("stop_loss") is not None else None
        )
        trailing_pips = (
            float(trade_data.get("trailing_stop_pips", 0))
            if trade_data.get("trailing_stop_pips") is not None
            else None
        )

        if trailing_pips and trailing_pips > 0:
            price_tick = mt5.symbol_info_tick(mt5_symbol)
            if price_tick:
                trailing_points = trailing_pips * 10
                if position.type == mt5.POSITION_TYPE_BUY:
                    stop_loss = round(price_tick.bid - trailing_points * point, digits)
                else:
                    stop_loss = round(price_tick.ask + trailing_points * point, digits)

        price_tick = mt5.symbol_info_tick(mt5_symbol)
        if stop_loss is not None and price_tick:
            if position.type == mt5.POSITION_TYPE_BUY and stop_loss >= price_tick.bid:
                return {"error": "Stop Loss must be below current price for buy positions"}
            if position.type == mt5.POSITION_TYPE_SELL and stop_loss <= price_tick.ask:
                return {"error": "Stop Loss must be above current price for sell positions"}

        if take_profit is not None:
            take_profit = round(take_profit, digits)
        if stop_loss is not None:
            stop_loss = round(stop_loss, digits)

        request = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": mt5_symbol,
            "position": ticket,
            "tp": take_profit if take_profit is not None else position.tp,
            "sl": stop_loss if stop_loss is not None else position.sl,
            "type_time": mt5.ORDER_TIME_GTC,
        }

        result = mt5.order_send(request)
        if not result or result.retcode != mt5.TRADE_RETCODE_DONE:
            return {
                "error": self._get_position_error_message(result, request),
                "retcode": getattr(result, "retcode", None),
            }

        return {
            "ticket": ticket,
            "symbol": mt5_symbol,
            "take_profit": take_profit,
            "stop_loss": stop_loss,
            "trailing_stop_pips": trailing_pips if trailing_pips else None,
        }

    # ------------------------------------------------------------------
    # Async wrappers
    # ------------------------------------------------------------------
    async def async_execute_market_order(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._retry_operation(
            lambda: self._run_in_executor(self._execute_order, trade_data)
        )

    async def async_close_position(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._retry_operation(
            lambda: self._run_in_executor(self._close_position, trade_data)
        )

    async def async_update_position(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        return await self._retry_operation(
            lambda: self._run_in_executor(self._update_position, trade_data)
        )

    async def _update_stop_loss_mt5(
        self,
        ticket: int,
        sl_price: float,
        tp: Optional[float],
        symbol: str,
    ) -> bool:
        async def _attempt_update() -> bool:
            return await self._run_in_executor(
                self._send_sltp_request,
                ticket,
                symbol,
                sl_price,
                tp,
            )

        for attempt in range(5):
            try:
                if await _attempt_update():
                    return True
            except Exception as exc:
                logger.warning(
                    "Error updating stop loss for ticket %s (attempt %d): %s",
                    ticket,
                    attempt + 1,
                    exc,
                )
            await asyncio.sleep(0.1 * (attempt + 1))

        logger.error("Failed to update trailing stop for ticket %s after retries", ticket)
        return False

    def _send_sltp_request(
        self,
        ticket: int,
        symbol: str,
        sl_price: Optional[float],
        tp_price: Optional[float],
    ) -> bool:
        if not self._ensure_initialized():
            raise RuntimeError("MT5 initialization failed")

        if not self._select_symbol(symbol):
            raise RuntimeError(f"Failed to select symbol {symbol}")

        symbol_info = self._get_symbol_info(symbol, force_refresh=True)
        if not symbol_info:
            raise RuntimeError(f"Failed to get symbol info for {symbol}")

        request: Dict[str, Any] = {
            "action": mt5.TRADE_ACTION_SLTP,
            "symbol": symbol,
            "position": ticket,
            "type_time": mt5.ORDER_TIME_GTC,
        }

        if sl_price is not None:
            request["sl"] = round(sl_price, symbol_info.digits)
        if tp_price is not None:
            request["tp"] = round(tp_price, symbol_info.digits)

        result = mt5.order_send(request)
        if not result:
            raise RuntimeError(f"Order send failed: {mt5.last_error()}")
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            raise RuntimeError(self._get_position_error_message(result, request))

        updated_position = mt5.positions_get(ticket=ticket)
        if not updated_position:
            raise RuntimeError("Failed to verify position update")

        return True

    async def monitor_trailing_stops(self, poll_interval: float = 1.0) -> None:
        if not self.db:
            logger.debug("Trailing stop monitor skipped because no database handler is attached")
            return

        while self.running:
            try:
                positions = await self._run_in_executor(mt5.positions_get)
                if not positions:
                    await asyncio.sleep(poll_interval)
                    continue

                tickets = [str(position.ticket) for position in positions]
                trade_map = await self.db.async_get_trades_by_mt5_tickets(tickets)

                tasks = []
                for position in positions:
                    trade = trade_map.get(str(position.ticket))
                    if not trade or trade.get("is_closed"):
                        continue

                    trailing_value = trade.get("trailing_stop_pips")
                    if trailing_value:
                        tasks.append(
                            self._adjust_trailing_stop(position, float(trailing_value))
                        )

                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)

            except Exception as exc:
                logger.error("Error monitoring trailing stops: %s", exc)

            await asyncio.sleep(poll_interval)

    async def _adjust_trailing_stop(self, position, trailing_pips: float) -> None:
        try:
            symbol = position.symbol
            symbol_info = await self._run_in_executor(self._get_symbol_info, symbol, True)
            price_tick = await self._run_in_executor(mt5.symbol_info_tick, symbol)

            if not symbol_info or not price_tick:
                return

            trailing_distance = self.instrument_manager.calculate_trailing_distance(
                symbol,
                trailing_pips,
                symbol_info,
            )

            if position.type == mt5.POSITION_TYPE_BUY:
                new_sl = round(price_tick.bid - trailing_distance, symbol_info.digits)
                should_update = position.sl == 0 or new_sl > position.sl
            else:
                new_sl = round(price_tick.ask + trailing_distance, symbol_info.digits)
                should_update = position.sl == 0 or new_sl < position.sl

            if should_update:
                await self._update_stop_loss_mt5(position.ticket, new_sl, position.tp, symbol)
        except Exception as exc:
            logger.error(
                "Error adjusting trailing stop for ticket %s: %s",
                getattr(position, "ticket", "unknown"),
                exc,
            )

    async def _check_position_exists(self, ticket: int, symbol: str = None) -> Dict[str, Any]:
        def _check():
            if not self._ensure_initialized():
                return {"exists": False, "error": "MT5 initialization failed"}

            positions = mt5.positions_get(ticket=ticket)
            if not positions:
                return {"exists": False, "error": f"Position #{ticket} not found"}

            position = positions[0]
            if symbol and position.symbol != symbol:
                return {
                    "exists": False,
                    "error": f"Position #{ticket} exists but symbol mismatch: expected {symbol}, found {position.symbol}",
                }

            return {
                "exists": True,
                "position": position,
                "symbol": position.symbol,
                "volume": position.volume,
                "type": "buy" if position.type == mt5.POSITION_TYPE_BUY else "sell",
                "price": position.price_open,
                "tp": position.tp,
                "sl": position.sl,
            }

        return await self._run_in_executor(_check)

    def _get_position_error_message(self, result, request: Dict[str, Any]) -> str:
        base_error = "Failed to update position: "
        if result and getattr(result, "retcode", None) == mt5.TRADE_RETCODE_INVALID_STOPS:
            if "tp" in request and "sl" not in request:
                return f"{base_error}Invalid TakeProfit level"
            if "sl" in request and "tp" not in request:
                return f"{base_error}Invalid StopLoss level"
            return f"{base_error}Invalid TP/SL levels"
        comment = getattr(result, "comment", "Unknown error")
        return f"{base_error}{comment}"

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------
    def cleanup(self) -> None:
        self.running = False
        if self.initialized:
            mt5.shutdown()
            self.initialized = False
        with self._symbol_cache_lock:
            self._symbol_cache.clear()
