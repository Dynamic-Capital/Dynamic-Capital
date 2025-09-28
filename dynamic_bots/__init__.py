"""Dynamic Bots helpers and integrations.

Only a handful of bot helpers exist today, primarily the Telegram
integration used for trade and operations notifications.  This wrapper
provides a consistent entry-point that mirrors other ``dynamic_*``
packages and unlocks imports such as ``from dynamic_bots import
DynamicTelegramBot`` without reaching into the ``integrations`` module
structure.
"""

from integrations.telegram_bot import DynamicTelegramBot

from .recycling import DynamicRecyclingBot
from .ocean import (
    DynamicOceanLayerBot,
    DynamicEpipelagicBot,
    DynamicMesopelagicBot,
    DynamicBathypelagicBot,
    DynamicAbyssopelagicBot,
    DynamicHadalpelagicBot,
)
from .elements import (
    ElementBotPersona,
    ELEMENT_BOTS,
    list_element_bots,
    iter_element_bots,
    get_element_bot,
    search_element_bots,
)

__all__ = [
    "DynamicTelegramBot",
    "DynamicRecyclingBot",
    "DynamicOceanLayerBot",
    "DynamicEpipelagicBot",
    "DynamicMesopelagicBot",
    "DynamicBathypelagicBot",
    "DynamicAbyssopelagicBot",
    "DynamicHadalpelagicBot",
    "ElementBotPersona",
    "ELEMENT_BOTS",
    "list_element_bots",
    "iter_element_bots",
    "get_element_bot",
    "search_element_bots",
]
