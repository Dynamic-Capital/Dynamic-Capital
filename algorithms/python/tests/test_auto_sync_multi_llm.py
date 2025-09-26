import json
from typing import Any, Dict, Sequence

import pytest

from algorithms.python.auto_sync_multi_llm import (
    AutoSyncPlan,
    DynamicAutoSyncOrchestrator,
    SyncSnapshot,
)
from algorithms.python.multi_llm import LLMConfig


class StubClient:
    def __init__(self, responses: Sequence[str]) -> None:
        self.responses = list(responses)
        self.calls: list[Dict[str, Any]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        if not self.responses:
            raise RuntimeError("no responses queued")
        return self.responses.pop(0)


def _config(client: StubClient) -> LLMConfig:
    return LLMConfig(name="stub", client=client, temperature=0.2, nucleus_p=0.9, max_tokens=512)


def test_orchestrator_merges_multi_llm_actions() -> None:
    detector_payload = {
        "anomalies": ["user-2 missing token"],
        "actions": [
            {
                "entity_id": "user-1",
                "action": "grant_token",
                "reason": "Alpha access minted",
                "confidence": 0.72,
                "tags": ["grant"],
                "metadata": {"source": "detector"},
            },
            {
                "entity_id": "user-2",
                "action": "revoke_access",
                "reason": "Subscription inactive",
                "confidence": 0.85,
                "tags": ["compliance"],
            },
        ],
    }

    resolver_payload = {
        "actions": [
            {
                "entity_id": "user-1",
                "action": "grant_token",
                "reason": "Cross-model consensus",
                "confidence": 0.9,
                "tags": ["consensus"],
                "metadata": {"mode": "auto"},
            },
            {
                "entity_id": "user-3",
                "action": "flag_review",
                "reason": "Missing verification",
                "confidence": 0.6,
            },
        ],
        "escalations": ["user-3 requires manual verification"],
    }

    auditor_payload = {
        "escalations": ["Confirm KYC for user-2"],
        "notes": ["Ensure legal sign-off on revocations"],
    }

    detector_client = StubClient([json.dumps(detector_payload)])
    resolver_client = StubClient([json.dumps(resolver_payload)])
    auditor_client = StubClient([json.dumps(auditor_payload)])

    orchestrator = DynamicAutoSyncOrchestrator(
        detector=_config(detector_client),
        resolver=_config(resolver_client),
        auditor=_config(auditor_client),
    )

    snapshots = [
        SyncSnapshot(
            entity_id="user-1",
            current_state={"memberships": ["vip"]},
            desired_state={"memberships": ["vip", "alpha"]},
            history=[{"event": "joined", "channel": "@alpha"}],
            metadata={"tier": "vip"},
        ),
        SyncSnapshot(
            entity_id="user-2",
            current_state={"memberships": ["vip"]},
            desired_state={"memberships": []},
            history=["subscription lapsed"],
            metadata={"tier": "vip"},
        ),
    ]

    plan = orchestrator.build_plan(
        snapshots,
        context={"runway_months": 24},
        guardrails={"max_grants_per_day": 200},
        goal="Synchronise VIP tokens across membership surfaces",
    )

    assert isinstance(plan, AutoSyncPlan)
    assert plan.summary.startswith("3 sync actions")
    assert plan.anomalies == ("user-2 missing token",)
    assert "user-3 requires manual verification" in plan.escalations
    assert "Confirm KYC for user-2" in plan.escalations

    actions = {(action.entity_id, action.action): action for action in plan.actions}
    assert len(actions) == 3

    user1 = actions[("user-1", "grant_token")]
    assert set(user1.reasons) == {"Alpha access minted", "Cross-model consensus"}
    assert user1.confidence == pytest.approx(0.9)
    assert set(user1.tags) == {"grant", "consensus"}
    assert user1.metadata["mode"] == "auto"
    assert user1.metadata["source"] == "detector"

    user2 = actions[("user-2", "revoke_access")]
    assert user2.confidence == pytest.approx(0.85)

    user3 = actions[("user-3", "flag_review")]
    assert user3.confidence == pytest.approx(0.6)
    assert "Missing verification" in user3.reasons[0]

    assert "detector" in plan.metadata
    assert "resolver" in plan.metadata
    assert "auditor" in plan.metadata
    assert json.dumps(plan.metadata["detector"])  # round-trip safety
    assert len(plan.runs) == 3
    assert plan.raw_runs is not None
    assert "snapshots" in detector_client.calls[0]["prompt"]
    assert "plan_preview" in resolver_client.calls[0]["prompt"]
    assert "compliance auditor" in auditor_client.calls[0]["prompt"]


def test_orchestrator_handles_textual_fallbacks() -> None:
    detector_client = StubClient(["Narrative only response"])
    resolver_client = StubClient(["Manual review required"])

    orchestrator = DynamicAutoSyncOrchestrator(
        detector=_config(detector_client),
        resolver=_config(resolver_client),
    )

    snapshots = [
        SyncSnapshot(entity_id="user-1", current_state={"memberships": ["vip"]}),
    ]

    plan = orchestrator.build_plan(snapshots, context={"runway_months": 12})

    assert plan.actions == ()
    assert plan.escalations == ()
    assert plan.anomalies == ()
    assert plan.metadata["detector"]["narrative"] == "Narrative only response"
    assert plan.metadata["resolver"]["narrative"] == "Manual review required"
    assert plan.summary.startswith("0 sync actions")


def test_build_plan_requires_snapshots() -> None:
    detector_client = StubClient(["{}"])
    orchestrator = DynamicAutoSyncOrchestrator(detector=_config(detector_client))

    with pytest.raises(ValueError):
        orchestrator.build_plan([])
