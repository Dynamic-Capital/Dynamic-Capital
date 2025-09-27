from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.group_keeper import (  # noqa: E402
    CommunityGroup,
    DynamicGroupKeeperAlgorithm,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "insight": "Prioritise engagement rituals and close open escalations.",
                "actions": ["Confirm weekly sync", "Resolve payment blockers"],
            }
        )


def test_group_keeper_sync_tracks_groups_and_guidance() -> None:
    keeper = DynamicGroupKeeperAlgorithm()
    alpha = CommunityGroup(
        name="Alpha Squad",
        platform="Telegram",
        owners=("Elena",),
        managers=("Elena", "Marcus"),
        purpose="Primary trading cohort",
        region="Global",
        tags=("priority", "fx"),
        channels=("alpha-updates",),
        cadence="Weekly sprint",
        member_count=180,
        priority=10,
    )
    keeper.register_group(alpha)
    keeper.register_ritual(
        "Alpha Squad",
        {"name": "Weekly standup", "cadence": "Fridays", "owner": "Elena"},
    )
    keeper.register_escalation(
        "Alpha Squad",
        {"summary": "Resolve onboarding backlog", "severity": "medium"},
    )

    beta = CommunityGroup(
        name="Beta Circle",
        platform="Discord",
        owners=("Jordan",),
        managers=("Jordan",),
        purpose="Product analytics guild",
        region="Europe",
        tags=("analytics",),
        channels=("beta-changelog", "beta-office-hours"),
        cadence="Bi-weekly",
        member_count=95,
        priority=5,
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="group-keeper-gpt",
        client=dummy_client,
        temperature=0.2,
        nucleus_p=0.9,
        max_tokens=400,
    )

    as_of = datetime(2024, 6, 1, 17, 45, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        groups=(beta,),
        rituals={"Beta Circle": ({"name": "Insights review", "cadence": "Mondays"},)},
        escalations={
            "Beta Circle": (
                {"summary": "Confirm data warehouse sync", "owner": "Jordan"},
            )
        },
        status_overrides={"Beta Circle": "launching"},
        membership_overrides={"Beta Circle": 120},
        llm_configs=(config,),
        theme="Harden elite cohorts",
        context={"notes": ["Focus on engagement", "Align incentives"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "Harden elite cohorts"
    assert result.metrics["total_groups"] == 2
    assert result.metrics["active_groups"] == 2
    assert result.metrics["total_members"] == 300

    alpha_payload = next(group for group in result.groups if group["name"] == "Alpha Squad")
    assert alpha_payload["status"] == "active"
    assert alpha_payload["member_count"] == 180
    assert "priority" in alpha_payload["tags"]

    beta_payload = next(group for group in result.groups if group["name"] == "Beta Circle")
    assert beta_payload["status"] == "launching"
    assert beta_payload["member_count"] == 120
    assert beta_payload["channels"] == ["beta-changelog", "beta-office-hours"]

    assert any(ritual["group"] == "Alpha Squad" for ritual in result.rituals)
    assert any(ritual["group"] == "Beta Circle" for ritual in result.rituals)
    assert any(alert["group"] == "Beta Circle" for alert in result.escalations)

    assert result.llm_runs and result.llm_runs[0].name == "group-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "Harden elite cohorts" in result.metadata["prompt"]
    assert "Alpha Squad" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("2 groups")
    assert payload["metrics"]["total_members"] == 300


def test_group_keeper_requires_groups() -> None:
    keeper = DynamicGroupKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()

