"""Benchmark helpers for the Dynamic AI analysis and fusion pipelines."""

from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter
from typing import Any, Iterable, List, Mapping, MutableMapping, Optional

from .analysis import DynamicAnalysis
from .core import DynamicFusionAlgo


@dataclass(frozen=True)
class FusionBenchmarkScenario:
    """Market payload exercised when benchmarking the fusion algo."""

    name: str
    market_payload: Mapping[str, Any]


@dataclass(frozen=True)
class AnalysisBenchmarkScenario:
    """Research payload exercised when benchmarking the analysis engine."""

    name: str
    analysis_payload: Mapping[str, Any]


@dataclass
class BenchmarkResult:
    """Timing information produced for a benchmark scenario."""

    scenario: str
    iterations: int
    total_seconds: float
    per_iteration_seconds: float
    metadata: MutableMapping[str, Any] = field(default_factory=dict)


def _ensure_iterations(iterations: int) -> int:
    if iterations <= 0:
        raise ValueError("iterations must be a positive integer")
    return iterations


def benchmark_fusion_algo(
    algo: DynamicFusionAlgo,
    scenarios: Iterable[FusionBenchmarkScenario] | None = None,
    *,
    iterations: int = 250,
) -> List[BenchmarkResult]:
    """Benchmark ``algo.generate_signal`` across ``scenarios``."""

    _ensure_iterations(iterations)

    scenario_list = list(scenarios or default_fusion_scenarios())
    if not scenario_list:
        return []

    results: List[BenchmarkResult] = []

    for scenario in scenario_list:
        payload = dict(scenario.market_payload)
        start = perf_counter()
        last_signal = None
        for _ in range(iterations):
            last_signal = algo.generate_signal(dict(payload))
        total = perf_counter() - start

        metadata: MutableMapping[str, Any] = {}
        if last_signal is not None:
            metadata.update(
                {
                    "action": last_signal.action,
                    "confidence": last_signal.confidence,
                    "reasoning": last_signal.reasoning,
                }
            )

        results.append(
            BenchmarkResult(
                scenario=scenario.name,
                iterations=iterations,
                total_seconds=total,
                per_iteration_seconds=total / iterations,
                metadata=metadata,
            )
        )

    return results


def benchmark_analysis_engine(
    engine: DynamicAnalysis,
    scenarios: Iterable[AnalysisBenchmarkScenario] | None = None,
    *,
    iterations: int = 250,
) -> List[BenchmarkResult]:
    """Benchmark ``engine.analyse`` across ``scenarios``."""

    _ensure_iterations(iterations)

    scenario_list = list(scenarios or default_analysis_scenarios())
    if not scenario_list:
        return []

    results: List[BenchmarkResult] = []

    for scenario in scenario_list:
        payload = dict(scenario.analysis_payload)
        start = perf_counter()
        last_result: Optional[Mapping[str, Any]] = None
        for _ in range(iterations):
            last_result = engine.analyse(dict(payload))
        total = perf_counter() - start

        metadata: MutableMapping[str, Any] = {}
        if last_result is not None:
            metadata.update(
                {
                    "action": last_result.get("action"),
                    "score": last_result.get("score"),
                    "confidence": last_result.get("confidence"),
                    "primary_driver": last_result.get("primary_driver"),
                }
            )

        results.append(
            BenchmarkResult(
                scenario=scenario.name,
                iterations=iterations,
                total_seconds=total,
                per_iteration_seconds=total / iterations,
                metadata=metadata,
            )
        )

    return results


def default_fusion_scenarios() -> List[FusionBenchmarkScenario]:
    """Return representative market payloads for benchmarking."""

    return [
        FusionBenchmarkScenario(
            name="bullish_breakout",
            market_payload={
                "signal": "BUY",
                "confidence": 0.58,
                "volatility": 0.85,
                "momentum": 0.42,
                "trend": "uptrend",
                "support_level": 195.2,
                "resistance_level": 205.5,
                "news": ["earnings beat", "analyst upgrade"],
                "human_bias": "BUY",
                "human_weight": 0.25,
                "composite_scores": [0.52, 0.61, 0.55],
            },
        ),
        FusionBenchmarkScenario(
            name="risk_off_pullback",
            market_payload={
                "signal": "SELL",
                "confidence": 0.62,
                "volatility": 1.35,
                "momentum": -0.38,
                "trend": "downtrend",
                "news": ["geopolitical escalation", "credit downgrades"],
                "drawdown": 0.04,
                "human_bias": "SELL",
                "human_weight": 0.2,
                "circuit_breaker": False,
                "composite_scores": [0.35, 0.41, 0.39],
            },
        ),
        FusionBenchmarkScenario(
            name="neutral_consolidation",
            market_payload={
                "signal": "HOLD",
                "confidence": 0.5,
                "volatility": 1.0,
                "momentum": 0.05,
                "trend": "sideways",
                "news": [],
                "human_bias": None,
                "human_weight": 0.0,
                "composite_scores": [0.49, 0.51, 0.5],
            },
        ),
    ]


def default_analysis_scenarios() -> List[AnalysisBenchmarkScenario]:
    """Return representative research payloads for benchmarking."""

    return [
        AnalysisBenchmarkScenario(
            name="growth_bias",
            analysis_payload={
                "technical": {
                    "trend": "bullish",
                    "momentum": 0.35,
                    "volatility": 1.1,
                    "support_strength": 0.4,
                    "resistance_pressure": 0.15,
                    "moving_average_alignment": ["bullish", "bullish", "neutral"],
                },
                "fundamental": {
                    "revenue_growth": 0.3,
                    "profitability": 0.45,
                    "valuation": -0.1,
                    "debt_to_equity": 0.25,
                    "sample_size": 750,
                },
                "sentiment": {
                    "feeds": [
                        {"score": 0.6, "confidence": 0.7},
                        {"score": 0.4, "confidence": 0.55},
                    ],
                    "social_score": 0.25,
                    "news_bias": 0.15,
                    "analyst_consensus": 0.2,
                },
                "macro": {
                    "regime": "expansion",
                    "inflation_trend": 0.05,
                    "growth_outlook": 0.3,
                    "policy_support": 0.2,
                    "liquidity": 0.35,
                },
                "risk": {
                    "drawdown": -0.04,
                    "treasury_utilisation": 0.55,
                    "stress_index": 0.25,
                    "halt": False,
                },
            },
        ),
        AnalysisBenchmarkScenario(
            name="defensive_rotation",
            analysis_payload={
                "technical": {
                    "trend": "bearish",
                    "momentum": -0.25,
                    "volatility": 1.4,
                    "support_strength": 0.15,
                    "resistance_pressure": 0.45,
                    "moving_average_alignment": ["bearish", "bearish", "down"],
                },
                "fundamental": {
                    "revenue_growth": -0.05,
                    "profitability": 0.1,
                    "valuation": 0.3,
                    "debt_to_equity": 0.6,
                    "sample_size": 540,
                },
                "sentiment": {
                    "sources": [
                        {"score": -0.4, "confidence": 0.65},
                        {"score": -0.2, "confidence": 0.55},
                    ],
                    "social_score": -0.15,
                    "news_bias": -0.3,
                    "analyst_consensus": -0.25,
                },
                "macro": {
                    "regime": "contraction",
                    "inflation_trend": 0.35,
                    "growth_outlook": -0.2,
                    "policy_support": -0.1,
                    "liquidity": 0.2,
                },
                "risk": {
                    "drawdown": -0.12,
                    "treasury_utilisation": 0.82,
                    "stress_index": 0.65,
                    "halt": False,
                },
            },
        ),
    ]
