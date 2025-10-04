"""Trading services for Dynamic Capital."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING

from .live_sync import DynamicTradingLiveSync, LiveTradingDecision, MarketUpdate

_SUBMODULES = {name: f"{__name__}.{name}" for name in ("logic", "algo", "live_sync")}

if TYPE_CHECKING:  # pragma: no cover - static typing hook
    from . import algo, live_sync, logic  # noqa: F401 (re-exported modules)

__all__ = [
    "logic",
    "algo",
    "live_sync",
    "DynamicTradingLiveSync",
    "LiveTradingDecision",
    "MarketUpdate",
]


def __getattr__(name: str):
    """Load trading submodules lazily to avoid import-time side effects."""

    try:
        module_name = _SUBMODULES[name]
    except KeyError as exc:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'") from exc

    module = import_module(module_name)
    globals()[name] = module
    return module


def __dir__() -> list[str]:
    return sorted(__all__)
