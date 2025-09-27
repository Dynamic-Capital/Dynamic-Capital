"""Compatibility shim exposing the synchronous orchestration helper lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = ["run_dynamic_agent_cycle"]

_LAZY = LazyNamespace("algorithms.python.dynamic_ai_sync", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
