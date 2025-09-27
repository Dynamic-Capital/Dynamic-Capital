from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.channel_keeper import (  # noqa: E402
    BroadcastChannel,
    DynamicChannelKeeperAlgorithm,
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
                "guidance": "Balance launch cadence with delivery reliability.",
                "recommendations": ["Confirm Twitter cross-posting", "Audit TON updates"],
            }
        )


def test_channel_keeper_sync_tracks_channels_and_campaigns() -> None:
    keeper = DynamicChannelKeeperAlgorithm()
    signals = BroadcastChannel(
        name="Signals Channel",
        platform="Telegram",
        owner="Operations Desk",
        cadence="Daily",
        format="Short-form alerts",
        status="live",
        audience_count=12000,
        focus="Trade execution alerts",
        managers=("Ava", "Noah"),
        distribution=("telegram", "email-digest"),
        tags=("priority", "alpha"),
        priority=10,
    )
    keeper.register_channel(signals)
    keeper.register_campaign(
        "Signals Channel",
        {"name": "Liquidity sprint", "window": "Jun 3-7", "owner": "Ava"},
    )
    keeper.register_alert(
        "Signals Channel",
        {"issue": "Investigate delivery latency", "severity": "high"},
    )

    briefing = BroadcastChannel(
        name="Desk Briefing",
        platform="YouTube",
        owner="Media Studio",
        cadence="Weekly",
        format="Video recap",
        status="planning",
        audience_count=4800,
        focus="Macro and desk updates",
        managers=("Liam",),
        distribution=("youtube", "podcast"),
        tags=("macro", "community"),
        priority=7,
    )

    dummy_client = DummyClient()
    config = LLMConfig(
        name="channel-keeper-gpt",
        client=dummy_client,
        temperature=0.15,
        nucleus_p=0.92,
        max_tokens=450,
    )

    as_of = datetime(2024, 6, 2, 9, 30, tzinfo=timezone.utc)
    result = keeper.sync(
        as_of=as_of,
        channels=(briefing,),
        campaigns={
            "Desk Briefing": (
                {"name": "Launch countdown", "schedule": "Jun 10", "owner": "Liam"},
            )
        },
        alerts={
            "Desk Briefing": (
                {"summary": "Confirm studio availability", "owner": "Liam"},
            )
        },
        status_overrides={"Desk Briefing": "launching"},
        audience_overrides={"Desk Briefing": 5200},
        llm_configs=(config,),
        theme="Amplify liquidity messaging",
        context={"notes": ["Cross-post on Twitter", "Highlight TON flows"]},
    )

    assert result.timestamp == as_of
    assert result.theme == "Amplify liquidity messaging"
    assert result.metrics["total_channels"] == 2
    assert result.metrics["live_channels"] == 2
    assert result.metrics["total_audience"] == 17200

    signals_payload = next(channel for channel in result.channels if channel["name"] == "Signals Channel")
    assert signals_payload["status"] == "live"
    assert signals_payload["audience_count"] == 12000
    assert "telegram" in signals_payload["distribution"]

    briefing_payload = next(channel for channel in result.channels if channel["name"] == "Desk Briefing")
    assert briefing_payload["status"] == "launching"
    assert briefing_payload["audience_count"] == 5200
    assert briefing_payload["cadence"] == "Weekly"

    assert any(campaign["channel"] == "Signals Channel" for campaign in result.campaigns)
    assert any(campaign["channel"] == "Desk Briefing" for campaign in result.campaigns)
    assert any(alert["channel"] == "Desk Briefing" for alert in result.alerts)

    assert result.llm_runs and result.llm_runs[0].name == "channel-keeper-gpt"
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]
    assert "Amplify liquidity messaging" in result.metadata["prompt"]
    assert "Signals Channel" in result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["timestamp"] == as_of.isoformat()
    assert payload["summary"].startswith("2 channels")
    assert payload["metrics"]["total_audience"] == 17200


def test_channel_keeper_requires_channels() -> None:
    keeper = DynamicChannelKeeperAlgorithm()
    with pytest.raises(ValueError):
        keeper.sync()

