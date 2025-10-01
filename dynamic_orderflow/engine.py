"""Dynamic orderflow telemetry primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping

__all__ = [
    "OrderEvent",
    "OrderFlowWindow",
    "OrderFlowImbalance",
    "DynamicOrderFlow",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_side(value: str) -> str:
    lowered = value.strip().lower()
    if lowered not in {"buy", "sell"}:
        raise ValueError("side must be either 'buy' or 'sell'")
    return lowered


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(slots=True)
class OrderEvent:
    """Represents a single aggressive order hitting the book."""

    symbol: str
    side: str
    size: float
    price: float
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.symbol = self.symbol.strip().upper()
        if not self.symbol:
            raise ValueError("symbol must not be empty")
        self.side = _normalise_side(self.side)
        self.size = max(float(self.size), 0.0)
        if self.size == 0.0:
            raise ValueError("size must be positive")
        self.price = float(self.price)
        if self.price <= 0:
            raise ValueError("price must be positive")
        self.timestamp = _ensure_timestamp(self.timestamp)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):  # pragma: no cover - defensive
            raise TypeError("metadata must be mapping or None")

    @property
    def notional(self) -> float:
        return self.price * self.size

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "symbol": self.symbol,
            "side": self.side,
            "size": self.size,
            "price": self.price,
            "timestamp": self.timestamp.isoformat(),
            "notional": self.notional,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class OrderFlowWindow:
    """Sliding window of recent orderflow events."""

    horizon: timedelta
    events: Deque[OrderEvent] = field(default_factory=deque)

    def __post_init__(self) -> None:
        if isinstance(self.horizon, (int, float)):
            self.horizon = timedelta(seconds=float(self.horizon))
        if self.horizon <= timedelta(0):
            raise ValueError("horizon must be positive")

    def add(self, event: OrderEvent) -> None:
        self.events.append(event)
        reference_time = event.timestamp
        current_time = _utcnow()
        if reference_time < current_time:
            reference_time = current_time
        self._expire(reference_time)

    def extend(self, events: Iterable[OrderEvent]) -> None:
        for event in events:
            self.add(event)

    def _expire(self, now: datetime | None = None) -> None:
        cutoff = (now or _utcnow()) - self.horizon
        while self.events and self.events[0].timestamp < cutoff:
            self.events.popleft()

    @property
    def total_notional(self) -> float:
        self._expire()
        return sum(event.notional for event in self.events)

    @property
    def buy_notional(self) -> float:
        self._expire()
        return sum(event.notional for event in self.events if event.side == "buy")

    @property
    def sell_notional(self) -> float:
        self._expire()
        return sum(event.notional for event in self.events if event.side == "sell")

    def imbalance(self) -> "OrderFlowImbalance":
        self._expire()
        buy_notional = 0.0
        sell_notional = 0.0
        for event in self.events:
            notional = event.notional
            if event.side == "buy":
                buy_notional += notional
            else:
                sell_notional += notional
        total_notional = buy_notional + sell_notional
        return OrderFlowImbalance(
            buy_notional=buy_notional,
            sell_notional=sell_notional,
            total_notional=total_notional,
        )


@dataclass(slots=True)
class OrderFlowImbalance:
    """Summarises the directional pressure within a window."""

    buy_notional: float
    sell_notional: float
    total_notional: float

    def __post_init__(self) -> None:
        self.buy_notional = max(float(self.buy_notional), 0.0)
        self.sell_notional = max(float(self.sell_notional), 0.0)
        self.total_notional = max(float(self.total_notional), 0.0)
        if self.total_notional == 0.0:
            self.total_notional = self.buy_notional + self.sell_notional

    @property
    def delta(self) -> float:
        return self.buy_notional - self.sell_notional

    @property
    def intensity(self) -> float:
        if self.total_notional == 0.0:
            return 0.0
        return abs(self.delta) / self.total_notional

    @property
    def bias(self) -> float:
        if self.total_notional == 0.0:
            return 0.5
        return self.buy_notional / self.total_notional

    @property
    def dominant_side(self) -> str:
        if self.buy_notional > self.sell_notional:
            return "buy"
        if self.sell_notional > self.buy_notional:
            return "sell"
        return "neutral"

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "buy_notional": self.buy_notional,
            "sell_notional": self.sell_notional,
            "total_notional": self.total_notional,
            "delta": self.delta,
            "intensity": self.intensity,
            "bias": self.bias,
        }


@dataclass(slots=True)
class DynamicOrderFlow:
    """High level manager for orderflow telemetry."""

    horizon: timedelta = field(default_factory=lambda: timedelta(seconds=120))
    max_samples: int = 180
    _window: OrderFlowWindow = field(init=False)
    _latencies: Deque[float] = field(default_factory=deque, init=False)

    def __post_init__(self) -> None:
        self._window = OrderFlowWindow(self.horizon)
        if self.max_samples <= 0:
            raise ValueError("max_samples must be positive")

    def ingest(self, events: Iterable[OrderEvent]) -> None:
        for event in events:
            self.record(event)

    def record(self, event: OrderEvent) -> None:
        self._window.add(event)
        latency = (_utcnow() - event.timestamp).total_seconds()
        self._latencies.append(max(latency, 0.0))
        while len(self._latencies) > self.max_samples:
            self._latencies.popleft()

    def pressure(self) -> OrderFlowImbalance:
        return self._window.imbalance()

    def average_latency(self) -> float:
        if not self._latencies:
            return 0.0
        return fmean(self._latencies)

    def health(self) -> Mapping[str, float | str]:
        imbalance = self.pressure()
        return {
            "dominant_side": imbalance.dominant_side,
            "intensity": imbalance.intensity,
            "bias": imbalance.bias,
            "average_latency": self.average_latency(),
        }
