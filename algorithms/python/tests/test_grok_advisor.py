import json
from datetime import datetime, timezone
from typing import Any

import pytest

from algorithms.python.grok_advisor import AdvisorFeedback, DualLLMAdvisor, GrokAdvisor
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot, TradeSignal


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
        symbol="GBPUSD",
        timestamp=datetime(2024, 3, 19, 7, 0, tzinfo=timezone.utc),
        close=1.2755,
        rsi_fast=55.0,
        adx_fast=21.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
        seasonal_bias=0.4,
        seasonal_confidence=0.7,
    )


def test_grok_advisor_parses_confidence_adjustment() -> None:
    client = StubClient('{"adjusted_confidence": 0.45, "rationale": "Macro headwinds"}')
    advisor = GrokAdvisor(client=client, temperature=0.1, nucleus_p=0.95, max_tokens=128)

    signal = TradeSignal(direction=1, confidence=0.6, votes=5, neighbors_considered=8)
    feedback = advisor.review(
        snapshot=_snapshot(),
        signal=signal,
        context={"final_confidence": 0.6},
        open_positions=[ActivePosition(symbol="EURUSD", direction=1, size=0.2, entry_price=1.09)],
    )

    assert feedback is not None
    assert isinstance(feedback, AdvisorFeedback)
    assert feedback.adjusted_signal is not None
    assert feedback.adjusted_signal.confidence == pytest.approx(0.45)
    assert feedback.metadata["rationale"] == "Macro headwinds"
    assert client.calls and "GBPUSD" in client.calls[0]["prompt"]


def test_grok_advisor_handles_text_response() -> None:
    client = StubClient("Maintain current plan; monitor ECB guidance.")
    advisor = GrokAdvisor(client=client)

    signal = TradeSignal(direction=-1, confidence=0.55, votes=4, neighbors_considered=6)
    feedback = advisor.review(
        snapshot=_snapshot(),
        signal=signal,
        context={"final_confidence": 0.55},
        open_positions=[],
    )

    assert feedback is not None
    assert feedback.adjusted_signal is None
    assert "Maintain current plan" in feedback.metadata["rationale"]
    assert feedback.raw_response.startswith("Maintain")


def test_dual_llm_advisor_applies_deepseek_modifier() -> None:
    grok_client = StubClient('{"adjusted_confidence": 0.64, "alerts": ["Liquidity concentration"]}')
    deepseek_client = StubClient('{"confidence_modifier": 0.75, "alerts": ["Overnight funding risk"], "rationale": "Thin Asia session"}')

    advisor = DualLLMAdvisor(grok_client=grok_client, deepseek_client=deepseek_client)

    signal = TradeSignal(direction=1, confidence=0.7, votes=5, neighbors_considered=8)
    snapshot = _snapshot()
    open_positions = [
        ActivePosition(symbol="EURUSD", direction=-1, size=0.15, entry_price=1.09),
    ]

    feedback = advisor.review(
        snapshot=snapshot,
        signal=signal,
        context={"final_confidence": 0.7},
        open_positions=open_positions,
    )

    assert feedback is not None
    assert feedback.adjusted_signal is not None
    assert feedback.adjusted_signal.confidence == pytest.approx(0.48)

    metadata = feedback.metadata
    assert metadata["grok"]["alerts"] == ["Liquidity concentration"]
    assert metadata["deepseek"]["applied_modifier"] == pytest.approx(0.75)
    assert "Overnight funding risk" in metadata["alerts"]
    assert deepseek_client.calls and "DeepSeek-V3" in deepseek_client.calls[0]["prompt"]

    assert feedback.raw_response is not None
    payload = json.loads(feedback.raw_response)
    assert len(payload) == 2
    assert {entry["model"] for entry in payload} == {"grok", "deepseek"}


def test_dual_llm_advisor_handles_textual_deepseek_feedback() -> None:
    grok_client = StubClient('{"adjusted_confidence": 0.52, "rationale": "Strong momentum"}')
    deepseek_client = StubClient("Risk high due to overlapping news windows")

    advisor = DualLLMAdvisor(grok_client=grok_client, deepseek_client=deepseek_client, risk_weight=0.4)

    signal = TradeSignal(direction=-1, confidence=0.6, votes=4, neighbors_considered=6)
    feedback = advisor.review(
        snapshot=_snapshot(),
        signal=signal,
        context={"final_confidence": 0.6},
        open_positions=[],
    )

    assert feedback is not None
    assert feedback.adjusted_signal is not None
    # DeepSeek does not supply a numeric modifier, so Grok's confidence is preserved.
    assert feedback.adjusted_signal.confidence == pytest.approx(0.52)
    assert "Risk high" in feedback.metadata["deepseek"]["rationale"]
    # Alerts should fall back to Grok-only notes when DeepSeek provides prose.
    assert feedback.metadata.get("alerts") == feedback.metadata["grok"].get("alerts")
