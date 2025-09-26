from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import pytest

from algorithms.python.trade_logic import ActivePosition, MarketSnapshot
from algorithms.python.economic_catalysts import EconomicCatalyst
from algorithms.python.trading_data_processor import (
    TradingDataProcessor,
    TradingDataRequest,
    TradingDataResult,
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


def _snapshot(close: float, *, minutes: int) -> MarketSnapshot:
    base = datetime(2024, 4, 12, 14, 0, tzinfo=timezone.utc)
    return MarketSnapshot(
        symbol="EURUSD",
        timestamp=base.replace(minute=base.minute + minutes),
        close=close,
        rsi_fast=45.0 + minutes,
        adx_fast=18.0 + minutes / 2,
        rsi_slow=50.0 + minutes / 3,
        adx_slow=17.0 + minutes / 4,
        pip_size=0.0001,
        pip_value=10.0,
        open=close - 0.0005,
        high=close + 0.0007,
        low=close - 0.0006,
    )


def test_processor_combines_llm_outputs() -> None:
    grok_payload = {
        "normalized_features": {"momentum_score": 0.7, "liquidity_score": 0.4},
        "insights": ["Momentum improving across majors."],
        "risks": ["Liquidity pockets remain thin."],
        "confidence": 0.6,
        "alerts": ["Watch NY session supply"],
    }
    deepseek_payload = {
        "confidence_modifier": 0.8,
        "risk_score": 0.3,
        "risks": ["US data drop could whipsaw"],
        "risk_mitigations": ["Cap exposure at 1.25%"],
        "alerts": ["Monitor DXY options flow"],
    }

    grok_client = StubClient(response=json.dumps(grok_payload))
    deepseek_client = StubClient(response=json.dumps(deepseek_payload))

    processor = TradingDataProcessor(grok_client=grok_client, deepseek_client=deepseek_client)

    request = TradingDataRequest(
        snapshots=[_snapshot(1.0830, minutes=0), _snapshot(1.0842, minutes=5), _snapshot(1.0850, minutes=10)],
        context={"session": "London", "empty": ""},
        analytics={"volatility_z": -0.8, "carry": 1.4, "momentum": 0.9},
        macro_events=["US CPI", "ECB minutes"],
        open_positions=[ActivePosition(symbol="GBPUSD", direction=1, size=0.2, entry_price=1.2650)],
        notes=["Desk expects shallow dips"],
    )

    result = processor.process(request)

    assert isinstance(result, TradingDataResult)
    assert result.feature_summary["samples"] == pytest.approx(3.0)
    assert result.normalized_features == {"momentum_score": 0.7, "liquidity_score": 0.4}
    assert "mechanical_velocity_mean" in result.feature_summary
    assert result.insights == ["Momentum improving across majors."]
    assert any("US data drop" in risk for risk in result.risks)
    assert sorted(result.alerts) == ["Monitor DXY options flow", "Watch NY session supply"]
    assert result.confidence == pytest.approx(0.336)
    assert result.metadata["prompt_optimisation"]["snapshots_retained"] == 3
    assert "Think step-by-step" in grok_client.calls[0]["prompt"]
    assert "Review the Grok-1 analysis" in deepseek_client.calls[0]["prompt"]


def test_processor_handles_textual_responses() -> None:
    grok_client = StubClient("Maintain caution; liquidity thin.")
    deepseek_client = StubClient("Risk high due to data gap.")

    processor = TradingDataProcessor(grok_client=grok_client, deepseek_client=deepseek_client)

    request = TradingDataRequest(snapshots=[_snapshot(1.0830, minutes=0), _snapshot(1.0825, minutes=5)])

    result = processor.process(request)

    assert "Maintain caution" in result.insights[0]
    assert any("Risk high" in risk for risk in result.risks)
    assert result.confidence is None
    assert result.metadata["grok"]["narrative"] == "Maintain caution; liquidity thin."


def test_feature_summary_captures_momentum_and_range() -> None:
    grok_client = StubClient("{}")
    deepseek_client = StubClient("{}")

    processor = TradingDataProcessor(grok_client=grok_client, deepseek_client=deepseek_client)

    request = TradingDataRequest(
        snapshots=[_snapshot(1.0800, minutes=10), _snapshot(1.0750, minutes=0)],
    )

    result = processor.process(request)

    momentum = (1.0800 - 1.0750) / 1.0750
    assert result.feature_summary["momentum_pct"] == pytest.approx(momentum)
    assert result.feature_summary["range_high"] >= result.feature_summary["range_low"]
    assert "mechanical_bias_mean" in result.feature_summary
    assert result.metadata["prompt_optimisation"]["snapshots_retained"] == 2
    assert "Optimisation stats" in grok_client.calls[0]["prompt"]


def test_processor_merges_macro_events_with_catalysts() -> None:
    grok_client = StubClient("{}")
    deepseek_client = StubClient("{}")

    processor = TradingDataProcessor(grok_client=grok_client, deepseek_client=deepseek_client)

    catalyst = EconomicCatalyst(
        pair="EUR-USD",
        observed_at=datetime(2024, 4, 12, 14, 0, tzinfo=timezone.utc),
        headline="Euro extends breakout",
        impact="High",
        market_focus=("EUR", "USD", "EUR-USD"),
        commentary="Momentum chase into NY close",
        metrics={"percentage_change": 1.1},
    )
    catalyst_mapping = {
        "pair": "GBP-USD",
        "observed_at": datetime(2024, 4, 12, 13, 30, tzinfo=timezone.utc).isoformat(),
        "headline": "Cable slips on data",
        "impact": "Medium",
        "market_focus": ["GBP", "USD"],
        "commentary": "Traders fade the surprise beat",
        "metrics": {"percentage_change": -0.4},
    }

    request = TradingDataRequest(
        snapshots=[_snapshot(1.0830, minutes=0), _snapshot(1.0825, minutes=5)],
        macro_events=["Existing macro event"],
        catalysts=[catalyst, catalyst_mapping],
    )

    result = processor.process(request)

    prompt = grok_client.calls[0]["prompt"]
    assert "Existing macro event" in prompt
    assert "Euro extends breakout" in prompt
    assert "Cable slips on data" in prompt

    optimisation_meta = result.metadata["prompt_optimisation"]
    assert optimisation_meta["macro_events_retained"] == 3
    assert optimisation_meta["macro_events_from_catalysts"] == 2
    assert optimisation_meta["catalysts_supplied"] == 2

