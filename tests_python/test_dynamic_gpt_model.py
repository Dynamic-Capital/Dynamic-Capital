"""Unit tests for the dynamic GPT model utilities."""

import pytest

torch = pytest.importorskip("torch")

from dynamic_gpt_model import (
    GPTModelBuilder,
    GPTStageConfig,
    build_gpt_model,
    build_gpt_model_from_stages,
    instantiate_torch_model,
)


def test_build_and_instantiate_forward_pass() -> None:
    builder = GPTModelBuilder(base_name="unit-test", share_embeddings=True, use_bias=False)
    config = builder.build(
        depth=2,
        model_dim=32,
        num_heads=4,
        feedforward_ratio=2.0,
        vocab_size=128,
        max_position_embeddings=64,
        dropout=0.0,
        attention_dropout=0.0,
        residual_dropout=0.0,
    )

    model = instantiate_torch_model(config)
    input_ids = torch.randint(0, config.embedding.vocab_size, (3, 16))
    logits = model(input_ids)

    assert logits.shape == (3, 16, config.embedding.vocab_size)
    assert model.lm_head.weight.data_ptr() == model.token_embeddings.weight.data_ptr()


def test_stage_builder_creates_expected_depth() -> None:
    stages = (
        GPTStageConfig(depth=1, model_dim=48, num_heads=6, feedforward_ratio=2.0),
        GPTStageConfig(depth=2, model_dim=48, num_heads=6, feedforward_ratio=3.0),
    )

    config = build_gpt_model_from_stages(
        name="staged",
        stages=stages,
        vocab_size=256,
        max_position_embeddings=32,
        dropout=0.0,
        share_embeddings=False,
        final_layer_norm=True,
        use_bias=True,
    )

    model = instantiate_torch_model(config)
    assert len(model.blocks) == sum(stage.depth for stage in stages)
    assert not config.share_embeddings


@torch.no_grad()
def test_generation_appends_tokens() -> None:
    torch.manual_seed(42)
    config = build_gpt_model(
        depth=1,
        model_dim=16,
        num_heads=4,
        feedforward_ratio=2.0,
        vocab_size=32,
        max_position_embeddings=32,
    )
    model = instantiate_torch_model(config)
    input_ids = torch.zeros((1, 4), dtype=torch.long)
    generated = model.generate(input_ids, max_new_tokens=3, top_k=5)

    assert generated.shape == (1, 7)
    assert torch.all(generated[:, :4] == 0)


def test_instantiate_with_device_and_dtype() -> None:
    config = build_gpt_model(
        depth=1,
        model_dim=8,
        num_heads=2,
        feedforward_ratio=2.0,
        vocab_size=16,
        max_position_embeddings=16,
    )

    model = instantiate_torch_model(config, device="cpu", dtype=torch.float64)
    param = next(model.parameters())

    assert param.device.type == "cpu"
    assert param.dtype == torch.float64


def test_instantiate_with_string_dtype_alias() -> None:
    config = build_gpt_model(
        depth=1,
        model_dim=8,
        num_heads=2,
        feedforward_ratio=2.0,
        vocab_size=16,
        max_position_embeddings=16,
    )

    model = instantiate_torch_model(config, dtype="bf16")
    param = next(model.parameters())

    assert param.dtype == torch.bfloat16


def test_instantiate_with_unknown_dtype_alias_raises() -> None:
    config = build_gpt_model(
        depth=1,
        model_dim=8,
        num_heads=2,
        feedforward_ratio=2.0,
        vocab_size=16,
        max_position_embeddings=16,
    )

    with pytest.raises((ValueError, TypeError)):
        instantiate_torch_model(config, dtype="not-a-real-dtype")
