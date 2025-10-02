"""Integration tests for the macro-aware dynamic prompt stack."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

import asyncio
import pytest

from dynamic_crawl import DynamicCrawler, FetchPayload
from dynamic_macro_builder import build_macro_agent, build_macro_bot, build_macro_engine
from dynamic_macro_crawler import gather_macro_pages
from dynamic_macro_keeper import MacroMemoryKeeper
from dynamic_macro_model import MacroContext, MacroSignal


@pytest.fixture()
def sample_signals() -> list[MacroSignal]:
    return [
        MacroSignal(name="GDP growth", value="2.4%", weight=0.8, narrative="Expansion continues"),
        MacroSignal(name="CPI", value="3.4%", weight=1.0, narrative="Inflation sticky"),
        MacroSignal(name="Unemployment", value="4.1%", weight=0.6, narrative="Labour market softening"),
    ]


def test_dynamic_macro_engine_renders_brief(sample_signals: list[MacroSignal]) -> None:
    context = MacroContext(
        persona="Macro Navigator",
        objectives=["Assess inflation trajectory", "Monitor employment"],
        signals=sample_signals,
        actions=["Highlight inflation persistence"],
        timeframe="Q2 2024",
    )

    engine = build_macro_engine()
    agent = build_macro_agent(engine=engine)

    rendered = agent.build_brief(context)
    formatted = rendered.to_formatted_string()

    assert "Macro Navigator" in formatted
    assert "inflation" in formatted.lower()
    assert "GDP growth" in formatted


def test_macro_keeper_tracks_history(sample_signals: list[MacroSignal]) -> None:
    keeper = MacroMemoryKeeper(max_history=2)

    first = MacroContext(
        persona="Macro Strategist",
        objectives=["Monitor inflation"],
        signals=sample_signals,
        timeframe="Q1",
    )
    second = MacroContext(
        persona="Macro Strategist",
        objectives=["Assess employment"],
        signals=sample_signals[1:],
        timeframe="Q2",
    )

    keeper.record(first)
    keeper.record(second)

    layer = keeper.to_context_layer()
    assert "historical_context" in layer
    assert "T-1" in layer["historical_context"]
    assert "inflation" in layer["historical_context"].lower()


def test_macro_bot_cycle_updates_keeper(sample_signals: list[MacroSignal]) -> None:
    bot = build_macro_bot(history=3)
    context = MacroContext(
        persona="Macro Strategist",
        objectives=["Track inflation"],
        signals=sample_signals,
        timeframe="Weekly",
    )

    rendered = bot.run_cycle(context)
    assert bot.keeper.latest() is not None
    assert "Track inflation" in rendered.to_formatted_string()


def test_gather_macro_pages_uses_custom_crawler() -> None:
    async def fake_fetcher(url: str) -> FetchPayload:
        return FetchPayload(status_code=200, headers={}, content=f"payload:{url}".encode(), elapsed=0.01)

    crawler = DynamicCrawler(
        max_depth=0,
        fetcher=fake_fetcher,
        link_extractor=lambda result: [],
    )

    results = asyncio.run(gather_macro_pages(["https://macro.test"], crawler=crawler))
    assert "https://macro.test" in results
    assert results["https://macro.test"].status_code == 200
    assert "payload" in results["https://macro.test"].text()
