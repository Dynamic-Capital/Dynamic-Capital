"""Compatibility wrapper for the Dynamic Wyckoff Engine."""

from __future__ import annotations

from dynamic_wyckoff.engine import (
    BarLike,
    DynamicWyckoffEngine,
    PriceBar,
    WyckoffConfig,
    WyckoffMetrics,
)

DynamicWyckoffStrategy = DynamicWyckoffEngine

__all__ = [
    "BarLike",
    "PriceBar",
    "WyckoffConfig",
    "WyckoffMetrics",
    "DynamicWyckoffEngine",
    "DynamicWyckoffStrategy",
]
