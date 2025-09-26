from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Sequence

import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.home_hub_sync import (
    DeviceState,
    GrokDeepSeekSyncPlanner,
    HomeHubSnapshot,
    HomeHubSyncEngine,
    SyncAction,
    build_sync_delta,
)


class StubCompletionClient:
    def __init__(self, responses: Iterable[str]) -> None:
        self._responses = list(responses)
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:  # noqa: D401 - protocol match
        self.prompts.append(prompt)
        if not self._responses:
            raise RuntimeError("No stubbed response available")
        return self._responses.pop(0)


class StubHub:
    def __init__(self, snapshot: HomeHubSnapshot) -> None:
        self.snapshot = snapshot
        self.applied_actions: list[Sequence[SyncAction]] = []

    def load_snapshot(self) -> HomeHubSnapshot:
        return self.snapshot

    def apply_actions(self, actions: Sequence[SyncAction]) -> None:
        self.applied_actions.append(actions)


class StubRealtime:
    def __init__(self, snapshot: HomeHubSnapshot) -> None:
        self.snapshot = snapshot

    def fetch_snapshot(self) -> HomeHubSnapshot:
        return self.snapshot


@pytest.fixture
def baseline_snapshots() -> dict[str, HomeHubSnapshot]:
    base_time = datetime(2024, 1, 1, 12, 0, 0)
    hub_snapshot = HomeHubSnapshot(
        timestamp=base_time,
        devices={
            "light.living": DeviceState(status="off", attributes={"brightness": 10}, updated_at=base_time),
            "sensor.kitchen": DeviceState(status="online", attributes={"value": 21.5}, updated_at=base_time),
        },
    )
    realtime_snapshot = HomeHubSnapshot(
        timestamp=base_time + timedelta(seconds=30),
        devices={
            "light.living": DeviceState(
                status="on",
                attributes={"brightness": 100},
                updated_at=base_time + timedelta(seconds=30),
            ),
            "lock.front": DeviceState(status="locked", attributes={}, updated_at=base_time + timedelta(seconds=30)),
        },
    )
    return {"hub": hub_snapshot, "realtime": realtime_snapshot}


def test_build_sync_delta_identifies_mismatches(baseline_snapshots: Dict[str, HomeHubSnapshot]) -> None:
    delta = build_sync_delta(
        baseline_snapshots["hub"],
        baseline_snapshots["realtime"],
        staleness_tolerance=5.0,
    )

    assert delta.has_changes is True
    assert {device.device_id for device in delta.devices} == {"light.living", "lock.front", "sensor.kitchen"}

    living_room = next(device for device in delta.devices if device.device_id == "light.living")
    attrs = {attr.attribute for attr in living_room.attribute_deltas}
    assert attrs == {"brightness", "status"}

    lock = next(device for device in delta.devices if device.device_id == "lock.front")
    assert lock.missing_in_hub is True

    sensor = next(device for device in delta.devices if device.device_id == "sensor.kitchen")
    assert sensor.missing_in_realtime is True


def test_planner_merges_grok_and_deepseek_guidance(baseline_snapshots: Dict[str, HomeHubSnapshot]) -> None:
    grok_client = StubCompletionClient(
        responses=[
            '{"actions": [{"device_id": "light.living", "operation": "set_state", "parameters": {"status": "on"}}], "notes": ["Turn on light"], "confidence": 0.6}',
        ]
    )
    deepseek_client = StubCompletionClient(
        responses=[
            '{"notes": ["Ensure occupant approval"], "blocked_devices": ["light.living"], "additional_actions": [{"device_id": "lock.front", "operation": "sync_state", "parameters": {"status": "locked"}}], "confidence": 0.82, "risk_score": 0.2}',
        ]
    )
    planner = GrokDeepSeekSyncPlanner(grok_client=grok_client, deepseek_client=deepseek_client)
    plan = planner.plan(
        build_sync_delta(baseline_snapshots["hub"], baseline_snapshots["realtime"]),
        context={"initiator": "automation"},
    )

    assert [action.device_id for action in plan.actions] == ["lock.front"]
    assert plan.actions[0].operation == "sync_state"
    assert plan.confidence == pytest.approx(0.82)
    assert any("DeepSeek-V3 blocked devices" in note for note in plan.notes)
    assert any("Ensure occupant approval" in note for note in plan.notes)
    assert "grok" in plan.metadata and "deepseek" in plan.metadata
    assert "Grok plan" in deepseek_client.prompts[0]


def test_sync_engine_applies_actions_when_plan_non_empty(baseline_snapshots: Dict[str, HomeHubSnapshot]) -> None:
    grok_client = StubCompletionClient(['{"actions": [], "notes": []}'])
    deepseek_client = StubCompletionClient(['{"notes": [], "confidence": 0.3}'])
    planner = GrokDeepSeekSyncPlanner(grok_client=grok_client, deepseek_client=deepseek_client)
    hub = StubHub(baseline_snapshots["hub"])
    realtime = StubRealtime(baseline_snapshots["realtime"])
    engine = HomeHubSyncEngine(hub=hub, realtime=realtime, planner=planner)

    # First call returns no actions, ensuring hub is not mutated.
    plan = engine.sync_once(context={"run": 1})
    assert plan.actions == []
    assert hub.applied_actions == []

    # Second round returns actionable plan.
    grok_client._responses.append(
        '{"actions": [{"device_id": "lock.front", "operation": "sync_state"}]}'
    )
    deepseek_client._responses.append('{"approved": true}')
    plan = engine.sync_once(context={"run": 2})
    assert [action.device_id for action in plan.actions] == ["lock.front"]
    assert len(hub.applied_actions) == 1
