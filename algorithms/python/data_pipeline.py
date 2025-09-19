"""Historical data ingestion utilities for Dynamic Capital trading models."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple

from .trade_logic import MarketSnapshot


@dataclass(slots=True)
class RawBar:
    """Minimal OHLCV container used by the ingestion job."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0


@dataclass(slots=True)
class InstrumentMeta:
    """Instrument metadata required to mirror live feature inputs."""

    symbol: str
    pip_size: float
    pip_value: float


def _rolling_mean(values: Sequence[float]) -> float:
    return sum(values) / len(values)


def _compute_rsi(closes: Sequence[float], period: int) -> List[Optional[float]]:
    if period <= 0:
        raise ValueError("RSI period must be positive")
    rsis: List[Optional[float]] = [None] * len(closes)
    gains: List[float] = [0.0]
    losses: List[float] = [0.0]
    for idx in range(1, len(closes)):
        change = closes[idx] - closes[idx - 1]
        gains.append(max(change, 0.0))
        losses.append(abs(min(change, 0.0)))
    for idx in range(period, len(closes)):
        if idx == period:
            avg_gain = _rolling_mean(gains[1 : period + 1])
            avg_loss = _rolling_mean(losses[1 : period + 1])
        else:
            avg_gain = (avg_gain * (period - 1) + gains[idx]) / period  # type: ignore[name-defined]
            avg_loss = (avg_loss * (period - 1) + losses[idx]) / period  # type: ignore[name-defined]
        if avg_loss == 0:
            rs = math.inf
        else:
            rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        rsis[idx] = rsi
    return rsis


def _compute_adx(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int,
) -> List[Optional[float]]:
    if period <= 0:
        raise ValueError("ADX period must be positive")
    adx_values: List[Optional[float]] = [None] * len(closes)
    tr_values: List[float] = [0.0]
    plus_dm: List[float] = [0.0]
    minus_dm: List[float] = [0.0]
    for idx in range(1, len(closes)):
        high = highs[idx]
        low = lows[idx]
        prev_close = closes[idx - 1]
        up_move = high - highs[idx - 1]
        down_move = lows[idx - 1] - low
        plus_dm.append(up_move if up_move > down_move and up_move > 0 else 0.0)
        minus_dm.append(down_move if down_move > up_move and down_move > 0 else 0.0)
        true_range = max(high - low, abs(high - prev_close), abs(low - prev_close))
        tr_values.append(true_range)
    for idx in range(period, len(closes)):
        if idx == period:
            tr_sum = sum(tr_values[1 : period + 1])
            plus_dm_sum = sum(plus_dm[1 : period + 1])
            minus_dm_sum = sum(minus_dm[1 : period + 1])
        else:
            tr_sum = tr_sum - (tr_sum / period) + tr_values[idx]  # type: ignore[name-defined]
            plus_dm_sum = plus_dm_sum - (plus_dm_sum / period) + plus_dm[idx]  # type: ignore[name-defined]
            minus_dm_sum = minus_dm_sum - (minus_dm_sum / period) + minus_dm[idx]  # type: ignore[name-defined]
        if tr_sum == 0:
            plus_di = 0.0
            minus_di = 0.0
        else:
            plus_di = 100 * (plus_dm_sum / tr_sum)
            minus_di = 100 * (minus_dm_sum / tr_sum)
        di_diff = abs(plus_di - minus_di)
        di_sum = plus_di + minus_di
        dx = 0.0 if di_sum == 0 else (di_diff / di_sum) * 100
        if idx == period:
            adx = _rolling_mean([dx] * period)
        else:
            adx = (adx * (period - 1) + dx) / period  # type: ignore[name-defined]
        adx_values[idx] = adx
    return adx_values


class MarketDataIngestionJob:
    """Builds :class:`MarketSnapshot` rows from historical OHLC data."""

    def __init__(
        self,
        *,
        rsi_fast: int = 9,
        rsi_slow: int = 14,
        adx_fast: int = 9,
        adx_slow: int = 14,
    ) -> None:
        self.rsi_fast = rsi_fast
        self.rsi_slow = rsi_slow
        self.adx_fast = adx_fast
        self.adx_slow = adx_slow

    def run(self, bars: Iterable[RawBar], instrument: InstrumentMeta) -> List[MarketSnapshot]:
        rows = sorted(list(bars), key=lambda bar: bar.timestamp)
        closes = [row.close for row in rows]
        highs = [row.high for row in rows]
        lows = [row.low for row in rows]

        rsi_fast_values = _compute_rsi(closes, self.rsi_fast)
        rsi_slow_values = _compute_rsi(closes, self.rsi_slow)
        adx_fast_values = _compute_adx(highs, lows, closes, self.adx_fast)
        adx_slow_values = _compute_adx(highs, lows, closes, self.adx_slow)

        snapshots: List[MarketSnapshot] = []
        daily_high: Optional[float] = None
        daily_low: Optional[float] = None
        previous_daily_high: Optional[float] = None
        previous_daily_low: Optional[float] = None
        current_day: Optional[date] = None
        weekly_high: Optional[float] = None
        weekly_low: Optional[float] = None
        previous_week_high: Optional[float] = None
        previous_week_low: Optional[float] = None
        current_week: Optional[Tuple[int, int]] = None
        for idx, bar in enumerate(rows):
            snapshot_day = bar.timestamp.date()
            iso_calendar = bar.timestamp.isocalendar()
            week_key = (iso_calendar[0], iso_calendar[1])

            if snapshot_day != current_day:
                if current_day is not None:
                    previous_daily_high = daily_high
                    previous_daily_low = daily_low
                current_day = snapshot_day
                daily_high = bar.high
                daily_low = bar.low
            else:
                daily_high = max(daily_high or bar.high, bar.high)
                daily_low = min(daily_low or bar.low, bar.low)

            if week_key != current_week:
                if current_week is not None:
                    previous_week_high = weekly_high
                    previous_week_low = weekly_low
                current_week = week_key
                weekly_high = bar.high
                weekly_low = bar.low
            else:
                weekly_high = max(weekly_high or bar.high, bar.high)
                weekly_low = min(weekly_low or bar.low, bar.low)

            rsi_fast = rsi_fast_values[idx]
            rsi_slow = rsi_slow_values[idx]
            adx_fast = adx_fast_values[idx]
            adx_slow = adx_slow_values[idx]
            if None in (rsi_fast, rsi_slow, adx_fast, adx_slow):
                continue
            snapshots.append(
                MarketSnapshot(
                    symbol=instrument.symbol,
                    timestamp=bar.timestamp,
                    close=bar.close,
                    rsi_fast=float(rsi_fast),
                    adx_fast=float(adx_fast),
                    rsi_slow=float(rsi_slow),
                    adx_slow=float(adx_slow),
                    pip_size=instrument.pip_size,
                    pip_value=instrument.pip_value,
                    open=bar.open,
                    high=bar.high,
                    low=bar.low,
                    daily_high=daily_high,
                    daily_low=daily_low,
                    previous_daily_high=previous_daily_high,
                    previous_daily_low=previous_daily_low,
                    weekly_high=weekly_high,
                    weekly_low=weekly_low,
                    previous_week_high=previous_week_high,
                    previous_week_low=previous_week_low,
                )
            )
        return snapshots

    def save_csv(self, snapshots: Sequence[MarketSnapshot], output_path: Path) -> None:
        import csv

        output_path.parent.mkdir(parents=True, exist_ok=True)
        fieldnames = [
            "symbol",
            "timestamp",
            "close",
            "rsi_fast",
            "adx_fast",
            "rsi_slow",
            "adx_slow",
            "pip_size",
            "pip_value",
            "daily_high",
            "daily_low",
        ]
        with output_path.open("w", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=fieldnames)
            writer.writeheader()
            for snapshot in snapshots:
                writer.writerow(
                    {
                        "symbol": snapshot.symbol,
                        "timestamp": snapshot.timestamp.isoformat(),
                        "close": snapshot.close,
                        "rsi_fast": snapshot.rsi_fast,
                        "adx_fast": snapshot.adx_fast,
                        "rsi_slow": snapshot.rsi_slow,
                        "adx_slow": snapshot.adx_slow,
                        "pip_size": snapshot.pip_size,
                        "pip_value": snapshot.pip_value,
                        "daily_high": snapshot.daily_high,
                        "daily_low": snapshot.daily_low,
                    }
                )


__all__ = [
    "InstrumentMeta",
    "MarketDataIngestionJob",
    "RawBar",
]
