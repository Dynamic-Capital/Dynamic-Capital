"""Dynamic Bots helpers and integrations.

Only a handful of bot helpers exist today, primarily the Telegram
integration used for trade and operations notifications.  Historically we
eagerly imported every bot implementation which made importing
``dynamic_bots`` surprisingly expensive during cold starts.  We now reuse
the shared :mod:`dynamic_agents._lazy` helpers to resolve symbols on
demand while keeping backwards compatibility with legacy import paths.
"""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_EXPORT_MAP = {
    "integrations.telegram_bot": ("DynamicTelegramBot",),
    "dynamic_bots.recycling": ("DynamicRecyclingBot",),
    "dynamic_bots.ocean": (
        "DynamicOceanLayerBot",
        "DynamicEpipelagicBot",
        "DynamicMesopelagicBot",
        "DynamicBathypelagicBot",
        "DynamicAbyssopelagicBot",
        "DynamicHadalpelagicBot",
    ),
    "dynamic_bots.nft_engine": (
        "DynamicNFTBot",
    ),
    "dynamic_bots.elements": (
        "ElementBotPersona",
        "ELEMENT_BOTS",
        "list_element_bots",
        "iter_element_bots",
        "get_element_bot",
        "search_element_bots",
    ),
}

_LAZY = build_lazy_namespace(_EXPORT_MAP, default_module="integrations.telegram_bot")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial wrapper
    return _LAZY.dir(globals())
