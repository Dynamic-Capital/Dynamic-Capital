from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_deep_learning import (  # noqa: E402 - runtime path mutation for tests
    DynamicDeepLearningEngine,
    DynamicLayerEngineConfig,
    LayerBlueprint,
)


def test_layer_engine_config_builds_model_spec() -> None:
    config = DynamicLayerEngineConfig(
        input_dim=6,
        input_layers=[LayerBlueprint(name="ingest", units=8, activation="relu")],
        hidden_layers=[{"name": "compress", "units": 4, "activation": "tanh"}],
        output_layers=[LayerBlueprint(name="decide", units=2, activation="softmax")],
        learning_rate=0.05,
        momentum=0.8,
        l2_regularisation=0.01,
        gradient_clip=1.5,
        seed=7,
        shuffle_training=False,
    )

    spec = config.build_model_spec()

    assert spec.input_dim == 6
    assert spec.output_dim == 2
    assert pytest.approx(spec.learning_rate, rel=1e-9) == 0.05
    assert pytest.approx(spec.momentum, rel=1e-9) == 0.8
    assert pytest.approx(spec.l2_regularisation, rel=1e-9) == 0.01
    assert spec.gradient_clip == 1.5
    assert spec.seed == 7
    assert spec.shuffle_training is False
    assert [layer.name for layer in spec.layers] == ["ingest", "compress", "decide"]
    assert spec.layers[0].input_dim == 6
    assert spec.layers[0].output_dim == 8
    assert spec.layers[1].input_dim == 8
    assert spec.layers[1].output_dim == 4
    assert spec.layers[-1].activation == "softmax"

    engine = DynamicDeepLearningEngine(spec)
    prediction = engine.predict([0.0] * spec.input_dim)
    assert len(prediction) == 2


def test_layer_engine_config_requires_output_layers() -> None:
    with pytest.raises(ValueError):
        DynamicLayerEngineConfig(input_dim=3, output_layers=())


def test_layer_blueprint_accepts_mappings() -> None:
    config = DynamicLayerEngineConfig(
        input_dim=2,
        output_layers=[{"name": "score", "units": 1, "activation": "sigmoid"}],
    )

    spec = config.build_model_spec()

    assert spec.input_dim == 2
    assert spec.output_dim == 1
