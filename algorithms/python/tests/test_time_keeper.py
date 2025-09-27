from __future__ import annotations

import json
from datetime import datetime, time, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.time_keeper import (  # noqa: E402
    DynamicTimeKeeperAlgorithm,
    KillZone,
    MVT_TIMEZONE,
    TradingSession,
)
from algorithms.python.multi_llm import LLMConfig  # noqa: E402


class DummyClient:
    def __init__(self) -> None:
        self.prompts: list[str] = []

    def complete(self, prompt: str, *, temperature: float, max_tokens: int, nucleus_p: float) -> str:
        self.prompts.append(prompt)
        return json.dumps(
            {
                "guidance": "Maintain alignment across sessions.",
                "coordination_focus": ["London", "New York"],
                "highlights": ["London kill zone active"],
            }
        )


def test_time_keeper_sync_tracks_sessions_and_llm_runs() -> None:
    algo = DynamicTimeKeeperAlgorithm()
    london = TradingSession(
        market="London",
        open_time=time(7, 0),
        close_time=time(16, 0),
        timezone=timezone.utc,
        tags=("fx", "europe"),
        description="Core European session",
    )
    new_york = TradingSession(
        market="New York",
        open_time=time(13, 30),
        close_time=time(22, 0),
        timezone=timezone.utc,
        tags=("fx", "us"),
        description="US equities and FX overlap",
    )
    algo.register_session(london)

    london_kill_zone = KillZone(
        name="London Kill Zone",
        start=time(11, 30),
        end=time(13, 30),
        description="Heightened liquidity window",
    )
    algo.register_kill_zone(london_kill_zone)

    as_of = datetime(2024, 3, 12, 12, 30, tzinfo=MVT_TIMEZONE)
    dummy_client = DummyClient()
    config = LLMConfig(
        name="coordinator-gpt",
        client=dummy_client,
        temperature=0.1,
        nucleus_p=0.95,
        max_tokens=512,
    )

    result = algo.sync(
        as_of=as_of,
        theme="Momentum with macro hedges",
        algorithms=("market_advisory", "core_orchestration"),
        sessions=(new_york,),
        llm_configs=(config,),
    )

    assert result.desk_time == as_of
    assert result.theme == "Momentum with macro hedges"
    assert len(result.trading_windows) == 2
    london_window = next(window for window in result.trading_windows if window["market"] == "London")
    assert london_window["status"] == "active"
    assert london_window["duration_minutes"] == 540

    kill_zone_window = result.kill_zones[0]
    assert kill_zone_window["status"] == "active"
    assert kill_zone_window["duration_minutes"] == 120

    assert result.overlaps and result.overlaps[0]["markets"] == ["London", "New York"]
    assert result.overlaps[0]["start"].strftime("%H:%M") == "18:30"

    assert result.llm_runs and result.llm_runs[0].name == "coordinator-gpt"
    assert "Momentum with macro hedges" in result.metadata["prompt"]
    assert "Algorithms in scope" in result.metadata["prompt"]
    assert dummy_client.prompts and dummy_client.prompts[0] == result.metadata["prompt"]

    payload = result.to_dict()
    assert payload["desk_time"] == as_of.isoformat()
    assert payload["trading_windows"][0]["start"].endswith("+05:00")
    assert payload["llm_runs"][0]["model"] == "coordinator-gpt"


def test_time_keeper_requires_sessions() -> None:
    algo = DynamicTimeKeeperAlgorithm()
    with pytest.raises(ValueError):
        algo.sync()
