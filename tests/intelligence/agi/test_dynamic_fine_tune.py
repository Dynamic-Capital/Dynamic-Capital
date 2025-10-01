from __future__ import annotations

from dynamic.intelligence.agi.fine_tune import DynamicAGIFineTuner
from dynamic.intelligence.agi.self_improvement import ImprovementSignal, LearningSnapshot


def _snapshot_with_signals(*metrics: str) -> LearningSnapshot:
    signals = tuple(
        ImprovementSignal(metric=metric, value=index + 1.0)
        for index, metric in enumerate(metrics)
    )
    return LearningSnapshot(
        output={"status": "ok"},
        performance={},
        feedback=(),
        signals=signals,
    )


def test_example_from_snapshot_preserves_signal_tag_order() -> None:
    tuner = DynamicAGIFineTuner()
    snapshot = _snapshot_with_signals("pnl", "drawdown", "pnl", "sharpe")

    first = tuner._example_from_snapshot(snapshot)
    second = tuner._example_from_snapshot(snapshot)

    assert first.tags == ("pnl", "drawdown", "sharpe")
    assert second.tags == first.tags
