import json
from datetime import datetime, timezone
from typing import Any

import pytest

from algorithms.python.market_intelligence import (
    MarketIntelligenceEngine,
    MarketIntelligenceReport,
    MarketIntelligenceRequest,
)
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot


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


def _snapshot() -> MarketSnapshot:
    return MarketSnapshot(
        symbol="EURUSD",
        timestamp=datetime(2024, 4, 12, 14, 0, tzinfo=timezone.utc),
        close=1.0835,
        rsi_fast=48.0,
        adx_fast=19.0,
        rsi_slow=51.0,
        adx_slow=17.0,
        pip_size=0.0001,
        pip_value=10.0,
        seasonal_bias=0.2,
        seasonal_confidence=0.6,
    )


def test_engine_combines_grok_and_deepseek_payloads() -> None:
    grok_payload = {
        "narrative": "Dollar softens as core CPI undershoots expectations.",
        "opportunities": ["Long EURUSD pullbacks"],
        "risks": ["Fed speakers push back"],
        "actions": ["Scale into longs on dips"],
        "confidence": 0.62,
        "alerts": ["Monitor NY open liquidity"],
    }
    deepseek_payload = {
        "risk_score": 0.4,
        "risks": ["Liquidity gap if equities sell off"],
        "recommended_actions": ["Cap position size at 1.5% equity"],
        "confidence_modifier": 0.8,
        "alerts": ["Watch US yields"],
    }

    grok_client = StubClient(response=json.dumps(grok_payload))
    deepseek_client = StubClient(response=json.dumps(deepseek_payload))

    engine = MarketIntelligenceEngine(grok_client=grok_client, deepseek_client=deepseek_client)

    request = MarketIntelligenceRequest(
        snapshot=_snapshot(),
        context={"session": "London"},
        macro_events=["US CPI", "ECB minutes"],
        watchlist=["EURUSD", "DXY"],
        open_positions=[ActivePosition(symbol="GBPUSD", direction=1, size=0.2, entry_price=1.2650)],
        analytics={"volatility_zscore": -0.7},
    )

    report = engine.generate_report(request)

    assert isinstance(report, MarketIntelligenceReport)
    assert report.narrative.startswith("Dollar softens")
    assert report.opportunities == ["Long EURUSD pullbacks"]
    assert any("Liquidity gap" in risk for risk in report.risks)
    assert any("Cap position size" in action for action in report.recommended_actions)
    assert report.confidence == pytest.approx(0.496)
    assert sorted(report.alerts) == ["Monitor NY open liquidity", "Watch US yields"]
    assert report.metadata["deepseek"]["risk_score"] == pytest.approx(0.4)
    assert report.metadata["prompt_optimisation"]["macro_events_retained"] == 2
    assert "Grok-1 intelligence" in deepseek_client.calls[0]["prompt"]


def test_engine_handles_textual_responses() -> None:
    grok_client = StubClient("Maintain neutral stance until FOMC guidance")
    deepseek_client = StubClient("Elevated risk: spreads widening")

    engine = MarketIntelligenceEngine(grok_client=grok_client, deepseek_client=deepseek_client)

    request = MarketIntelligenceRequest(snapshot=_snapshot())

    report = engine.generate_report(request)

    assert "Maintain neutral stance" in report.narrative
    assert report.alerts == []
    assert report.raw_response is not None
    assert "Elevated risk" in report.metadata["deepseek"].get("rationale", "")


def test_prompts_request_step_by_step_reasoning() -> None:
    grok_client = StubClient("{}")
    deepseek_client = StubClient("{}")
    engine = MarketIntelligenceEngine(grok_client=grok_client, deepseek_client=deepseek_client)
    request = MarketIntelligenceRequest(snapshot=_snapshot(), macro_events=["NFP"], analytics={"beta": 0.5})

    payload, meta = engine._prepare_prompt_payload(request)
    grok_prompt = engine._build_grok_prompt(payload, meta)
    deepseek_prompt = engine._build_deepseek_prompt(payload, {"narrative": "Test"}, meta)

    assert "think step-by-step" in grok_prompt
    assert "Work step-by-step" in deepseek_prompt
    assert "Quantitative analytics" in deepseek_prompt
    assert "All relevant context supplied" in grok_prompt
    assert "All relevant context supplied" in deepseek_prompt


def test_prompt_payload_optimises_context_volume() -> None:
    engine = MarketIntelligenceEngine(
        grok_client=StubClient("{}"),
        deepseek_client=StubClient("{}"),
        max_macro_events=3,
        max_watchlist=2,
        max_positions=1,
        analytics_top_k=2,
    )
    request = MarketIntelligenceRequest(
        snapshot=_snapshot(),
        macro_events=["US CPI", "ECB minutes", "BoE presser", "FOMC minutes"],
        watchlist=["EURUSD", "DXY", "USDJPY", "EURUSD"],
        open_positions=[
            ActivePosition(symbol="GBPUSD", direction=1, size=0.2, entry_price=1.2650),
            ActivePosition(symbol="USDJPY", direction=-1, size=0.1, entry_price=152.30),
        ],
        analytics={"volatility_zscore": -0.7, "carry": 1.2, "momentum": -2.4},
        context={"session": "London", "empty": ""},
    )

    payload, meta = engine._prepare_prompt_payload(request)

    assert len(payload["macro_events"]) == 3
    assert meta["macro_events_omitted"] == 1
    assert payload["watchlist"] == ["EURUSD", "DXY"]
    assert meta["watchlist_omitted"] == 1
    assert len(payload["open_positions"]) == 1
    assert meta["open_positions_omitted"] == 1
    assert set(payload["analytics"].keys()) <= {"carry", "momentum", "volatility_zscore"}
    assert len(payload["analytics"]) == 2
    assert meta["analytics_omitted"] == 1
    assert meta["context_pruned"] == 1
