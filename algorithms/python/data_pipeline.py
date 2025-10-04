"""Historical data ingestion utilities for Dynamic Capital trading models."""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import date, datetime
from operator import attrgetter
from pathlib import Path
from typing import TYPE_CHECKING, Iterable, List, Optional, Sequence, Tuple

from .trade_logic import MarketSnapshot

if TYPE_CHECKING:  # pragma: no cover - typing only
    from .mechanical_analysis import MechanicalAnalysisCalculator, MechanicalMetrics


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


def _compute_rsi_multi(closes: Sequence[float], periods: Iterable[int]) -> dict[int, List[Optional[float]]]:
    unique_periods = sorted({int(period) for period in periods})
    if not unique_periods:
        raise ValueError("at least one RSI period is required")
    if any(period <= 0 for period in unique_periods):
        raise ValueError("RSI period must be positive")

    total = len(closes)
    results: dict[int, List[Optional[float]]] = {period: [None] * total for period in unique_periods}
    if total == 0:
        return results

    class _RsiState:
        __slots__ = ("period", "gain_sum", "loss_sum", "avg_gain", "avg_loss")

        def __init__(self, period: int) -> None:
            self.period = period
            self.gain_sum = 0.0
            self.loss_sum = 0.0
            self.avg_gain = 0.0
            self.avg_loss = 0.0

    states = [_RsiState(period) for period in unique_periods]

    def _rsi_from_averages(avg_gain: float, avg_loss: float) -> float:
        if avg_loss == 0:
            rs = math.inf
        else:
            rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    for idx in range(1, total):
        change = closes[idx] - closes[idx - 1]
        gain = change if change > 0 else 0.0
        loss = -change if change < 0 else 0.0

        for state in states:
            if idx <= state.period:
                state.gain_sum += gain
                state.loss_sum += loss
                if idx == state.period:
                    state.avg_gain = state.gain_sum / state.period
                    state.avg_loss = state.loss_sum / state.period
                    results[state.period][idx] = _rsi_from_averages(state.avg_gain, state.avg_loss)
                continue

            state.avg_gain = (state.avg_gain * (state.period - 1) + gain) / state.period
            state.avg_loss = (state.avg_loss * (state.period - 1) + loss) / state.period
            results[state.period][idx] = _rsi_from_averages(state.avg_gain, state.avg_loss)

    return results


def _compute_rsi(closes: Sequence[float], period: int) -> List[Optional[float]]:
    return _compute_rsi_multi(closes, [period])[period]


def _compute_adx_multi(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    periods: Iterable[int],
) -> dict[int, List[Optional[float]]]:
    if not (len(highs) == len(lows) == len(closes)):
        raise ValueError("High, low, and close series must share the same length")

    unique_periods = sorted({int(period) for period in periods})
    if not unique_periods:
        raise ValueError("at least one ADX period is required")
    if any(period <= 0 for period in unique_periods):
        raise ValueError("ADX period must be positive")

    total = len(closes)
    results: dict[int, List[Optional[float]]] = {period: [None] * total for period in unique_periods}
    if total == 0:
        return results

    class _AdxState:
        __slots__ = ("period", "tr_sum", "plus_dm_sum", "minus_dm_sum", "adx")

        def __init__(self, period: int) -> None:
            self.period = period
            self.tr_sum = 0.0
            self.plus_dm_sum = 0.0
            self.minus_dm_sum = 0.0
            self.adx = 0.0

    states = [_AdxState(period) for period in unique_periods]

    def _true_range(idx: int, prev_close: float) -> float:
        high = highs[idx]
        low = lows[idx]
        return max(high - low, abs(high - prev_close), abs(low - prev_close))

    def _di_values(tr_sum: float, plus_dm_sum: float, minus_dm_sum: float) -> tuple[float, float]:
        if tr_sum == 0:
            return 0.0, 0.0
        plus_di = 100 * (plus_dm_sum / tr_sum)
        minus_di = 100 * (minus_dm_sum / tr_sum)
        return plus_di, minus_di

    for idx in range(1, total):
        up_move = highs[idx] - highs[idx - 1]
        down_move = lows[idx - 1] - lows[idx]
        plus_dm = up_move if up_move > down_move and up_move > 0 else 0.0
        minus_dm = down_move if down_move > up_move and down_move > 0 else 0.0
        tr = _true_range(idx, closes[idx - 1])

        for state in states:
            if idx <= state.period:
                state.plus_dm_sum += plus_dm
                state.minus_dm_sum += minus_dm
                state.tr_sum += tr
                if idx == state.period:
                    plus_di, minus_di = _di_values(state.tr_sum, state.plus_dm_sum, state.minus_dm_sum)
                    di_diff = abs(plus_di - minus_di)
                    di_sum = plus_di + minus_di
                    dx = 0.0 if di_sum == 0 else (di_diff / di_sum) * 100
                    state.adx = dx
                    results[state.period][idx] = state.adx
                continue

            state.plus_dm_sum = state.plus_dm_sum - (state.plus_dm_sum / state.period) + plus_dm
            state.minus_dm_sum = state.minus_dm_sum - (state.minus_dm_sum / state.period) + minus_dm
            state.tr_sum = state.tr_sum - (state.tr_sum / state.period) + tr

            plus_di, minus_di = _di_values(state.tr_sum, state.plus_dm_sum, state.minus_dm_sum)
            di_diff = abs(plus_di - minus_di)
            di_sum = plus_di + minus_di
            dx = 0.0 if di_sum == 0 else (di_diff / di_sum) * 100
            state.adx = (state.adx * (state.period - 1) + dx) / state.period
            results[state.period][idx] = state.adx

    return results


def _compute_adx(
    highs: Sequence[float],
    lows: Sequence[float],
    closes: Sequence[float],
    period: int,
) -> List[Optional[float]]:
    return _compute_adx_multi(highs, lows, closes, [period])[period]


class MarketDataIngestionJob:
    """Builds :class:`MarketSnapshot` rows from historical OHLC data."""

    def __init__(
        self,
        *,
        rsi_fast: int = 9,
        rsi_slow: int = 14,
        adx_fast: int = 9,
        adx_slow: int = 14,
        mechanical_calculator: Optional["MechanicalAnalysisCalculator"] = None,
    ) -> None:
        self.rsi_fast = rsi_fast
        self.rsi_slow = rsi_slow
        self.adx_fast = adx_fast
        self.adx_slow = adx_slow
        if mechanical_calculator is None:
            from .mechanical_analysis import MechanicalAnalysisCalculator

            self.mechanical_calculator = MechanicalAnalysisCalculator()
        else:
            self.mechanical_calculator = mechanical_calculator

    def run(self, bars: Iterable[RawBar], instrument: InstrumentMeta) -> List[MarketSnapshot]:
        rows: List[RawBar] = sorted(bars, key=attrgetter("timestamp"))
        if not rows:
            return []
        closes = [row.close for row in rows]
        highs = [row.high for row in rows]
        lows = [row.low for row in rows]

        rsi_map = _compute_rsi_multi(closes, (self.rsi_fast, self.rsi_slow))
        adx_map = _compute_adx_multi(highs, lows, closes, (self.adx_fast, self.adx_slow))
        rsi_fast_values = rsi_map[self.rsi_fast]
        rsi_slow_values = rsi_map[self.rsi_slow]
        adx_fast_values = adx_map[self.adx_fast]
        adx_slow_values = adx_map[self.adx_slow]

        mechanical_map: dict[datetime, "MechanicalMetrics"] = {}
        if len(rows) >= 4:
            series = self.mechanical_calculator.compute_series(
                instrument.symbol, bars=rows
            )
            mechanical_map = {timestamp: metrics for timestamp, metrics in series}

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
                if daily_high is None:
                    daily_high = bar.high
                else:
                    daily_high = max(daily_high, bar.high)
                if daily_low is None:
                    daily_low = bar.low
                else:
                    daily_low = min(daily_low, bar.low)

            if week_key != current_week:
                if current_week is not None:
                    previous_week_high = weekly_high
                    previous_week_low = weekly_low
                current_week = week_key
                weekly_high = bar.high
                weekly_low = bar.low
            else:
                if weekly_high is None:
                    weekly_high = bar.high
                else:
                    weekly_high = max(weekly_high, bar.high)
                if weekly_low is None:
                    weekly_low = bar.low
                else:
                    weekly_low = min(weekly_low, bar.low)

            rsi_fast = rsi_fast_values[idx]
            rsi_slow = rsi_slow_values[idx]
            adx_fast = adx_fast_values[idx]
            adx_slow = adx_slow_values[idx]
            if None in (rsi_fast, rsi_slow, adx_fast, adx_slow):
                continue
            mechanical = mechanical_map.get(bar.timestamp)
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
                    mechanical_velocity=mechanical.velocity if mechanical else None,
                    mechanical_acceleration=(
                        mechanical.acceleration if mechanical else None
                    ),
                    mechanical_jerk=mechanical.jerk if mechanical else None,
                    mechanical_energy=mechanical.energy if mechanical else None,
                    mechanical_stress_ratio=(
                        mechanical.stress_ratio if mechanical else None
                    ),
                    mechanical_state=mechanical.state if mechanical else None,
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
