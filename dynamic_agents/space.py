"""Compatibility shim exposing the space persona lazily."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

__all__ = ["SpaceAgent", "SpaceAgentResult"]

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic_ai.agents import SpaceAgent, SpaceAgentResult


def __getattr__(name: str) -> Any:
    if name in __all__:
        module = import_module("dynamic_ai.agents")
        return getattr(module, name)
    raise AttributeError(f"module 'dynamic_agents.space' has no attribute {name!r}")


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(set(globals()) | set(__all__))
