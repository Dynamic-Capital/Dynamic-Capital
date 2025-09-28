"""Financial orchestration primitives for the dynamic ocean engine.

This module adapts the physical ``dynamic_ocean`` observability stack for
capital markets monitoring.  Each pelagic layer is mapped to a trading
mandate, complete with default instrumentation (currents and sensors)
and scoring heuristics that translate oceanic signals into liquidity,
momentum, volatility, systemic risk, and sentiment metrics.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Mapping, Sequence

from .ocean import DynamicOcean, OceanCurrent, OceanLayer, OceanSensor, OceanSnapshot

__all__ = [
    "PelagicFinancialProfile",
    "PelagicMarketSignal",
    "DEFAULT_FINANCIAL_PROFILES",
    "build_financial_ocean",
    "derive_market_signal",
    "resolve_financial_profile",
]


@dataclass(slots=True)
class PelagicFinancialProfile:
    """Mapping between an ocean stratum and a financial mandate."""

    layer_name: str
    market_focus: tuple[str, ...]
    asset_classes: tuple[str, ...]
    trading_horizon: str
    risk_appetite: str
    data_channels: tuple[str, ...]
    macro_indicators: tuple[str, ...]
    default_depth: float
    default_location: tuple[float, float, float]


@dataclass(slots=True)
class PelagicMarketSignal:
    """Derived financial insight produced from a single observation."""

    profile: PelagicFinancialProfile
    snapshot: OceanSnapshot
    liquidity_score: float
    momentum_score: float
    volatility_score: float
    systemic_risk_score: float
    sentiment_score: float
    alerts: tuple[str, ...]
    recommendations: tuple[str, ...]


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _score_from_delta(value: float, baseline: float, *, scale: float) -> float:
    if baseline == 0.0:
        baseline = 1.0
    normalised = (value - baseline) / (abs(baseline) * scale)
    return _clamp(0.5 + normalised)


_DEFAULT_LAYER_SPECS: Mapping[str, Mapping[str, object]] = {
    "Epipelagic": {
        "depth_range": (0.0, 200.0),
        "temperature_c": 18.0,
        "salinity_psu": 35.0,
        "oxygen_mg_l": 6.5,
        "turbidity_ntu": 2.0,
    },
    "Mesopelagic": {
        "depth_range": (200.0, 1000.0),
        "temperature_c": 4.0,
        "salinity_psu": 34.6,
        "oxygen_mg_l": 5.2,
        "turbidity_ntu": 3.5,
    },
    "Bathypelagic": {
        "depth_range": (1000.0, 4000.0),
        "temperature_c": 2.0,
        "salinity_psu": 34.7,
        "oxygen_mg_l": 4.8,
        "turbidity_ntu": 4.5,
    },
    "Abyssopelagic": {
        "depth_range": (4000.0, 6000.0),
        "temperature_c": 1.5,
        "salinity_psu": 34.8,
        "oxygen_mg_l": 4.2,
        "turbidity_ntu": 5.2,
    },
    "Hadalpelagic": {
        "depth_range": (6000.0, 11000.0),
        "temperature_c": 1.0,
        "salinity_psu": 34.9,
        "oxygen_mg_l": 3.6,
        "turbidity_ntu": 5.8,
    },
}


DEFAULT_FINANCIAL_PROFILES: Mapping[str, PelagicFinancialProfile] = {
    "Epipelagic": PelagicFinancialProfile(
        layer_name="Epipelagic",
        market_focus=("Global equities", "IPO pipeline", "Algorithmic trading"),
        asset_classes=("Large-cap equities", "Equity index futures", "Equity options"),
        trading_horizon="Intraday to short-term swings",
        risk_appetite="Growth with disciplined drawdown controls",
        data_channels=(
            "Exchange order books",
            "Primary issuance calendars",
            "Newswire velocity feeds",
        ),
        macro_indicators=("PMI surprise", "Retail flows", "Volatility term structure"),
        default_depth=100.0,
        default_location=(0.0, 0.0, 100.0),
    ),
    "Mesopelagic": PelagicFinancialProfile(
        layer_name="Mesopelagic",
        market_focus=("Credit markets", "FX carry", "Private credit underwriting"),
        asset_classes=("Investment-grade credit", "Sovereign FX", "Structured credit"),
        trading_horizon="Multi-week positioning",
        risk_appetite="Income-oriented with moderate leverage",
        data_channels=(
            "Corporate issuance trackers",
            "Cross-currency basis monitors",
            "Credit default swap curves",
        ),
        macro_indicators=("Yield curve slope", "Credit spreads", "FX reserve balances"),
        default_depth=600.0,
        default_location=(12.0, -8.0, 600.0),
    ),
    "Bathypelagic": PelagicFinancialProfile(
        layer_name="Bathypelagic",
        market_focus=("Commodities", "Volatility arbitrage", "Energy logistics"),
        asset_classes=("Oil futures", "Base metals", "Volatility surfaces"),
        trading_horizon="Tactical swing trading",
        risk_appetite="Opportunistic with derivatives overlays",
        data_channels=(
            "Supply chain telemetry",
            "Options surface snapshots",
            "Weather derivatives pricing",
        ),
        macro_indicators=("Inventory levels", "Freight rates", "Volatility of volatility"),
        default_depth=2200.0,
        default_location=(-24.0, 18.0, 2200.0),
    ),
    "Abyssopelagic": PelagicFinancialProfile(
        layer_name="Abyssopelagic",
        market_focus=("Global macro", "Rates strategy", "Systemic risk monitoring"),
        asset_classes=("Sovereign rates", "Inflation swaps", "Macro hedge funds"),
        trading_horizon="Quarterly to annual rebalancing",
        risk_appetite="Capital preservation with convex hedges",
        data_channels=(
            "Central bank transcripts",
            "Macro regime classifiers",
            "Systemic stress indicators",
        ),
        macro_indicators=("Global liquidity", "Fiscal balance", "Systemic risk index"),
        default_depth=4800.0,
        default_location=(40.0, -30.0, 4800.0),
    ),
    "Hadalpelagic": PelagicFinancialProfile(
        layer_name="Hadalpelagic",
        market_focus=("Tail-risk hedging", "Crisis playbooks", "Distressed opportunities"),
        asset_classes=("Deep out-of-the-money options", "Distressed debt", "Catastrophe bonds"),
        trading_horizon="Event-driven with opportunistic deployment",
        risk_appetite="Protective with asymmetric payoffs",
        data_channels=(
            "Crisis indicator dashboards",
            "Liquidity stress monitors",
            "Policy intervention trackers",
        ),
        macro_indicators=("Systemic drawdown", "Liquidity premium", "Crisis severity"),
        default_depth=9000.0,
        default_location=(-65.0, 12.0, 9000.0),
    ),
}


_DEFAULT_CURRENTS: Sequence[Mapping[str, object]] = (
    {
        "name": "Surface Momentum Jet",
        "speed_mps": 1.4,
        "direction": (0.9, 0.1, 0.0),
        "depth": 120.0,
        "origin": (0.0, 0.0, 95.0),
        "influence_radius_km": 320.0,
        "temperature_delta": 3.2,
        "salinity_delta": 0.4,
        "oxygen_delta": 0.6,
        "turbulence_delta": 0.5,
        "variability": 0.2,
        "stability": 0.78,
    },
    {
        "name": "Midwater Carry Stream",
        "speed_mps": 0.9,
        "direction": (0.2, -0.6, 0.1),
        "depth": 550.0,
        "origin": (18.0, -9.0, 560.0),
        "influence_radius_km": 220.0,
        "temperature_delta": -0.6,
        "salinity_delta": 0.2,
        "oxygen_delta": -0.3,
        "turbulence_delta": 0.3,
        "variability": 0.28,
        "stability": 0.6,
    },
    {
        "name": "Deep Vol Arb Gyre",
        "speed_mps": 0.6,
        "direction": (-0.3, 0.4, -0.2),
        "depth": 2100.0,
        "origin": (-28.0, 14.0, 2150.0),
        "influence_radius_km": 260.0,
        "temperature_delta": 0.4,
        "salinity_delta": -0.2,
        "oxygen_delta": -0.5,
        "turbulence_delta": 0.6,
        "variability": 0.35,
        "stability": 0.55,
    },
    {
        "name": "Macro Drift Current",
        "speed_mps": 0.4,
        "direction": (0.1, 0.2, 0.0),
        "depth": 4700.0,
        "origin": (42.0, -28.0, 4700.0),
        "influence_radius_km": 380.0,
        "temperature_delta": 0.2,
        "salinity_delta": 0.1,
        "oxygen_delta": -0.2,
        "turbulence_delta": 0.3,
        "variability": 0.18,
        "stability": 0.7,
    },
    {
        "name": "Crisis Undertow",
        "speed_mps": 0.3,
        "direction": (-0.4, 0.2, 0.3),
        "depth": 8800.0,
        "origin": (-60.0, 10.0, 8900.0),
        "influence_radius_km": 420.0,
        "temperature_delta": -0.3,
        "salinity_delta": 0.3,
        "oxygen_delta": -0.8,
        "turbulence_delta": 0.5,
        "variability": 0.4,
        "stability": 0.48,
    },
)


_DEFAULT_SENSORS: Sequence[Mapping[str, object]] = (
    {
        "name": "Surface-Liquidity-Array",
        "position": (10.0, 5.0, 90.0),
        "sensitivity": 1.2,
        "detection_range": 300.0,
        "noise_floor": 0.05,
    },
    {
        "name": "Credit-Depth-Array",
        "position": (25.0, -12.0, 620.0),
        "sensitivity": 1.1,
        "detection_range": 340.0,
        "noise_floor": 0.06,
    },
    {
        "name": "Commodity-Core-Array",
        "position": (-30.0, 18.0, 2150.0),
        "sensitivity": 0.95,
        "detection_range": 360.0,
        "noise_floor": 0.07,
    },
    {
        "name": "Macro-Basin-Array",
        "position": (38.0, -32.0, 4700.0),
        "sensitivity": 0.9,
        "detection_range": 420.0,
        "noise_floor": 0.08,
    },
    {
        "name": "Crisis-Trench-Array",
        "position": (-66.0, 14.0, 9050.0),
        "sensitivity": 0.85,
        "detection_range": 480.0,
        "noise_floor": 0.09,
    },
)


def build_financial_ocean(*, max_history: int = 240) -> DynamicOcean:
    """Instantiate ``DynamicOcean`` with the financial instrumentation."""

    ocean = DynamicOcean(max_history=max_history)
    for index, (name, spec) in enumerate(_DEFAULT_LAYER_SPECS.items()):
        ocean.register_layer(
            OceanLayer(name=name, **spec),
            default=index == 0,
        )
    for current in _DEFAULT_CURRENTS:
        ocean.add_current(OceanCurrent(**current))
    for sensor in _DEFAULT_SENSORS:
        ocean.add_sensor(OceanSensor(**sensor))
    return ocean


def resolve_financial_profile(layer_name: str) -> PelagicFinancialProfile:
    """Return the canonical profile for ``layer_name``."""

    try:
        return DEFAULT_FINANCIAL_PROFILES[layer_name]
    except KeyError as exc:  # pragma: no cover - defensive
        raise KeyError(f"Unknown financial layer '{layer_name}'.") from exc


def derive_market_signal(
    snapshot: OceanSnapshot,
    profile: PelagicFinancialProfile,
) -> PelagicMarketSignal:
    """Translate an :class:`OceanSnapshot` into a financial signal."""

    layer = snapshot.layer
    liquidity = _score_from_delta(snapshot.salinity_psu, layer.salinity_psu, scale=0.6)
    momentum = _score_from_delta(snapshot.temperature_c, layer.temperature_c, scale=0.4)
    turbidity_ratio = (snapshot.turbidity_ntu - layer.turbidity_ntu) / (max(layer.turbidity_ntu, 1.0) * 0.5)
    energy_factor = sqrt(max(snapshot.current_energy, 0.0)) / 4.0
    volatility = _clamp(0.5 + 0.3 * turbidity_ratio + 0.4 * energy_factor)
    oxygen_delta = (layer.oxygen_mg_l - snapshot.oxygen_mg_l) / max(layer.oxygen_mg_l, 1.0)
    systemic_risk = _clamp(0.4 + (1.0 - snapshot.stability_index) * 0.5 + max(oxygen_delta, 0.0) * 0.4)
    sentiment = _clamp(
        0.5
        + 0.3 * (snapshot.temperature_c - layer.temperature_c) / max(abs(layer.temperature_c), 1.0)
        + 0.3 * (snapshot.oxygen_mg_l - layer.oxygen_mg_l) / max(layer.oxygen_mg_l, 1.0)
        - 0.2 * max(systemic_risk - 0.6, 0.0)
    )

    recommendations: list[str] = []
    if liquidity > 0.7 and momentum > 0.6:
        recommendations.append(
            f"Scale into {profile.asset_classes[0]} while liquidity remains strong."
        )
    if volatility > 0.65:
        recommendations.append(
            "Deploy hedges via listed options or variance swaps to contain volatility risk."
        )
    if systemic_risk > 0.6:
        recommendations.append(
            f"Layer defensive overlays across {profile.asset_classes[-1]} to offset systemic stress."
        )
    if sentiment < 0.4:
        recommendations.append(
            f"Trim exposure within {profile.market_focus[0]} until sentiment stabilises."
        )
    if not recommendations:
        recommendations.append("Maintain core positioning with dynamic rebalancing triggers engaged.")

    return PelagicMarketSignal(
        profile=profile,
        snapshot=snapshot,
        liquidity_score=liquidity,
        momentum_score=momentum,
        volatility_score=volatility,
        systemic_risk_score=systemic_risk,
        sentiment_score=sentiment,
        alerts=snapshot.alerts,
        recommendations=tuple(recommendations),
    )
