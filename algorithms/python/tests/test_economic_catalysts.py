from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from algorithms.python.awesome_api import AwesomeAPIAutoCalculator
from algorithms.python.data_pipeline import RawBar
from algorithms.python.economic_catalysts import (
    EconomicCatalystGenerator,
    EconomicCatalystSyncJob,
)


@pytest.fixture
def sample_bars() -> list[RawBar]:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    closes = [5.0, 5.1, 5.05, 5.3, 5.4, 5.6]
    bars: list[RawBar] = []
    for idx, close in enumerate(closes):
        moment = start + timedelta(hours=idx)
        bars.append(
            RawBar(
                timestamp=moment,
                open=close - 0.05,
                high=close + 0.07,
                low=close - 0.09,
                close=close,
                volume=1_000 + idx,
            )
        )
    return bars


def test_generator_builds_high_impact_catalyst(sample_bars: list[RawBar]) -> None:
    calculator = AwesomeAPIAutoCalculator()
    metrics = calculator.compute_metrics("USD-BRL", bars=sample_bars)
    generator = EconomicCatalystGenerator()

    observed_at = sample_bars[-1].timestamp
    catalyst = generator.build(
        "USD-BRL",
        metrics,
        observed_at,
        market_focus=("LatAm FX",),
    )

    assert catalyst.impact == "High"
    assert "USD-BRL" in catalyst.headline
    assert "LatAm FX" in catalyst.market_focus
    assert "USD-BRL" in catalyst.market_focus
    assert catalyst.metrics["percentage_change"] == pytest.approx(metrics.percentage_change)


def test_generator_handles_muted_move(sample_bars: list[RawBar]) -> None:
    flat_bars = [bar for bar in sample_bars[:3]]
    flat_bars.append(
        RawBar(
            timestamp=flat_bars[-1].timestamp + timedelta(hours=1),
            open=flat_bars[-1].close,
            high=flat_bars[-1].close + 0.01,
            low=flat_bars[-1].close - 0.01,
            close=flat_bars[-1].close + 0.001,
            volume=1_500,
        )
    )
    calculator = AwesomeAPIAutoCalculator()
    metrics = calculator.compute_metrics("EUR-USD", bars=flat_bars)
    generator = EconomicCatalystGenerator()

    catalyst = generator.build(
        "EUR-USD",
        metrics,
        flat_bars[-1].timestamp,
    )

    assert catalyst.impact == "Low"
    assert "flat" in catalyst.headline.lower()


def test_sync_job_upserts_rows(sample_bars: list[RawBar]) -> None:
    class StubClient:
        def __init__(self) -> None:
            self.calls: list[tuple[str, int]] = []

        def fetch_bars(self, pair: str, *, limit: int) -> list[RawBar]:
            self.calls.append((pair, limit))
            assert pair == "USD-BRL"
            assert limit == 32
            return list(sample_bars)

    class StubWriter:
        def __init__(self) -> None:
            self.rows: list[dict[str, object]] | None = None

        def upsert(self, rows):
            self.rows = [dict(row) for row in rows]
            return len(self.rows)

    calculator = AwesomeAPIAutoCalculator(client=StubClient())
    writer = StubWriter()
    job = EconomicCatalystSyncJob(
        pairs={"USD-BRL": ("USD", "BRL")},
        writer=writer,
        calculator=calculator,
        history=32,
    )

    count = job.run()

    assert count == 1
    assert writer.rows is not None
    payload = writer.rows[0]
    assert payload["pair"] == "USD-BRL"
    assert payload["observed_at"] == sample_bars[-1].timestamp
    assert payload["market_focus"] == ["USD", "BRL", "USD-BRL"]
    assert "awesomeapi" == payload["source"]


def test_sync_job_handles_fetch_errors() -> None:
    class FailingClient:
        def fetch_bars(self, pair: str, *, limit: int):  # pragma: no cover - defensive
            raise RuntimeError("boom")

    class StubWriter:
        def upsert(self, rows):  # pragma: no cover - defensive
            raise AssertionError("upsert should not be called")

    calculator = AwesomeAPIAutoCalculator(client=FailingClient())
    job = EconomicCatalystSyncJob(
        pairs={"USD-BRL": ("USD", "BRL")},
        writer=StubWriter(),
        calculator=calculator,
        history=16,
    )

    assert job.run() == 0
