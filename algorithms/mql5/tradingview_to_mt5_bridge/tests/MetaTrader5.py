"""Test-local MetaTrader5 shim importing the shared stub."""

from __future__ import annotations

from ..src.utils import mt5_stub

globals().update(mt5_stub.__dict__)
__all__ = getattr(mt5_stub, "__all__", tuple())
