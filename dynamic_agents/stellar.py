"""Compatibility shim exposing stellar persona agents lazily."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ._lazy import LazyNamespace

__all__ = [
    "StellarAgentProfile",
    "StellarAgentResult",
    "StellarAgent",
    "STAR_PROFILES",
    "DynamicAlphaCanisMajorisAgent",
    "DynamicAlphaCarinaeAgent",
    "DynamicAlphaCentauriAgent",
    "DynamicAlphaBootisAgent",
    "DynamicAlphaLyraeAgent",
    "DynamicAlphaAurigaeAgent",
    "DynamicBetaOrionisAgent",
    "DynamicAlphaCanisMinorisAgent",
    "DynamicAlphaEridaniAgent",
    "DynamicAlphaOrionisAgent",
    "DynamicNorthStarAgent",
    "DynamicAlphaTauriAgent",
    "DynamicAlphaVirginisAgent",
    "DynamicAlphaScorpiiAgent",
    "DynamicAlphaAquilaeAgent",
    "DynamicAlphaCygniAgent",
]

_LAZY = LazyNamespace("dynamic.intelligence.ai_apps.stellar_agents", __all__)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from dynamic.intelligence.ai_apps.stellar_agents import (  # noqa: F401
        DynamicAlphaAurigaeAgent,
        DynamicAlphaBootisAgent,
        DynamicAlphaCanisMajorisAgent,
        DynamicAlphaCanisMinorisAgent,
        DynamicAlphaCarinaeAgent,
        DynamicAlphaCentauriAgent,
        DynamicAlphaCygniAgent,
        DynamicAlphaEridaniAgent,
        DynamicAlphaLyraeAgent,
        DynamicAlphaOrionisAgent,
        DynamicAlphaScorpiiAgent,
        DynamicAlphaTauriAgent,
        DynamicAlphaVirginisAgent,
        DynamicAlphaAquilaeAgent,
        DynamicBetaOrionisAgent,
        DynamicNorthStarAgent,
        STAR_PROFILES,
        StellarAgent,
        StellarAgentProfile,
        StellarAgentResult,
    )


def __getattr__(name: str) -> Any:
    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return _LAZY.dir(globals())
