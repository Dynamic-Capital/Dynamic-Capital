from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TESTS_ROOT = PROJECT_ROOT / "tests"
sys.path.insert(0, str(PROJECT_ROOT))
sys.path = [p for p in sys.path if not p.startswith(str(TESTS_ROOT))]

from dynamic.intelligence.ai_apps.analysis import DynamicAnalysis
from dynamic.intelligence.ai_apps.benchmark import (
    AnalysisBenchmarkScenario,
    BenchmarkResult,
    FusionBenchmarkScenario,
    benchmark_analysis_engine,
    benchmark_fusion_algo,
    default_analysis_scenarios,
    default_fusion_scenarios,
)
from dynamic.intelligence.ai_apps.core import DynamicFusionAlgo


@pytest.fixture()
def fusion_algo() -> DynamicFusionAlgo:
    return DynamicFusionAlgo(boost_topics=["earnings beat"])


@pytest.fixture()
def analysis_engine() -> DynamicAnalysis:
    return DynamicAnalysis()


def test_benchmark_fusion_algo_records_timings(
    fusion_algo: DynamicFusionAlgo,
) -> None:
    scenarios = [
        FusionBenchmarkScenario(
            name="benchmark_buy",
            market_payload={
                "signal": "BUY",
                "confidence": 0.6,
                "volatility": 0.9,
                "momentum": 0.3,
                "trend": "bullish",
                "news": ["earnings surprise", "guidance upgrade"],
                "human_bias": "BUY",
                "human_weight": 0.25,
                "composite_scores": [0.55, 0.6, 0.52],
            },
        )
    ]

    results = benchmark_fusion_algo(fusion_algo, scenarios, iterations=3)

    assert len(results) == 1
    result = results[0]
    assert isinstance(result, BenchmarkResult)
    assert result.iterations == 3
    assert result.total_seconds >= 0
    assert result.per_iteration_seconds == pytest.approx(result.total_seconds / result.iterations)
    assert result.metadata["action"] in {"BUY", "SELL", "HOLD", "NEUTRAL"}
    assert "confidence" in result.metadata


def test_benchmark_analysis_engine_records_outputs(
    analysis_engine: DynamicAnalysis,
) -> None:
    scenarios = [
        AnalysisBenchmarkScenario(
            name="analysis_case",
            analysis_payload={
                "technical": {
                    "trend": "bullish",
                    "momentum": 0.25,
                    "volatility": 1.1,
                    "support_strength": 0.35,
                    "resistance_pressure": 0.2,
                    "moving_average_alignment": ["bullish", "bullish", "up"],
                },
                "fundamental": {
                    "revenue_growth": 0.22,
                    "profitability": 0.3,
                    "valuation": -0.05,
                    "debt_to_equity": 0.3,
                    "sample_size": 600,
                },
                "sentiment": {
                    "feeds": [
                        {"score": 0.5, "confidence": 0.6},
                        {"score": 0.3, "confidence": 0.5},
                    ],
                    "social_score": 0.2,
                    "news_bias": 0.1,
                    "analyst_consensus": 0.15,
                },
                "macro": {
                    "regime": "expansion",
                    "inflation_trend": 0.08,
                    "growth_outlook": 0.25,
                    "policy_support": 0.12,
                    "liquidity": 0.3,
                },
                "risk": {
                    "drawdown": -0.05,
                    "treasury_utilisation": 0.6,
                    "stress_index": 0.4,
                    "halt": False,
                },
            },
        )
    ]

    results = benchmark_analysis_engine(analysis_engine, scenarios, iterations=2)

    assert len(results) == 1
    result = results[0]
    assert isinstance(result, BenchmarkResult)
    assert result.iterations == 2
    assert result.total_seconds >= 0
    assert result.per_iteration_seconds == pytest.approx(result.total_seconds / result.iterations)
    assert result.metadata["action"] in {"BUY", "SELL", "HOLD"}
    assert "score" in result.metadata
    assert "confidence" in result.metadata


def test_default_scenarios_exposed() -> None:
    fusion_scenarios = default_fusion_scenarios()
    analysis_scenarios = default_analysis_scenarios()

    assert fusion_scenarios, "Expected fusion scenarios to be populated"
    assert analysis_scenarios, "Expected analysis scenarios to be populated"
    assert len({scenario.name for scenario in fusion_scenarios}) == len(fusion_scenarios)
    assert len({scenario.name for scenario in analysis_scenarios}) == len(analysis_scenarios)


@pytest.mark.parametrize("iterations", [0, -2])
def test_invalid_iterations_raise(fusion_algo: DynamicFusionAlgo, iterations: int) -> None:
    scenario = FusionBenchmarkScenario(
        name="invalid",
        market_payload={"signal": "HOLD", "confidence": 0.5, "volatility": 1.0},
    )

    with pytest.raises(ValueError):
        benchmark_fusion_algo(fusion_algo, [scenario], iterations=iterations)
