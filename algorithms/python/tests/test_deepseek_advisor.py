from datetime import datetime, timezone
import json

import pytest

from algorithms.python.deepseek_advisor import DeepSeekAdvisor, DeepSeekAPIClient
from algorithms.python.grok_advisor import AdvisorFeedback
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot, TradeSignal


class StubClient:
    def __init__(self, response: str) -> None:
        self.response = response
        self.calls: list[dict[str, object]] = []

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


def test_deepseek_advisor_normalises_reasoning_blocks() -> None:
    response = (
        "<think>Liquidity running on prior highs. Watch USD news.\n</think>"
        "{\"final\": {\"adjusted_confidence\": 0.58, \"rationale\": \"Favour long setup\", \"alerts\": [\"Tighten stop\"]}}"
    )
    client = StubClient(response)
    advisor = DeepSeekAdvisor(client=client)

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
    assert feedback.adjusted_signal.confidence == pytest.approx(0.58)
    assert feedback.metadata["source"] == "deepseek-v3"
    assert feedback.metadata["model"] == "deepseek-v3"
    assert "analysis" in feedback.metadata and "Liquidity" in feedback.metadata["analysis"]
    assert feedback.metadata["alerts"] == ["Tighten stop"]
    assert client.calls and client.calls[0]["nucleus_p"] == advisor.nucleus_p


def test_deepseek_api_client_merges_reasoning(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "choices": [
            {
                "message": {
                    "content": "{\"adjusted_confidence\": 0.51, \"rationale\": \"Align with London flow\"}",
                    "reasoning_content": "Assessing seasonal bias before confirming entry.",
                }
            }
        ]
    }

    class DummyResponse:
        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def read(self) -> bytes:
            return json.dumps(payload).encode("utf-8")

    def fake_urlopen(request, timeout):  # type: ignore[override]
        return DummyResponse()

    monkeypatch.setattr("algorithms.python.deepseek_advisor.urlopen", fake_urlopen)

    client = DeepSeekAPIClient(api_key="test", base_url="https://example.com")
    result = client.complete("Prompt", temperature=0.2, max_tokens=128, nucleus_p=0.9)

    assert result.startswith("<think>")
    assert "Assessing seasonal bias" in result
    assert "adjusted_confidence" in result
