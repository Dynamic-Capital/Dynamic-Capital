from pathlib import Path
import sys

import pytest

sys.path.append(str(Path(__file__).resolve().parents[2]))

from dynamic_ai.core import DynamicFusionAlgo


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


def test_news_none_is_treated_as_empty_iterable(algo: DynamicFusionAlgo) -> None:
    payload = {
        "signal": "SELL",
        "confidence": "0.4",
        "volatility": "not-a-number",
        "news": None,
    }

    signal = algo.generate_signal(payload)

    assert signal.confidence == pytest.approx(0.45)


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
