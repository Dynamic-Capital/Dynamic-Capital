import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dynamic.models.holistic_intelligence import (
    DynamicHolisticIntelligence,
    HolisticIntelligenceReport,
    _coerce_signals,
)
from dynamic_thinking.engine import ThinkingSignal


class _RecordingModel:
    def __init__(self, name: str, order: list[str], result: object) -> None:
        self._name = name
        self._order = order
        self._result = result
        self.calls: list[tuple[tuple, dict]] = []

    def __getattr__(self, item: str):  # pragma: no cover - defensive
        raise AttributeError(item)

    def record(self, *args, **kwargs):
        self._order.append(self._name)
        self.calls.append((args, kwargs))
        return self._result


class _StubAGI(_RecordingModel):
    def evaluate(self, **kwargs):
        return self.record(**kwargs)


class _StubThinking(_RecordingModel):
    def run_cycle(self, **kwargs):
        return self.record(**kwargs)


class _StubAwareness(_RecordingModel):
    def assess(self, **kwargs):
        return self.record(**kwargs)


class _StubCognitive(_RecordingModel):
    def reflect(self, **kwargs):
        return self.record(**kwargs)


class _StubUltimate(_RecordingModel):
    def realise(self, **kwargs):
        return self.record(**kwargs)


def test_coerce_signals_preserves_order_and_instantiates_mappings() -> None:
    first = ThinkingSignal(theme="Alpha", content="First observation")
    mapping_signal = {
        "theme": "Beta",
        "content": "Second observation",
        "timestamp": datetime(2024, 1, 1, tzinfo=timezone.utc),
    }

    signals = _coerce_signals(
        (first, mapping_signal),
        label="thinking_signals",
        signal_type=ThinkingSignal,
    )

    assert signals[0] is first
    assert isinstance(signals[1], ThinkingSignal)
    assert signals[1].theme == "beta"
    assert signals[1].content == "Second observation"


def test_coerce_signals_rejects_empty_iterables() -> None:
    with pytest.raises(ValueError, match="thinking_signals must contain at least one signal"):
        _coerce_signals((), label="thinking_signals", signal_type=ThinkingSignal)


def test_run_back_to_back_executes_models_in_sequence() -> None:
    order: list[str] = []
    orchestrator = _StubAGI("agi", order, "agi-out")
    thinking = _StubThinking("thinking", order, "think-out")
    awareness = _StubAwareness("self_awareness", order, "aware-out")
    cognitive = _StubCognitive("cognitive", order, "cog-out")
    ultimate = _StubUltimate("ultimate_reality", order, "ultimate-out")

    holistic = DynamicHolisticIntelligence(
        agi=orchestrator,
        thinking=thinking,
        self_awareness=awareness,
        cognitive=cognitive,
        ultimate_reality=ultimate,
    )

    report = holistic.run_back_to_back(
        agi_inputs={"market_data": {"symbol": "DYN"}},
        thinking_context={
            "objective": "Grow",
            "decision_horizon": "Q1",
            "risk_tolerance": 0.5,
            "time_pressure": 0.5,
            "data_completeness": 0.5,
        },
        thinking_signals=("placeholder",),
        self_awareness_context={"state": "steady"},
        self_awareness_signals=("placeholder",),
        cognitive_context={"focus": "iteration"},
        cognitive_signals=("placeholder",),
        ultimate_context={"mode": "non-dual"},
        ultimate_signals=("placeholder",),
    )

    assert order == [
        "agi",
        "thinking",
        "self_awareness",
        "cognitive",
        "ultimate_reality",
    ]
    assert isinstance(report, HolisticIntelligenceReport)
    assert report.agi == "agi-out"
    assert report.thinking == "think-out"
    assert report.self_awareness == "aware-out"
    assert report.cognitive == "cog-out"
    assert report.ultimate_reality == "ultimate-out"

