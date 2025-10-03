"""Dynamic tools namespace bridging the legacy toolkit surface.

This module exposes every symbol provided by :mod:`dynamic_tool_kits` so
callers can continue importing utilities via ``dynamic.tools``.  The helper
functions ``available_toolkits``, ``toolkit_symbol_sources``, and
``resolve_toolkit_symbol`` are re-exported for convenience while all toolkit
symbols are lazily resolved on first access.  This keeps import time light and
avoids loading heavy dependencies until a specific tool is requested.
"""

from __future__ import annotations

from typing import Iterable

import dynamic_tool_kits

available_toolkits = dynamic_tool_kits.available_toolkits
toolkit_symbol_sources = dynamic_tool_kits.toolkit_symbol_sources
resolve_toolkit_symbol = dynamic_tool_kits.resolve_toolkit_symbol

_HELPER_EXPORTS: tuple[str, ...] = (
    "available_toolkits",
    "resolve_toolkit_symbol",
    "toolkit_symbol_sources",
    "refresh_tool_exports",
)
_HELPER_EXPORT_SET = set(_HELPER_EXPORTS)


def _collect_tool_symbols() -> set[str]:
    """Return the set of all toolkit symbols discovered in the repository."""

    names: set[str] = set()
    for exports in available_toolkits().values():
        names.update(exports)
    return names


_TOOL_SYMBOLS: set[str] = _collect_tool_symbols()
_CACHED_SYMBOLS: set[str] = set()

__all__ = sorted(_TOOL_SYMBOLS | _HELPER_EXPORT_SET)


def refresh_tool_exports() -> None:
    """Rebuild the cached symbol index to include newly discovered toolkits."""

    global _TOOL_SYMBOLS, __all__

    symbols = _collect_tool_symbols()
    removed = _CACHED_SYMBOLS - symbols
    for name in removed:
        globals().pop(name, None)
    _CACHED_SYMBOLS.difference_update(removed)

    _TOOL_SYMBOLS = symbols
    __all__ = sorted(_TOOL_SYMBOLS | _HELPER_EXPORT_SET)


def __getattr__(name: str):
    if name in _HELPER_EXPORT_SET:
        return globals()[name]
    if name not in _TOOL_SYMBOLS:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
    value = resolve_toolkit_symbol(name)
    globals()[name] = value
    _CACHED_SYMBOLS.add(name)
    return value


def __dir__() -> Iterable[str]:
    return list(__all__)
