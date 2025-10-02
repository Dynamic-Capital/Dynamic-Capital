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
    _buy_notional: float = field(default=0.0, init=False, repr=False)
    _sell_notional: float = field(default=0.0, init=False, repr=False)
    _total_notional: float = field(default=0.0, init=False, repr=False)
    _count: int = field(default=0, init=False, repr=False)

    def __post_init__(self) -> None:
        if isinstance(self.horizon, (int, float)):
            self.horizon = timedelta(seconds=float(self.horizon))
        if self.horizon <= timedelta(0):
            raise ValueError("horizon must be positive")

    def add(self, event: OrderEvent) -> None:
        self.events.append(event)
        self._accumulate(event)
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
            expired = self.events.popleft()
            self._release(expired)

    def _accumulate(self, event: OrderEvent) -> None:
        notional = event.notional
        if event.side == "buy":
            self._buy_notional += notional
        else:
            self._sell_notional += notional
        self._total_notional += notional
        self._count += 1

    def _release(self, event: OrderEvent) -> None:
        notional = event.notional
        if event.side == "buy":
            self._buy_notional = max(self._buy_notional - notional, 0.0)
        else:
            self._sell_notional = max(self._sell_notional - notional, 0.0)
        self._total_notional = max(self._total_notional - notional, 0.0)
        self._count = max(self._count - 1, 0)

    @property
    def total_notional(self) -> float:
        self._expire()
        return self._total_notional

    @property
    def buy_notional(self) -> float:
        self._expire()
        return self._buy_notional

    @property
    def sell_notional(self) -> float:
        self._expire()
        return self._sell_notional

    @property
    def event_count(self) -> int:
        self._expire()
        return self._count

    def event_rate(self) -> float:
        """Return the realised events per minute over the active window."""

        self._expire()
        if not self.events:
            return 0.0
        if len(self.events) == 1:
            return 60.0 / max(self.horizon.total_seconds(), 1.0)
        span = (self.events[-1].timestamp - self.events[0].timestamp).total_seconds()
        if span <= 0.0:
            span = 1.0
        return (len(self.events) * 60.0) / span

    def imbalance(self) -> "OrderFlowImbalance":
        self._expire()
        return OrderFlowImbalance(
            buy_notional=self._buy_notional,
            sell_notional=self._sell_notional,
            total_notional=self._total_notional,
            event_count=self._count,
        )


@dataclass(slots=True)
class OrderFlowImbalance:
    """Summarises the directional pressure within a window."""

    buy_notional: float
    sell_notional: float
    total_notional: float
    event_count: int = 0

    def __post_init__(self) -> None:
        self.buy_notional = max(float(self.buy_notional), 0.0)
        self.sell_notional = max(float(self.sell_notional), 0.0)
        self.total_notional = max(float(self.total_notional), 0.0)
        self.event_count = max(int(self.event_count), 0)
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

    @property
    def average_notional(self) -> float:
        if self.event_count == 0:
            return 0.0
        return self.total_notional / self.event_count

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "buy_notional": self.buy_notional,
            "sell_notional": self.sell_notional,
            "total_notional": self.total_notional,
            "delta": self.delta,
            "intensity": self.intensity,
            "bias": self.bias,
            "event_count": float(self.event_count),
            "average_notional": self.average_notional,
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

    def health(self) -> Mapping[str, float | int | str]:
        imbalance = self.pressure()
        return {
            "dominant_side": imbalance.dominant_side,
            "intensity": imbalance.intensity,
            "bias": imbalance.bias,
            "average_latency": self.average_latency(),
            "events_per_minute": self._window.event_rate(),
            "event_count": imbalance.event_count,
            "average_notional": imbalance.average_notional,
        }
