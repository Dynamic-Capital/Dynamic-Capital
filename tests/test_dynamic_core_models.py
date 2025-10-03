from __future__ import annotations

import pytest

from core.dynamic_core_models import (
    CORE_BLUEPRINTS,
    CORE_MODEL_FACTORIES,
    CoreMetricDefinition,
    DynamicAICoreModel,
    DynamicCoreModel,
    build_all_core_models,
    build_core_model,
)


def _baseline_payload() -> dict[str, float]:
    return {
        "analysis_accuracy": 0.9,
        "fusion_cohesion": 0.82,
        "risk_alignment": 0.79,
        "automation_readiness": 0.75,
        "auditability": 0.88,
    }


def test_dynamic_ai_core_snapshot_includes_all_metrics() -> None:
    model = DynamicAICoreModel()
    snapshot = model.record(_baseline_payload())

    assert snapshot.domain == "Dynamic AI"
    assert snapshot.momentum == pytest.approx(0.0)
    assert 0.0 < snapshot.composite <= 1.0
    assert {metric.key for metric in snapshot.metrics} == set(_baseline_payload())


def test_dynamic_ai_core_allows_incremental_updates() -> None:
    model = DynamicAICoreModel()
    first = model.record(_baseline_payload())
    second = model.record({"analysis_accuracy": 0.95, "automation_readiness": 0.7})

    metrics = {metric.key: metric for metric in second.metrics}
    assert metrics["analysis_accuracy"].value == pytest.approx(0.95)
    assert metrics["automation_readiness"].value == pytest.approx(0.7)
    assert metrics["fusion_cohesion"].value == pytest.approx(
        {metric.key: metric for metric in first.metrics}["fusion_cohesion"].value
    )
    assert second.momentum != pytest.approx(0.0)


def test_dynamic_ai_core_metadata_is_exposed() -> None:
    model = DynamicAICoreModel()
    snapshot = model.record(
        _baseline_payload(),
        metadata={"analysis_accuracy": {"sources": 3}},
    )

    accuracy = next(metric for metric in snapshot.metrics if metric.key == "analysis_accuracy")
    assert accuracy.metadata is not None
    assert accuracy.metadata["sources"] == 3


def test_dynamic_core_requires_all_metrics_on_first_record() -> None:
    model = DynamicAICoreModel()

    with pytest.raises(KeyError):
        model.record({"analysis_accuracy": 0.9})


def test_dynamic_core_supports_lower_orientation() -> None:
    latency_definition = CoreMetricDefinition(
        key="latency",
        label="Latency",
        orientation="lower",
        target=0.3,
        warning=0.5,
        critical=0.7,
    )
    model = DynamicCoreModel("Test", [latency_definition])

    first = model.record({"latency": 0.4})
    metric = first.metrics[0]
    assert metric.status == "watch"
    assert metric.priority > 0

    second = model.record({"latency": 0.25})
    metric2 = second.metrics[0]
    assert metric2.status == "healthy"
    assert metric2.priority == pytest.approx(0.0)


def test_dynamic_core_priorities_surface_gaps() -> None:
    model = DynamicAICoreModel()
    model.record(_baseline_payload())
    degraded = {
        "analysis_accuracy": 0.62,
        "fusion_cohesion": 0.6,
        "risk_alignment": 0.92,
        "automation_readiness": 0.58,
        "auditability": 0.86,
    }
    model.record(degraded)

    priorities = model.priorities()
    assert priorities
    assert priorities[0].key in {"analysis_accuracy", "automation_readiness", "fusion_cohesion"}
    assert all(
        priorities[index].priority >= priorities[index + 1].priority
        for index in range(len(priorities) - 1)
    )


def test_dynamic_core_rejects_unknown_metric_keys() -> None:
    model = DynamicCoreModel(
        "Custom",
        [
            CoreMetricDefinition(key="alpha", label="Alpha"),
        ],
    )

    with pytest.raises(KeyError):
        model.record({"beta": 0.5})


@pytest.mark.parametrize("domain_key", tuple(CORE_MODEL_FACTORIES))
def test_build_core_model_instantiates_registered_domains(domain_key: str) -> None:
    model = build_core_model(domain_key)
    blueprint = CORE_BLUEPRINTS[domain_key]

    assert model.domain == blueprint.domain
    assert model.definitions == blueprint.metrics


def test_build_all_core_models_optimises_domains_back_to_back() -> None:
    models = build_all_core_models()

    assert set(models) == set(CORE_MODEL_FACTORIES)

    for domain_key, model in models.items():
        blueprint = CORE_BLUEPRINTS[domain_key]
        baseline = {definition.key: definition.target for definition in blueprint.metrics}
        follow_up = baseline.copy()
        first_metric = blueprint.metrics[0]
        follow_up[first_metric.key] = first_metric.warning

        first_snapshot = model.record(baseline)
        second_snapshot = model.record(follow_up)

        assert first_snapshot.sample_size == 1
        assert second_snapshot.sample_size == 2
        assert second_snapshot.momentum != pytest.approx(0.0)
