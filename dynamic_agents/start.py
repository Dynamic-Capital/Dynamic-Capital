"""Compatibility shim exposing dynamic start agent helpers lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = [
    "configure_dynamic_start_agents",
    "get_default_execution_agent",
    "get_default_research_agent",
    "get_default_risk_agent",
    "get_dynamic_start_agents",
    "prime_dynamic_start_agents",
    "reset_dynamic_start_agents",
]

_LAZY = LazyNamespace("dynamic.intelligence.ai_apps.agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic.intelligence.ai_apps.agents import (
        configure_dynamic_start_agents,
        get_default_execution_agent,
        get_default_research_agent,
        get_default_risk_agent,
        get_dynamic_start_agents,
        prime_dynamic_start_agents,
        reset_dynamic_start_agents,
    )


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
