from __future__ import annotations

from datetime import datetime, timezone

import pytest

from dynamic.trading.logic.engine import DynamicRisk, Position, RiskLimits


class RecordingCollector:
    def __init__(self) -> None:
        self.telemetry: list[dict[str, object]] = []

    def record_telemetry(self, payload: dict[str, object]) -> dict[str, object]:
        self.telemetry.append(payload)
        return {"status": "accepted"}


def test_dynamic_risk_emits_telemetry_payload() -> None:
    collector = RecordingCollector()
    risk = DynamicRisk(
        limits=RiskLimits(1000.0, 500.0, 250.0),
        returns_horizon=16,
        data_collector=collector,
    )
    risk.ingest_positions(
        [
            Position(
                symbol="EURUSD",
                quantity=1.0,
                entry_price=1.2,
                last_price=1.3,
                updated_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            )
        ]
    )
    risk.register_return(0.01)
    risk.register_return(-0.02)

    telemetry = risk.snapshot()

    assert telemetry.gross_exposure == pytest.approx(1.3)
    assert collector.telemetry
    payload = collector.telemetry[-1]
    assert payload["telemetry"]["gross_exposure"] == pytest.approx(1.3)
    assert payload["positions"][0]["symbol"] == "EURUSD"
    assert payload["limits"]["max_gross_exposure"] == pytest.approx(1000.0)
    assert payload["captured_at"].endswith("+00:00")
