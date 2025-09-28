from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic_trainer import (
    DynamicTrainerEngine,
    DynamicTrainerModel,
    TrainerContext,
    TrainingSignal,
)


def test_trainer_engine_summarise_generates_focus_and_advisory() -> None:
    engine = DynamicTrainerEngine(window=5)
    engine.extend(
        [
            TrainingSignal(
                run_label="baseline",
                dataset_rows=1200,
                accuracy=0.72,
                loss=0.78,
                throughput=24.0,
                stability=0.52,
                compute_efficiency=0.55,
                label_quality=0.58,
                energy=0.88,
                weight=1.0,
            ),
            TrainingSignal(
                run_label="augmented",
                dataset_rows=1500,
                accuracy=0.8,
                loss=0.7,
                throughput=26.0,
                stability=0.6,
                compute_efficiency=0.6,
                label_quality=0.62,
                energy=0.83,
                weight=1.3,
            ),
        ]
    )

    context = TrainerContext(
        objective="text classifier",
        target_accuracy=0.88,
        max_loss=0.55,
        min_throughput=32.0,
        stability_threshold=0.7,
        efficiency_target=0.75,
        autopilot_enabled=True,
        emphasis=("safety", "latency"),
    )

    model = engine.summarise(context)

    assert isinstance(model, DynamicTrainerModel)
    assert 0.0 <= model.readiness <= 1.0
    assert model.sample_size == 2
    assert any("accuracy" in focus for focus in model.focus_areas)
    assert any("Autopilot" in advisory for advisory in model.advisories)
    assert "Priority themes" in " ".join(model.advisories)
    assert "Address focus areas" in " ".join(model.recommended_actions)
    assert model.metadata is not None
    assert model.metadata["samples"] == 2


def test_trainer_engine_recommends_promotion_for_strong_metrics() -> None:
    engine = DynamicTrainerEngine(window=3)
    engine.extend(
        [
            TrainingSignal(
                run_label="checkpoint-1",
                dataset_rows=1800,
                accuracy=0.86,
                loss=0.28,
                throughput=42.0,
                stability=0.78,
                compute_efficiency=0.74,
                label_quality=0.81,
                energy=0.68,
                weight=1.0,
            ),
            TrainingSignal(
                run_label="checkpoint-2",
                dataset_rows=1800,
                accuracy=0.9,
                loss=0.24,
                throughput=48.0,
                stability=0.82,
                compute_efficiency=0.78,
                label_quality=0.85,
                energy=0.7,
                weight=1.1,
            ),
        ]
    )

    context = TrainerContext(
        objective="dialogue agent",
        target_accuracy=0.86,
        max_loss=0.35,
        min_throughput=24.0,
        stability_threshold=0.7,
        efficiency_target=0.65,
    )

    model = engine.summarise(context)

    assert model.readiness >= 0.75
    assert model.quality >= 0.7
    assert model.confidence >= 0.7
    assert not model.focus_areas  # no focus areas when metrics meet goals
    assert any("Promote" in action for action in model.recommended_actions)
