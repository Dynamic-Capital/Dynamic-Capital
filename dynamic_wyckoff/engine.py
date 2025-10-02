"""Dynamic Wyckoff Engine for market structure analytics."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from statistics import fmean, pstdev
from typing import Deque, Iterable, Mapping, Protocol, Sequence

Number = float | int


class BarLike(Protocol):
    """Minimal OHLCV contract expected by the Wyckoff engine."""

    open: Number
    high: Number
    low: Number
    close: Number
    volume: Number


@dataclass(frozen=True, slots=True)
class PriceBar:
    """Immutable OHLCV representation stored by the engine."""

    open: float
    high: float
    low: float
    close: float
    volume: float


@dataclass(frozen=True, slots=True)
class WyckoffConfig:
    """Runtime configuration for the dynamic Wyckoff analytics engine."""

    range_low: float | None = None
    range_high: float | None = None
    support_level: float | None = None
    resistance_level: float | None = None
    breakout_price: float | None = None
    accumulation_threshold: float = 0.0
    distribution_threshold: float = 0.0
    volume_spike_ratio: float = 1.5
    atr_window: int = 14
    weights: Mapping[str, float] | None = None
    entry_threshold: float = 0.6
    exit_threshold: float = 0.4
    volatility_factor: float = 1.0

    def weight(self, key: str, default: float) -> float:
        if not self.weights:
            return default
        return float(self.weights.get(key, default))


@dataclass(frozen=True, slots=True)
class WyckoffMetrics:
    """Captures quantitative interpretations of Wyckoff concepts."""

    buying_pressure: float
    selling_pressure: float
    net_pressure: float
    efficiency_ratio: float
    divergence_score: float
    wci: float
    accumulation_score: float
    distribution_score: float
    phase: str
    spring_strength: float | None
    cause: float
    expected_effect: float
    target_price: float
    smart_money_index: float
    smart_money_trend: float
    wyckoff_entry_score: float
    entry_signal: bool
    exit_signal: bool
    position_size: float


def _as_price_bar(bar: BarLike | Mapping[str, Number]) -> PriceBar:
    if isinstance(bar, Mapping):
        try:
            return PriceBar(
                open=float(bar["open"]),
                high=float(bar["high"]),
                low=float(bar["low"]),
                close=float(bar["close"]),
                volume=float(bar["volume"]),
            )
        except KeyError as exc:  # pragma: no cover - defensive guard
            raise KeyError(f"missing OHLCV key: {exc}") from exc
    return PriceBar(
        open=float(bar.open),
        high=float(bar.high),
        low=float(bar.low),
        close=float(bar.close),
        volume=float(bar.volume),
    )


def _normalise_bars(bars: Sequence[BarLike | Mapping[str, Number]]) -> list[PriceBar]:
    if not bars:
        raise ValueError("bars must be a non-empty sequence")
    return [_as_price_bar(bar) for bar in bars]


def _price_changes(bars: Sequence[PriceBar]) -> list[float]:
    return [bar.close - bar.open for bar in bars]


def _true_range(current: PriceBar, previous: PriceBar | None) -> float:
    if previous is None:
        return current.high - current.low
    return max(
        current.high - current.low,
        abs(current.high - previous.close),
        abs(current.low - previous.close),
    )


def _average_true_range(bars: Sequence[PriceBar], window: int) -> float:
    if len(bars) < 2:
        return bars[-1].high - bars[-1].low
    window = max(1, min(window, len(bars)))
    trs = [
        _true_range(bars[idx], bars[idx - 1] if idx else None)
        for idx in range(len(bars) - window, len(bars))
    ]
    return fmean(trs)


def _linear_regression_slope(values: Sequence[float]) -> float:
    count = len(values)
    if count < 2:
        return 0.0
    x_values = list(range(count))
    mean_x = fmean(x_values)
    mean_y = fmean(values)
    numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, values))
    denominator = sum((x - mean_x) ** 2 for x in x_values)
    if denominator == 0:
        return 0.0
    return numerator / denominator


def _z_score(value: float, series: Sequence[float]) -> float:
    if not series:
        return 0.0
    deviation = pstdev(series)
    if deviation == 0:
        return 0.0
    return (value - fmean(series)) / deviation


def _phase_score(phase: str) -> float:
    mapping = {
        "accumulation": 1.0,
        "markup": 0.7,
        "distribution": -1.0,
        "markdown": -0.7,
    }
    return mapping.get(phase.lower(), 0.0)


def _compute_pressures(bars: Sequence[PriceBar]) -> tuple[float, float, float]:
    buying_pressure = 0.0
    selling_pressure = 0.0
    for change, bar in zip(_price_changes(bars), bars):
        if change > 0:
            buying_pressure += bar.volume * change
        elif change < 0:
            selling_pressure += bar.volume * abs(change)
    net_pressure = buying_pressure - selling_pressure
    return buying_pressure, selling_pressure, net_pressure


def _compute_effort_vs_result(bars: Sequence[PriceBar]) -> tuple[float, float]:
    price_changes = [abs(change) for change in _price_changes(bars)]
    volumes = [bar.volume for bar in bars]
    total_volume = sum(volumes)
    total_change = sum(price_changes)
    efficiency = total_change / total_volume if total_volume else 0.0
    volume_z = _z_score(volumes[-1], volumes)
    price_z = _z_score(price_changes[-1], price_changes)
    divergence = volume_z - price_z
    return efficiency, divergence


def _compute_wci(bars: Sequence[PriceBar], *, atr_window: int, weights: WyckoffConfig) -> float:
    volumes = [bar.volume for bar in bars]
    ranges = [bar.high - bar.low for bar in bars]
    latest_volume = volumes[-1]
    average_volume = fmean(volumes)
    deviation = pstdev(volumes) or 1.0
    volume_trend = (latest_volume - average_volume) / deviation

    atr = _average_true_range(bars, window=atr_window) or 1.0
    price_range = (bars[-1].high - bars[-1].low) / atr

    result_span = abs(bars[-1].close - bars[-1].open) or 1e-9
    effort_result_ratio = latest_volume / result_span

    alpha = weights.weight("alpha", 0.34)
    beta = weights.weight("beta", 0.33)
    gamma = weights.weight("gamma", 0.33)
    normaliser = alpha + beta + gamma or 1.0

    wci = (
        alpha * volume_trend + beta * price_range + gamma * effort_result_ratio
    ) / normaliser
    if math.isfinite(wci):
        return wci
    return 0.0


def _within_range(price: float, lower: float | None, upper: float | None) -> bool:
    if lower is None or upper is None:
        return False
    return lower <= price <= upper


def _determine_range(bars: Sequence[PriceBar], config: WyckoffConfig) -> tuple[float, float]:
    if config.range_low is not None and config.range_high is not None:
        return config.range_low, config.range_high
    lows = [bar.low for bar in bars]
    highs = [bar.high for bar in bars]
    return min(lows), max(highs)


def _compute_accumulation_distribution(
    bars: Sequence[PriceBar],
    *,
    trading_range: tuple[float, float],
    average_volume: float,
    accumulation_threshold: float,
    distribution_threshold: float,
) -> tuple[float, float, str]:
    lower, upper = trading_range
    accumulation_score = 0.0
    distribution_score = 0.0
    closes = [bar.close for bar in bars]
    slope = _linear_regression_slope(closes)

    for bar, change in zip(bars, _price_changes(bars)):
        if bar.volume <= average_volume:
            continue
        if not _within_range(bar.close, lower, upper):
            continue
        buy_component = bar.volume * max(change, 0.0)
        sell_component = bar.volume * max(-change, 0.0)
        accumulation_score += buy_component - sell_component
        distribution_score += sell_component - buy_component

    last_close = closes[-1]
    in_range = _within_range(last_close, lower, upper)

    if accumulation_score > accumulation_threshold:
        phase = "accumulation"
    elif distribution_score > distribution_threshold:
        phase = "distribution"
    elif slope > 0 and not in_range:
        phase = "markup"
    elif slope < 0 and not in_range:
        phase = "markdown"
    else:
        phase = "neutral"

    return accumulation_score, distribution_score, phase


def _detect_spring(
    bars: Sequence[PriceBar],
    *,
    support_level: float | None,
    average_volume: float,
    volume_spike_ratio: float,
) -> tuple[float | None, float | None, float | None]:
    if support_level is None:
        return None, None, None
    spike_threshold = average_volume * volume_spike_ratio
    best_strength: float | None = None
    recovery_speed: float | None = None
    penetration_depth: float | None = None

    for idx in range(len(bars) - 1, -1, -1):
        bar = bars[idx]
        if bar.low >= support_level:
            continue
        if bar.volume < spike_threshold:
            continue

        bars_to_recover = 0
        for recovery_idx in range(idx, len(bars)):
            bars_to_recover += 1
            if bars[recovery_idx].close > support_level:
                break
        else:
            continue

        penetration = abs(bar.low - support_level) or 1e-9
        recovery_speed_metric = 1.0 / bars_to_recover
        volume_ratio = bar.volume / average_volume if average_volume else 0.0
        strength = (recovery_speed_metric * volume_ratio) / penetration

        if best_strength is None or strength > best_strength:
            best_strength = strength
            recovery_speed = recovery_speed_metric
            penetration_depth = penetration

    return best_strength, recovery_speed, penetration_depth


def _compute_cause_effect(
    *,
    trading_range: tuple[float, float],
    bars: Sequence[PriceBar],
    volatility_factor: float,
    breakout_price: float | None,
    phase: str,
) -> tuple[float, float, float]:
    lower, upper = trading_range
    width = max(upper - lower, 1e-9)
    in_range_bars = sum(1 for bar in bars if _within_range(bar.close, lower, upper))
    cause = width * in_range_bars
    expected_effect = cause * volatility_factor
    breakout = breakout_price if breakout_price is not None else bars[-1].close

    direction = 1.0
    if phase.lower() == "distribution":
        direction = -1.0
    elif phase.lower() == "markdown":
        direction = -1.0
    elif phase.lower() == "neutral":
        slope = _linear_regression_slope([bar.close for bar in bars])
        direction = 1.0 if slope >= 0 else -1.0

    target_price = breakout + direction * expected_effect
    return cause, expected_effect, target_price


def _smart_money_index(bars: Sequence[PriceBar], average_volume: float) -> tuple[float, float]:
    if len(bars) < 2:
        return 0.0, 0.0
    cumulative = 0.0
    values: list[float] = [0.0]
    for idx in range(1, len(bars)):
        current = bars[idx]
        previous = bars[idx - 1]
        price_change = current.close - previous.close
        volume_change = current.volume - previous.volume
        flat_move = abs(price_change) <= (previous.close * 0.001)
        high_volume = current.volume >= average_volume * 1.2

        if price_change > 0 and volume_change < 0:
            cumulative += current.volume
        elif price_change < 0 and volume_change < 0:
            cumulative -= current.volume
        elif flat_move and high_volume:
            if price_change >= 0:
                cumulative += 2 * current.volume
            else:
                cumulative -= 2 * current.volume
        values.append(cumulative)

    trend = values[-1] - values[0]
    return cumulative, trend


def _volume_analysis_component(net_pressure: float, divergence: float) -> float:
    return math.tanh(net_pressure * 1e-6) + divergence


def _position_size(
    *,
    cause: float,
    phase: str,
    bars: Sequence[PriceBar],
    account_risk: float,
    entry_price: float,
    stop_loss: float,
) -> float:
    closes = [bar.close for bar in bars]
    if len(closes) < 2 or account_risk <= 0:
        return 0.0
    returns = [
        math.log(closes[idx] / closes[idx - 1])
        for idx in range(1, len(closes))
        if closes[idx - 1] > 0
    ]
    volatility = pstdev(returns) or 1e-6
    lower, upper = min(closes), max(closes)
    theoretical_max = (upper - lower) * len(bars)
    cause_strength = cause / theoretical_max if theoretical_max else 0.0
    phase_score = abs(_phase_score(phase)) or 0.2
    confidence_factor = (cause_strength * phase_score) / volatility
    risk_per_unit = abs(entry_price - stop_loss) or 1e-6
    size = (account_risk * confidence_factor) / risk_per_unit
    return max(size, 0.0)


def _analyse(
    series: Sequence[PriceBar],
    config: WyckoffConfig,
    *,
    account_risk: float,
    entry_price: float,
    stop_loss: float,
) -> WyckoffMetrics:
    buying_pressure, selling_pressure, net_pressure = _compute_pressures(series)
    efficiency_ratio, divergence_score = _compute_effort_vs_result(series)

    wci = _compute_wci(series, atr_window=config.atr_window, weights=config)

    trading_range = _determine_range(series, config)
    volumes = [bar.volume for bar in series]
    average_volume = fmean(volumes)

    (
        accumulation_score,
        distribution_score,
        phase,
    ) = _compute_accumulation_distribution(
        series,
        trading_range=trading_range,
        average_volume=average_volume,
        accumulation_threshold=config.accumulation_threshold,
        distribution_threshold=config.distribution_threshold,
    )

    spring_strength, _, _ = _detect_spring(
        series,
        support_level=config.support_level,
        average_volume=average_volume,
        volume_spike_ratio=config.volume_spike_ratio,
    )

    cause, expected_effect, target_price = _compute_cause_effect(
        trading_range=trading_range,
        bars=series,
        volatility_factor=config.volatility_factor,
        breakout_price=config.breakout_price,
        phase=phase,
    )

    smi, smi_trend = _smart_money_index(series, average_volume)

    volume_component = _volume_analysis_component(net_pressure, divergence_score)
    wes = (
        config.weight("w1", 0.35) * _phase_score(phase)
        + config.weight("w2", 0.25) * (spring_strength or 0.0)
        + config.weight("w3", 0.2) * volume_component
        + config.weight("w4", 0.2) * math.tanh(smi_trend * 1e-6)
    )

    entry_signal = wes > config.entry_threshold and phase.lower() == "accumulation"
    exit_signal = wes < config.exit_threshold or phase.lower() == "distribution"

    position_size = _position_size(
        cause=cause,
        phase=phase,
        bars=series,
        account_risk=account_risk,
        entry_price=entry_price,
        stop_loss=stop_loss,
    )

    return WyckoffMetrics(
        buying_pressure=buying_pressure,
        selling_pressure=selling_pressure,
        net_pressure=net_pressure,
        efficiency_ratio=efficiency_ratio,
        divergence_score=divergence_score,
        wci=wci,
        accumulation_score=accumulation_score,
        distribution_score=distribution_score,
        phase=phase,
        spring_strength=spring_strength,
        cause=cause,
        expected_effect=expected_effect,
        target_price=target_price,
        smart_money_index=smi,
        smart_money_trend=smi_trend,
        wyckoff_entry_score=wes,
        entry_signal=entry_signal,
        exit_signal=exit_signal,
        position_size=position_size,
    )


@dataclass(slots=True)
class DynamicWyckoffEngine:
    """Compute Dynamic Capital's Wyckoff analytics with streaming support."""

    config: WyckoffConfig = field(default_factory=WyckoffConfig)
    window: int = 120
    _bars: Deque[PriceBar] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.window = max(int(self.window), 5)
        self._bars = deque(maxlen=self.window)

    @property
    def bars(self) -> tuple[PriceBar, ...]:
        """Return the currently retained OHLCV bars."""

        return tuple(self._bars)

    def clear(self) -> None:
        """Reset the engine state."""

        self._bars.clear()

    def ingest(self, bar: BarLike | Mapping[str, Number]) -> PriceBar:
        """Ingest a single OHLCV bar and return the normalised representation."""

        normalised = _as_price_bar(bar)
        self._bars.append(normalised)
        return normalised

    def extend(self, bars: Iterable[BarLike | Mapping[str, Number]]) -> tuple[PriceBar, ...]:
        """Ingest multiple OHLCV bars returning the appended snapshots."""

        appended: list[PriceBar] = []
        for bar in bars:
            appended.append(self.ingest(bar))
        return tuple(appended)

    def snapshot(
        self,
        *,
        account_risk: float,
        entry_price: float,
        stop_loss: float,
        bars: Sequence[BarLike | Mapping[str, Number]] | None = None,
    ) -> WyckoffMetrics:
        """Compute Wyckoff metrics for the supplied or retained bars."""

        if bars is None:
            if not self._bars:
                raise ValueError("no bars available; ingest data or pass bars explicitly")
            series: Sequence[PriceBar] = list(self._bars)
        else:
            if all(isinstance(bar, PriceBar) for bar in bars):
                series = list(bars)  # type: ignore[assignment]
            else:
                series = _normalise_bars(bars)
        return _analyse(
            series,
            self.config,
            account_risk=account_risk,
            entry_price=entry_price,
            stop_loss=stop_loss,
        )

    def analyse(
        self,
        *,
        account_risk: float,
        entry_price: float,
        stop_loss: float,
        bars: Sequence[BarLike | Mapping[str, Number]] | None = None,
    ) -> WyckoffMetrics:
        """Alias for :meth:`snapshot` for API symmetry."""

        return self.snapshot(
            account_risk=account_risk,
            entry_price=entry_price,
            stop_loss=stop_loss,
            bars=bars,
        )

    def evaluate(
        self,
        bars: Sequence[BarLike | Mapping[str, Number]],
        *,
        account_risk: float,
        entry_price: float,
        stop_loss: float,
    ) -> WyckoffMetrics:
        """Backward compatible API matching the previous strategy helper."""

        series = _normalise_bars(bars)
        return _analyse(
            series,
            self.config,
            account_risk=account_risk,
            entry_price=entry_price,
            stop_loss=stop_loss,
        )


DynamicWyckoffStrategy = DynamicWyckoffEngine

__all__ = [
    "BarLike",
    "PriceBar",
    "WyckoffConfig",
    "WyckoffMetrics",
    "DynamicWyckoffEngine",
    "DynamicWyckoffStrategy",
]
