from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.deepseek_advisor import (
    DeepSeekAdvisor,
    DeepSeekClient,
    advisor_from_environment,
)
from algorithms.python.trade_logic import ActivePosition, MarketSnapshot, TradeSignal


class FakeTransport:
    def __init__(self, status: int, payload: dict[str, Any]) -> None:
        self.status = status
        self.payload = payload
        self.calls: list[dict[str, Any]] = []

    def __call__(self, url: str, data: bytes, headers: dict[str, str], timeout: float) -> tuple[int, str]:
        body = json.loads(data.decode("utf-8"))
        self.calls.append(
            {
                "url": url,
                "body": body,
                "headers": headers,
                "timeout": timeout,
            }
        )
        return self.status, json.dumps(self.payload)


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
        timestamp=datetime(2024, 4, 1, 12, 0, tzinfo=timezone.utc),
        close=1.1025,
        rsi_fast=55.0,
        adx_fast=20.0,
        rsi_slow=52.0,
        adx_slow=18.0,
        pip_size=0.0001,
        pip_value=10.0,
    )


def test_deepseek_client_marshals_openai_payload() -> None:
    transport = FakeTransport(
        200,
        {
            "choices": [
                {
                    "message": {"content": "{\"adjusted_confidence\": 0.48}"},
                }
            ]
        },
    )
    client = DeepSeekClient(api_key="test", _request_handler=transport)

    response = client.complete("Review", temperature=0.2, max_tokens=128, nucleus_p=0.85)

    assert response == '{"adjusted_confidence": 0.48}'
    assert transport.calls, "expected request to be dispatched"
    call = transport.calls[0]
    assert call["url"].endswith("/chat/completions")
    assert call["body"]["model"] == "deepseek-chat"
    assert call["body"]["messages"][0]["content"] == "Review"
    assert call["body"]["temperature"] == pytest.approx(0.2)
    assert call["body"]["top_p"] == pytest.approx(0.85)
    assert call["body"]["max_tokens"] == 128
    assert call["headers"]["Authorization"].startswith("Bearer test")


def test_deepseek_client_raises_on_http_error() -> None:
    transport = FakeTransport(500, {"error": {"message": "boom"}})
    client = DeepSeekClient(api_key="test", _request_handler=transport)

    with pytest.raises(RuntimeError):
        client.complete("Check", temperature=0.3, max_tokens=64, nucleus_p=0.9)


def test_deepseek_advisor_adjusts_confidence_and_metadata() -> None:
    client = StubClient('{"adjusted_confidence": 0.51, "rationale": "Macro support"}')
    advisor = DeepSeekAdvisor(client=client, temperature=0.1, nucleus_p=0.92, max_tokens=192)

    signal = TradeSignal(direction=1, confidence=0.6, votes=4, neighbors_considered=6)
    feedback = advisor.review(
        snapshot=_snapshot(),
        signal=signal,
        context={"final_confidence": 0.6},
        open_positions=[ActivePosition(symbol="GBPUSD", direction=-1, size=0.2, entry_price=1.0950)],
    )

    assert feedback is not None
    assert feedback.adjusted_signal is not None
    assert feedback.adjusted_signal.confidence == pytest.approx(0.51)
    assert feedback.metadata["source"] == "deepseek"
    assert feedback.metadata["rationale"] == "Macro support"
    assert client.calls and client.calls[0]["temperature"] == pytest.approx(0.1)


def test_deepseek_advisor_handles_plain_text_response() -> None:
    client = StubClient("Hold position; watch ECB minutes.")
    advisor = DeepSeekAdvisor(client=client)

    signal = TradeSignal(direction=-1, confidence=0.55, votes=3, neighbors_considered=5)
    feedback = advisor.review(
        snapshot=_snapshot(),
        signal=signal,
        context={"final_confidence": 0.55},
        open_positions=[],
    )

    assert feedback is not None
    assert feedback.adjusted_signal is None
    assert feedback.metadata["source"] == "deepseek"
    assert "Hold position" in feedback.metadata["rationale"]


def test_advisor_from_environment_reads_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEEPSEEK_API_KEY", "secret")
    monkeypatch.setenv("DEEPSEEK_API_BASE_URL", "https://example.test/api")
    monkeypatch.setenv("DEEPSEEK_MODEL", "deepseek-reasoner")
    monkeypatch.setenv("DEEPSEEK_TIMEOUT", "12.5")
    monkeypatch.setenv("DEEPSEEK_TEMPERATURE", "0.17")
    monkeypatch.setenv("DEEPSEEK_TOP_P", "0.71")
    monkeypatch.setenv("DEEPSEEK_MAX_TOKENS", "512")

    advisor = advisor_from_environment()

    assert isinstance(advisor, DeepSeekAdvisor)
    assert isinstance(advisor.client, DeepSeekClient)
    assert advisor.client.base_url == "https://example.test/api"
    assert advisor.client.model == "deepseek-reasoner"
    assert advisor.client.timeout == pytest.approx(12.5)
    assert advisor.temperature == pytest.approx(0.17)
    assert advisor.nucleus_p == pytest.approx(0.71)
    assert advisor.max_tokens == 512
