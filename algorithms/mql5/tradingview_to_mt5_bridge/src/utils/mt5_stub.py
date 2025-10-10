"""Lightweight MetaTrader5 stub used for automated tests.

The real MetaTrader5 package is a CPython extension that is not available in
the execution environment used by the tests.  The components under
``algorithms/mql5/tradingview_to_mt5_bridge`` only require a very small subset
of the API during the tests: initialising a session, logging in, reading basic
account information and fetching symbol metadata.  This module provides a
minimal drop-in replacement that mimics the parts of the API that are touched
by the tests while remaining completely in-memory.

The stub intentionally keeps the surface compatible with the production code
so that higher level services can continue to operate.  It is not a full
replacement for MetaTrader5 and should only be used in local/unit tests where
connecting to a real terminal is not possible.
"""

from __future__ import annotations

from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, Dict, Iterable, List, Optional

__all__ = [
    "initialize",
    "login",
    "account_info",
    "shutdown",
    "last_error",
    "symbol_select",
    "symbol_info",
    "symbol_info_tick",
    "symbols_get",
    "positions_get",
    "orders_get",
    "order_send",
    "copy_rates_from_pos",
    "copy_rates_range",
    "IS_STUB",
    "ORDER_FILLING_FOK",
    "ORDER_FILLING_IOC",
    "ORDER_FILLING_RETURN",
    "ORDER_TYPE_BUY",
    "ORDER_TYPE_SELL",
    "TRADE_ACTION_DEAL",
    "TRADE_ACTION_SLTP",
    "ORDER_TIME_GTC",
    "TRADE_RETCODE_DONE",
    "TRADE_RETCODE_INVALID_STOPS",
    "POSITION_TYPE_BUY",
    "POSITION_TYPE_SELL",
    "TIMEFRAME_M1",
]


# ---------------------------------------------------------------------------
# Constants (values mirror the official MetaTrader5 module where relevant)
# ---------------------------------------------------------------------------

ORDER_FILLING_FOK = 0x1
ORDER_FILLING_IOC = 0x2
ORDER_FILLING_RETURN = 0x4

ORDER_TYPE_BUY = 0
ORDER_TYPE_SELL = 1

TRADE_ACTION_DEAL = 1
TRADE_ACTION_SLTP = 7

ORDER_TIME_GTC = 0

TRADE_RETCODE_DONE = 10009
TRADE_RETCODE_INVALID_STOPS = 10016

POSITION_TYPE_BUY = 0
POSITION_TYPE_SELL = 1

TIMEFRAME_M1 = 1

IS_STUB = True


# ---------------------------------------------------------------------------
# Internal state helpers
# ---------------------------------------------------------------------------

@dataclass
class _AccountInfo:
    login: int
    server: str


@dataclass
class _TradeResult:
    retcode: int
    comment: str = "done"
    order: int = 1
    deal: int = 1


_initialized: bool = False
_account: Optional[_AccountInfo] = None
_last_error: tuple[int, str] = (0, "OK")


def _ensure_initialised() -> bool:
    """Return True when the stub is ready; False otherwise."""

    return _initialized


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def initialize(**kwargs: Any) -> bool:  # noqa: ARG001 - signature kept for parity
    """Simulate MetaTrader5.initialize by marking the session as ready."""

    global _initialized
    _initialized = True
    return True


def login(login: int, password: Optional[str] = None, server: Optional[str] = None) -> bool:  # noqa: ARG001
    """Simulate a successful login and cache account information."""

    if not _ensure_initialised():
        return False

    global _account
    _account = _AccountInfo(login=login, server=server or "stub-server")
    return True


def account_info() -> Optional[_AccountInfo]:
    """Return cached account information if logged in."""

    return _account


def shutdown() -> None:
    """Reset the stubbed connection state."""

    global _initialized, _account
    _initialized = False
    _account = None


def last_error() -> tuple[int, str]:
    """Return the last stored error tuple."""

    return _last_error


def symbol_select(symbol: str, enable: bool = True) -> bool:  # noqa: ARG001
    """Pretend that symbols are always selectable."""

    return True


def _symbol_namespace(symbol: str) -> SimpleNamespace:
    return SimpleNamespace(
        name=symbol,
        bid=100.0,
        ask=100.5,
        digits=2,
        point=0.01,
        trade_contract_size=1.0,
        volume_min=0.01,
        volume_max=100.0,
        volume_step=0.01,
    )


def symbol_info(symbol: str) -> SimpleNamespace:
    """Return synthetic symbol information for the requested symbol."""

    return _symbol_namespace(symbol)


def symbol_info_tick(symbol: str) -> SimpleNamespace:
    """Return a simplified price tick for the symbol."""

    return SimpleNamespace(bid=100.0, ask=100.5)


def symbols_get() -> Iterable[SimpleNamespace]:
    """Return a small catalogue of tradable symbols."""

    return [
        _symbol_namespace("BTCUSD.r"),
        _symbol_namespace("ETHUSD.r"),
        _symbol_namespace("XAUUSD.r"),
    ]


def positions_get(**kwargs: Any) -> List[Any]:  # noqa: ARG001 - kept for compatibility
    """Return an empty list of positions."""

    return []


def orders_get(**kwargs: Any) -> List[Any]:  # noqa: ARG001 - kept for compatibility
    """Return an empty list of pending orders."""

    return []


def order_send(request: Dict[str, Any]) -> _TradeResult:  # noqa: ARG001 - request unused in stub
    """Pretend to execute an order successfully."""

    return _TradeResult(retcode=TRADE_RETCODE_DONE)


def copy_rates_from_pos(symbol: str, timeframe: int, start_pos: int, count: int) -> List[Any]:  # noqa: ARG001
    """Return an empty price series."""

    return []


def copy_rates_range(symbol: str, timeframe: int, date_from: Any, date_to: Any) -> List[Any]:  # noqa: ARG001
    """Return an empty price series for range requests."""

    return []
