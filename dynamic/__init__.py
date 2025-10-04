"""Dynamic Capital consolidated namespace with lazy submodule loading."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Dict

__all__ = [
    "blockchain",
    "brand",
    "framework",
    "governance",
    "intelligence",
    "models",
    "proof",
    "platform",
    "tools",
    "trading",
]

_SUBMODULES: Dict[str, str] = {name: f"{__name__}.{name}" for name in __all__}

if TYPE_CHECKING:  # pragma: no cover - static typing hook
    from . import (  # noqa: F401 (re-exported modules)
        blockchain,
        brand,
        framework,
        governance,
        intelligence,
        models,
        platform,
        tools,
        trading,
    )


def __getattr__(name: str):
    """Load submodules on demand to avoid import-time side effects."""

    try:
        module_name = _SUBMODULES[name]
    except KeyError as exc:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'") from exc

    module = import_module(module_name)
    globals()[name] = module
    return module


def __dir__() -> list[str]:
    return sorted(__all__)
