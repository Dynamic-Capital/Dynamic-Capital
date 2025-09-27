"""Dynamic Candles module for analysing OHLC data streams."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "Candle",
    "PatternSignal",
    "CandleSeries",
    "CandleAnalytics",
    "DynamicCandles",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_symbol(symbol: str | None) -> str | None:
    if symbol is None:
        return None
    cleaned = symbol.strip().upper()
    return cleaned or None


def _ensure_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_float(value: object, *, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{field_name} must be convertible to float") from exc


# ---------------------------------------------------------------------------
# core dataclasses


@dataclass(slots=True)
class Candle:
    """Represents a single OHLCV candle."""

    open: float
    high: float
    low: float
    close: float
    volume: float = 0.0
    timestamp: datetime = field(default_factory=_utcnow)
    symbol: str | None = None
    interval: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.open = _coerce_float(self.open, field_name="open")
        self.high = _coerce_float(self.high, field_name="high")
        self.low = _coerce_float(self.low, field_name="low")
        self.close = _coerce_float(self.close, field_name="close")
        self.volume = max(_coerce_float(self.volume, field_name="volume"), 0.0)
        if self.high < self.low:
            raise ValueError("high must be greater than or equal to low")
        if not (self.low <= self.open <= self.high):
            raise ValueError("open must be within the high/low range")
        if not (self.low <= self.close <= self.high):
            raise ValueError("close must be within the high/low range")
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.symbol = _normalise_symbol(self.symbol)
        self.interval = self.interval.strip() if isinstance(self.interval, str) else None
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def body(self) -> float:
        return abs(self.close - self.open)

    @property
    def range(self) -> float:
        return self.high - self.low

    @property
    def upper_wick(self) -> float:
        return self.high - max(self.open, self.close)

    @property
    def lower_wick(self) -> float:
        return min(self.open, self.close) - self.low

    @property
    def direction(self) -> str:
        if self.close > self.open:
            return "bullish"
        if self.close < self.open:
            return "bearish"
        return "neutral"

    @property
    def typical_price(self) -> float:
        return (self.high + self.low + self.close) / 3

    def true_range(self, previous_close: float | None = None) -> float:
        base_range = self.range
        if previous_close is None:
            return base_range
        return max(
            base_range,
            abs(self.high - previous_close),
            abs(self.low - previous_close),
        )

    def percent_change(self) -> float:
        if self.open == 0:  # pragma: no cover - defensive guard
            return 0.0
        return (self.close - self.open) / abs(self.open)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
            "timestamp": self.timestamp.isoformat(),
            "direction": self.direction,
        }
        if self.symbol:
            payload["symbol"] = self.symbol
        if self.interval:
            payload["interval"] = self.interval
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, object]) -> "Candle":
        if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("mapping must be a mapping")
        lower_map = {key.lower(): key for key in mapping.keys()}
        required = {"open", "high", "low", "close"}
        if not required.issubset(lower_map):
            missing = sorted(required - lower_map.keys())
            raise KeyError(f"mapping candle missing fields: {', '.join(missing)}")
        get = mapping.get
        return cls(
            open=get(lower_map["open"]),
            high=get(lower_map["high"]),
            low=get(lower_map["low"]),
            close=get(lower_map["close"]),
            volume=get(lower_map.get("volume"), 0.0),
            timestamp=get(lower_map.get("timestamp"), _utcnow()),
            symbol=get(lower_map.get("symbol")),
            interval=get(lower_map.get("interval")),
            metadata=get(lower_map.get("metadata")),
        )


@dataclass(slots=True)
class PatternSignal:
    """Description of a recognised candlestick pattern."""

    name: str
    direction: str
    confidence: float
    index: int
    timestamp: datetime
    details: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.name = self.name.strip().lower().replace(" ", "-")
        if not self.name:
            raise ValueError("pattern name must not be empty")
        direction = self.direction.strip().lower()
        if direction not in {"bullish", "bearish", "neutral"}:
            raise ValueError("direction must be bullish, bearish, or neutral")
        self.direction = direction
        self.confidence = _clamp(float(self.confidence))
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.details = dict(self.details)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "direction": self.direction,
            "confidence": self.confidence,
            "index": self.index,
            "timestamp": self.timestamp.isoformat(),
            "details": dict(self.details),
        }


@dataclass(slots=True)
class CandleAnalytics:
    """Snapshot of trend and volatility metrics for a candle series."""

    symbol: str | None
    atr: float
    momentum: float
    trend_strength: float
    volume_pressure: float
    patterns: tuple[PatternSignal, ...]
    window: int
    latest_close: float
    generated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.patterns = tuple(self.patterns)
        if self.generated_at.tzinfo is None:
            self.generated_at = self.generated_at.replace(tzinfo=timezone.utc)
        else:
            self.generated_at = self.generated_at.astimezone(timezone.utc)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "atr": self.atr,
            "momentum": self.momentum,
            "trend_strength": self.trend_strength,
            "volume_pressure": self.volume_pressure,
            "patterns": [pattern.as_dict() for pattern in self.patterns],
            "window": self.window,
            "latest_close": self.latest_close,
            "generated_at": self.generated_at.isoformat(),
        }


# ---------------------------------------------------------------------------
# candle series utilities


def _coerce_candle(value: Candle | Mapping[str, object]) -> Candle:
    if isinstance(value, Candle):
        return value
    if isinstance(value, Mapping):
        return Candle.from_mapping(value)
    raise TypeError("value must be Candle or mapping")


class CandleSeries:
    """Sliding window collection of candles with analytical helpers."""

    __slots__ = ("_candles",)

    def __init__(self, *, maxlen: int = 120) -> None:
        if maxlen <= 0:
            raise ValueError("maxlen must be positive")
        self._candles: Deque[Candle] = deque(maxlen=maxlen)

    def __len__(self) -> int:
        return len(self._candles)

    def __iter__(self):  # pragma: no cover - convenience
        return iter(self._candles)

    @property
    def candles(self) -> tuple[Candle, ...]:
        return tuple(self._candles)

    def clear(self) -> None:
        self._candles.clear()

    def append(self, candle: Candle | Mapping[str, object]) -> Candle:
        coerced = _coerce_candle(candle)
        self._candles.append(coerced)
        return coerced

    def extend(self, candles: Iterable[Candle | Mapping[str, object]]) -> None:
        for candle in candles:
            self.append(candle)

    @property
    def latest(self) -> Candle:
        if not self._candles:
            raise ValueError("series is empty")
        return self._candles[-1]

    def _subset(self, length: int) -> Sequence[Candle]:
        if length <= 0:
            raise ValueError("length must be positive")
        if not self._candles:
            return ()
        if length >= len(self._candles):
            return tuple(self._candles)
        return tuple(list(self._candles)[-length:])

    def average_true_range(self, length: int = 14) -> float:
        candles = self._subset(length + 1)
        if len(candles) < 2:
            return 0.0
        true_ranges: list[float] = []
        previous = candles[0].close
        for candle in candles[1:]:
            true_ranges.append(candle.true_range(previous))
            previous = candle.close
        if not true_ranges:
            return 0.0
        return sum(true_ranges) / len(true_ranges)

    def momentum(self, length: int = 5) -> float:
        candles = self._subset(length + 1)
        if len(candles) < 2:
            return 0.0
        start = candles[0].close
        end = candles[-1].close
        if start == 0:  # pragma: no cover - defensive guard
            return 0.0
        momentum = (end - start) / abs(start)
        return max(min(momentum, 5.0), -5.0)

    def volume_pressure(self, length: int = 20) -> float:
        candles = self._subset(length)
        if not candles:
            return 0.0
        bullish = sum(candle.volume for candle in candles if candle.direction == "bullish")
        bearish = sum(candle.volume for candle in candles if candle.direction == "bearish")
        total = bullish + bearish
        if total == 0:
            return 0.0
        pressure = (bullish - bearish) / total
        return max(min(pressure, 1.0), -1.0)

    def trend_strength(self, length: int = 10) -> float:
        candles = self._subset(length)
        if len(candles) < 2:
            return 0.0
        closes = [candle.close for candle in candles]
        start, end = closes[0], closes[-1]
        high, low = max(closes), min(closes)
        amplitude = high - low
        if amplitude == 0:
            return 0.0
        strength = (end - start) / amplitude
        return max(min(strength, 1.0), -1.0)


# ---------------------------------------------------------------------------
# pattern detection


def _detect_bullish_engulfing(previous: Candle, current: Candle, index: int) -> PatternSignal | None:
    if previous.direction != "bearish" or current.direction != "bullish":
        return None
    if current.body <= previous.body:
        return None
    if current.low > previous.low or current.high < previous.high:
        return None
    ratio = current.body / (previous.body + 1e-9)
    confidence = _clamp(ratio / 2)
    return PatternSignal(
        name="bullish-engulfing",
        direction="bullish",
        confidence=confidence,
        index=index,
        timestamp=current.timestamp,
        details={
            "current_body": current.body,
            "previous_body": previous.body,
            "range_ratio": current.range / (previous.range + 1e-9),
        },
    )


def _detect_bearish_engulfing(previous: Candle, current: Candle, index: int) -> PatternSignal | None:
    if previous.direction != "bullish" or current.direction != "bearish":
        return None
    if current.body <= previous.body:
        return None
    if current.low > previous.low or current.high < previous.high:
        return None
    ratio = current.body / (previous.body + 1e-9)
    confidence = _clamp(ratio / 2)
    return PatternSignal(
        name="bearish-engulfing",
        direction="bearish",
        confidence=confidence,
        index=index,
        timestamp=current.timestamp,
        details={
            "current_body": current.body,
            "previous_body": previous.body,
            "range_ratio": current.range / (previous.range + 1e-9),
        },
    )


def _detect_hammer(candle: Candle, index: int) -> PatternSignal | None:
    if candle.direction == "bearish":
        return None
    body = candle.body
    lower = candle.lower_wick
    upper = candle.upper_wick
    if lower < body * 2:
        return None
    if upper > body * 1.2:
        return None
    ratio = lower / (body + 1e-9)
    confidence = _clamp(ratio / 3)
    return PatternSignal(
        name="hammer",
        direction="bullish",
        confidence=confidence,
        index=index,
        timestamp=candle.timestamp,
        details={
            "lower_wick": lower,
            "body": body,
            "upper_wick": upper,
        },
    )


def _detect_doji(candle: Candle, index: int) -> PatternSignal | None:
    if candle.range == 0:
        return None
    body_ratio = candle.body / candle.range
    if body_ratio > 0.15:
        return None
    confidence = _clamp(1.0 - body_ratio)
    return PatternSignal(
        name="doji",
        direction="neutral",
        confidence=confidence,
        index=index,
        timestamp=candle.timestamp,
        details={"body_ratio": body_ratio},
    )


def _detect_patterns(candles: Sequence[Candle], threshold: float) -> tuple[PatternSignal, ...]:
    if not candles:
        return ()
    signals: list[PatternSignal] = []
    last_index = len(candles) - 1
    current = candles[-1]
    if len(candles) >= 2:
        previous = candles[-2]
        for detector in (_detect_bullish_engulfing, _detect_bearish_engulfing):
            signal = detector(previous, current, last_index)
            if signal and signal.confidence >= threshold:
                signals.append(signal)
    for detector in (_detect_hammer, _detect_doji):
        signal = detector(current, last_index)
        if signal and signal.confidence >= threshold:
            signals.append(signal)
    return tuple(signals)


# ---------------------------------------------------------------------------
# public facade


class DynamicCandles:
    """High-level orchestrator for candlestick analytics."""

    __slots__ = ("_series", "_pattern_threshold")

    def __init__(self, *, max_candles: int = 240, pattern_sensitivity: float = 0.6) -> None:
        if not 0.0 <= pattern_sensitivity <= 1.0:
            raise ValueError("pattern_sensitivity must be between 0 and 1")
        self._series = CandleSeries(maxlen=max_candles)
        self._pattern_threshold = float(pattern_sensitivity)

    @property
    def candles(self) -> tuple[Candle, ...]:
        return self._series.candles

    @property
    def pattern_sensitivity(self) -> float:
        return self._pattern_threshold

    def ingest(self, candle: Candle | Mapping[str, object]) -> Candle:
        return self._series.append(candle)

    def ingest_many(self, candles: Iterable[Candle | Mapping[str, object]]) -> None:
        self._series.extend(candles)

    def reset(self) -> None:
        self._series.clear()

    def snapshot(
        self,
        *,
        atr_window: int = 14,
        momentum_window: int = 5,
        volume_window: int = 20,
        trend_window: int = 10,
    ) -> CandleAnalytics:
        if len(self._series) == 0:
            raise ValueError("no candles ingested")
        atr = self._series.average_true_range(atr_window)
        momentum = self._series.momentum(momentum_window)
        volume_pressure = self._series.volume_pressure(volume_window)
        trend_strength = self._series.trend_strength(trend_window)
        patterns = _detect_patterns(self._series.candles, self._pattern_threshold)
        latest = self._series.latest
        return CandleAnalytics(
            symbol=latest.symbol,
            atr=atr,
            momentum=momentum,
            trend_strength=trend_strength,
            volume_pressure=volume_pressure,
            patterns=patterns,
            window=len(self._series),
            latest_close=latest.close,
        )
