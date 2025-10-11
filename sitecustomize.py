"""Test harness customisations for optional third-party dependencies."""

from __future__ import annotations

import importlib.util
import sys


def _real_metatrader5_available() -> bool:
    """Return True when the genuine MetaTrader5 package can be imported."""

    if "MetaTrader5" in sys.modules:
        return True

    try:
        return importlib.util.find_spec("MetaTrader5") is not None
    except Exception:  # pragma: no cover - defensive guard during early boot
        return False


try:
    if not _real_metatrader5_available():
        from algorithms.mql5.tradingview_to_mt5_bridge.src.utils import mt5_stub

        sys.modules.setdefault("MetaTrader5", mt5_stub)
except Exception:  # pragma: no cover - defensive guard for early interpreter boot
    pass
