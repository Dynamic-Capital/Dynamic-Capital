from pathlib import Path
import sys

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_multi_ll import (  # noqa: E402  - imported after sys.path mutation
    DynamicMultiLLEngine,
    LLModelDescriptor,
    MultiLLModel,
    MultiLLPrompt,
    MultiLLResponse,
)


def test_dynamic_multi_ll_consensus_selection() -> None:
    model = MultiLLModel(
        (
            LLModelDescriptor(name="Atlas", provider="OpenAI", weight=1.2, metadata={"tier": "prime"}),
            LLModelDescriptor(name="Zephyr", provider="Anthropic", weight=0.8),
        ),
        consensus_threshold=0.5,
    )
    engine = DynamicMultiLLEngine(model)

    prompt = MultiLLPrompt(task="Summarise quarterly performance trends.")

    def adapter(descriptor: LLModelDescriptor, _: MultiLLPrompt) -> MultiLLResponse:
        confidence = 0.7 if descriptor.weight < 1.0 else 0.8
        return MultiLLResponse(
            model_name=descriptor.name,
            provider=descriptor.provider,
            content="Revenue grew 12% quarter-over-quarter while margins widened.",
            confidence=confidence,
        )

    result = engine.generate(prompt, adapter)

    assert result.aggregate.strategy == "consensus"
    assert result.aggregate.content == "Revenue grew 12% quarter-over-quarter while margins widened."
    assert set(result.supporting_models) == {"Atlas", "Zephyr"}
    assert result.aggregate.metadata["consensus_ratio"] >= 0.5
    assert result.aggregate.confidence >= 0.7


def test_dynamic_multi_ll_blended_strategy_when_responses_diverge() -> None:
    model = MultiLLModel(
        (
            LLModelDescriptor(name="Atlas", provider="OpenAI", weight=1.0),
            LLModelDescriptor(name="Nova", provider="Google", weight=1.0),
            LLModelDescriptor(name="Odin", provider="Mistral", weight=1.0),
        ),
        consensus_threshold=0.7,
    )
    engine = DynamicMultiLLEngine(model)

    prompt = MultiLLPrompt(task="Outline the key operational risks for the next quarter.")

    responses = {
        "Atlas": ("Supply constraints remain the top execution risk.", 0.6),
        "Nova": ("Demand volatility is increasing across core regions.", 0.5),
        "Odin": ("Regulatory scrutiny continues to intensify across markets.", 0.55),
    }

    def adapter(descriptor: LLModelDescriptor, _: MultiLLPrompt) -> MultiLLResponse:
        content, confidence = responses[descriptor.name]
        return MultiLLResponse(
            model_name=descriptor.name,
            provider=descriptor.provider,
            content=content,
            confidence=confidence,
        )

    result = engine.generate(prompt, adapter)

    assert result.aggregate.strategy == "blended"
    assert result.aggregate.content.count("\n") >= 2
    for clause in (
        "Supply constraints remain the top execution risk.",
        "Demand volatility is increasing across core regions.",
        "Regulatory scrutiny continues to intensify across markets.",
    ):
        assert clause in result.aggregate.content
    assert set(result.supporting_models) == {"Atlas", "Nova", "Odin"}
    assert result.aggregate.confidence == pytest.approx(0.375, rel=1e-6)


def test_dynamic_multi_ll_calibrate_updates_weights() -> None:
    model = MultiLLModel(
        (
            LLModelDescriptor(name="Helios", provider="openai", weight=1.0),
            LLModelDescriptor(name="Luna", provider="anthropic", weight=1.0),
        ),
        consensus_threshold=0.4,
    )
    engine = DynamicMultiLLEngine(model)

    updated = engine.calibrate({"Helios": 0.4, "Luna": -0.2})

    helios = updated.descriptor_for("Helios")
    luna = updated.descriptor_for("Luna")

    assert helios.weight == pytest.approx(1.4)
    assert luna.weight == pytest.approx(0.8)
    assert engine.model is updated

