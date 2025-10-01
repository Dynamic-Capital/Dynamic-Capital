from __future__ import annotations

import pytest

from dynamic.intelligence.agi.self_improvement import ImprovementSignal, LearningSnapshot
from dynamic.intelligence.agi.training_models import (
    DynamicAGITrainingModelGenerator,
)


def _build_snapshot(
    *,
    performance: dict[str, float],
    feedback: tuple[str, ...],
    signals: tuple[ImprovementSignal, ...],
) -> LearningSnapshot:
    return LearningSnapshot(
        output={"status": "ok"},
        performance=performance,
        feedback=feedback,
        signals=signals,
    )


def test_generate_training_model_produces_expected_features() -> None:
    generator = DynamicAGITrainingModelGenerator()
    snapshot = _build_snapshot(
        performance={"sharpe": 1.5, "drawdown": -0.02},
        feedback=("Focus risk control", "Nice work"),
        signals=(
            ImprovementSignal(metric="PnL", value=1.2, direction="positive", weight=0.8),
            ImprovementSignal(metric="Drawdown", value=0.5, direction="negative", weight=1.4),
        ),
    )

    model = generator.generate([snapshot], notes="session-1")

    assert model.summary["example_count"] == 1
    assert model.notes == "session-1"

    example = model.examples[0]
    assert example.features["performance::sharpe"] == pytest.approx(1.5)
    assert example.features["performance::drawdown"] == pytest.approx(-0.02)
    assert example.features["signal::pnl::value"] == pytest.approx(1.2)
    assert example.features["signal::drawdown::weight"] == pytest.approx(1.4)
    assert example.labels["signal::pnl::direction"] == pytest.approx(1.0)
    assert example.labels["signal::drawdown::direction"] == pytest.approx(-1.0)

    assert "feedback" in example.metadata
    assert example.metadata["feedback"] == ["Focus risk control", "Nice work"]
    assert model.summary["direction_histogram"].get("positive", 0) == 1
    assert model.summary["direction_histogram"].get("negative", 0) == 1
    assert model.summary["back_to_back_pairs"] == 0
    assert model.summary["average_back_to_back_magnitude"] == pytest.approx(0.0)

    assert set(model.feature_names) >= {
        "performance::sharpe",
        "performance::drawdown",
        "signal::pnl::value",
        "signal::pnl::direction",
        "signal::drawdown::weight",
        "signal::drawdown::direction",
    }


def test_generator_respects_feedback_flag_and_counts_directions() -> None:
    generator = DynamicAGITrainingModelGenerator(include_feedback=False)
    snapshot_positive = _build_snapshot(
        performance={"alpha": 0.2},
        feedback=("Keep scaling",),
        signals=(
            ImprovementSignal(metric="Momentum", value=0.9, direction="positive"),
        ),
    )
    snapshot_neutral = _build_snapshot(
        performance={},
        feedback=("Neutral",),
        signals=(
            ImprovementSignal(metric="Risk", value=0.0, direction="neutral"),
        ),
    )

    model = generator.generate([snapshot_positive, snapshot_neutral])

    assert model.summary["example_count"] == 2
    histogram = model.summary["direction_histogram"]
    assert histogram.get("positive", 0) == 1
    assert histogram.get("neutral", 0) == 1

    first_example = model.examples[0]
    assert "feedback" not in first_example.metadata
    assert model.summary["back_to_back_pairs"] == 0
    assert model.summary["average_back_to_back_magnitude"] == pytest.approx(0.0)


def test_back_to_back_transitions_add_delta_features() -> None:
    generator = DynamicAGITrainingModelGenerator(
        derive_back_to_back=True,
    )

    first_snapshot = _build_snapshot(
        performance={"alpha": 0.1, "beta": 0.5},
        feedback=("Steady",),
        signals=(
            ImprovementSignal(metric="PnL", value=1.0, direction="neutral"),
            ImprovementSignal(metric="Risk", value=0.2, direction="negative"),
        ),
    )
    second_snapshot = _build_snapshot(
        performance={"alpha": 0.4, "beta": 0.3},
        feedback=("Accelerate",),
        signals=(
            ImprovementSignal(metric="PnL", value=1.4, direction="positive"),
            ImprovementSignal(metric="Risk", value=0.1, direction="neutral"),
        ),
    )

    model = generator.generate([first_snapshot, second_snapshot])

    assert model.summary["back_to_back_pairs"] == 1
    assert model.summary["average_back_to_back_magnitude"] > 0

    second_example = model.examples[1]
    assert second_example.metadata.get("transition_magnitude", 0.0) > 0
    back_to_back_meta = second_example.metadata.get("back_to_back")
    assert isinstance(back_to_back_meta, dict)
    assert back_to_back_meta["performance_changes"]["alpha"] == pytest.approx(0.3)
    assert back_to_back_meta["signal_direction_changes"]["pnl"] > 0
    assert "delta::performance::alpha" in second_example.features
    assert "delta::signal::pnl::value" in second_example.features
