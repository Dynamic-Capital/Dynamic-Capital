"""Wyckoff market structure evaluation engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from statistics import mean
from typing import Iterable, Mapping, Sequence

__all__ = [
    "WyckoffCandle",
    "WyckoffWindow",
    "WyckoffConfig",
    "WyckoffPhase",
    "WyckoffBias",
    "WyckoffSignal",
    "WyckoffEvaluation",
    "DynamicWyckoffEngine",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _percentile(values: Sequence[float], quantile: float) -> float:
    if not values:
        raise ValueError("values must not be empty")
    if not 0.0 <= quantile <= 1.0:
        raise ValueError("quantile must be within [0, 1]")
    sorted_values = sorted(values)
    if len(sorted_values) == 1:
        return sorted_values[0]
    position = quantile * (len(sorted_values) - 1)
    lower_idx = int(position)
    upper_idx = min(lower_idx + 1, len(sorted_values) - 1)
    weight = position - lower_idx
    lower_value = sorted_values[lower_idx]
    upper_value = sorted_values[upper_idx]
    return lower_value + (upper_value - lower_value) * weight


def _average(values: Sequence[float]) -> float:
    return mean(values) if values else 0.0


def _normalise_positive(value: float, name: str) -> float:
    numeric = float(value)
    if numeric <= 0:
        raise ValueError(f"{name} must be positive")
    return numeric


def _normalise_non_negative(value: float, name: str) -> float:
    numeric = float(value)
    if numeric < 0:
        raise ValueError(f"{name} must be non-negative")
    return numeric


@dataclass(slots=True)
class WyckoffCandle:
    """Minimal OHLCV candle representation used by the engine."""

    open: float
    high: float
    low: float
    close: float
    volume: float

    def __post_init__(self) -> None:
        self.open = _normalise_positive(self.open, "open")
        self.high = _normalise_positive(self.high, "high")
        self.low = _normalise_positive(self.low, "low")
        self.close = _normalise_positive(self.close, "close")
        self.volume = _normalise_non_negative(self.volume, "volume")
        if self.low > self.high:
            raise ValueError("low cannot be above high")
        if not self.low <= self.open <= self.high:
            raise ValueError("open must lie within high/low range")
        if not self.low <= self.close <= self.high:
            raise ValueError("close must lie within high/low range")

    @property
    def spread(self) -> float:
        return self.high - self.low

    @property
    def body(self) -> float:
        return abs(self.close - self.open)

    @property
    def direction(self) -> float:
        return 1.0 if self.close >= self.open else -1.0


@dataclass(slots=True)
class WyckoffWindow:
    """Sequence of candles representing the latest market context."""

    candles: Sequence[WyckoffCandle]
    average_daily_range: float | None = None
    session: str | None = None
    instrument: str | None = None

    def __post_init__(self) -> None:
        if len(self.candles) < 5:
            raise ValueError("at least five candles are required for evaluation")
        self.candles = tuple(self.candles)
        if self.average_daily_range is not None:
            self.average_daily_range = _normalise_positive(
                self.average_daily_range, "average_daily_range"
            )

    def true_ranges(self) -> tuple[float, ...]:
        ranges: list[float] = []
        prev_close = self.candles[0].close
        for candle in self.candles:
            tr = max(candle.high - candle.low, abs(candle.high - prev_close), abs(prev_close - candle.low))
            ranges.append(tr)
            prev_close = candle.close
        return tuple(ranges)

    def closes(self) -> tuple[float, ...]:
        return tuple(c.close for c in self.candles)

    def volumes(self) -> tuple[float, ...]:
        return tuple(c.volume for c in self.candles)

    def highs(self) -> tuple[float, ...]:
        return tuple(c.high for c in self.candles)

    def lows(self) -> tuple[float, ...]:
        return tuple(c.low for c in self.candles)


class WyckoffPhase(str, Enum):
    ACCUMULATION = "accumulation"
    MARKUP = "markup"
    DISTRIBUTION = "distribution"
    MARKDOWN = "markdown"
    TRANSITION = "transition"


class WyckoffBias(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


@dataclass(slots=True)
class WyckoffConfig:
    """Tunable parameters for the Wyckoff engine."""

    range_min_bars: int = 15
    range_max_adr_ratio: float = 1.1
    volume_spike_factor: float = 1.6
    volume_lookback: int = 20
    spring_break_atr_factor: float = 0.28
    utad_break_atr_factor: float = 0.28
    structure_slope_threshold: float = 0.2
    structure_midpoint_tolerance: float = 0.45
    trend_lookback: int = 6
    base_reward: float = 1.2
    spring_reward: float = 2.6
    utad_reward: float = 2.4

    def __post_init__(self) -> None:
        if self.range_min_bars <= 0:
            raise ValueError("range_min_bars must be positive")
        self.range_max_adr_ratio = _normalise_positive(
            self.range_max_adr_ratio, "range_max_adr_ratio"
        )
        self.volume_spike_factor = _normalise_positive(
            self.volume_spike_factor, "volume_spike_factor"
        )
        if self.volume_lookback <= 0:
            raise ValueError("volume_lookback must be positive")
        self.spring_break_atr_factor = _normalise_positive(
            self.spring_break_atr_factor, "spring_break_atr_factor"
        )
        self.utad_break_atr_factor = _normalise_positive(
            self.utad_break_atr_factor, "utad_break_atr_factor"
        )
        self.structure_slope_threshold = _normalise_positive(
            self.structure_slope_threshold, "structure_slope_threshold"
        )
        self.structure_midpoint_tolerance = _normalise_positive(
            self.structure_midpoint_tolerance, "structure_midpoint_tolerance"
        )
        if self.trend_lookback <= 1:
            raise ValueError("trend_lookback must be greater than 1")
        self.base_reward = _normalise_positive(self.base_reward, "base_reward")
        self.spring_reward = _normalise_positive(self.spring_reward, "spring_reward")
        self.utad_reward = _normalise_positive(self.utad_reward, "utad_reward")


@dataclass(slots=True)
class WyckoffSignal:
    """Signal details produced by the engine."""

    trigger: str
    score: float
    reward: float
    notes: tuple[str, ...] = field(default_factory=tuple)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "trigger": self.trigger,
            "score": self.score,
            "reward": self.reward,
            "notes": self.notes,
        }


@dataclass(slots=True)
class WyckoffEvaluation:
    """Comprehensive Wyckoff market evaluation."""

    phase: WyckoffPhase
    bias: WyckoffBias
    confidence: float
    signal: WyckoffSignal
    levels: Mapping[str, float]
    diagnostics: Mapping[str, float]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "phase": self.phase.value,
            "bias": self.bias.value,
            "confidence": self.confidence,
            "signal": self.signal.as_dict(),
            "levels": dict(self.levels),
            "diagnostics": dict(self.diagnostics),
        }


class DynamicWyckoffEngine:
    """Evaluate Wyckoff structure, phase, and trade triggers."""

    def __init__(self, config: WyckoffConfig | None = None) -> None:
        self.config = config or WyckoffConfig()

    def evaluate(self, window: WyckoffWindow) -> WyckoffEvaluation:
        candles = window.candles
        config = self.config
        adr = window.average_daily_range
        true_ranges = window.true_ranges()
        average_range = _average(true_ranges)
        if adr is None:
            adr = max(average_range, 1e-6)
        else:
            adr = max(adr, 1e-6)

        highs = window.highs()
        lows = window.lows()
        closes = window.closes()
        volumes = window.volumes()

        historical_highs = highs[:-1] or highs
        historical_lows = lows[:-1] or lows
        core_range_height = max(historical_highs) - min(historical_lows)
        range_height = max(highs) - min(lows)
        range_ratio = core_range_height / adr if adr else 0.0
        in_range = len(candles) >= config.range_min_bars and range_ratio <= config.range_max_adr_ratio

        support = _percentile(historical_lows, 0.2)
        resistance = _percentile(historical_highs, 0.8)
        midpoint = (support + resistance) / 2.0

        last = candles[-1]
        prev = candles[-2]

        lookback = min(config.volume_lookback, len(candles) - 1)
        historical_volume = volumes[-(lookback + 1) : -1]
        baseline_volume = _average(historical_volume) or 1.0
        volume_ratio = last.volume / baseline_volume if baseline_volume else 1.0
        volume_spike = volume_ratio >= config.volume_spike_factor

        penetration_support = (support - last.low) / adr
        penetration_resistance = (last.high - resistance) / adr

        spring_trigger = (
            in_range
            and last.low < support
            and penetration_support >= config.spring_break_atr_factor
            and last.close > support
            and last.close > last.open
        )

        utad_trigger = (
            in_range
            and last.high > resistance
            and penetration_resistance >= config.utad_break_atr_factor
            and last.close < resistance
            and last.close < last.open
        )

        effective_trend_lookback = min(config.trend_lookback, len(closes) - 1)
        earlier_close = closes[-effective_trend_lookback - 1]
        price_change = closes[-1] - earlier_close
        trend_strength = price_change / (adr * max(effective_trend_lookback, 1))

        range_centre_distance = abs(last.close - midpoint) / (core_range_height or 1.0)

        if not in_range:
            if trend_strength > config.structure_slope_threshold:
                phase = WyckoffPhase.MARKUP
                bias = WyckoffBias.BULLISH
            elif trend_strength < -config.structure_slope_threshold:
                phase = WyckoffPhase.MARKDOWN
                bias = WyckoffBias.BEARISH
            else:
                phase = WyckoffPhase.TRANSITION
                bias = WyckoffBias.NEUTRAL
        else:
            if spring_trigger:
                phase = WyckoffPhase.ACCUMULATION
                bias = WyckoffBias.BULLISH
            elif utad_trigger:
                phase = WyckoffPhase.DISTRIBUTION
                bias = WyckoffBias.BEARISH
            elif last.close <= midpoint:
                phase = WyckoffPhase.ACCUMULATION
                bias = WyckoffBias.BULLISH if spring_trigger else WyckoffBias.NEUTRAL
            else:
                phase = WyckoffPhase.DISTRIBUTION
                bias = WyckoffBias.BEARISH if utad_trigger else WyckoffBias.NEUTRAL

        trigger_name = "range_observation"
        reward = config.base_reward
        score_components: list[float] = []
        notes: list[str] = []

        if spring_trigger:
            trigger_name = "spring"
            reward += config.spring_reward
            score_components.append(0.5 + penetration_support)
            notes.append("Spring event: liquidity sweep below support with bullish close")
        elif utad_trigger:
            trigger_name = "utad"
            reward += config.utad_reward
            score_components.append(0.5 + penetration_resistance)
            notes.append("UTAD event: upthrust beyond resistance with bearish close")
        elif phase is WyckoffPhase.MARKUP:
            trigger_name = "trend_continuation"
            reward += 0.9
            score_components.append(min(abs(trend_strength) * 1.5, 1.0))
            notes.append("Markup continuation confirmed by persistent higher closes")
        elif phase is WyckoffPhase.MARKDOWN:
            trigger_name = "trend_continuation"
            reward += 0.9
            score_components.append(min(abs(trend_strength) * 1.5, 1.0))
            notes.append("Markdown continuation confirmed by persistent lower closes")
        else:
            score_components.append(max(0.0, 0.4 - range_centre_distance) * 0.8)
            notes.append("Range structure intact; awaiting decisive spring/UTAD")

        if volume_spike:
            score_components.append(min(volume_ratio / config.volume_spike_factor, 2.0) * 0.4)
            notes.append("Volume expansion confirms effort")
        else:
            score_components.append(volume_ratio * 0.08)
            notes.append("Volume stable; moderate conviction")

        spread_ratio = last.spread / adr if adr else 0.0
        body_efficiency = (last.body / last.spread) if last.spread else 0.0
        score_components.append(_clamp(spread_ratio, lower=0.0, upper=2.0) * 0.15)
        score_components.append(body_efficiency * 0.1)

        score = _clamp(sum(score_components), lower=0.0, upper=1.0)

        confidence = 0.12 + score * 0.62
        if spring_trigger or utad_trigger:
            confidence += 0.1
        if in_range:
            confidence += 0.05
        if phase in (WyckoffPhase.MARKUP, WyckoffPhase.MARKDOWN):
            confidence += 0.06
        confidence = _clamp(confidence, lower=0.0, upper=1.0)

        if confidence < 0.45:
            notes.append("Signal muted: confidence below actionable threshold")
            if phase not in (WyckoffPhase.MARKUP, WyckoffPhase.MARKDOWN):
                bias = WyckoffBias.NEUTRAL

        diagnostics = {
            "range_ratio": range_ratio,
            "trend_strength": trend_strength,
            "volume_ratio": volume_ratio,
            "penetration_support": penetration_support,
            "penetration_resistance": penetration_resistance,
            "spread_ratio": spread_ratio,
            "body_efficiency": body_efficiency,
            "range_centre_distance": range_centre_distance,
        }

        signal = WyckoffSignal(
            trigger=trigger_name,
            score=score,
            reward=reward,
            notes=tuple(notes),
        )

        levels = {
            "support": support,
            "resistance": resistance,
            "midpoint": midpoint,
            "range_height": range_height,
        }

        return WyckoffEvaluation(
            phase=phase,
            bias=bias,
            confidence=confidence,
            signal=signal,
            levels=levels,
            diagnostics=diagnostics,
        )

    def batch_evaluate(self, windows: Iterable[WyckoffWindow]) -> tuple[WyckoffEvaluation, ...]:
        return tuple(self.evaluate(window) for window in windows)
