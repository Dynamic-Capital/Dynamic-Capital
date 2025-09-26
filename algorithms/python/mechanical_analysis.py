"""Mechanical analysis utilities derived from AwesomeAPI price history."""

from __future__ import annotations

import statistics
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Sequence, Tuple

from .awesome_api import AwesomeAPIClient, AwesomeAPIError, DEFAULT_HISTORY
from .data_pipeline import RawBar

State = str


@dataclass(frozen=True, slots=True)
class MechanicalMetrics:
    """Physics-inspired analytics computed from market price action."""

    pair: str
    timestamp: datetime
    velocity: float
    acceleration: float
    jerk: float
    energy: float
    stress_ratio: float
    state: State


def _classify_state(velocity: float, acceleration: float, jerk: float) -> State:
    """Return a qualitative state using velocity and acceleration thresholds."""

    threshold = 1e-6
    if velocity > threshold and acceleration > threshold:
        return "Bullish"
    if velocity < -threshold and acceleration < -threshold:
        return "Bearish"
    if abs(jerk) > abs(acceleration) and abs(jerk) > threshold:
        return "Turbulent"
    return "Neutral"


def _ensure_minimum_history(pair: str, bars: Sequence[RawBar]) -> None:
    if len(bars) < 4:
        raise AwesomeAPIError(
            f"AwesomeAPI returned insufficient history for {pair}; need at least 4 bars"
        )


def _velocities(closes: Sequence[float]) -> List[float]:
    return [closes[idx] - closes[idx - 1] for idx in range(1, len(closes))]


@dataclass(slots=True)
class MechanicalAnalysisCalculator:
    """Calculate mechanical metrics from AwesomeAPI OHLCV data."""

    client: AwesomeAPIClient = field(default_factory=AwesomeAPIClient)
    history: int = DEFAULT_HISTORY

    def compute_metrics(
        self,
        pair: str,
        *,
        history: int | None = None,
        bars: Sequence[RawBar] | None = None,
    ) -> MechanicalMetrics:
        """Fetch (or use supplied) bars and compute the latest mechanical metrics."""

        series = self._obtain_bars(pair, history=history, bars=bars)
        return self._latest_metrics(pair, series)

    def compute_series(
        self,
        pair: str,
        *,
        history: int | None = None,
        bars: Sequence[RawBar] | None = None,
    ) -> List[Tuple[datetime, MechanicalMetrics]]:
        """Return timestamps paired with mechanical metrics across the series."""

        series = self._obtain_bars(pair, history=history, bars=bars)
        _ensure_minimum_history(pair, series)
        metrics_series: List[Tuple[datetime, MechanicalMetrics]] = []
        for idx in range(3, len(series)):
            window = series[: idx + 1]
            metrics = self._latest_metrics(pair, window)
            metrics_series.append((window[-1].timestamp, metrics))
        return metrics_series

    def _obtain_bars(
        self,
        pair: str,
        *,
        history: int | None,
        bars: Sequence[RawBar] | None,
    ) -> Sequence[RawBar]:
        if bars is not None:
            if not bars:
                raise ValueError("bars must be non-empty when provided explicitly")
            return list(bars)
        window = self.history if history is None else history
        if window < 4:
            raise ValueError("history must be at least 4 to compute mechanical metrics")
        return self.client.fetch_bars(pair, limit=window)

    def _latest_metrics(self, pair: str, bars: Sequence[RawBar]) -> MechanicalMetrics:
        _ensure_minimum_history(pair, bars)
        closes = [bar.close for bar in bars]
        velocities = _velocities(closes)
        accelerations = _velocities(velocities)
        latest_bar = bars[-1]

        velocity = velocities[-1]
        acceleration = accelerations[-1]
        previous_acceleration = accelerations[-2]
        jerk = acceleration - previous_acceleration

        volatility = statistics.pstdev(closes) if len(closes) > 1 else 0.0
        energy = 0.5 * (volatility ** 2)
        average_close = sum(closes) / len(closes)
        stress_ratio = (
            (latest_bar.high - latest_bar.low) / average_close if average_close else 0.0
        )
        state = _classify_state(velocity, acceleration, jerk)

        return MechanicalMetrics(
            pair=pair,
            timestamp=latest_bar.timestamp,
            velocity=velocity,
            acceleration=acceleration,
            jerk=jerk,
            energy=energy,
            stress_ratio=stress_ratio,
            state=state,
        )


__all__ = ["MechanicalMetrics", "MechanicalAnalysisCalculator"]
