from __future__ import annotations

from datetime import datetime, timedelta, timezone

import math
import pytest

from dynamic_orderflow import DynamicOrderFlow, OrderEvent
from dynamic_quantum import (
    DynamicQuantumOrchestrator,
    QuantumOrchestrationSnapshot,
    QuantumStrategicState,
    resonance_score,
)


def _event(
    *,
    side: str,
    size: float,
    price: float,
    offset_seconds: float,
) -> OrderEvent:
    return OrderEvent(
        symbol="ETH",
        side=side,
        size=size,
        price=price,
        timestamp=datetime.now(timezone.utc) - timedelta(seconds=offset_seconds),
    )


def test_orchestrator_builds_snapshot() -> None:
    flow = DynamicOrderFlow(horizon=180, max_samples=20)
    flow.ingest(
        [
            _event(side="buy", size=2.0, price=1500, offset_seconds=1.0),
            _event(side="sell", size=1.2, price=1498, offset_seconds=1.5),
            _event(side="buy", size=1.5, price=1501, offset_seconds=2.0),
            _event(side="buy", size=1.1, price=1502, offset_seconds=3.0),
        ]
    )

    orchestrator = DynamicQuantumOrchestrator()
    snapshot = orchestrator.orchestrate(flow)

    assert isinstance(snapshot, QuantumOrchestrationSnapshot)
    assert pytest.approx(1.0, rel=1e-5) == math.sqrt(
        sum(abs(value) ** 2 for value in snapshot.state.amplitudes)
    )
    assert pytest.approx(resonance_score(snapshot.state, orchestrator.operators)) == snapshot.resonance
    assert set(snapshot.operator_expectations.keys()) == {op.name for op in orchestrator.operators}
    assert snapshot.orderflow.imbalance == flow.pressure()
    assert snapshot.recommendations


def test_orchestrator_blends_with_base_state() -> None:
    base_state = QuantumStrategicState([1, 0, 0, 0, 0])
    flow = DynamicOrderFlow(horizon=90, max_samples=10)
    flow.ingest(
        [
            _event(side="sell", size=2.5, price=1490, offset_seconds=0.5),
            _event(side="sell", size=1.8, price=1488, offset_seconds=0.7),
            _event(side="buy", size=0.9, price=1491, offset_seconds=1.2),
        ]
    )

    orchestrator = DynamicQuantumOrchestrator()
    snapshot = orchestrator.orchestrate(flow, base_state=base_state)

    assert snapshot.state != base_state
    assert snapshot.resonance == pytest.approx(resonance_score(snapshot.state, orchestrator.operators))
