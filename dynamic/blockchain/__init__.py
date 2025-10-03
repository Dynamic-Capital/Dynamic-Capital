"""Dynamic blockchain exports via the consolidated namespace.

The module lazily proxies attribute access to :mod:`dynamic_blockchain` so the
heavy primitives are only imported when they are actually requested. This keeps
back-to-back imports from eagerly executing module level code while still
providing the ergonomics of ``dynamic.blockchain``.
"""

from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import TYPE_CHECKING, Any

_PROVIDER_MODULE = "dynamic_blockchain"

__all__ = [
    "Block",
    "DelegateState",
    "DynamicBlockchain",
    "DynamicDelegatedProofOfStake",
    "Transaction",
]

if TYPE_CHECKING:  # pragma: no cover - only used for static analysis
    from dynamic_blockchain import (  # noqa: F401 (re-exported names)
        Block,
        DelegateState,
        DynamicBlockchain,
        DynamicDelegatedProofOfStake,
        Transaction,
    )


def _load_provider() -> ModuleType:
    """Import and memoize the underlying provider module."""

    module = import_module(_PROVIDER_MODULE)
    globals()["_provider"] = module
    return module


def __getattr__(name: str) -> Any:
    """Dynamically resolve blockchain primitives from the provider module."""

    if name not in __all__:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

    module: ModuleType
    if (module := globals().get("_provider")) is None:  # type: ignore[assignment]
        module = _load_provider()

    try:
        value = getattr(module, name)
    except AttributeError as exc:  # pragma: no cover - defensive hardening
        raise AttributeError(
            f"module '{_PROVIDER_MODULE}' has no attribute '{name}'"
        ) from exc

    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
