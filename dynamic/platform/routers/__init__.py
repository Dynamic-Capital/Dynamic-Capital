"""Dynamic router export shim for platform modules."""

from __future__ import annotations

import warnings
from importlib import import_module
from typing import Dict, Iterable, Tuple, Union

SymbolExport = Union[str, Tuple[str, str]]

_ROUTER_EXPORTS: Dict[str, Tuple[SymbolExport, ...]] = {
    "dai_architecture.orchestrator": (
        "MinimalRouter",
        "Phase4Router",
    ),
    "dynamic_gateway_engine": (
        "DynamicGatewayEngine",
    ),
    "dynamic_http": (
        "DynamicHttp",
    ),
}


def _export_alias(spec: SymbolExport) -> str:
    return spec[0] if isinstance(spec, tuple) else spec


def _export_symbol(spec: SymbolExport) -> str:
    return spec[1] if isinstance(spec, tuple) else spec


_EXPORTED_ALIASES = {
    _export_alias(spec)
    for specs in _ROUTER_EXPORTS.values()
    for spec in specs
}


__all__ = sorted(_EXPORTED_ALIASES | {"enable_all_dynamic_routers"})


_ENABLED_ALIASES: Dict[str, object] = {}
_TOTAL_EXPORTS = len(_EXPORTED_ALIASES)


def enable_all_dynamic_routers(*, strict: bool = False) -> Dict[str, object]:
    """Eagerly import every exported router and return the mapping."""

    if len(_ENABLED_ALIASES) == _TOTAL_EXPORTS:
        return dict(_ENABLED_ALIASES)

    loaded: Dict[str, object] = dict(_ENABLED_ALIASES)
    failures: Dict[str, Exception] = {}

    for module_name, specs in _ROUTER_EXPORTS.items():
        for spec in specs:
            alias = _export_alias(spec)
            if alias in loaded:
                continue
            if alias in globals():
                value = globals()[alias]
                loaded[alias] = value
                _ENABLED_ALIASES[alias] = value
                continue
            try:
                value = _load_symbol(module_name, spec)
            except Exception as exc:  # pragma: no cover - defensive import guard
                failures[alias] = exc
                if strict:
                    raise RuntimeError(
                        f"Failed to enable router '{alias}' from {module_name}"
                    ) from exc
            else:
                loaded[alias] = value
                _ENABLED_ALIASES[alias] = value

        if len(loaded) == _TOTAL_EXPORTS:
            break

    if failures:
        details = ", ".join(
            f"{name} ({type(error).__name__})" for name, error in failures.items()
        )
        warnings.warn(
            f"Failed to enable {len(failures)} router(s): {details}",
            RuntimeWarning,
            stacklevel=2,
        )

    return dict(loaded)


def _load_symbol(module_name: str, spec: SymbolExport) -> object:
    alias = _export_alias(spec)
    symbol = _export_symbol(spec)
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[alias] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, specs in _ROUTER_EXPORTS.items():
        for spec in specs:
            if _export_alias(spec) == name:
                return _load_symbol(module_name, spec)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)

