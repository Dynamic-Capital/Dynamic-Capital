from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from dynamic_deep_learning import (  # noqa: E402 - runtime path mutation for tests
    DynamicAgent,
    DynamicBot,
    DynamicBuilder,
    DynamicCrawler,
    DynamicDeepLearningEngine,
    DynamicHelper,
    DynamicKeeper,
    DynamicLayer,
    DynamicLayerEngineConfig,
    DynamicModel,
    LayerBlueprint,
    TrainingSample,
    generate_input_layers,
    generate_domain_input_layers,
    build_dynamic_ai_input_layers,
    build_dynamic_agi_input_layers,
    build_dynamic_ags_input_layers,
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


def test_generate_input_layers_progressive_stack() -> None:
    layers = generate_input_layers(
        input_dim=5,
        depth=3,
        expansion_factor=2.0,
        activation="tanh",
        dropout=0.1,
        prefix="ingest",
        max_units=32,
    )

    assert [layer.name for layer in layers] == ["ingest_1", "ingest_2", "ingest_3"]
    assert [layer.units for layer in layers] == [10, 20, 32]
    assert all(layer.activation == "tanh" for layer in layers)
    assert all(pytest.approx(0.1, rel=1e-9) == layer.dropout for layer in layers)

    config = DynamicLayerEngineConfig(
        input_dim=5,
        input_layers=layers,
        output_layers=[LayerBlueprint(name="decide", units=2, activation="softmax")],
    )

    spec = config.build_model_spec()

    assert spec.layers[0].input_dim == 5
    assert spec.layers[0].output_dim == 10
    assert spec.layers[1].input_dim == 10
    assert spec.layers[2].output_dim == 32


def test_dynamic_ai_domain_input_layers_profile() -> None:
    layers = build_dynamic_ai_input_layers(input_dim=16)

    assert [layer.name for layer in layers] == [
        "dai_signal_ingest",
        "dai_context_fusion",
        "dai_alignment_gate",
    ]
    assert [layer.units for layer in layers] == [24, 42, 36]
    assert [layer.activation for layer in layers] == ["relu", "tanh", "relu"]
    assert [pytest.approx(layer.dropout, rel=1e-9) for layer in layers] == [
        0.05,
        0.1,
        0.05,
    ]


def test_dynamic_agi_domain_input_layers_profile() -> None:
    layers = build_dynamic_agi_input_layers(input_dim=20)

    assert [layer.name for layer in layers] == [
        "dagi_signal_intake",
        "dagi_cognitive_bridge",
        "dagi_reasoning_core",
        "dagi_alignment_hub",
    ]
    assert [layer.units for layer in layers] == [36, 49, 59, 53]
    assert [layer.activation for layer in layers] == ["relu", "tanh", "relu", "tanh"]
    assert [pytest.approx(layer.dropout, rel=1e-9) for layer in layers] == [
        0.05,
        0.1,
        0.1,
        0.05,
    ]


def test_dynamic_ags_domain_input_layers_profile() -> None:
    layers = build_dynamic_ags_input_layers(input_dim=12)

    assert [layer.name for layer in layers] == [
        "dags_context_intake",
        "dags_policy_composer",
        "dags_governance_gate",
    ]
    assert [layer.units for layer in layers] == [14, 14, 11]
    assert [layer.activation for layer in layers] == ["relu", "tanh", "sigmoid"]
    assert [pytest.approx(layer.dropout, rel=1e-9) for layer in layers] == [
        0.05,
        0.05,
        0.0,
    ]


def test_generate_domain_input_layers_supports_aliases() -> None:
    aliased = generate_domain_input_layers("DAGI", input_dim=20)
    canonical = build_dynamic_agi_input_layers(input_dim=20)

    assert [layer.name for layer in aliased] == [layer.name for layer in canonical]
    assert [layer.units for layer in aliased] == [layer.units for layer in canonical]


def test_generate_domain_input_layers_invalid_domain() -> None:
    with pytest.raises(ValueError):
        generate_domain_input_layers("unknown", input_dim=10)


def test_generate_domain_input_layers_requires_positive_input_dim() -> None:
    with pytest.raises(ValueError):
        build_dynamic_ai_input_layers(0)


def test_dynamic_layer_converts_to_blueprint_and_spec() -> None:
    layer = DynamicLayer(name="fusion", units=4, activation="tanh", dropout=0.1)

    blueprint = layer.to_blueprint()
    spec = layer.to_spec(3)

    assert blueprint.name == "fusion"
    assert spec.input_dim == 3
    assert spec.output_dim == 4
    assert spec.activation == "tanh"


def test_dynamic_model_from_layer_groups() -> None:
    model = DynamicModel.from_layer_groups(
        input_dim=3,
        input_layers=[LayerBlueprint(name="ingest", units=5, activation="relu")],
        output_layers=[LayerBlueprint(name="decide", units=2, activation="softmax")],
        learning_rate=0.02,
    )

    assert model.spec.input_dim == 3
    assert [layer.name for layer in model.spec.layers] == ["ingest", "decide"]
    assert "input_dim=3" in model.summary()


def test_dynamic_helper_and_builder_pipeline() -> None:
    helper = DynamicHelper(domain="dynamic_ai")
    builder = DynamicBuilder(input_dim=16, helper=helper)

    model = builder.build(
        output_layers=[LayerBlueprint(name="decision", units=3, activation="softmax")]
    )

    assert model.spec.layers[0].name == "dai_signal_ingest"
    assert model.spec.layers[-1].name == "decision"


def test_dynamic_keeper_registers_custom_domain() -> None:
    keeper = DynamicKeeper()

    keeper.register_domain(
        "custom_domain",
        [
            {
                "name": "custom_stage",
                "expansion": 1.0,
                "activation": "relu",
                "dropout": 0.0,
                "max_units": 32,
            }
        ],
    )

    assert keeper.has_domain("custom_domain")
    layers = keeper.build_input_layers("custom_domain", input_dim=10)
    assert [layer.name for layer in layers] == ["custom_stage"]
    assert layers[0].units == 10


def test_dynamic_agent_bot_crawler_workflow() -> None:
    helper = DynamicHelper(default_depth=1, expansion_factor=1.0, prefix="entry")
    builder = DynamicBuilder(input_dim=2, helper=helper)

    model = builder.build(
        hidden_layers=[LayerBlueprint(name="compress", units=3, activation="tanh")],
        output_layers=[LayerBlueprint(name="output", units=1, activation="sigmoid")],
        learning_rate=0.1,
        shuffle_training=False,
    )

    agent = DynamicAgent(model=model)
    dataset = [
        TrainingSample(features=(0.0, 0.0), target=(0.0,)),
        TrainingSample(features=(1.0, 1.0), target=(1.0,)),
    ]
    bot = DynamicBot(agent=agent)

    metrics = bot.run_training_schedule([dataset], epochs=2, batch_size=2)

    assert len(metrics) == 2
    assert metrics[0].epoch == 1

    evaluation = bot.evaluate(dataset)

    assert evaluation.note == "evaluation"

    crawler = DynamicCrawler(agent=agent)
    predictions = crawler.crawl_predictions([(0.0, 0.0), (1.0, 1.0)])

    assert len(predictions) == 2
    assert isinstance(predictions[0], tuple)
    assert "DynamicDeepLearningEngine" in crawler.crawl_summary()
