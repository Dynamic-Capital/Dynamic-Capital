from __future__ import annotations

import json
from pathlib import Path
import sys
from typing import Mapping, Sequence

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python import generate_desk_plan_snapshot as snapshot_module


class DummyRolloutSource:
    def __init__(self, payloads: Mapping[str, Sequence[Mapping[str, object]]]) -> None:
        self._payloads = payloads
        self.loaded: list[str] = []

    def load_rollout(self, rollout: str) -> Sequence[Mapping[str, object]]:
        self.loaded.append(rollout)
        if rollout not in self._payloads:
            raise snapshot_module.RolloutNotFoundError(f"No rollout data found for '{rollout}'.")
        return self._payloads[rollout]


def _scenario_payload() -> list[dict[str, object]]:
    return [
        {
            "id": "alpha",
            "config": {"neighbors": 5, "manual_stop_loss_pips": 20.0},
            "signal": {
                "direction": 1,
                "confidence": 0.52345,
                "votes": 4,
                "neighbors_considered": 6,
            },
            "snapshot": {
                "symbol": "EURUSD",
                "timestamp": "2024-03-19T15:00:00+00:00",
                "close": 1.0832,
                "rsi_fast": 62.0,
                "adx_fast": 18.0,
                "rsi_slow": 55.0,
                "adx_slow": 16.0,
                "pip_size": 0.0001,
                "pip_value": 10.0,
                "open": 1.0820,
                "high": 1.0845,
                "low": 1.0815,
            },
            "open_positions": [
                {
                    "symbol": "EURUSD",
                    "direction": 1,
                    "size": 0.6,
                    "entry_price": 1.0795,
                    "opened_at": "2024-03-18T08:00:00+00:00",
                }
            ],
        }
    ]


def test_materialize_desk_plan_writes_snapshot(monkeypatch: pytest.MonkeyPatch) -> None:
    rollout_id = "mock-rollout"
    data_source = DummyRolloutSource({rollout_id: _scenario_payload()})

    written: dict[str, object] = {}

    def fake_write_text(self: Path, payload: str, *args, **kwargs) -> int:  # type: ignore[override]
        written["path"] = self
        written["payload"] = payload
        return len(payload)

    monkeypatch.setattr(Path, "write_text", fake_write_text, raising=False)
    monkeypatch.setattr(Path, "mkdir", lambda self, **_: None, raising=False)

    def fake_run_scenario(scenario: snapshot_module.Scenario):
        decision = snapshot_module.TradeDecision(
            action="open",
            symbol=scenario.snapshot.symbol,
            direction=scenario.signal.direction,
            entry=1.23456,
            stop_loss=1.19994,
            take_profit=1.34567,
            reason="Strategy alignment",
            context={
                "original_confidence": scenario.signal.confidence,
                "final_confidence": scenario.signal.confidence,
            },
        )
        return decision, scenario.snapshot

    monkeypatch.setattr(snapshot_module, "_run_scenario", fake_run_scenario)
    monkeypatch.setattr(snapshot_module, "render_desk_plan", lambda *_, **__: "Test plan")

    target = snapshot_module.materialize_desk_plan(rollout_id, data_source=data_source)

    assert written["path"].as_posix().endswith("apps/web/data/trading-desk-plan.json")
    assert target == written["path"]

    payload = json.loads(written["payload"])  # type: ignore[arg-type]
    assert payload == {
        "alpha": {
            "symbol": "EURUSD",
            "direction": "long",
            "entry": 1.2346,
            "stopLoss": 1.1999,
            "takeProfit": 1.3457,
            "originalConfidence": 0.5234,
            "finalConfidence": 0.5234,
            "reason": "Strategy alignment",
            "plan": "Test plan",
        }
    }

    assert data_source.loaded == [rollout_id]


def test_generate_snapshot_raises_for_missing_rollout() -> None:
    class MissingSource:
        def load_rollout(self, rollout: str) -> Sequence[Mapping[str, object]]:
            raise snapshot_module.RolloutNotFoundError(
                f"No rollout data found for '{rollout}'. Available rollouts: recent-rollout."
            )

    with pytest.raises(snapshot_module.RolloutNotFoundError) as excinfo:
        snapshot_module.generate_snapshot("unknown", data_source=MissingSource())

    assert "No rollout data found for 'unknown'" in str(excinfo.value)
