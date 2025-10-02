"""Tests for the dynamic transformer architecture builder."""

from __future__ import annotations

from dynamic_transformer_architecture import (
    DynamicTransformerBuilder,
    build_transformer_architecture,
)


def test_builder_add_stage_scales_dimensions() -> None:
    builder = DynamicTransformerBuilder(
        "Research Core",
        model_dim=512,
        num_heads=8,
        vocab_size=48_000,
        max_position_embeddings=1_024,
        ff_multiplier=3.5,
        attention_dropout=0.1,
        residual_dropout=0.05,
        activation="silu",
    )

    blocks = builder.add_stage(
        depth=3,
        width_scale=1.25,
        head_scale=1.0,
        ff_scale=1.1,
        dropout=0.12,
        rotary_percentage=0.25,
    )

    assert len(blocks) == 3
    assert all(block.model_dim % block.num_heads == 0 for block in blocks)
    assert blocks[0].feedforward_ratio > 3.5  # scaled by ff_scale
    assert blocks[0].activation == "silu"

    builder.update_metadata({"profile": "research", "region": "global"})
    architecture = builder.build()

    assert architecture.depth == 3
    assert architecture.embedding.model_dim == 512
    assert architecture.parameter_estimate > 0
    assert architecture.metadata["profile"] == "research"


def test_build_transformer_architecture_from_profile() -> None:
    profile = {
        "name": "Dynamic Sequence Model",
        "model_dim": 768,
        "num_heads": 12,
        "vocab_size": 64_000,
        "max_position_embeddings": 2_560,
        "ff_multiplier": 4.0,
        "embedding_dropout": 0.01,
        "attention_dropout": 0.08,
        "residual_dropout": 0.12,
        "activation": "gelu",
        "stages": [
            {"depth": 10, "width_scale": 1.0},
            {"depth": 2, "width_scale": 1.5, "head_scale": 1.25, "ff_scale": 1.2},
        ],
        "metadata": {"owner": "ml-platform"},
    }

    architecture = build_transformer_architecture(profile)

    assert architecture.name == "Dynamic Sequence Model"
    assert architecture.depth == 12
    assert architecture.blocks[-1].model_dim >= architecture.blocks[0].model_dim
    assert architecture.blocks[-1].num_heads >= architecture.blocks[0].num_heads
    assert architecture.parameter_estimate > architecture.embedding.vocab_size * architecture.embedding.model_dim
    assert architecture.metadata["owner"] == "ml-platform"
