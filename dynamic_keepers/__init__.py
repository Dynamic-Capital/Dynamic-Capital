"""Compatibility shims for legacy ``dynamic_keepers`` imports.

Historically a single ``dynamic_keepers`` namespace re-exported the keeper
algorithms and the data contracts they returned.  The canonical
implementations now live under :mod:`algorithms.python.*_keeper`, but a
number of callers – especially orchestration scripts – still import from the
legacy path.  To keep those integrations working we lazily forward attribute
access to the modern modules.  This mirrors the approach used by
``dynamic_engines`` and avoids importing heavy dependencies until a symbol is
first accessed.
"""

from __future__ import annotations

from importlib import import_module
from typing import Dict, Iterable, Tuple

_KEEPER_EXPORTS: Dict[str, Tuple[str, ...]] = {
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
    "dynamic_keepers.ocean": (
        "DynamicOceanLayerKeeper",
        "DynamicEpipelagicKeeper",
        "DynamicMesopelagicKeeper",
        "DynamicBathypelagicKeeper",
        "DynamicAbyssopelagicKeeper",
        "DynamicHadalpelagicKeeper",
        "KeeperTrendSnapshot",
    ),
}

__all__ = sorted({symbol for symbols in _KEEPER_EXPORTS.values() for symbol in symbols})


def _load_symbol(module_name: str, symbol: str) -> object:
    module = import_module(module_name)
    value = getattr(module, symbol)
    globals()[symbol] = value
    return value


def __getattr__(name: str) -> object:
    for module_name, symbols in _KEEPER_EXPORTS.items():
        if name in symbols:
            return _load_symbol(module_name, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> Iterable[str]:
    return sorted(__all__)
