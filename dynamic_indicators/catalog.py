"""Curated indicator definitions for the Dynamic Indicators engine."""

from __future__ import annotations

from typing import Iterable, Mapping

from .engine import DynamicIndicators, IndicatorDefinition

__all__ = ["DEFAULT_INDICATOR_SPECS", "create_dynamic_indicators"]


#: Baseline indicator specifications that capture the primary telemetry feeds
#: requested for the Dynamic Capital monitoring estate.  Each specification is
#: converted into an :class:`IndicatorDefinition` before registration.
DEFAULT_INDICATOR_SPECS: tuple[Mapping[str, object], ...] = (
    {
        "key": "dynamic_national_statistics",
        "title": "Dynamic National Statistics",
        "description": "Latest data sourced directly from official sources.",
        "category": "macroeconomics",
        "target": 0.85,
        "warning": 0.6,
        "critical": 0.4,
        "weight": 1.2,
        "metadata": {
            "coverage": "national",
            "provenance": ("statistical_offices", "official_sources"),
        },
    },
    {
        "key": "dynamic_economic_calendar",
        "title": "Dynamic Economic Calendar",
        "description": "Get releases from our calendar updated 24 hours a day.",
        "category": "macro_calendar",
        "target": 0.8,
        "warning": 0.55,
        "critical": 0.35,
        "weight": 1.1,
        "metadata": {
            "update_frequency": "24/7",
            "release_types": ("economic", "policy", "surveys"),
        },
    },
    {
        "key": "dynamic_forecasts",
        "title": "Dynamic Forecasts",
        "description": "Proprietary predictions for many indicators and financial markets",
        "category": "forecasting",
        "target": 0.78,
        "warning": 0.52,
        "critical": 0.32,
        "metadata": {
            "models": ("macro", "markets", "risk"),
        },
    },
    {
        "key": "dynamic_commodities",
        "title": "Dynamic Commodities",
        "description": "Energy, Metals, Agricultural, Livestock, Industrial",
        "category": "commodities",
        "target": 0.75,
        "warning": 0.5,
        "critical": 0.3,
        "metadata": {
            "segments": (
                "energy",
                "metals",
                "agricultural",
                "livestock",
                "industrial",
            ),
        },
    },
    {
        "key": "dynamic_stocks",
        "title": "Dynamic Stocks",
        "description": "Quotes for stock indexes and individual shares",
        "category": "equities",
        "target": 0.82,
        "warning": 0.56,
        "critical": 0.34,
        "metadata": {
            "universes": ("indexes", "single_name_equities"),
        },
    },
    {
        "key": "dynamic_bonds",
        "title": "Dynamic Bonds",
        "description": "Government Bond Yields for several maturities",
        "category": "fixed_income",
        "target": 0.76,
        "warning": 0.51,
        "critical": 0.31,
        "metadata": {
            "maturities": ("short_term", "intermediate", "long_term"),
        },
    },
    {
        "key": "dynamic_currencies_crypto",
        "title": "Currencies & Crypto",
        "description": "Exchange rates for 150 majors, 29K crosses and crypto.",
        "category": "fx_crypto",
        "target": 0.79,
        "warning": 0.53,
        "critical": 0.33,
        "metadata": {
            "coverage": {
                "majors": 150,
                "crosses": 29000,
                "crypto": True,
            }
        },
    },
    {
        "key": "dynamic_financials",
        "title": "Financials",
        "description": "Financial data for thousands of public traded companies.",
        "category": "fundamentals",
        "target": 0.77,
        "warning": 0.52,
        "critical": 0.32,
        "metadata": {
            "universes": ("global", "regional"),
        },
    },
    {
        "key": "dynamic_fred",
        "title": "Dynamic FRED",
        "description": "US Federal Reserve Data by State and County",
        "category": "federal_reserve",
        "target": 0.73,
        "warning": 0.48,
        "critical": 0.28,
        "metadata": {
            "granularity": ("state", "county"),
        },
    },
    {
        "key": "dynamic_world_bank",
        "title": "Dynamic World Bank",
        "description": "Development indicators from official sources.",
        "category": "development",
        "target": 0.74,
        "warning": 0.49,
        "critical": 0.29,
        "metadata": {
            "coverage": "global",
        },
    },
    {
        "key": "dynamic_comtrade",
        "title": "Dynamic COMTRADE",
        "description": "International Trade Statistics for more than 170 countries.",
        "category": "trade",
        "target": 0.72,
        "warning": 0.47,
        "critical": 0.27,
        "metadata": {
            "countries": ">=170",
        },
    },
    {
        "key": "dynamic_eurostat",
        "title": "Dynamic EUROSTAT",
        "description": "Statistical information for European Union.",
        "category": "europe",
        "target": 0.71,
        "warning": 0.46,
        "critical": 0.26,
        "metadata": {
            "coverage": "european_union",
        },
    },
)


def _materialise_definitions(
    definitions: Iterable[IndicatorDefinition | Mapping[str, object]]
) -> list[IndicatorDefinition]:
    """Return concrete indicator definitions for the provided specs."""

    materialised: list[IndicatorDefinition] = []
    for definition in definitions:
        if isinstance(definition, IndicatorDefinition):
            materialised.append(definition)
        else:
            materialised.append(IndicatorDefinition(**definition))
    return materialised


def create_dynamic_indicators(
    *,
    history: int = 90,
    decay: float = 0.2,
    definitions: Iterable[IndicatorDefinition | Mapping[str, object]] | None = None,
) -> DynamicIndicators:
    """Create a :class:`DynamicIndicators` orchestrator with curated defaults."""

    orchestrator = DynamicIndicators(history=history, decay=decay)
    for definition in _materialise_definitions(DEFAULT_INDICATOR_SPECS):
        orchestrator.register(definition)
    if definitions:
        for definition in _materialise_definitions(definitions):
            orchestrator.register(definition)
    return orchestrator

