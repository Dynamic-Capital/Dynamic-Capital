"""Dynamic Volume Algo analysing depth-of-market volume signatures."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import fmean
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "BookLevel",
    "VolumeSnapshot",
    "VolumeAlert",
    "VolumeThresholds",
    "DynamicVolumeAlgo",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_symbol(value: str) -> str:
    cleaned = value.strip().upper()
    if not cleaned:
        raise ValueError("symbol must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _ensure_sequence(value: Sequence[object] | None) -> Sequence[object]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        raise TypeError("book levels must not be a string")
    return value


def _parse_timestamp(value: object | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    raise TypeError("timestamp must be datetime or ISO string")


@dataclass(slots=True)
class BookLevel:
    """Depth-of-market level containing price and resting volume."""

    price: float
    volume: float

    def __post_init__(self) -> None:
        self.price = float(self.price)
        self.volume = max(float(self.volume), 0.0)
        if self.price <= 0.0:
            raise ValueError("price must be positive")

    def as_dict(self) -> MutableMapping[str, float]:
        return {"price": self.price, "volume": self.volume}


def _coerce_level(level: object) -> BookLevel:
    if isinstance(level, BookLevel):
        return level
    if isinstance(level, Mapping):
        if "price" not in level or "volume" not in level:
            raise KeyError("mapping level must contain price and volume")
        return BookLevel(price=level["price"], volume=level["volume"])
    if isinstance(level, Sequence) and not isinstance(level, (str, bytes)):
        if len(level) < 2:
            raise ValueError("sequence level requires price and volume")
        price, volume = level[0], level[1]
        return BookLevel(price=price, volume=volume)
    raise TypeError("level must be BookLevel, mapping, or sequence")


def _coerce_levels(levels: Sequence[object] | None) -> tuple[BookLevel, ...]:
    if not levels:
        return ()
    coerced: list[BookLevel] = []
    for level in _ensure_sequence(levels):
        coerced.append(_coerce_level(level))
    return tuple(coerced)


@dataclass(slots=True)
class VolumeSnapshot:
    """Order book snapshot summarising bid/ask depth and derived metrics."""

    symbol: str
    bids: tuple[BookLevel, ...]
    asks: tuple[BookLevel, ...]
    timestamp: datetime = field(default_factory=_utcnow)

    total_bid_volume: float = field(init=False)
    total_ask_volume: float = field(init=False)
    spread: float = field(init=False)
    mid_price: float = field(init=False)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.bids = tuple(sorted(_coerce_levels(self.bids), key=lambda level: level.price, reverse=True))
        self.asks = tuple(sorted(_coerce_levels(self.asks), key=lambda level: level.price))
        if not self.bids or not self.asks:
            raise ValueError("snapshot requires both bids and asks")
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        self.total_bid_volume = sum(level.volume for level in self.bids)
        self.total_ask_volume = sum(level.volume for level in self.asks)
        self.spread = max(self.asks[0].price - self.bids[0].price, 0.0)
        self.mid_price = (self.asks[0].price + self.bids[0].price) / 2

    @property
    def imbalance_ratio(self) -> float:
        total = self.total_bid_volume + self.total_ask_volume
        if total == 0:
            return 0.5
        return self.total_bid_volume / total

    def liquidity_pockets(self, *, multiplier: float) -> Mapping[str, tuple[BookLevel, ...]]:
        if multiplier <= 1.0:
            raise ValueError("multiplier must be > 1")
        return {
            "bids": _detect_pockets(self.bids, multiplier),
            "asks": _detect_pockets(self.asks, multiplier),
        }

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "timestamp": self.timestamp.isoformat(),
            "total_bid_volume": self.total_bid_volume,
            "total_ask_volume": self.total_ask_volume,
            "spread": self.spread,
            "mid_price": self.mid_price,
            "imbalance_ratio": self.imbalance_ratio,
            "bids": [level.as_dict() for level in self.bids],
            "asks": [level.as_dict() for level in self.asks],
        }


def _detect_pockets(levels: Sequence[BookLevel], multiplier: float) -> tuple[BookLevel, ...]:
    if not levels:
        return ()
    average_volume = fmean(level.volume for level in levels)
    if average_volume == 0:
        return ()
    pockets = [level for level in levels if level.volume >= average_volume * multiplier]
    return tuple(pockets)


@dataclass(slots=True)
class VolumeAlert:
    """Alert structure emitted when thresholds are breached."""

    symbol: str
    kind: str
    message: str
    severity: float
    metrics: Mapping[str, float]
    timestamp: datetime = field(default_factory=_utcnow)
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.kind = self.kind.strip().upper()
        if not self.kind:
            raise ValueError("kind must not be empty")
        self.message = self.message.strip()
        if not self.message:
            raise ValueError("message must not be empty")
        self.severity = _clamp(float(self.severity))
        self.metrics = dict(self.metrics)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        normalised_tags: list[str] = []
        for tag in self.tags:
            cleaned = tag.strip().lower()
            if cleaned and cleaned not in normalised_tags:
                normalised_tags.append(cleaned)
        self.tags = tuple(normalised_tags)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "kind": self.kind,
            "message": self.message,
            "severity": self.severity,
            "metrics": dict(self.metrics),
            "timestamp": self.timestamp.isoformat(),
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class VolumeThresholds:
    """Configuration for determining meaningful depth-of-market events."""

    imbalance_ratio: float = 0.65
    volume_spike_multiplier: float = 2.0
    liquidity_pocket_multiplier: float = 2.5
    spread_ratio: float = 0.0025
    history_window: int = 12

    def __post_init__(self) -> None:
        if not 0.5 <= float(self.imbalance_ratio) <= 1.0:
            raise ValueError("imbalance_ratio must be within [0.5, 1.0]")
        if self.volume_spike_multiplier <= 1.0:
            raise ValueError("volume_spike_multiplier must be > 1")
        if self.liquidity_pocket_multiplier <= 1.0:
            raise ValueError("liquidity_pocket_multiplier must be > 1")
        if self.spread_ratio <= 0:
            raise ValueError("spread_ratio must be positive")
        if self.history_window <= 1:
            raise ValueError("history_window must be greater than 1")
        self.imbalance_ratio = float(self.imbalance_ratio)
        self.volume_spike_multiplier = float(self.volume_spike_multiplier)
        self.liquidity_pocket_multiplier = float(self.liquidity_pocket_multiplier)
        self.spread_ratio = float(self.spread_ratio)
        self.history_window = int(self.history_window)


class DynamicVolumeAlgo:
    """Detects volume anomalies and liquidity pockets for trading oversight."""

    def __init__(
        self,
        *,
        window: int = 120,
        thresholds: VolumeThresholds | None = None,
    ) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self.thresholds = thresholds or VolumeThresholds()
        self._snapshots: Deque[VolumeSnapshot] = deque(maxlen=max(window, self.thresholds.history_window))
        self._listeners: list[Callable[[VolumeAlert], None]] = []

    def register_listener(self, callback: Callable[[VolumeAlert], None]) -> None:
        if not callable(callback):
            raise TypeError("callback must be callable")
        self._listeners.append(callback)

    def ingest(self, payload: VolumeSnapshot | Mapping[str, object]) -> tuple[VolumeAlert, ...]:
        snapshot = self._coerce_snapshot(payload)
        self._snapshots.append(snapshot)
        alerts = (
            list(self._detect_imbalance(snapshot))
            + list(self._detect_volume_spike(snapshot))
            + list(self._detect_liquidity_gaps(snapshot))
        )
        for alert in alerts:
            self._notify(alert)
        return tuple(alerts)

    def recent_snapshots(self) -> tuple[VolumeSnapshot, ...]:
        return tuple(self._snapshots)

    def update_thresholds(self, thresholds: VolumeThresholds) -> None:
        if not isinstance(thresholds, VolumeThresholds):
            raise TypeError("thresholds must be VolumeThresholds")
        self.thresholds = thresholds
        self._snapshots = deque(self._snapshots, maxlen=max(self._snapshots.maxlen or thresholds.history_window, thresholds.history_window))

    def _notify(self, alert: VolumeAlert) -> None:
        for listener in self._listeners:
            listener(alert)

    def _coerce_snapshot(self, payload: VolumeSnapshot | Mapping[str, object]) -> VolumeSnapshot:
        if isinstance(payload, VolumeSnapshot):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("payload must be VolumeSnapshot or mapping")
        symbol = payload.get("symbol")
        bids = payload.get("bids")
        asks = payload.get("asks")
        if symbol is None:
            raise KeyError("payload must include symbol")
        timestamp = _parse_timestamp(payload.get("timestamp"))
        return VolumeSnapshot(
            symbol=symbol,
            bids=_coerce_levels(bids),
            asks=_coerce_levels(asks),
            timestamp=timestamp or _utcnow(),
        )

    def _detect_imbalance(self, snapshot: VolumeSnapshot) -> Iterable[VolumeAlert]:
        ratio = snapshot.imbalance_ratio
        threshold = self.thresholds.imbalance_ratio
        if ratio >= threshold:
            severity = _clamp((ratio - threshold) / (1.0 - threshold or 1.0))
            yield VolumeAlert(
                symbol=snapshot.symbol,
                kind="BID_DOMINANCE",
                message=f"Bid pressure dominating with imbalance ratio {ratio:.2f}",
                severity=severity,
                metrics={
                    "imbalance_ratio": ratio,
                    "total_bid_volume": snapshot.total_bid_volume,
                    "total_ask_volume": snapshot.total_ask_volume,
                },
                tags=("volume", "imbalance", "buy_pressure"),
            )
        elif ratio <= 1 - threshold:
            dominance = 1 - ratio
            severity = _clamp((dominance - threshold) / (1.0 - threshold or 1.0))
            yield VolumeAlert(
                symbol=snapshot.symbol,
                kind="ASK_DOMINANCE",
                message=f"Ask pressure dominating with imbalance ratio {ratio:.2f}",
                severity=severity,
                metrics={
                    "imbalance_ratio": ratio,
                    "total_bid_volume": snapshot.total_bid_volume,
                    "total_ask_volume": snapshot.total_ask_volume,
                },
                tags=("volume", "imbalance", "sell_pressure"),
            )

    def _detect_volume_spike(self, snapshot: VolumeSnapshot) -> Iterable[VolumeAlert]:
        history_window = min(len(self._snapshots), self.thresholds.history_window)
        if history_window < 2:
            return ()
        history = list(self._snapshots)[-history_window:-1]
        if not history:
            return ()
        avg_bid = fmean(item.total_bid_volume for item in history)
        avg_ask = fmean(item.total_ask_volume for item in history)
        alerts: list[VolumeAlert] = []
        multiplier = self.thresholds.volume_spike_multiplier
        if avg_bid > 0 and snapshot.total_bid_volume >= avg_bid * multiplier:
            severity = _clamp(snapshot.total_bid_volume / (avg_bid * multiplier))
            alerts.append(
                VolumeAlert(
                    symbol=snapshot.symbol,
                    kind="BID_VOLUME_SPIKE",
                    message=f"Bid volume spike detected ({snapshot.total_bid_volume:.1f} vs avg {avg_bid:.1f})",
                    severity=severity,
                    metrics={
                        "current_bid_volume": snapshot.total_bid_volume,
                        "average_bid_volume": avg_bid,
                        "multiplier": multiplier,
                    },
                    tags=("volume", "spike", "buy_pressure"),
                )
            )
        if avg_ask > 0 and snapshot.total_ask_volume >= avg_ask * multiplier:
            severity = _clamp(snapshot.total_ask_volume / (avg_ask * multiplier))
            alerts.append(
                VolumeAlert(
                    symbol=snapshot.symbol,
                    kind="ASK_VOLUME_SPIKE",
                    message=f"Ask volume spike detected ({snapshot.total_ask_volume:.1f} vs avg {avg_ask:.1f})",
                    severity=severity,
                    metrics={
                        "current_ask_volume": snapshot.total_ask_volume,
                        "average_ask_volume": avg_ask,
                        "multiplier": multiplier,
                    },
                    tags=("volume", "spike", "sell_pressure"),
                )
            )
        return alerts

    def _detect_liquidity_gaps(self, snapshot: VolumeSnapshot) -> Iterable[VolumeAlert]:
        alerts: list[VolumeAlert] = []
        mid = snapshot.mid_price or snapshot.asks[0].price
        if mid <= 0:
            return alerts
        spread_ratio = snapshot.spread / mid
        if spread_ratio >= self.thresholds.spread_ratio:
            severity = _clamp(spread_ratio / self.thresholds.spread_ratio)
            alerts.append(
                VolumeAlert(
                    symbol=snapshot.symbol,
                    kind="SPREAD_WIDENING",
                    message=f"Spread widening detected at {spread_ratio:.4f}",
                    severity=severity,
                    metrics={
                        "spread": snapshot.spread,
                        "mid_price": snapshot.mid_price,
                        "spread_ratio": spread_ratio,
                    },
                    tags=("spread", "liquidity", "market"),
                )
            )
        pockets = snapshot.liquidity_pockets(multiplier=self.thresholds.liquidity_pocket_multiplier)
        for side, levels in pockets.items():
            if not levels:
                continue
            severity = _clamp(min(level.volume for level in levels) / max(
                fmean(level.volume for level in (snapshot.bids if side == "bids" else snapshot.asks)),
                1.0,
            ))
            alerts.append(
                VolumeAlert(
                    symbol=snapshot.symbol,
                    kind=f"{side.upper()}_LIQUIDITY_POCKET",
                    message=f"Liquidity pocket on {side} with {len(levels)} stacked levels",
                    severity=_clamp(severity),
                    metrics={
                        "levels": float(len(levels)),
                        "threshold_multiplier": self.thresholds.liquidity_pocket_multiplier,
                    },
                    tags=("liquidity", "depth", side),
                )
            )
        return alerts
