"""Elliott wave analytics powered by AwesomeAPI price history."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Iterable, List, Literal, Sequence, Tuple

from .awesome_api import AwesomeAPIClient, AwesomeAPIError, DEFAULT_HISTORY
from .data_pipeline import RawBar


WaveDirection = Literal["bullish", "bearish", "none"]
SwingType = Literal["high", "low"]


@dataclass(frozen=True, slots=True)
class ElliottSwing:
    """Swing high/low detected from the OHLC series."""

    index: int
    timestamp: datetime
    price: float
    kind: SwingType


@dataclass(frozen=True, slots=True)
class ElliottWaveReport:
    """Summary of Elliott wave conditions for a price series."""

    pair: str
    timestamp: datetime
    latest_price: float
    swings: Tuple[ElliottSwing, ...]
    impulse_confirmed: bool
    impulse_direction: WaveDirection
    impulse_score: float
    corrective_confirmed: bool
    corrective_direction: WaveDirection
    corrective_score: float


def _ensure_minimum_bars(pair: str, bars: Sequence[RawBar], pivot_lookback: int) -> None:
    minimum = max(pivot_lookback * 2 + 3, 10)
    if len(bars) < minimum:
        raise AwesomeAPIError(
            f"AwesomeAPI returned insufficient history for {pair}; need at least {minimum} bars",
        )


def _sorted_bars(bars: Iterable[RawBar]) -> List[RawBar]:
    return sorted(bars, key=lambda bar: bar.timestamp)


def _append_swing(swings: List[ElliottSwing], candidate: ElliottSwing) -> None:
    if not swings:
        swings.append(candidate)
        return

    last = swings[-1]
    if last.kind == candidate.kind:
        is_more_extreme = (
            candidate.price > last.price if candidate.kind == "high" else candidate.price < last.price
        )
        if is_more_extreme:
            swings[-1] = candidate
        return

    swings.append(candidate)


def _extract_swings(bars: Sequence[RawBar], pivot_lookback: int) -> List[ElliottSwing]:
    closes = [bar.close for bar in bars]
    swings: List[ElliottSwing] = []
    total = len(bars)
    for idx in range(pivot_lookback, total - pivot_lookback):
        window = closes[idx - pivot_lookback : idx + pivot_lookback + 1]
        price = closes[idx]
        if not window:
            continue
        if price == max(window) and price > closes[idx - 1] and price >= closes[idx + 1]:
            _append_swing(
                swings,
                ElliottSwing(
                    index=idx,
                    timestamp=bars[idx].timestamp,
                    price=price,
                    kind="high",
                ),
            )
        elif price == min(window) and price < closes[idx - 1] and price <= closes[idx + 1]:
            _append_swing(
                swings,
                ElliottSwing(
                    index=idx,
                    timestamp=bars[idx].timestamp,
                    price=price,
                    kind="low",
                ),
            )

    if not swings:
        return swings

    last_bar = bars[-1]
    last_swing = swings[-1]
    if last_swing.index != total - 1:
        direction: SwingType = "high" if last_bar.close >= last_swing.price else "low"
        terminal = ElliottSwing(
            index=total - 1,
            timestamp=last_bar.timestamp,
            price=last_bar.close,
            kind=direction,
        )
        _append_swing(swings, terminal)

    return swings


def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return abs(numerator) / abs(denominator)


def _impulse_window_score(
    sequence: Sequence[ElliottSwing], pullback_range: Tuple[float, float]
) -> Tuple[WaveDirection, float]:
    if any(sequence[idx].kind == sequence[idx - 1].kind for idx in range(1, len(sequence))):
        return "none", 0.0

    start_kind = sequence[0].kind
    if start_kind == "low" and sequence[1].kind == "high":
        direction: WaveDirection = "bullish"
    elif start_kind == "high" and sequence[1].kind == "low":
        direction = "bearish"
    else:
        return "none", 0.0

    pullback_min, pullback_max = pullback_range
    if pullback_min > pullback_max:
        pullback_min, pullback_max = pullback_max, pullback_min

    wave1 = sequence[1].price - sequence[0].price
    wave2 = sequence[2].price - sequence[1].price
    wave3 = sequence[3].price - sequence[2].price
    wave4 = sequence[4].price - sequence[3].price
    wave5 = sequence[5].price - sequence[4].price

    if direction == "bullish":
        if not (wave1 > 0 and wave3 > 0 and wave5 > 0 and wave2 < 0 and wave4 < 0):
            return "none", 0.0
    else:
        if not (wave1 < 0 and wave3 < 0 and wave5 < 0 and wave2 > 0 and wave4 > 0):
            return "none", 0.0

    retrace2 = _safe_ratio(wave2, wave1)
    retrace4 = _safe_ratio(wave4, wave3)
    trend_extension = _safe_ratio(wave3, wave1)
    final_extension = _safe_ratio(wave5, wave1)
    new_high_low = (
        sequence[5].price > sequence[3].price
        if direction == "bullish"
        else sequence[5].price < sequence[3].price
    )

    conditions = [
        pullback_min <= retrace2 <= pullback_max,
        pullback_min <= retrace4 <= pullback_max,
        trend_extension >= 1.0,
        final_extension >= 0.382,
        new_high_low,
    ]

    score = sum(1.0 for condition in conditions if condition) / len(conditions)
    return direction, score


def _evaluate_impulse(
    swings: Sequence[ElliottSwing],
    pullback_range: Tuple[float, float],
) -> Tuple[bool, WaveDirection, float]:
    if len(swings) < 6:
        return False, "none", 0.0

    best_score = 0.0
    best_direction: WaveDirection = "none"
    best_index = -1
    for start in range(len(swings) - 5):
        window = swings[start : start + 6]
        direction, score = _impulse_window_score(window, pullback_range)
        if direction == "none":
            continue
        if score > best_score or (score == best_score and start > best_index):
            best_score = score
            best_direction = direction
            best_index = start

    if best_direction == "none":
        return False, "none", 0.0

    confirmed = best_score >= 0.6
    if not confirmed:
        return False, "none", best_score
    return True, best_direction, best_score


def _evaluate_correction(
    swings: Sequence[ElliottSwing],
    corrective_ratio: Tuple[float, float],
    impulse_direction: WaveDirection,
) -> Tuple[bool, WaveDirection, float]:
    if len(swings) < 4:
        return False, "none", 0.0

    sequence = list(swings[-4:])
    if any(sequence[idx].kind == sequence[idx - 1].kind for idx in range(1, len(sequence))):
        return False, "none", 0.0

    ratio_min, ratio_max = corrective_ratio
    if ratio_min > ratio_max:
        ratio_min, ratio_max = ratio_max, ratio_min

    if sequence[0].kind == "high":
        direction: WaveDirection = "bearish"
        if not (
            sequence[1].kind == "low"
            and sequence[2].kind == "high"
            and sequence[3].kind == "low"
        ):
            return False, "none", 0.0
    elif sequence[0].kind == "low":
        direction = "bullish"
        if not (
            sequence[1].kind == "high"
            and sequence[2].kind == "low"
            and sequence[3].kind == "high"
        ):
            return False, "none", 0.0
    else:  # pragma: no cover - exhaustive guard
        return False, "none", 0.0

    if impulse_direction != "none" and direction == impulse_direction:
        return False, "none", 0.0

    wave_a = sequence[1].price - sequence[0].price
    wave_b = sequence[2].price - sequence[1].price
    wave_c = sequence[3].price - sequence[2].price

    if direction == "bearish":
        if not (wave_a < 0 and wave_b > 0 and wave_c < 0):
            return False, "none", 0.0
    else:
        if not (wave_a > 0 and wave_b < 0 and wave_c > 0):
            return False, "none", 0.0

    ratio = _safe_ratio(wave_c, wave_a)
    secondary_ratio = _safe_ratio(wave_b, wave_a)
    conditions = [
        ratio_min <= ratio <= ratio_max,
        secondary_ratio <= 1.0,
    ]
    score = sum(1.0 for condition in conditions if condition) / len(conditions)
    confirmed = score >= 0.5
    if not confirmed:
        direction = "none"
    return confirmed, direction, score


@dataclass(slots=True)
class ElliottWaveAnalyzer:
    """Detect Elliott wave impulse and corrective structures from AwesomeAPI data."""

    client: AwesomeAPIClient = field(default_factory=AwesomeAPIClient)
    history: int = DEFAULT_HISTORY
    pivot_lookback: int = 3
    impulse_pullback_range: Tuple[float, float] = (0.382, 0.618)
    corrective_ratio: Tuple[float, float] = (0.618, 1.0)

    def analyse(
        self,
        pair: str,
        *,
        history: int | None = None,
        bars: Sequence[RawBar] | None = None,
    ) -> ElliottWaveReport:
        """Return an :class:`ElliottWaveReport` for the requested instrument."""

        series = self._obtain_bars(pair, history=history, bars=bars)
        ordered = _sorted_bars(series)
        _ensure_minimum_bars(pair, ordered, self.pivot_lookback)
        swings = _extract_swings(ordered, self.pivot_lookback)

        impulse_confirmed, impulse_direction, impulse_score = _evaluate_impulse(
            swings, self.impulse_pullback_range
        )
        corrective_confirmed, corrective_direction, corrective_score = _evaluate_correction(
            swings, self.corrective_ratio, impulse_direction
        )

        latest = ordered[-1]
        return ElliottWaveReport(
            pair=pair,
            timestamp=latest.timestamp,
            latest_price=latest.close,
            swings=tuple(swings),
            impulse_confirmed=impulse_confirmed,
            impulse_direction=impulse_direction,
            impulse_score=impulse_score,
            corrective_confirmed=corrective_confirmed,
            corrective_direction=corrective_direction,
            corrective_score=corrective_score,
        )

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
        if window <= self.pivot_lookback * 2:
            raise ValueError("history must exceed twice the pivot lookback for swing detection")
        return self.client.fetch_bars(pair, limit=window)


__all__ = [
    "ElliottSwing",
    "ElliottWaveAnalyzer",
    "ElliottWaveReport",
]
