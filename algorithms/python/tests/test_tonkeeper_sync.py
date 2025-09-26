"""Tests for the Tonkeeper multi-LLM synchronisation toolkit."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.tonkeeper_sync import (  # noqa: E402
    TonkeeperAccountSnapshot,
    TonkeeperLLMCoordinator,
    TonkeeperNetworkStatus,
    TonkeeperSyncContext,
    TonkeeperSyncEngine,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class StubCompletionClient:
    """Deterministic completion client used for unit tests."""

    def __init__(self, response: str):
        self.response = response
        self.calls: list[dict[str, object]] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        return self.response


@pytest.fixture()
def sample_context() -> TonkeeperSyncContext:
    accounts = [
        TonkeeperAccountSnapshot(
            address="EQCUSTODY123",
            balance_ton=12.5,
            balance_usd=48.75,
            min_balance_ton=10.0,
            pending_transactions=("tx-01",),
            labels=("treasury", "core"),
        ),
        TonkeeperAccountSnapshot(
            address="EQHOTWALLET456",
            balance_ton=4.25,
            balance_usd=16.58,
            min_balance_ton=5.0,
            pending_transactions=(),
            labels=("user_funds",),
        ),
    ]
    network = TonkeeperNetworkStatus(
        ton_price_usd=2.1,
        network_load=0.62,
        validators_online=252,
        epoch="2024-08",
        upgrades=("ton-v5.1 rollout",),
    )
    return TonkeeperSyncContext(
        accounts=accounts,
        network=network,
        agenda=("Reconcile treasury", "Push wallet update"),
        incidents=("API latency spike",),
        last_sync=datetime(2024, 8, 20, 15, 0, tzinfo=timezone.utc),
    )


def test_coordinator_merges_llm_payloads(sample_context: TonkeeperSyncContext) -> None:
    primary_response = json.dumps(
        {
            "summary": "Keep treasury and user balances aligned.",
            "actions": [
                "Reconcile treasury wallet movements",
                "Notify stakeholders about staking queues",
            ],
            "alerts": ["Monitoring latency remains elevated"],
            "sync": {
                "checkpoints": ["Confirm validator rewards have settled"],
                "next_run_minutes": 15,
            },
        }
    )
    secondary_response = json.dumps(
        {
            "summary": "",
            "actions": [
                "Reconcile treasury wallet movements",
                "Investigate staking inflows",
            ],
            "alerts": [],
            "sync": {
                "checkpoints": ["Audit user hot wallet top-ups"],
                "notes": ["Ensure TON upgrade checklist is ready"],
                "next_run_minutes": 25,
            },
        }
    )
    coordinator = TonkeeperLLMCoordinator(
        llms=[
            LLMConfig(
                name="model-a",
                client=StubCompletionClient(primary_response),
                temperature=0.2,
                nucleus_p=0.9,
                max_tokens=512,
            ),
            LLMConfig(
                name="model-b",
                client=StubCompletionClient(secondary_response),
                temperature=0.1,
                nucleus_p=0.85,
                max_tokens=400,
            ),
        ]
    )

    resolution = coordinator.generate_plan(sample_context)
    plan = resolution.plan

    assert plan.summary == "Keep treasury and user balances aligned."
    assert "Reconcile treasury wallet movements" in plan.actions
    assert "Investigate staking inflows" in plan.actions
    assert "Audit user hot wallet top-ups" in plan.checkpoints
    assert "Reconcile balance for EQCUSTODY123" in plan.checkpoints
    assert plan.next_sync_minutes == 15
    assert plan.metadata["model_count"] == 2
    assert any(entry["model"] == "model-a" for entry in plan.metadata["disagreements"])
    assert resolution.serialised_runs is not None


def test_sync_engine_applies_fallbacks_when_models_silent(sample_context: TonkeeperSyncContext) -> None:
    silent_client = StubCompletionClient("{}")
    coordinator = TonkeeperLLMCoordinator(
        llms=[
            LLMConfig(
                name="silent-model",
                client=silent_client,
                temperature=0.0,
                nucleus_p=0.0,
                max_tokens=128,
            )
        ]
    )
    engine = TonkeeperSyncEngine(coordinator=coordinator)

    context = sample_context
    context.accounts[1].balance_ton = 3.0  # drop below 75% buffer

    resolution = engine.plan_sync(context)
    plan = resolution.plan

    assert plan.metadata.get("fallback_actions") is True
    assert any(action.startswith("Review") for action in plan.actions)
    assert any("Top up" in action for action in plan.actions)
    assert plan.metadata.get("balance_alerts") is True
    assert any("Critical TON balance" in alert for alert in plan.alerts)
    assert plan.summary
