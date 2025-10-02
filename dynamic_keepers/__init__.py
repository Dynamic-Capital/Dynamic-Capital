"""Compatibility shims for legacy ``dynamic_keepers`` imports.

Historically a single ``dynamic_keepers`` namespace re-exported the keeper
algorithms and the data contracts they returned.  The canonical
implementations now live under :mod:`algorithms.python.*_keeper`, but a
number of callers – especially orchestration scripts – still import from the
legacy path.  To keep those integrations working we lazily forward attribute
access to the modern modules.  This mirrors the approach used by
``dynamic_engines`` and avoids importing heavy dependencies until a symbol is
first accessed.  The shims now reuse :func:`dynamic_agents._lazy.build_lazy_namespace`
so their caching behaviour matches the other compatibility packages.  The same
lazy map now forwards the :mod:`dynamic_crawl` exports as well so historical
automation scripts that imported the crawler via ``dynamic_keepers`` continue
to function.
"""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_KEEPER_EXPORTS = {
    "algorithms.python.api_keeper": (
        "ApiEndpoint",
        "ApiKeeperSyncResult",
        "DynamicAPIKeeperAlgorithm",
    ),
    "algorithms.python.backend_keeper": (
        "BackendService",
        "BackendKeeperSyncResult",
        "DynamicBackendKeeperAlgorithm",
    ),
    "algorithms.python.channel_keeper": (
        "BroadcastChannel",
        "ChannelKeeperSyncResult",
        "DynamicChannelKeeperAlgorithm",
    ),
    "algorithms.python.frontend_keeper": (
        "FrontendSurface",
        "FrontendKeeperSyncResult",
        "DynamicFrontendKeeperAlgorithm",
    ),
    "algorithms.python.group_keeper": (
        "CommunityGroup",
        "GroupKeeperSyncResult",
        "DynamicGroupKeeperAlgorithm",
    ),
    "algorithms.python.route_keeper": (
        "Route",
        "RouteKeeperSyncResult",
        "DynamicRouteKeeperAlgorithm",
    ),
    "algorithms.python.time_keeper": (
        "MVT_TIMEZONE",
        "TradingSession",
        "KillZone",
        "TimeKeeperSyncResult",
        "DynamicTimeKeeperAlgorithm",
    ),
    "dynamic_keepers.recycling": (
        "DynamicRecyclingKeeper",
        "RecyclingKeeperSnapshot",
    ),
    "dynamic_keepers.dhivehi_language": ("DynamicDhivehiLanguageKeeper",),
    "dynamic_keepers.business": ("DynamicBusinessKeeper",),
    "dynamic_keepers.ocean": (
        "DynamicOceanLayerKeeper",
        "DynamicEpipelagicKeeper",
        "DynamicMesopelagicKeeper",
        "DynamicBathypelagicKeeper",
        "DynamicAbyssopelagicKeeper",
        "DynamicHadalpelagicKeeper",
        "KeeperTrendSnapshot",
    ),
    "dynamic_architecture.keeper": ("DynamicArchitectureKeeper",),
    "dynamic_keepers.elements": (
        "ElementKeeperPersona",
        "ELEMENT_KEEPERS",
        "list_element_keepers",
        "iter_element_keepers",
        "get_element_keeper",
        "search_element_keepers",
    ),
    "dynamic_crawl": (
        "CrawlPlan",
        "DynamicCrawler",
        "FetchPayload",
        "FetchResult",
    ),
}

_LAZY = build_lazy_namespace(_KEEPER_EXPORTS, default_module="algorithms.python.api_keeper")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial wrapper
    return _LAZY.dir(globals())
