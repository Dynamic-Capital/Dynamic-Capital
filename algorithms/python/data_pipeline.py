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
    total = len(closes)
    rsis: List[Optional[float]] = [None] * total
    if total <= period:
        return rsis

    gain_sum = 0.0
    loss_sum = 0.0
    for idx in range(1, period + 1):
        change = closes[idx] - closes[idx - 1]
        if change >= 0:
            gain_sum += change
        else:
            loss_sum -= change
    avg_gain = gain_sum / period
    avg_loss = loss_sum / period

    def _rsi_from_averages(avg_gain: float, avg_loss: float) -> float:
        if avg_loss == 0:
            rs = math.inf
        else:
            rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    rsis[period] = _rsi_from_averages(avg_gain, avg_loss)

    for idx in range(period + 1, total):
        change = closes[idx] - closes[idx - 1]
        gain = change if change > 0 else 0.0
        loss = -change if change < 0 else 0.0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        rsis[idx] = _rsi_from_averages(avg_gain, avg_loss)
    return rsis


def _compute_adx(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int,
) -> List[Optional[float]]:
    if period <= 0:
        raise ValueError("ADX period must be positive")
    if not (len(highs) == len(lows) == len(closes)):
        raise ValueError("High, low, and close series must share the same length")
    total = len(closes)
    adx_values: List[Optional[float]] = [None] * total
    if total <= period:
        return adx_values

    tr_sum = 0.0
    plus_dm_sum = 0.0
    minus_dm_sum = 0.0

    def _true_range(idx: int, prev_close: float) -> float:
        high = highs[idx]
        low = lows[idx]
        return max(high - low, abs(high - prev_close), abs(low - prev_close))

    for idx in range(1, period + 1):
        up_move = highs[idx] - highs[idx - 1]
        down_move = lows[idx - 1] - lows[idx]
        plus_dm = up_move if up_move > down_move and up_move > 0 else 0.0
        minus_dm = down_move if down_move > up_move and down_move > 0 else 0.0
        tr = _true_range(idx, closes[idx - 1])
        plus_dm_sum += plus_dm
        minus_dm_sum += minus_dm
        tr_sum += tr

    def _di_values(tr_sum: float, plus_dm_sum: float, minus_dm_sum: float) -> tuple[float, float]:
        if tr_sum == 0:
            return 0.0, 0.0
        plus_di = 100 * (plus_dm_sum / tr_sum)
        minus_di = 100 * (minus_dm_sum / tr_sum)
        return plus_di, minus_di

    plus_di, minus_di = _di_values(tr_sum, plus_dm_sum, minus_dm_sum)
    di_diff = abs(plus_di - minus_di)
    di_sum = plus_di + minus_di
    dx = 0.0 if di_sum == 0 else (di_diff / di_sum) * 100
    adx = dx
    adx_values[period] = adx

    for idx in range(period + 1, total):
        up_move = highs[idx] - highs[idx - 1]
        down_move = lows[idx - 1] - lows[idx]
        plus_dm = up_move if up_move > down_move and up_move > 0 else 0.0
        minus_dm = down_move if down_move > up_move and down_move > 0 else 0.0
        tr = _true_range(idx, closes[idx - 1])

        plus_dm_sum = plus_dm_sum - (plus_dm_sum / period) + plus_dm
        minus_dm_sum = minus_dm_sum - (minus_dm_sum / period) + minus_dm
        tr_sum = tr_sum - (tr_sum / period) + tr

        plus_di, minus_di = _di_values(tr_sum, plus_dm_sum, minus_dm_sum)
        di_diff = abs(plus_di - minus_di)
        di_sum = plus_di + minus_di
        dx = 0.0 if di_sum == 0 else (di_diff / di_sum) * 100
        adx = (adx * (period - 1) + dx) / period
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
