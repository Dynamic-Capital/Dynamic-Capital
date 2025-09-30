"""Dynamic liquidity intelligence utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LiquidityLevel",
    "LiquiditySnapshot",
    "LiquiditySignal",
    "DynamicLiquidity",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timezone(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _coerce_levels(levels: Sequence[Mapping[str, object]] | Sequence["LiquidityLevel"] | None) -> tuple["LiquidityLevel", ...]:
    if not levels:
        return ()
    coerced: list[LiquidityLevel] = []
    for level in levels:
        if isinstance(level, LiquidityLevel):
            coerced.append(level)
            continue
        if not isinstance(level, Mapping):
            raise TypeError("levels must be mappings or LiquidityLevel instances")
        price = float(level["price"])
        size = float(level["size"])
        coerced.append(LiquidityLevel(price=price, size=size))
    return tuple(sorted(coerced, key=lambda lvl: lvl.price))


@dataclass(slots=True)
class LiquidityLevel:
    """Single level of liquidity at a given price."""

    price: float
    size: float

    def __post_init__(self) -> None:
        self.price = float(self.price)
        self.size = max(float(self.size), 0.0)
        if self.price <= 0.0:
            raise ValueError("price must be positive")

    def as_dict(self) -> MutableMapping[str, float]:
        return {"price": self.price, "size": self.size}


@dataclass(slots=True)
class LiquiditySnapshot:
    """Represents the state of liquidity for a symbol."""

    symbol: str
    bids: tuple[LiquidityLevel, ...]
    asks: tuple[LiquidityLevel, ...]
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.symbol = self.symbol.strip().upper()
        if not self.symbol:
            raise ValueError("symbol must not be empty")
        self.bids = tuple(sorted(_coerce_levels(self.bids), key=lambda level: level.price, reverse=True))
        self.asks = tuple(sorted(_coerce_levels(self.asks), key=lambda level: level.price))
        if not self.bids or not self.asks:
            raise ValueError("snapshot requires both bids and asks")
        self.timestamp = _ensure_timezone(self.timestamp)

    @property
    def best_bid(self) -> LiquidityLevel:
        return self.bids[0]

    @property
    def best_ask(self) -> LiquidityLevel:
        return self.asks[0]

    @property
    def spread(self) -> float:
        return max(self.best_ask.price - self.best_bid.price, 0.0)

    @property
    def mid_price(self) -> float:
        return (self.best_bid.price + self.best_ask.price) / 2

    @property
    def depth(self) -> float:
        return sum(level.size for level in self.bids[:5]) + sum(level.size for level in self.asks[:5])

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp.isoformat(),
            "spread": self.spread,
            "mid_price": self.mid_price,
            "depth": self.depth,
            "bids": [level.as_dict() for level in self.bids],
            "asks": [level.as_dict() for level in self.asks],
        }


@dataclass(slots=True)
class LiquiditySignal:
    """Derived liquidity signal summarising execution quality."""

    spread: float
    depth: float
    slippage_estimate: float
    quality_score: float

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "spread": self.spread,
            "depth": self.depth,
            "slippage_estimate": self.slippage_estimate,
            "quality_score": self.quality_score,
        }


@dataclass(slots=True)
class DynamicLiquidity:
    """Maintains a rolling view of liquidity conditions."""

    horizon: timedelta = field(default_factory=lambda: timedelta(minutes=5))
    max_snapshots: int = 120
    _snapshots: Deque[LiquiditySnapshot] = field(default_factory=deque, init=False)

    def __post_init__(self) -> None:
        if isinstance(self.horizon, (int, float)):
            self.horizon = timedelta(seconds=float(self.horizon))
        if self.horizon <= timedelta(0):
            raise ValueError("horizon must be positive")
        if self.max_snapshots <= 0:
            raise ValueError("max_snapshots must be positive")

    def add_snapshot(self, snapshot: LiquiditySnapshot) -> None:
        self._snapshots.append(snapshot)
        self._expire(snapshot.timestamp)
        while len(self._snapshots) > self.max_snapshots:
            self._snapshots.popleft()

    def extend(self, snapshots: Iterable[LiquiditySnapshot]) -> None:
        for snapshot in snapshots:
            self.add_snapshot(snapshot)

    def _expire(self, now: datetime | None = None) -> None:
        cutoff = (now or _utcnow()) - self.horizon
        while self._snapshots and self._snapshots[0].timestamp < cutoff:
            self._snapshots.popleft()

    def latest(self) -> LiquiditySnapshot | None:
        return self._snapshots[-1] if self._snapshots else None

    def signal(self) -> LiquiditySignal | None:
        if not self._snapshots:
            return None
        spreads = [snapshot.spread for snapshot in self._snapshots]
        depths = [snapshot.depth for snapshot in self._snapshots]
        avg_spread = fmean(spreads)
        avg_depth = fmean(depths)
        latest = self._snapshots[-1]
        slippage = 0.0
        if avg_depth > 0:
            slippage = latest.spread / max(avg_depth, 1e-9)
        quality = max(0.0, min(1.0, (avg_depth / (avg_spread + 1e-6)) / 100))
        return LiquiditySignal(
            spread=avg_spread,
            depth=avg_depth,
            slippage_estimate=slippage,
            quality_score=quality,
        )

    def health(self) -> Mapping[str, float] | None:
        signal = self.signal()
        if signal is None:
            return None
        return signal.as_dict()
