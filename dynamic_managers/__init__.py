"""Dynamic manager personas with lazy imports."""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_MANAGER_EXPORTS = {
    "dynamic_managers.security": ("DynamicSecurityManager",),
}

_LAZY = build_lazy_namespace(_MANAGER_EXPORTS, default_module="dynamic_managers.security")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial wrapper
    return _LAZY.dir(globals())
