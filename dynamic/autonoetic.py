"""Dynamic package access to autonoetic consciousness utilities."""

from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import TYPE_CHECKING, Final, Iterable

_BACKING_MODULE: Final[str] = "dynamic_autonoetic"
__all__ = (
    "AutonoeticConsciousness",
    "AutonoeticContext",
    "AutonoeticSignal",
    "AutonoeticState",
)
_EXPORTED_NAMES: Final[frozenset[str]] = frozenset(__all__)


if TYPE_CHECKING:  # pragma: no cover - type check import path
    from dynamic_autonoetic import (  # noqa: F401 - re-exported names
        AutonoeticConsciousness,
        AutonoeticContext,
        AutonoeticSignal,
        AutonoeticState,
    )


def _load_module() -> ModuleType:
    try:
        return import_module(_BACKING_MODULE)
    except ModuleNotFoundError as exc:  # pragma: no cover - defensive guard
        raise ModuleNotFoundError(
            "dynamic.autonoetic requires the 'dynamic_autonoetic' package to be available"
        ) from exc


def _resolve_export(name: str) -> object:
    module = _load_module()
    try:
        value = getattr(module, name)
    except AttributeError as exc:  # pragma: no cover - defensive guard
        raise AttributeError(
            f"module '{_BACKING_MODULE}' does not define attribute {name!r}"
        ) from exc
    globals()[name] = value
    return value


def __getattr__(name: str) -> object:
    if name in _EXPORTED_NAMES:
        return _resolve_export(name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
