"""High-traffic helper utilities re-exported for legacy imports.

Only a handful of helper functions and constants were historically routed
through ``dynamic_helpers``.  Rather than duplicating implementations, this
module proxies access to the canonical locations and loads them on demand.
"""

from __future__ import annotations

from importlib import import_module
from typing import Dict, Iterable, Tuple

_HELPER_EXPORTS: Dict[str, Tuple[str, ...]] = {
    "dynamic_agents": ("run_dynamic_agent_cycle",),
    "dynamic_ai": ("calibrate_lorentzian_lobe", "load_lorentzian_model"),
    "dynamic_algo": ("normalise_symbol", "ORDER_ACTION_BUY", "ORDER_ACTION_SELL", "SUCCESS_RETCODE"),
    "dynamic_bridge": ("create_dynamic_mt5_bridge",),
    "dynamic_helpers.recycling": (
        "build_material_stream",
        "build_recycling_event",
        "summarise_recycling_events",
        "format_recycling_digest",
    ),
    "dynamic_helpers.ocean": (
        "DynamicOceanLayerHelper",
        "DynamicEpipelagicHelper",
        "DynamicMesopelagicHelper",
        "DynamicBathypelagicHelper",
        "DynamicAbyssopelagicHelper",
        "DynamicHadalpelagicHelper",
    ),
    "dynamic_helpers.rib": ("DynamicRibHelper",),
    "dynamic_helpers.elements": (
        "ElementHelperPersona",
        "ELEMENT_HELPERS",
        "list_element_helpers",
        "iter_element_helpers",
        "get_element_helper",
        "search_element_helpers",
    ),
}

__all__ = sorted({symbol for symbols in _HELPER_EXPORTS.values() for symbol in symbols})


def _load_symbol(module_name: str, symbol: str) -> object:
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[symbol] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, symbols in _HELPER_EXPORTS.items():
        if name in symbols:
            return _load_symbol(module_name, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
