from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterable, Mapping, Sequence

import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.awesome_api import AwesomeAPIAutoMetrics
from algorithms.python.awesome_sync import (
    AwesomeAlgoSyncEngine,
    AwesomeAlgoSyncRequest,
    AwesomeLLMInsights,
)
from algorithms.python.data_pipeline import InstrumentMeta, RawBar
from algorithms.python.multi_llm import LLMConfig
from algorithms.python.trade_logic import MarketSnapshot


class StubAwesomeClient:
    def __init__(self, bars_map: Mapping[str, Sequence[RawBar]]) -> None:
        self._bars_map = {key: list(value) for key, value in bars_map.items()}

    def fetch_bars(self, pair: str, *, limit: int) -> Sequence[RawBar]:
        bars = self._bars_map.get(pair, [])
        if not bars:
            return []
        return bars[-limit:]


class StubIngestionJob:
    def run(self, bars: Iterable[RawBar], instrument: InstrumentMeta) -> list[MarketSnapshot]:
        snapshots: list[MarketSnapshot] = []
        for bar in bars:
            snapshots.append(
                MarketSnapshot(
                    symbol=instrument.symbol,
                    timestamp=bar.timestamp,
                    close=bar.close,
                    rsi_fast=55.0,
                    adx_fast=22.0,
                    rsi_slow=52.0,
                    adx_slow=24.0,
                    pip_size=instrument.pip_size,
                    pip_value=instrument.pip_value,
                )
            )
        return snapshots


@dataclass(slots=True)
class StubMetricsCalculator:
    def compute_metrics(
        self,
        pair: str,
        *,
        history: int | None = None,
        bars: Sequence[RawBar] | None = None,
    ) -> AwesomeAPIAutoMetrics:
        assert bars is not None
        closes = [bar.close for bar in bars]
        highs = [bar.high for bar in bars]
        lows = [bar.low for bar in bars]
        latest_close = closes[-1]
        previous_close = closes[-2]
        absolute_change = latest_close - previous_close
        percentage_change = (absolute_change / previous_close) * 100
        average_close = sum(closes) / len(closes)
        price_range = max(highs) - min(lows)
        cumulative_return = (latest_close - closes[0]) / closes[0]
        deltas = [closes[idx] - closes[idx - 1] for idx in range(1, len(closes))]
        average_daily_change = sum(deltas) / len(deltas)
        return AwesomeAPIAutoMetrics(
            pair=pair,
            sample_size=len(bars),
            latest_close=latest_close,
            previous_close=previous_close,
            absolute_change=absolute_change,
            percentage_change=percentage_change,
            average_close=average_close,
            high=max(highs),
            low=min(lows),
            price_range=price_range,
            cumulative_return=cumulative_return,
            average_daily_change=average_daily_change,
            volatility=0.0,
            trend_strength=0.0,
        )


class StubCompletionClient:
    def __init__(self, response: str) -> None:
        self.response = response
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
        return self.response


def build_bars(symbol: str, start: datetime, *, count: int) -> list[RawBar]:
    bars: list[RawBar] = []
    for idx in range(count):
        timestamp = start + timedelta(hours=idx)
        base = 1.1 + 0.01 * idx
        bars.append(
            RawBar(
                timestamp=timestamp,
                open=base,
                high=base + 0.002,
                low=base - 0.002,
                close=base + 0.001,
                volume=1000.0 + idx,
            )
        )
    return bars


def test_sync_engine_generates_llm_summary() -> None:
    bars = build_bars("EURUSD", datetime(2024, 1, 1, tzinfo=UTC), count=6)
    client = StubAwesomeClient({"EURUSD": bars})
    job = StubIngestionJob()
    calculator = StubMetricsCalculator()

    primary_client = StubCompletionClient(
        '{"summary": "Maintain bullish bias", "actions": ["scale into longs"], "opportunities": ["Breakout above 1.12"], "alerts": ["Watch CPI"]}'
    )
    secondary_client = StubCompletionClient(
        '{"narrative": "Volatility cooling", "risks": ["Reversal if DXY rallies"], "highlights": ["Momentum steady"]}'
    )

    engine = AwesomeAlgoSyncEngine(
        client=client,
        job=job,
        calculator=calculator,
        llm_configs=(
            LLMConfig(
                name="primary",
                client=primary_client,
                temperature=0.2,
                nucleus_p=0.9,
                max_tokens=256,
            ),
            LLMConfig(
                name="secondary",
                client=secondary_client,
                temperature=0.15,
                nucleus_p=0.85,
                max_tokens=256,
            ),
        ),
        history=6,
    )

    request = AwesomeAlgoSyncRequest(
        pairs=["EURUSD", "EURUSD"],
        instruments={
            "EURUSD": InstrumentMeta(symbol="EURUSD", pip_size=0.0001, pip_value=10.0)
        },
        metadata={"source": "unit-test"},
        context={"macro": {"usd": "soft"}},
        notes=("Focus on breakout", ""),
    )

    report = engine.sync(request)

    assert "EURUSD" in report.snapshots
    assert report.metrics["EURUSD"].latest_close == pytest.approx(bars[-1].close)
    assert report.errors == {}
    assert report.prompt_payload["metadata"]["source"] == "unit-test"
    assert report.prompt_payload["context"]["macro"]["usd"] == "soft"

    assert isinstance(report.insights, AwesomeLLMInsights)
    assert report.insights.summary == "Maintain bullish bias"
    assert report.insights.actions == ["scale into longs"]
    assert report.insights.opportunities == ["Breakout above 1.12"]
    assert report.insights.risks == ["Reversal if DXY rallies"]
    assert report.insights.alerts == ["Watch CPI"]
    assert report.insights.highlights == ["Momentum steady"]

    assert "primary" in report.llm_payloads
    assert "secondary" in report.llm_payloads
    assert report.raw_llm_responses is not None
    assert primary_client.prompts and secondary_client.prompts


def test_sync_engine_handles_missing_instrument_gracefully() -> None:
    bars = build_bars("GBPUSD", datetime(2024, 1, 1, tzinfo=UTC), count=4)
    client = StubAwesomeClient({"GBPUSD": bars})
    job = StubIngestionJob()
    calculator = StubMetricsCalculator()
    engine = AwesomeAlgoSyncEngine(client=client, job=job, calculator=calculator, llm_configs=())

    request = AwesomeAlgoSyncRequest(pairs=["GBPUSD"], instruments={})
    report = engine.sync(request)

    assert report.snapshots == {}
    assert report.metrics == {}
    assert "GBPUSD" in report.errors
    assert report.llm_runs == ()
    assert report.insights is None


def test_request_requires_history_window() -> None:
    with pytest.raises(ValueError):
        AwesomeAlgoSyncRequest(pairs=["USDJPY"], instruments={}, history=1)

