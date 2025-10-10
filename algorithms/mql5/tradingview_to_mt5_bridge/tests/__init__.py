"""Test package initialisation hooks."""

from __future__ import annotations

import sys

from ..src.utils import mt5_stub

sys.modules.setdefault("MetaTrader5", mt5_stub)
