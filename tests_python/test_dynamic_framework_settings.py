from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))


from dynamic_framework import (
    DynamicFrameworkEngine,
    FrameworkNode,
    FrameworkPulse,
    FrameworkSettings,
)
from dynamic_framework.__main__ import serialise_report


def _pulse(
    *,
    node: str,
    maturity: float,
    confidence: float,
    enablement: float,
    resilience: float,
    momentum: float,
    timestamp: datetime,
) -> FrameworkPulse:
    return FrameworkPulse(
        node=node,
        maturity=maturity,
        confidence=confidence,
        enablement=enablement,
        resilience=resilience,
        momentum=momentum,
        timestamp=timestamp,
    )


def test_framework_settings_from_mapping() -> None:
    settings = FrameworkSettings.from_mapping(
        {
            "enablement_guardrail": 0.7,
            "enablement_integrated_threshold": 0.8,
            "resilience_guardrail": 0.65,
            "momentum_negative_threshold": -0.2,
        }
    )

    assert settings.enablement_guardrail == pytest.approx(0.7)
    assert settings.enablement_integrated_threshold == pytest.approx(0.8)
    assert settings.resilience_guardrail == pytest.approx(0.65)
    assert settings.momentum_negative_threshold == pytest.approx(-0.2)


def test_engine_uses_custom_settings_for_snapshot() -> None:
    node = FrameworkNode(
        key="platform",
        title="Platform",
        minimum_maturity=0.5,
        target_maturity=0.8,
    )
    settings = FrameworkSettings(
        enablement_guardrail=0.93,
        enablement_integrated_threshold=0.95,
        resilience_guardrail=0.9,
        resilience_integrated_threshold=0.96,
        momentum_negative_threshold=-0.05,
        trend_decline_threshold=-0.05,
    )
    engine = DynamicFrameworkEngine(nodes=[node], settings=settings)
    engine.record(
        _pulse(
            node="platform",
            maturity=0.88,
            confidence=0.75,
            enablement=0.92,
            resilience=0.9,
            momentum=0.02,
            timestamp=datetime(2024, 3, 1, tzinfo=timezone.utc),
        )
    )
    engine.record(
        _pulse(
            node="platform",
            maturity=0.82,
            confidence=0.72,
            enablement=0.9,
            resilience=0.88,
            momentum=-0.12,
            timestamp=datetime(2024, 4, 1, tzinfo=timezone.utc),
        )
    )

    snapshot = engine.snapshot("platform")

    assert snapshot.status == "calibrating"
    assert any("enablement" in alert for alert in snapshot.alerts)
    assert any("resilience" in alert for alert in snapshot.alerts)
    assert any("momentum" in alert for alert in snapshot.alerts)
    assert any("trend" in alert for alert in snapshot.alerts)


def test_serialise_report_includes_settings() -> None:
    node = FrameworkNode(key="orchestration", title="Orchestration")
    engine = DynamicFrameworkEngine(nodes=[node])
    engine.record(
        _pulse(
            node="orchestration",
            maturity=0.9,
            confidence=0.8,
            enablement=0.75,
            resilience=0.72,
            momentum=0.12,
            timestamp=datetime(2024, 4, 2, tzinfo=timezone.utc),
        )
    )

    payload = serialise_report(engine)

    assert "settings" in payload
    assert payload["settings"]["enablement_guardrail"] == pytest.approx(
        engine.settings.enablement_guardrail
    )
