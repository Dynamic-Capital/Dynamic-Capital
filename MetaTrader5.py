"""Fallback MetaTrader5 stub for environments without the native library."""

from __future__ import annotations

from algorithms.mql5.tradingview_to_mt5_bridge.src.utils import mt5_stub

globals().update(mt5_stub.__dict__)
__all__ = getattr(mt5_stub, "__all__", tuple())
