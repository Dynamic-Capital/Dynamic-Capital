"""Tests for the Dynamic TON webhook helpers."""

from __future__ import annotations

import base64
import os
from datetime import datetime, timezone
from unittest import mock

import pytest

from dynamic_ton import (
    DynamicTonEngine,
    TonExecutionPlan,
    build_plan_from_webhook,
    compute_webhook_signature_hex,
    get_webhook_secret,
    parse_ton_webhook,
    verify_webhook_signature,
)


@pytest.fixture
def sample_payload() -> dict[str, object]:
    return {
        "id": "evt_123",
        "type": "ton.plan.requested",
        "deliveredAt": "2025-05-21T10:30:00Z",
        "attempts": 2,
        "data": {
            "engine": {"minTotalDepthTon": 500_000, "ratioTolerance": 0.1},
            "liquidity": [
                {
                    "venue": "STON.fi",
                    "pair": "ton/usdt",
                    "tonDepth": 200_000,
                    "quoteDepth": 150_000,
                    "utilisation": 0.85,
                },
                {
                    "venue": "DeDust",
                    "pair": "dct/ton",
                    "tonDepth": 120_000,
                    "quoteDepth": 200_000,
                    "utilisation": 0.4,
                },
            ],
            "telemetry": {
                "tonPriceUsd": 2.25,
                "bridgeLatencyMs": 1200,
                "settlementBacklog": 4,
                "tonInflow24h": 30_000,
                "tonOutflow24h": 80_000,
            },
            "treasury": {
                "tonReserve": 250_000,
                "stableReserve": 350_000,
                "targetTonRatio": 0.55,
                "hedgedRatio": 0.2,
            },
        },
    }


def test_verify_webhook_signature_accepts_hex_and_base64(sample_payload: dict[str, object]) -> None:
    secret = "demo-secret"
    payload_text = "{}"
    signature_hex = compute_webhook_signature_hex(secret, payload_text)
    signature_b64 = base64.b64encode(bytes.fromhex(signature_hex)).decode()

    assert verify_webhook_signature(secret, payload_text, signature_hex) is True
    assert verify_webhook_signature(secret, payload_text, signature_b64) is True
    assert verify_webhook_signature(secret, payload_text, "invalid-signature") is False


def test_parse_ton_webhook_builds_envelope(sample_payload: dict[str, object]) -> None:
    envelope = parse_ton_webhook(sample_payload)

    assert envelope.event_id == "evt_123"
    assert envelope.event_type == "ton.plan.requested"
    assert envelope.attempts == 2
    assert envelope.delivered_at == datetime(2025, 5, 21, 10, 30, tzinfo=timezone.utc)

    plan = envelope.build_plan()
    assert isinstance(plan, TonExecutionPlan)
    assert plan.has_high_priority_actions is True


def test_build_plan_from_webhook_accepts_engine_override(sample_payload: dict[str, object]) -> None:
    engine = DynamicTonEngine(min_total_depth_ton=100_000, utilisation_ceiling=0.5)

    plan = build_plan_from_webhook(sample_payload, engine=engine)

    assert isinstance(plan, TonExecutionPlan)
    assert any(action.priority == "high" for action in plan.actions)


def test_parse_ton_webhook_requires_required_sections() -> None:
    with pytest.raises(ValueError):
        parse_ton_webhook({"id": "evt", "type": "ton.plan", "data": {"liquidity": []}})


def test_get_webhook_secret_reads_environment_variable() -> None:
    with mock.patch.dict(os.environ, {"DYNAMIC_TON_API_KEY": "super-secret"}, clear=True):
        assert get_webhook_secret() == "super-secret"


def test_get_webhook_secret_raises_when_missing() -> None:
    with mock.patch.dict(os.environ, {}, clear=True):
        with pytest.raises(RuntimeError):
            get_webhook_secret()
