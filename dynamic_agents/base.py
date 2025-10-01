"""Compatibility shim exposing shared agent contracts lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = ["Agent", "AgentResult"]

_LAZY = LazyNamespace("dynamic.intelligence.ai_apps.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic.intelligence.ai_apps.agents import Agent, AgentResult


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
