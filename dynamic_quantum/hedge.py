"""Quantum-enhanced hedging utilities for Dynamic Capital.

This module implements a suite of high-level abstractions described in the
"Advanced Dynamic Quantum Hedge Model" brief.  The intent is not to provide a
fully fledged execution engine, but rather a deterministic and testable
simulation layer that captures the concepts from the specification.  Each
component follows a functional style with rich docstrings and typing so that it
can serve as both documentation and a foundation for future integration work.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import exp
from statistics import fmean
from typing import Dict, Mapping, MutableSequence, Sequence

__all__ = [
    "PortfolioHolding",
    "HedgeRatioInstruction",
    "QuantumHedgePlan",
    "QuantumDynamicHedge",
    "PairCandidate",
    "DynamicHedgePortfolio",
    "quantum_pairs_trading_hedge",
    "QuantumVolatilityHedge",
    "CrossAssetHedge",
    "cross_asset_quantum_hedge",
    "quantum_derivatives",
    "QuantumHedgeOptimizer",
    "HedgeEffectivenessMonitor",
    "black_swan_hedge_strategy",
    "hedging_framework",
    "adaptive_hedge_calibration",
]


# ---------------------------------------------------------------------------
# Core data structures
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PortfolioHolding:
    """Normalised representation of a single portfolio holding.

    Parameters are intentionally high-level.  The default values represent a
    diversified large-cap exposure so that missing metadata does not derail the
    risk decomposition pipeline.
    """

    name: str
    weight: float
    beta: float = 1.0
    volatility: float = 0.2
    liquidity: float = 0.7
    correlation: float = 0.5
    entanglement: float = 0.2


@dataclass(frozen=True)
class HedgeRatioInstruction:
    """Instruction describing how to express a hedge for a risk factor."""

    factor: str
    instrument: str
    ratio: float
    rationale: str


@dataclass(frozen=True)
class QuantumHedgePlan:
    """Aggregated output of the :class:`QuantumDynamicHedge` workflow."""

    risk_exposures: Mapping[str, float]
    residual_risks: Mapping[str, float]
    hedge_instructions: Sequence[HedgeRatioInstruction]
    effectiveness_score: float


# ---------------------------------------------------------------------------
# Portfolio normalisation helpers
# ---------------------------------------------------------------------------


def _normalise_portfolio(portfolio: Mapping[str, Mapping[str, float] | float]) -> tuple[PortfolioHolding, ...]:
    """Convert arbitrary portfolio payloads into :class:`PortfolioHolding`s.

    Each input position can either be a numeric weight (interpreted as notional
    exposure) or a mapping that exposes richer analytics.  The output weights are
    rescaled so that their absolute values sum to one, providing a stable base
    for downstream calculations.
    """

    if not portfolio:
        raise ValueError("portfolio must not be empty")

    holdings: MutableSequence[PortfolioHolding] = []
    total_weight = 0.0

    for name, payload in portfolio.items():
        if isinstance(payload, Mapping):
            weight = float(payload.get("weight", payload.get("notional", 0.0)))
            beta = float(payload.get("beta", 1.0))
            volatility = float(payload.get("volatility", payload.get("sigma", 0.2)))
            liquidity = float(payload.get("liquidity", payload.get("adv_ratio", 0.7)))
            correlation = float(payload.get("correlation", payload.get("rho", 0.5)))
            entanglement = float(payload.get("entanglement", payload.get("quantum_factor", 0.2)))
        else:  # treat scalar payload as a simple weight
            weight = float(payload)
            beta = 1.0
            volatility = 0.2
            liquidity = 0.7
            correlation = 0.5
            entanglement = 0.2

        if weight == 0.0:
            continue

        holdings.append(
            PortfolioHolding(
                name=name,
                weight=weight,
                beta=beta,
                volatility=max(0.0, volatility),
                liquidity=min(max(liquidity, 0.0), 1.0),
                correlation=min(max(correlation, -1.0), 1.0),
                entanglement=min(max(entanglement, 0.0), 1.0),
            )
        )
        total_weight += abs(weight)

    if not holdings:
        raise ValueError("portfolio does not contain any active positions")
    if total_weight == 0.0:
        raise ValueError("portfolio total weight must not be zero")

    return tuple(
        PortfolioHolding(
            name=holding.name,
            weight=holding.weight / total_weight,
            beta=holding.beta,
            volatility=holding.volatility,
            liquidity=holding.liquidity,
            correlation=holding.correlation,
            entanglement=holding.entanglement,
        )
        for holding in holdings
    )


# ---------------------------------------------------------------------------
# Core hedging architecture
# ---------------------------------------------------------------------------


class QuantumDynamicHedge:
    """High-level gateway for dynamic quantum hedge construction."""

    def __init__(self) -> None:
        self.primary_risk_factors: Mapping[str, str] = {
            "direction_risk": "Equity beta, market momentum",
            "volatility_risk": "VIX, implied vol surfaces",
            "liquidity_risk": "Bid-ask spreads, market depth",
            "correlation_risk": "Inter-asset dependency structures",
            "quantum_entanglement_risk": "Non-classical correlations",
        }

    def calculate_quantum_betas(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> Mapping[str, float]:
        """Estimate factor betas across the five canonical quantum risk vectors."""

        holdings = _normalise_portfolio(portfolio)

        exposures: Dict[str, float] = {key: 0.0 for key in self.primary_risk_factors}
        for holding in holdings:
            exposures["direction_risk"] += holding.weight * holding.beta
            exposures["volatility_risk"] += holding.weight * holding.volatility * 5.0
            exposures["liquidity_risk"] += holding.weight * (1.0 - holding.liquidity)
            exposures["correlation_risk"] += holding.weight * abs(holding.correlation)
            exposures["quantum_entanglement_risk"] += holding.weight * holding.entanglement

        # Normalise exposures into a bounded range [-1, 1]
        normalised: Dict[str, float] = {}
        for factor, value in exposures.items():
            normalised[factor] = max(-1.0, min(1.0, value))
        return normalised

    def identify_idiosyncratic_exposures(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> Mapping[str, float]:
        """Quantify asset-specific residual risks not explained by core factors."""

        holdings = _normalise_portfolio(portfolio)
        residuals: Dict[str, float] = {}

        for holding in holdings:
            dispersion = abs(holding.correlation) * (1.0 - holding.liquidity)
            thermal_noise = holding.volatility * (1.0 - holding.entanglement)
            residuals[holding.name] = round(min(1.0, dispersion + thermal_noise), 4)

        return residuals

    def optimize_hedge_ratios(
        self,
        risk_exposures: Mapping[str, float],
        residual_risks: Mapping[str, float],
    ) -> QuantumHedgePlan:
        """Construct a balanced hedge plan given factor and residual exposures."""

        instructions: MutableSequence[HedgeRatioInstruction] = []
        cumulative_risk = sum(abs(value) for value in risk_exposures.values())
        residual_penalty = fmean(residual_risks.values()) if residual_risks else 0.0

        for factor, exposure in risk_exposures.items():
            if abs(exposure) < 0.05:
                rationale = "Exposure within tolerance; monitoring only"
                ratio = 0.0
            else:
                ratio = round(-exposure * (1.0 + residual_penalty), 3)
                rationale = "Counterbalance systemic drift using liquid futures"

            instrument = _suggest_instrument_for_factor(factor)
            instructions.append(
                HedgeRatioInstruction(
                    factor=factor,
                    instrument=instrument,
                    ratio=ratio,
                    rationale=rationale,
                )
            )

        effectiveness = max(0.0, 1.0 - min(1.0, cumulative_risk + residual_penalty))
        return QuantumHedgePlan(
            risk_exposures=dict(risk_exposures),
            residual_risks=dict(residual_risks),
            hedge_instructions=tuple(instructions),
            effectiveness_score=round(effectiveness, 4),
        )

    def quantum_risk_decomposition(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> QuantumHedgePlan:
        """Run the full quantum risk decomposition pipeline."""

        risk_exposures = self.calculate_quantum_betas(portfolio)
        residual_risks = self.identify_idiosyncratic_exposures(portfolio)
        return self.optimize_hedge_ratios(risk_exposures, residual_risks)


def _suggest_instrument_for_factor(factor: str) -> str:
    mapping = {
        "direction_risk": "Equity index futures",
        "volatility_risk": "VIX futures",
        "liquidity_risk": "Treasury futures",
        "correlation_risk": "Correlation swaps",
        "quantum_entanglement_risk": "Quantum dispersion notes",
    }
    return mapping.get(factor, "Market-neutral baskets")


# ---------------------------------------------------------------------------
# Quantum statistical arbitrage hedge
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PairCandidate:
    """Pair of assets exhibiting quantum-enhanced cointegration."""

    asset_long: str
    asset_short: str
    cointegration_score: float


@dataclass(frozen=True)
class MeanReversionSignal:
    """Signal strength for a candidate pair."""

    z_score: float
    half_life: float


@dataclass(frozen=True)
class DynamicHedgePortfolio:
    """Result bundle for the quantum pairs trading hedge routine."""

    pairs: Sequence[PairCandidate]
    hedge_ratios: Mapping[str, float]
    signals: Mapping[str, MeanReversionSignal]


def quantum_cointegration_test(*, universe: int, confidence_level: float) -> tuple[PairCandidate, ...]:
    """Create deterministic pseudo cointegration pairs.

    The routine uses simple exponential decay to produce interpretable scores
    without relying on external data dependencies.  The ``universe`` parameter is
    leveraged to scale the variety of pairs.
    """

    pair_count = max(1, min(10, universe // 500))
    pairs = []
    for idx in range(pair_count):
        score = round(1.0 - exp(-confidence_level * (idx + 1) / pair_count), 4)
        pairs.append(
            PairCandidate(
                asset_long=f"ASSET_{idx:03d}",
                asset_short=f"ASSET_{idx + 1:03d}",
                cointegration_score=score,
            )
        )
    return tuple(pairs)


def kalman_filter_hedge_ratios(pairs: Sequence[PairCandidate]) -> Dict[str, float]:
    """Estimate hedge ratios using a simplified Kalman filter heuristic."""

    ratios: Dict[str, float] = {}
    for pair in pairs:
        key = f"{pair.asset_long}/{pair.asset_short}"
        ratios[key] = round(0.5 + (pair.cointegration_score - 0.5) * 0.8, 4)
    return ratios


def generate_quantum_mean_reversion_signals(pairs: Sequence[PairCandidate]) -> Dict[str, MeanReversionSignal]:
    """Generate multi-timeframe mean reversion signals for each pair."""

    signals: Dict[str, MeanReversionSignal] = {}
    for pair in pairs:
        z_score = round((pair.cointegration_score - 0.5) * 3.0, 4)
        half_life = round(5.0 / max(0.1, pair.cointegration_score), 2)
        signals[f"{pair.asset_long}/{pair.asset_short}"] = MeanReversionSignal(
            z_score=z_score,
            half_life=half_life,
        )
    return signals


def quantum_pairs_trading_hedge(portfolio: Mapping[str, Mapping[str, float] | float]) -> DynamicHedgePortfolio:
    """Assemble a dynamic hedge portfolio using quantum-enhanced signals."""

    pairs = quantum_cointegration_test(universe=len(portfolio), confidence_level=0.99)
    hedge_ratios = kalman_filter_hedge_ratios(pairs)
    signals = generate_quantum_mean_reversion_signals(pairs)
    return DynamicHedgePortfolio(pairs=pairs, hedge_ratios=hedge_ratios, signals=signals)


# ---------------------------------------------------------------------------
# Volatility surface hedging
# ---------------------------------------------------------------------------


@dataclass
class VolatilityBucket:
    """Container representing aggregate vega/gamma exposure."""

    level: str
    notional: float


class StochasticVolatilitySurface:
    """Placeholder for a stochastic volatility surface model."""

    def implied_volatility(self, tenor: str, moneyness: float) -> float:
        return round(0.2 + 0.05 * moneyness + (len(tenor) % 3) * 0.01, 4)


class QuantumSkewExposure:
    """Quantum-aware skew analytics helper."""

    def skew_risk(self, tenor: str) -> float:
        base = 0.1 + (len(tenor) % 2) * 0.05
        return round(base, 4)


class QuantumVolatilityHedge:
    """Provide hedging guidance across vega and gamma buckets."""

    def __init__(self) -> None:
        self.vol_surface_model = StochasticVolatilitySurface()
        self.skew_risk_model = QuantumSkewExposure()

    def analyze_vega_exposures(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> tuple[VolatilityBucket, ...]:
        buckets: MutableSequence[VolatilityBucket] = []
        for tenor in ("1M", "3M", "6M", "12M"):
            notional = sum(
                float(data.get("vega", 0.0)) if isinstance(data, Mapping) else 0.0
                for data in portfolio.values()
            )
            adjustment = self.vol_surface_model.implied_volatility(tenor, 1.0) - 0.2
            buckets.append(VolatilityBucket(level=tenor, notional=round(notional * (1 + adjustment), 2)))
        return tuple(buckets)

    def analyze_gamma_exposures(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> tuple[VolatilityBucket, ...]:
        buckets: MutableSequence[VolatilityBucket] = []
        for tenor in ("front", "mid", "tail"):
            notional = sum(
                float(data.get("gamma", 0.0)) if isinstance(data, Mapping) else 0.0
                for data in portfolio.values()
            )
            adjustment = self.skew_risk_model.skew_risk(tenor)
            buckets.append(VolatilityBucket(level=tenor, notional=round(notional * (1 + adjustment), 2)))
        return tuple(buckets)

    def optimize_vol_hedge(
        self,
        vega_buckets: Sequence[VolatilityBucket],
        gamma_buckets: Sequence[VolatilityBucket],
        hedge_instruments: Sequence[str],
    ) -> Dict[str, float]:
        """Allocate hedge notionals across derivative instruments."""

        allocations: Dict[str, float] = {}
        total_notional = sum(bucket.notional for bucket in vega_buckets + tuple(gamma_buckets))
        if total_notional == 0:
            return {instrument: 0.0 for instrument in hedge_instruments}

        for idx, instrument in enumerate(hedge_instruments):
            weight = 1.0 / len(hedge_instruments)
            allocations[instrument] = round(total_notional * weight * (0.8 + 0.05 * idx), 2)
        return allocations

    def hedge_volatility_exposures(self, portfolio: Mapping[str, Mapping[str, float] | float]) -> Dict[str, float]:
        vega_buckets = self.analyze_vega_exposures(portfolio)
        gamma_buckets = self.analyze_gamma_exposures(portfolio)
        hedge_instruments = [
            "VIX futures",
            "Volatility ETFs",
            "Option strangles",
            "Variance swaps",
        ]
        return self.optimize_vol_hedge(vega_buckets, gamma_buckets, hedge_instruments)


# ---------------------------------------------------------------------------
# Quantum multi-asset class hedge
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CrossAssetHedge:
    """Container describing cross-asset hedge weights and triggers."""

    weights: Mapping[str, float]
    rebalance_triggers: Mapping[str, object]


ASSET_SET = ["SPX", "UST10Y", "Gold", "EURUSD", "Oil"]
TIME_HORIZONS = ["intraday", "weekly", "monthly"]


def calculate_quantum_correlations(*, assets: Sequence[str], time_horizons: Sequence[str]) -> Dict[str, float]:
    """Generate a stylised quantum correlation matrix encoded as a flat mapping."""

    correlations: Dict[str, float] = {}
    for asset in assets:
        for horizon in time_horizons:
            key = f"{asset}:{horizon}"
            correlations[key] = round(0.3 + 0.1 * len(asset) / 10 + 0.05 * len(horizon) / 8, 4)
    return correlations


def minimum_variance_hedge(correlation_matrix: Mapping[str, float], portfolio_exposures: Mapping[str, float]) -> Dict[str, float]:
    """Compute minimum-variance hedge weights using heuristic allocation."""

    weights: Dict[str, float] = {}
    total_exposure = sum(abs(v) for v in portfolio_exposures.values()) or 1.0
    for asset in ASSET_SET:
        score = sum(
            correlation_matrix.get(f"{asset}:{horizon}", 0.0) for horizon in TIME_HORIZONS
        )
        weights[asset] = round(score / (total_exposure * len(TIME_HORIZONS)), 4)
    return weights


def cross_asset_quantum_hedge(portfolio: Mapping[str, Mapping[str, float] | float]) -> CrossAssetHedge:
    """Build a multi-asset hedge with dynamic rebalancing triggers."""

    quantum_engine = QuantumDynamicHedge()
    exposures = quantum_engine.calculate_quantum_betas(portfolio)
    correlation_matrix = calculate_quantum_correlations(assets=ASSET_SET, time_horizons=TIME_HORIZONS)
    hedge_weights = minimum_variance_hedge(correlation_matrix, exposures)
    rebalance_triggers = {
        "correlation_breakdown": 0.15,
        "volatility_regime_change": True,
        "liquidity_shocks": True,
    }
    return CrossAssetHedge(weights=hedge_weights, rebalance_triggers=rebalance_triggers)


# ---------------------------------------------------------------------------
# Advanced hedging instruments
# ---------------------------------------------------------------------------


quantum_derivatives = {
    "correlation_swaps": "Hedge correlation risk directly",
    "dispersion_trading": "Hedge index vs component risk",
    "volatility_arbitrage": "Capitalize on vol surface anomalies",
    "quantum_options": "Options priced with quantum algorithms",
    "tail_risk_hedges": "Deep OTM puts, VIX calls, crash puts",
}


# ---------------------------------------------------------------------------
# Real-time hedge adjustment engine
# ---------------------------------------------------------------------------


class DynamicCostModel:
    def estimate_slippage(self, target_hedge: Mapping[str, float]) -> float:
        return round(0.001 * sum(abs(v) for v in target_hedge.values()), 6)


class BasisRiskTracker:
    def forecast_basis_changes(self, target_hedge: Mapping[str, float]) -> float:
        return round(0.01 + 0.002 * len(target_hedge), 4)


class AdaptiveLiquidityModel:
    def assess_market_impact(self, target_hedge: Mapping[str, float]) -> float:
        return round(0.005 * sum(abs(v) for v in target_hedge.values()), 6)


class QuantumHedgeOptimizer:
    """Balance hedge effectiveness against execution frictions."""

    def __init__(self) -> None:
        self.cost_of_carry_model = DynamicCostModel()
        self.basis_risk_monitor = BasisRiskTracker()
        self.liquidity_adjuster = AdaptiveLiquidityModel()

    def estimate_slippage(self, target_hedge: Mapping[str, float]) -> float:
        return self.cost_of_carry_model.estimate_slippage(target_hedge)

    def calculate_carry_costs(self, target_hedge: Mapping[str, float]) -> float:
        return round(0.002 + 0.001 * len(target_hedge), 4)

    def forecast_basis_changes(self, target_hedge: Mapping[str, float]) -> float:
        return self.basis_risk_monitor.forecast_basis_changes(target_hedge)

    def assess_market_impact(self, target_hedge: Mapping[str, float]) -> float:
        return self.liquidity_adjuster.assess_market_impact(target_hedge)

    def multi_objective_optimization(self, considerations: Mapping[str, float]) -> Mapping[str, float]:
        weightings = {
            "transaction_costs": 0.35,
            "financing_costs": 0.15,
            "basis_risk": 0.3,
            "liquidity_impact": 0.2,
        }
        score = sum(weightings[key] * considerations.get(key, 0.0) for key in weightings)
        return {
            "composite_cost": round(score, 6),
            "recommended_adjustment": round(max(0.0, 1.0 - score * 5), 4),
        }

    def optimize_hedge_execution(self, target_hedge: Mapping[str, float]) -> Mapping[str, float]:
        considerations = {
            "transaction_costs": self.estimate_slippage(target_hedge),
            "financing_costs": self.calculate_carry_costs(target_hedge),
            "basis_risk": self.forecast_basis_changes(target_hedge),
            "liquidity_impact": self.assess_market_impact(target_hedge),
        }
        return self.multi_objective_optimization(considerations)


# ---------------------------------------------------------------------------
# Risk-managed hedge framework
# ---------------------------------------------------------------------------


class HedgeEffectivenessMonitor:
    """Monitor the effectiveness of a hedge portfolio in real time."""

    def __init__(self) -> None:
        self.performance_metrics = {
            "r_squared": "Variance reduction effectiveness",
            "beta_stability": "Hedge ratio consistency",
            "tracking_error": "Basis risk measurement",
            "cost_efficiency": "Cost per unit risk reduced",
        }

    def calculate_effectiveness(self, hedge_portfolio: Mapping[str, float]) -> float:
        if not hedge_portfolio:
            return 0.0
        dispersion = fmean(abs(value) for value in hedge_portfolio.values())
        return round(max(0.0, 1.0 - dispersion), 4)

    def trigger_hedge_review(self, hedge_portfolio: Mapping[str, float]) -> Mapping[str, float]:
        return {"action": "review", "portfolio_size": len(hedge_portfolio)}

    def generate_hedge_adjustment_signals(self) -> Mapping[str, str]:
        return {"signal": "tighten_hedge", "rationale": "Effectiveness below threshold"}

    def continuous_hedge_validation(self, hedge_portfolio: Mapping[str, float]) -> Mapping[str, object]:
        effectiveness_score = self.calculate_effectiveness(hedge_portfolio)
        response: Dict[str, object] = {
            "effectiveness_score": effectiveness_score,
        }
        if effectiveness_score < 0.85:
            response["review"] = self.trigger_hedge_review(hedge_portfolio)
            response["adjustment_signal"] = self.generate_hedge_adjustment_signals()
        return response


# ---------------------------------------------------------------------------
# Tail risk and black swan hedging
# ---------------------------------------------------------------------------


def quantum_anomaly_detection(*, market_data: Sequence[float], risk_factors: Sequence[float]) -> float:
    signal_strength = sum(market_data) * 0.001 + sum(risk_factors) * 0.002
    return round(min(1.0, signal_strength), 4)


def quantum_value_at_risk(portfolio: Mapping[str, Mapping[str, float] | float], *, confidence: float) -> float:
    holdings = _normalise_portfolio(portfolio)
    volatility = sum(holding.volatility * abs(holding.weight) for holding in holdings)
    return round(volatility * confidence, 4)


@dataclass(frozen=True)
class TailHedgePortfolio:
    instruments: Sequence[str]
    hedge_size: float
    warning_signal_strength: float


def black_swan_hedge_strategy(portfolio: Mapping[str, Mapping[str, float] | float]) -> TailHedgePortfolio:
    warning_signals = quantum_anomaly_detection(
        market_data=[0.6, 0.7, 0.55],
        risk_factors=[0.4, 0.5, 0.65],
    )
    tail_hedge_instruments = [
        "Far OTM put options (5-10% delta)",
        "VIX call options",
        "Long-dated volatility futures",
        "Gold and Swiss Franc allocations",
        "Inverse correlation assets",
    ]
    hedge_size = quantum_value_at_risk(portfolio, confidence=0.995)
    return TailHedgePortfolio(tail_hedge_instruments, hedge_size, warning_signals)


# ---------------------------------------------------------------------------
# Implementation framework
# ---------------------------------------------------------------------------


hedging_framework = {
    "market_regimes": {
        "bull_market": "Minimal delta hedge, focus on gamma",
        "high_volatility": "Increased vega hedging, tail protection",
        "crisis_mode": "Maximum hedge ratios, liquidity focus",
        "recovery_phase": "Gradual hedge reduction, convexity positions",
    },
    "portfolio_characteristics": {
        "high_beta": "Aggressive delta hedging",
        "options_heavy": "Sophisticated greek hedging",
        "concentrated": "Individual position hedging",
        "diversified": "Factor-based portfolio hedging",
    },
    "cost_constraints": {
        "low_budget": "ETF-based hedging, less frequent rebalancing",
        "medium_budget": "Options strategies, moderate rebalancing",
        "high_budget": "Direct instrument hedging, dynamic rebalancing",
    },
}


# ---------------------------------------------------------------------------
# Performance optimization
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class HedgeCalibrationResult:
    parameters: Mapping[str, float]
    objective: str


def multi_regime_dataset(historical_data: Sequence[Mapping[str, float]]) -> Sequence[Mapping[str, float]]:
    return historical_data


def quantum_neural_network(*, inputs: Sequence[Mapping[str, float]], objective: str) -> Dict[str, float]:
    size_penalty = 1.0 / max(1, len(inputs))
    aggregated = {
        key: round(sum(entry.get(key, 0.0) for entry in inputs) * size_penalty, 4)
        for key in {metric for entry in inputs for metric in entry}
    }
    return aggregated


def calibrate_hedge_model(parameters: Mapping[str, float]) -> HedgeCalibrationResult:
    normalised = {
        key: round(value / (abs(value) + 1.0), 4) for key, value in parameters.items()
    }
    return HedgeCalibrationResult(parameters=normalised, objective="maximize_risk_adjusted_returns")


def adaptive_hedge_calibration(historical_data: Sequence[Mapping[str, float]]) -> HedgeCalibrationResult:
    training_data = multi_regime_dataset(historical_data)
    optimal_parameters = quantum_neural_network(
        inputs=training_data,
        objective="maximize_risk_adjusted_returns",
    )
    return calibrate_hedge_model(optimal_parameters)


# ---------------------------------------------------------------------------
# Utility bundle for module level exports
# ---------------------------------------------------------------------------


__all__ += [
    "MeanReversionSignal",
    "VolatilityBucket",
    "StochasticVolatilitySurface",
    "QuantumSkewExposure",
    "DynamicCostModel",
    "BasisRiskTracker",
    "AdaptiveLiquidityModel",
    "TailHedgePortfolio",
    "HedgeCalibrationResult",
    "quantum_cointegration_test",
    "kalman_filter_hedge_ratios",
    "generate_quantum_mean_reversion_signals",
    "calculate_quantum_correlations",
    "minimum_variance_hedge",
    "quantum_anomaly_detection",
    "quantum_value_at_risk",
    "multi_regime_dataset",
    "quantum_neural_network",
    "calibrate_hedge_model",
]
