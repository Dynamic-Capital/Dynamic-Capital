"""Test harness customisations for optional third-party dependencies."""

from __future__ import annotations

import sys

try:
    from algorithms.mql5.tradingview_to_mt5_bridge.src.utils import mt5_stub

    sys.modules.setdefault("MetaTrader5", mt5_stub)
except Exception:  # pragma: no cover - defensive guard for early interpreter boot
    pass
