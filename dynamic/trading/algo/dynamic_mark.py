"""Mark-to-market utilities for Dynamic Capital trading portfolios."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Mapping, MutableMapping, Optional, Tuple

__all__ = [
    "PositionMark",
    "PortfolioMarkSnapshot",
    "DynamicMark",
]


def _coerce_timestamp(value: datetime | str | None = None) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*."""

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive guardrail
            raise ValueError(f"Invalid ISO timestamp: {value!r}") from exc
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp must be datetime, ISO string, or None")


def _coerce_float(value: object, *, name: str) -> float:
    try:
        coerced = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise ValueError(f"{name} must be numeric") from exc
    return coerced


@dataclass(slots=True)
class PositionMark:
    """Snapshot of a single open position."""

    symbol: str
    quantity: float
    entry_price: float
    current_price: float
    last_updated: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.symbol:
            raise ValueError("symbol is required")

        self.symbol = str(self.symbol).upper()
        self.quantity = _coerce_float(self.quantity, name="quantity")
        if self.quantity == 0:
            raise ValueError("quantity must be non-zero")

        self.entry_price = _coerce_float(self.entry_price, name="entry_price")
        if self.entry_price <= 0:
            raise ValueError("entry_price must be positive")

        self.current_price = _coerce_float(self.current_price, name="current_price")
        if self.current_price <= 0:
            raise ValueError("current_price must be positive")

        self.last_updated = _coerce_timestamp(self.last_updated)

    # ------------------------------------------------------------------ metrics
    @property
    def direction(self) -> str:
        return "long" if self.quantity > 0 else "short"

    @property
    def notional(self) -> float:
        return abs(self.quantity) * self.current_price

    @property
    def value(self) -> float:
        return self.quantity * self.current_price

    @property
    def cost_basis(self) -> float:
        return self.quantity * self.entry_price

    @property
    def unrealised_pnl(self) -> float:
        return (self.current_price - self.entry_price) * self.quantity

    @property
    def return_pct(self) -> Optional[float]:
        denominator = abs(self.entry_price * self.quantity)
        if denominator == 0:
            return None
        return round(self.unrealised_pnl / denominator, 6)

    # ----------------------------------------------------------------- mutation
    def update_price(self, price: float, *, timestamp: datetime | str | None = None) -> None:
        self.current_price = _coerce_float(price, name="price")
        if self.current_price <= 0:
            raise ValueError("price must be positive")
        self.last_updated = _coerce_timestamp(timestamp)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "current_price": self.current_price,
            "direction": self.direction,
            "notional": self.notional,
            "value": self.value,
            "cost_basis": self.cost_basis,
            "unrealised_pnl": self.unrealised_pnl,
            "return_pct": self.return_pct,
            "last_updated": self.last_updated.isoformat(),
            "metadata": dict(self.metadata) if self.metadata else None,
        }


@dataclass(slots=True)
class PortfolioMarkSnapshot:
    """Aggregated mark-to-market metrics for the portfolio."""

    timestamp: datetime
    position_count: int
    gross_exposure: float
    net_exposure: float
    long_exposure: float
    short_exposure: float
    total_unrealised_pnl: float
    average_return_pct: Optional[float]
    best_symbol: Optional[str]
    worst_symbol: Optional[str]
    marks: Tuple[PositionMark, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "position_count": self.position_count,
            "gross_exposure": self.gross_exposure,
            "net_exposure": self.net_exposure,
            "long_exposure": self.long_exposure,
            "short_exposure": self.short_exposure,
            "total_unrealised_pnl": self.total_unrealised_pnl,
            "average_return_pct": self.average_return_pct,
            "best_symbol": self.best_symbol,
            "worst_symbol": self.worst_symbol,
            "marks": [mark.as_dict() for mark in self.marks],
        }


class DynamicMark:
    """Maintain rolling position marks and aggregate exposure metrics."""

    def __init__(self) -> None:
        self._positions: Dict[str, PositionMark] = {}

    # ------------------------------------------------------------- position ops
    def upsert_position(
        self,
        symbol: str,
        quantity: float,
        *,
        entry_price: float,
        current_price: float | None = None,
        timestamp: datetime | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> PositionMark:
        price = current_price if current_price is not None else entry_price
        mark = PositionMark(
            symbol=symbol,
            quantity=quantity,
            entry_price=entry_price,
            current_price=price,
            last_updated=_coerce_timestamp(timestamp),
            metadata=metadata,
        )
        self._positions[mark.symbol] = mark
        return mark

    def mark_price(
        self,
        symbol: str,
        price: float,
        *,
        timestamp: datetime | str | None = None,
    ) -> Optional[PositionMark]:
        key = symbol.upper()
        mark = self._positions.get(key)
        if mark is None:
            return None
        mark.update_price(price, timestamp=timestamp)
        return mark

    def close_position(self, symbol: str) -> bool:
        key = symbol.upper()
        if key not in self._positions:
            return False
        self._positions.pop(key, None)
        return True

    # --------------------------------------------------------------- inspection
    def get(self, symbol: str) -> Optional[PositionMark]:
        return self._positions.get(symbol.upper())

    def positions(self) -> Tuple[PositionMark, ...]:
        return tuple(sorted(self._positions.values(), key=lambda mark: mark.symbol))

    def portfolio_snapshot(self) -> PortfolioMarkSnapshot:
        marks = self.positions()
        timestamp = max((mark.last_updated for mark in marks), default=datetime.now(timezone.utc))

        if not marks:
            return PortfolioMarkSnapshot(
                timestamp=timestamp,
                position_count=0,
                gross_exposure=0.0,
                net_exposure=0.0,
                long_exposure=0.0,
                short_exposure=0.0,
                total_unrealised_pnl=0.0,
                average_return_pct=None,
                best_symbol=None,
                worst_symbol=None,
                marks=(),
            )

        gross_exposure = sum(mark.notional for mark in marks)
        net_exposure = sum(mark.value for mark in marks)
        long_exposure = sum(mark.value for mark in marks if mark.quantity > 0)
        short_exposure = sum(abs(mark.value) for mark in marks if mark.quantity < 0)
        total_unrealised_pnl = sum(mark.unrealised_pnl for mark in marks)

        returns = [r for mark in marks if (r := mark.return_pct) is not None]
        average_return_pct = round(sum(returns) / len(returns), 6) if returns else None

        best_mark = max(marks, key=lambda mark: mark.unrealised_pnl, default=None)
        worst_mark = min(marks, key=lambda mark: mark.unrealised_pnl, default=None)

        return PortfolioMarkSnapshot(
            timestamp=timestamp,
            position_count=len(marks),
            gross_exposure=gross_exposure,
            net_exposure=net_exposure,
            long_exposure=long_exposure,
            short_exposure=short_exposure,
            total_unrealised_pnl=total_unrealised_pnl,
            average_return_pct=average_return_pct,
            best_symbol=best_mark.symbol if best_mark else None,
            worst_symbol=worst_mark.symbol if worst_mark else None,
            marks=marks,
        )

    def as_dict(self) -> MutableMapping[str, object]:
        snapshot = self.portfolio_snapshot()
        return snapshot.as_dict()

    def clear(self) -> None:
        self._positions.clear()
