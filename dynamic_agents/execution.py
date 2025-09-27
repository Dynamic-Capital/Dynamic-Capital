"""Compatibility shim exposing the execution persona lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = ["ExecutionAgent", "ExecutionAgentResult"]

_LAZY = LazyNamespace("dynamic_ai.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import ExecutionAgent, ExecutionAgentResult


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
