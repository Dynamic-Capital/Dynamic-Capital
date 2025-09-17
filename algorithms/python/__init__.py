"""Python trading strategy utilities for Dynamic Capital."""

from . import trade_logic as _trade_logic

__all__ = getattr(_trade_logic, "__all__", [])  # type: ignore[attr-defined]
globals().update({name: getattr(_trade_logic, name) for name in __all__})
