"""Market data providers that emit normalised depth snapshots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Mapping, MutableSequence, Protocol, Sequence

__all__ = [
    "LevelLike",
    "MarketDepthProvider",
    "MarketDepthSnapshot",
    "ProviderError",
    "coerce_levels",
    "create_snapshot",
    "normalise_symbol",
    "parse_timestamp",
    "split_market",
]


class ProviderError(RuntimeError):
    """Raised when a market data provider is unable to deliver a snapshot."""


@dataclass(slots=True)
class MarketDepthSnapshot:
    """Aggregated market depth information for a trading pair."""

    symbol: str
    provider: str
    bid_price: float
    ask_price: float
    mid_price: float
    spread_bps: float
    depth_usd: float
    bid_volume: float
    ask_volume: float
    tick_volume: float
    observed_at: datetime


class MarketDepthProvider(Protocol):
    """Interface implemented by market depth providers."""

    def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot | None:
        """Return a depth snapshot for ``market`` or ``None`` if unavailable."""


LevelLike = Sequence[object] | Mapping[str, object]


def normalise_symbol(symbol: str) -> str:
    """Render ``symbol`` suitable for storage (strips separators and casing)."""

    return symbol.replace("/", "").replace("-", "").upper()


def split_market(market: str) -> tuple[str, str]:
    """Split a market symbol into base/quote tokens."""

    token = market.replace("/", "-")
    if "-" not in token:
        raise ValueError(f"Unable to derive base/quote from '{market}'")
    base, quote = token.split("-", 1)
    return base.upper(), quote.upper()


def parse_timestamp(value: object) -> datetime:
    """Parse timestamps from providers into timezone-aware datetimes."""

    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(tz=timezone.utc)


def _coerce_number(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _coerce_level(level: LevelLike) -> tuple[float, float] | None:
    if isinstance(level, Mapping):
        price = _coerce_number(
            level.get("price")
            or level.get("p")
            or level.get("rate")
            or level.get("value")
        )
        amount = _coerce_number(
            level.get("size")
            or level.get("quantity")
            or level.get("amount")
            or level.get("volume")
            or level.get("qty")
        )
        if price is None or amount is None:
            return None
        return price, amount

    if len(level) >= 2:
        price = _coerce_number(level[0])
        amount = _coerce_number(level[1])
        if price is None or amount is None:
            return None
        return price, amount
    return None


def coerce_levels(levels: Sequence[LevelLike]) -> list[tuple[float, float]]:
    """Normalise provider-specific depth into price/size tuples."""

    output: MutableSequence[tuple[float, float]] = []
    for level in levels:
        coerced = _coerce_level(level)
        if coerced:
            output.append(coerced)
    return list(output)


def create_snapshot(
    *,
    symbol: str,
    provider: str,
    bids: Sequence[LevelLike],
    asks: Sequence[LevelLike],
    depth: int,
    observed_at: datetime,
) -> MarketDepthSnapshot | None:
    """Build a :class:`MarketDepthSnapshot` from depth levels."""

    bid_levels = coerce_levels(bids)
    ask_levels = coerce_levels(asks)
    if not bid_levels or not ask_levels:
        return None

    bid_price = bid_levels[0][0]
    ask_price = ask_levels[0][0]
    mid_price = (bid_price + ask_price) / 2 if (bid_price and ask_price) else 0.0
    spread_bps = ((ask_price - bid_price) / mid_price * 10_000) if mid_price else 0.0

    bid_volume = sum(level[1] for level in bid_levels[:depth])
    ask_volume = sum(level[1] for level in ask_levels[:depth])

    depth_usd = sum(price * size for price, size in bid_levels[:depth])
    depth_usd += sum(price * size for price, size in ask_levels[:depth])

    tick_volume = 0.0
    if bid_levels:
        tick_volume += bid_levels[0][1]
    if ask_levels:
        tick_volume += ask_levels[0][1]

    return MarketDepthSnapshot(
        symbol=normalise_symbol(symbol),
        provider=provider,
        bid_price=bid_price,
        ask_price=ask_price,
        mid_price=mid_price,
        spread_bps=spread_bps,
        depth_usd=depth_usd,
        bid_volume=bid_volume,
        ask_volume=ask_volume,
        tick_volume=tick_volume,
        observed_at=observed_at,
    )
