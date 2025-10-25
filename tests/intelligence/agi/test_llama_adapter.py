import sys
from types import SimpleNamespace

import pytest

from dynamic.intelligence.ai_apps import DynamicFusionAlgo, OllamaAdapter
from dynamic.intelligence.agi import DynamicAGIModel


def test_dynamic_agi_model_initialises_default_llama_adapter() -> None:
    model = DynamicAGIModel()

    assert isinstance(model.fusion, DynamicFusionAlgo)
    assert isinstance(model.fusion.llm_adapter, OllamaAdapter)
    assert model.fusion.llm_adapter.config.model == "llama3.3"
    assert model.fusion.reasoning_cache_size == 64


def test_dynamic_agi_model_can_disable_default_llama_adapter() -> None:
    model = DynamicAGIModel(llama_model=None)

    assert isinstance(model.fusion, DynamicFusionAlgo)
    assert model.fusion.llm_adapter is None


def test_dynamic_agi_model_respects_custom_llm_adapter() -> None:
    sentinel = OllamaAdapter()

    model = DynamicAGIModel(llm_adapter=sentinel)

    assert model.fusion.llm_adapter is sentinel
    assert model.fusion.llm_adapter.config.model == sentinel.config.model


def test_dynamic_agi_model_applies_ollama_overrides() -> None:
    model = DynamicAGIModel(
        ollama_host="http://ollama.internal:11434",
        ollama_options={"temperature": 0.2},
        ollama_headers={"X-Test": "true"},
        ollama_keep_alive=120.0,
        ollama_timeout=45.0,
        reasoning_cache_size=5,
    )

    adapter = model.fusion.llm_adapter
    assert isinstance(adapter, OllamaAdapter)
    assert adapter.config.host == "http://ollama.internal:11434"
    assert adapter.config.keep_alive == 120.0
    assert adapter.config.options["temperature"] == 0.2
    assert adapter.config.headers == {"X-Test": "true"}
    assert adapter.timeout == 45.0
    assert model.fusion.reasoning_cache_size == 5


def test_ollama_adapter_applies_model_override(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, object] = {}

    class DummyResponse:
        def __init__(self) -> None:
            self.status_code = 200

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, str]:
            return {"response": "refined reasoning"}

    def fake_post(url: str, json: dict[str, object], headers: dict[str, str] | None, timeout: float) -> DummyResponse:
        captured["url"] = url
        captured["json"] = json
        captured["headers"] = headers or {}
        captured["timeout"] = timeout
        return DummyResponse()

    dummy_requests = SimpleNamespace(post=fake_post, RequestException=Exception)
    monkeypatch.setitem(sys.modules, "requests", dummy_requests)

    adapter = OllamaAdapter()
    output = adapter.enhance_reasoning(
        action="BUY",
        confidence=0.7,
        base_reasoning="baseline",
        market_context={"volatility": 0.1},
        model="dynamic-llama",
    )

    assert output == "refined reasoning"
    assert captured["json"]["model"] == "dynamic-llama"
