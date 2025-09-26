import json
from datetime import datetime, timezone
from typing import Any

import pytest

from algorithms.python.currency_correlation import (
    CorrelationSeries,
    CurrencyCorrelationCalculator,
    CurrencyCorrelationRequest,
)


class StubClient:
    def __init__(self, response: str) -> None:
        self.response = response
        self.calls: list[dict[str, Any]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        return self.response


def _series(pair: str, prices: list[float]) -> CorrelationSeries:
    timestamps = [datetime(2024, 4, 10, 12, 0, tzinfo=timezone.utc).isoformat()] * len(prices)
    return CorrelationSeries(pair=pair, closes=tuple(prices), timestamps=tuple(timestamps))


def test_correlation_calculator_fuses_llm_guidance() -> None:
    grok_payload = {
        "narrative": "EURUSD tightly coupled with GBPUSD while USDCHF hedges.",
        "actions": ["Scale EURUSD risk against GBPUSD correlation"],
        "hedges": ["USDCHF"],
        "stacking_candidates": ["GBPUSD"],
        "alerts": ["Correlation regime may shift on CPI"],
        "confidence": 0.7,
    }
    deepseek_payload = {
        "analysis": "Confirm GBPUSD stack but cap sizing; watch yen crosses.",
        "recommended_actions": ["Limit combined EUR/GBP exposure to 1.5%"],
        "hedge_candidates": ["USDCHF"],
        "stacking_candidates": ["GBPUSD"],
        "warnings": ["JPY correlation unstable"],
        "confidence_modifier": 0.8,
        "risk_score": 0.2,
    }

    grok_client = StubClient(response=json.dumps(grok_payload))
    deepseek_client = StubClient(response=json.dumps(deepseek_payload))

    calculator = CurrencyCorrelationCalculator(grok_client=grok_client, deepseek_client=deepseek_client)

    request = CurrencyCorrelationRequest(
        base_pair="EURUSD",
        series=[
            _series("EURUSD", [1.08, 1.0815, 1.0790, 1.0820, 1.0845, 1.0860]),
            _series("GBPUSD", [1.26, 1.2618, 1.2585, 1.2625, 1.2655, 1.2670]),
            _series("USDCHF", [0.91, 0.9085, 0.9120, 0.9078, 0.9060, 0.9045]),
            _series("AUDJPY", [97.2, 97.4, 97.1, 97.5, 97.6, 97.9]),
        ],
        timeframe="H1",
        analytics={"volatility_z": -0.6, "carry_spread": 0.35},
        macro_events=["US CPI", "ECB minutes"],
        context={"session": "London"},
    )

    report = calculator.calculate(request)

    assert report.base_pair == "EURUSD"
    assert report.correlations["GBPUSD"] > 0
    assert report.correlations["USDCHF"] < 0
    assert "USDCHF" in report.hedging_candidates
    assert "GBPUSD" in report.stacking_candidates
    assert any("Limit combined" in action for action in report.strategic_actions)
    assert "Correlation regime may shift on CPI" in report.alerts
    assert pytest.approx(0.448, rel=1e-3) == report.confidence
    assert "Analyse the currency correlation" in grok_client.calls[0]["prompt"]
    assert "Review the Grok-1 assessment" in deepseek_client.calls[0]["prompt"]
    assert report.metadata["prompt_optimisation"]["series_retained"] >= 2


def test_correlation_calculator_handles_text_responses() -> None:
    grok_client = StubClient("Correlation stable but monitor USD strength.")
    deepseek_client = StubClient("Risk high if DXY surges.")

    calculator = CurrencyCorrelationCalculator(grok_client=grok_client, deepseek_client=deepseek_client)

    request = CurrencyCorrelationRequest(
        base_pair="EURUSD",
        series=[
            _series("EURUSD", [1.08, 1.0815, 1.0790, 1.0820, 1.0845, 1.0860]),
            _series("USDCHF", [0.91, 0.9085, 0.9120, 0.9078, 0.9060, 0.9045]),
        ],
    )

    report = calculator.calculate(request)

    assert "Correlation stable" in report.narrative
    assert any("Risk high" in alert for alert in report.alerts)
    assert report.confidence is None


def test_correlation_calculator_requires_base_series() -> None:
    grok_client = StubClient("{}")
    deepseek_client = StubClient("{}")
    calculator = CurrencyCorrelationCalculator(grok_client=grok_client, deepseek_client=deepseek_client)

    request = CurrencyCorrelationRequest(
        base_pair="EURUSD",
        series=[_series("GBPUSD", [1.26, 1.27, 1.28, 1.275])],
    )

    with pytest.raises(ValueError):
        calculator.calculate(request)

