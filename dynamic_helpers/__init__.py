"""High-traffic helper utilities re-exported for legacy imports.

Only a handful of helper functions and constants were historically routed
through ``dynamic_helpers``.  Rather than duplicating implementations, this
module proxies access to the canonical locations and loads them on demand.
The original implementation eagerly walked a module map and imported the
target as soon as :data:`__getattr__` was invoked.  We now leverage the
shared :func:`dynamic_agents._lazy.build_lazy_namespace` helper so the
implementation mirrors other shim packages and centralises caching.  The
mapping also proxies the :mod:`dynamic_crawl` primitives so older utilities
that imported the crawler through ``dynamic_helpers`` continue to resolve to
the modern implementation.
"""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_HELPER_EXPORTS = {
    "dynamic_helpers.recycling": (
        "build_material_stream",
        "build_recycling_event",
        "summarise_recycling_events",
        "format_recycling_digest",
    ),
    "dynamic_architecture.helper": ("DynamicArchitectureHelper",),
    "dynamic_helpers.ocean": (
        "DynamicOceanLayerHelper",
        "DynamicEpipelagicHelper",
        "DynamicMesopelagicHelper",
        "DynamicBathypelagicHelper",
        "DynamicAbyssopelagicHelper",
        "DynamicHadalpelagicHelper",
    ),
    "dynamic_helpers.nft_engine": ("DynamicNFTHelper",),
    "dynamic_helpers.elements": (
        "ElementHelperPersona",
        "ELEMENT_HELPERS",
        "list_element_helpers",
        "iter_element_helpers",
        "get_element_helper",
        "search_element_helpers",
    ),
    "dynamic_agents": ("run_dynamic_agent_cycle",),
    "dynamic.intelligence.ai_apps": ("calibrate_lorentzian_lobe", "load_lorentzian_model"),
    "dynamic.trading.algo": (
        "normalise_symbol",
        "ORDER_ACTION_BUY",
        "ORDER_ACTION_SELL",
        "SUCCESS_RETCODE",
    ),
    "dynamic_bridge": ("create_dynamic_mt5_bridge",),
    "dynamic_crawl": (
        "CrawlPlan",
        "DynamicCrawler",
        "FetchPayload",
        "FetchResult",
    ),
}

_LAZY = build_lazy_namespace(_HELPER_EXPORTS, default_module="dynamic_helpers.recycling")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial wrapper
    return _LAZY.dir(globals())
