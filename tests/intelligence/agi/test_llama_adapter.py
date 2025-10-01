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
