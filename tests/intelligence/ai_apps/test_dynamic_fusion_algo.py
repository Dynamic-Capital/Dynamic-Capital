from pathlib import Path
import sys
from typing import Any, Iterable

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[3]
TESTS_ROOT = PROJECT_ROOT / "tests"
sys.path.insert(0, str(PROJECT_ROOT))
sys.path = [p for p in sys.path if not p.startswith(str(TESTS_ROOT))]

from dynamic.intelligence.ai_apps.core import DynamicFusionAlgo, PreparedMarketContext
from dynamic.intelligence.ai_apps.fusion import SentimentLobe


@pytest.fixture()
def algo() -> DynamicFusionAlgo:
    return DynamicFusionAlgo(boost_topics=["fomc minutes"])


def test_generate_signal_handles_null_numeric_fields(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "BUY",
        "momentum": None,
        "confidence": None,
        "volatility": None,
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"
    assert signal.confidence == pytest.approx(0.6)


def test_confidence_boosts_for_single_string_news(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "HOLD",
        "confidence": 0.5,
        "volatility": 1.0,
        "news": "FOMC Minutes",
    }

    signal = algo.generate_signal(payload)

    assert signal.confidence == pytest.approx(0.6)


def test_composite_scores_mapping_biases_action(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "NEUTRAL",
        "confidence": 0.5,
        "volatility": 1.0,
        "composite_scores": {"model_a": 0.6, "model_b": 0.55, "model_c": 0.4},
    }

    context = algo._prepare_context(payload)

    assert context.composite_scores == pytest.approx((0.6, 0.55, 0.4))
    assert context.composite_trimmed_mean is not None

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"


def test_generate_signal_reuses_prepared_context(monkeypatch: pytest.MonkeyPatch) -> None:
    algo = DynamicFusionAlgo()
    payload = {"signal": "BUY", "confidence": 0.6, "volatility": 1.1}

    original_prepare = algo._prepare_context
    context = original_prepare(dict(payload))

    calls = 0

    def tracked_prepare(data: dict[str, Any]) -> PreparedMarketContext:
        nonlocal calls
        calls += 1
        return original_prepare(data)

    monkeypatch.setattr(algo, "_prepare_context", tracked_prepare)

    signal = algo.generate_signal(payload, context=context)

    assert calls == 0
    assert signal.action == "BUY"


def test_human_bias_alignment_boosts_confidence(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "BUY",
        "confidence": 0.55,
        "volatility": 1.0,
        "human_bias": "BUY",
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"
    assert signal.confidence > 0.55
    assert "Human analysis" in signal.reasoning


def test_human_bias_override_when_divergent(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "SELL",
        "confidence": 0.6,
        "volatility": 1.0,
        "human_bias": "BUY",
        "human_weight": 0.6,
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"
    assert signal.confidence >= 0.6
    assert "adjusted action" in signal.reasoning


def test_human_bias_boundary_scores_promote_action(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "NEUTRAL",
        "confidence": 0.55,
        "volatility": 1.0,
        "human_bias": "BUY",
        # Weight yields blended score fractionally under the nominal threshold.
        "human_weight": 0.1999995,
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"


def test_news_none_is_treated_as_empty_iterable(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "SELL",
        "confidence": "0.4",
        "volatility": "not-a-number",
        "news": None,
    }

    signal = algo.generate_signal(payload)

    assert signal.confidence == pytest.approx(0.45)


def test_fractional_drawdown_reduces_confidence(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "BUY",
        "confidence": 0.6,
        "volatility": 1.0,
        "drawdown": -0.08,
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "BUY"
    assert signal.confidence == pytest.approx(0.54)


def test_deep_fractional_drawdown_triggers_neutral_action(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "BUY",
        "confidence": 0.6,
        "volatility": 1.0,
        "drawdown": -0.12,
    }

    signal = algo.generate_signal(payload)

    assert signal.action == "NEUTRAL"
    assert signal.confidence == pytest.approx(0.4)


def test_mm_parameters_adjust_risk_controls(algo: DynamicFusionAlgo) -> None:
    params = algo.mm_parameters(
        market_data={"volatility": 0.06},
        treasury={"balance": 750_000},
        inventory=50,
    )

    assert params["gamma"] == pytest.approx(0.05)
    assert params["spread_floor"] == pytest.approx(0.005)


def test_mm_parameters_scale_with_inventory(algo: DynamicFusionAlgo) -> None:
    params = algo.mm_parameters(
        market_data={"volatility": 0.01},
        treasury={"balance": 10_000},
        inventory=2_000,
    )

    assert params["gamma"] == pytest.approx(0.2)


def test_sentiment_lobe_handles_generator_feeds() -> None:
    lobe = SentimentLobe()

    def feed_generator() -> Iterable[dict[str, Any]]:
        for feed in (
            {"score": 0.6, "summary": "Growth outlook bullish"},
            {"score": -0.2, "summary": "Risk warnings bearish tone"},
            {"score": 0.4, "summary": "Upgrade and growth prospects"},
        ):
            yield feed

    signal = lobe.evaluate({"sentiment_feeds": feed_generator()})

    assert signal.score == pytest.approx(0.4666666, rel=1e-6)
    assert signal.confidence == pytest.approx(0.4666666, rel=1e-6)


class DummyAdapter:
    def __init__(self) -> None:
        self.calls = 0

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: dict[str, Any],
        prior_dialogue: Iterable[tuple[str, str]] | None = None,
    ) -> str:
        self.calls += 1
        return f"enhanced-{self.calls}-{action}-{confidence:.2f}"


def test_reasoning_cache_reuses_adapter_output() -> None:
    adapter = DummyAdapter()
    algo = DynamicFusionAlgo(llm_adapter=adapter, reasoning_cache_size=4)
    payload = {"signal": "BUY", "confidence": 0.6, "volatility": 1.0}

    first = algo.generate_signal(payload)
    second = algo.generate_signal(payload)

    assert adapter.calls == 1
    assert second.reasoning == first.reasoning


def test_reasoning_cache_respects_disabled_configuration() -> None:
    adapter = DummyAdapter()
    algo = DynamicFusionAlgo(llm_adapter=adapter, reasoning_cache_size=0)
    payload = {"signal": "BUY", "confidence": 0.6, "volatility": 1.0}

    algo.generate_signal(payload)
    algo.generate_signal(payload)

    assert adapter.calls == 2
