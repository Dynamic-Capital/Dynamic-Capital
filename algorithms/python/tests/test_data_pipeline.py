from __future__ import annotations

from datetime import datetime, timedelta, timezone

from algorithms.python.data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar


def _build_bars_with_zero_low() -> list[RawBar]:
    start = datetime(2024, 3, 4, tzinfo=timezone.utc)
    bars: list[RawBar] = []
    price = 1.5
    # Build enough history within a single week to exercise indicator calculations.
    for idx in range(20):
        timestamp = start + timedelta(minutes=idx * 5)
        open_price = price
        close_price = price + 0.05
        high = max(open_price, close_price) + 0.3
        low = 0.0 if idx == 0 else 0.4
        bars.append(
            RawBar(
                timestamp=timestamp,
                open=open_price,
                high=high,
                low=low,
                close=close_price,
            )
        )
        price = close_price

    # Extend into the next day to verify previous-day tracking is preserved.
    next_day = start + timedelta(days=1)
    for idx in range(6):
        timestamp = next_day + timedelta(minutes=idx * 5)
        open_price = price
        close_price = price + 0.07
        high = max(open_price, close_price) + 0.25
        low = 0.6
        bars.append(
            RawBar(
                timestamp=timestamp,
                open=open_price,
                high=high,
                low=low,
                close=close_price,
            )
        )
        price = close_price

    return bars


def test_market_data_ingestion_preserves_zero_low_values() -> None:
    job = MarketDataIngestionJob()
    instrument = InstrumentMeta(symbol="XAUUSD", pip_size=0.1, pip_value=1.0)
    bars = _build_bars_with_zero_low()

    snapshots = job.run(bars, instrument)
    assert snapshots, "expected snapshots to be generated"

    day_one = bars[0].timestamp.date()
    day_two = day_one + timedelta(days=1)

    day_one_snapshots = [snap for snap in snapshots if snap.timestamp.date() == day_one]
    assert day_one_snapshots, "expected at least one snapshot on the first day"
    final_day_one_snapshot = max(day_one_snapshots, key=lambda snap: snap.timestamp)
    assert final_day_one_snapshot.daily_low == 0.0
    assert final_day_one_snapshot.weekly_low == 0.0

    day_two_snapshots = [snap for snap in snapshots if snap.timestamp.date() == day_two]
    assert day_two_snapshots, "expected at least one snapshot on the second day"
    first_day_two_snapshot = min(day_two_snapshots, key=lambda snap: snap.timestamp)
    assert first_day_two_snapshot.previous_daily_low == 0.0
    assert first_day_two_snapshot.weekly_low == 0.0
