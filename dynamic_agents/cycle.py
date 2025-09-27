"""Compatibility shim exposing the synchronous orchestration helper lazily."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

__all__ = ["run_dynamic_agent_cycle"]

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from algorithms.python.dynamic_ai_sync import run_dynamic_agent_cycle


def __getattr__(name: str) -> Any:
    if name == "run_dynamic_agent_cycle":
        module = import_module("algorithms.python.dynamic_ai_sync")
        return getattr(module, name)
    raise AttributeError(f"module 'dynamic_agents.cycle' has no attribute {name!r}")


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(set(globals()) | set(__all__))
