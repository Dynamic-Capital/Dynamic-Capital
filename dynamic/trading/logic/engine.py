"""Dynamic capital telemetry for portfolio risk."""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import date, datetime, timezone
from math import sqrt
from statistics import fmean
from typing import Any, Deque, Dict, Iterable, Mapping, MutableMapping

try:  # pragma: no cover - optional dependency
    from integrations.data_collection_api import (
        bootstrap_data_collection_api,
        serialise_for_collection,
    )
except Exception:  # pragma: no cover - collector dependency optional
    bootstrap_data_collection_api = None  # type: ignore
    serialise_for_collection = None  # type: ignore

logger = logging.getLogger(__name__)

__all__ = [
    "Position",
    "RiskLimits",
    "RiskTelemetry",
    "DynamicRisk",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_symbol(value: str) -> str:
    symbol = value.strip().upper()
    if not symbol:
        raise ValueError("symbol must not be empty")
    return symbol


def _collection_payload(value: Any) -> Any:
    if serialise_for_collection is not None:
        try:
            return serialise_for_collection(value)
        except Exception:  # pragma: no cover - defensive
            pass
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc).isoformat()
    if is_dataclass(value):
        try:
            return {key: _collection_payload(val) for key, val in asdict(value).items()}
        except Exception:  # pragma: no cover - defensive
            return str(value)
    if isinstance(value, Mapping):
        return {str(key): _collection_payload(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_collection_payload(item) for item in value]
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        try:
            mapping = to_dict()
        except Exception:  # pragma: no cover - user provided
            mapping = None
        if isinstance(mapping, Mapping):
            return {str(key): _collection_payload(val) for key, val in mapping.items()}
    as_dict_method = getattr(value, "as_dict", None)
    if callable(as_dict_method):
        try:
            mapping = as_dict_method()
        except Exception:  # pragma: no cover - user provided
            mapping = None
        if isinstance(mapping, Mapping):
            return {str(key): _collection_payload(val) for key, val in mapping.items()}
    if hasattr(value, "__dict__"):
        return {
            str(key): _collection_payload(val)
            for key, val in vars(value).items()
            if not key.startswith("_")
        }
    return str(value)


@dataclass(slots=True)
class Position:
    """Represents a live trading position."""

    symbol: str
    quantity: float
    entry_price: float
    last_price: float
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.quantity = float(self.quantity)
        self.entry_price = float(self.entry_price)
        self.last_price = float(self.last_price)
        if self.entry_price <= 0 or self.last_price <= 0:
            raise ValueError("prices must be positive")
        self.updated_at = _ensure_timestamp(self.updated_at)

    @property
    def exposure(self) -> float:
        return self.last_price * self.quantity

    @property
    def unrealised_pnl(self) -> float:
        return (self.last_price - self.entry_price) * self.quantity

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "last_price": self.last_price,
            "updated_at": self.updated_at.isoformat(),
            "exposure": self.exposure,
            "unrealised_pnl": self.unrealised_pnl,
        }


@dataclass(slots=True)
class RiskLimits:
    """Portfolio guard rails."""

    max_gross_exposure: float
    max_single_position: float
    max_var: float

    def __post_init__(self) -> None:
        self.max_gross_exposure = float(self.max_gross_exposure)
        self.max_single_position = float(self.max_single_position)
        self.max_var = float(self.max_var)
        if min(self.max_gross_exposure, self.max_single_position, self.max_var) <= 0:
            raise ValueError("risk limits must be positive")


@dataclass(slots=True)
class RiskTelemetry:
    """Computed telemetry snapshot."""

    gross_exposure: float
    net_exposure: float
    largest_position: float
    value_at_risk: float
    breaches: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "gross_exposure": self.gross_exposure,
            "net_exposure": self.net_exposure,
            "largest_position": self.largest_position,
            "value_at_risk": self.value_at_risk,
            "breaches": list(self.breaches),
        }


@dataclass(slots=True)
class DynamicRisk:
    """Tracks portfolio risk metrics in real time."""

    limits: RiskLimits
    returns_horizon: int = 64
    data_collector: Any | None = None
    _positions: dict[str, Position] = field(default_factory=dict, init=False)
    _portfolio_returns: Deque[float] = field(default_factory=deque, init=False)

    def __post_init__(self) -> None:
        if self.returns_horizon <= 1:
            raise ValueError("returns_horizon must be greater than one")
        if self.data_collector is None:
            self.data_collector = self._bootstrap_data_collector()

    def upsert_position(self, position: Position) -> None:
        self._positions[position.symbol] = position

    def ingest_positions(self, positions: Iterable[Position]) -> None:
        for position in positions:
            self.upsert_position(position)

    def mark_price(self, symbol: str, price: float, *, timestamp: datetime | None = None) -> None:
        normalised = _normalise_symbol(symbol)
        if normalised not in self._positions:
            raise KeyError(f"position for {normalised} not found")
        position = self._positions[normalised]
        self._positions[normalised] = Position(
            symbol=position.symbol,
            quantity=position.quantity,
            entry_price=position.entry_price,
            last_price=price,
            updated_at=_ensure_timestamp(timestamp),
        )

    def register_return(self, portfolio_return: float) -> None:
        self._portfolio_returns.append(float(portfolio_return))
        while len(self._portfolio_returns) > self.returns_horizon:
            self._portfolio_returns.popleft()

    def _value_at_risk(self) -> float:
        if not self._portfolio_returns:
            return 0.0
        mean_return = fmean(self._portfolio_returns)
        variance = fmean([(value - mean_return) ** 2 for value in self._portfolio_returns])
        stdev = sqrt(variance)
        # 95% one-day VaR assuming normality
        return abs(mean_return - 1.65 * stdev)

    def snapshot(self) -> RiskTelemetry:
        exposures = [abs(position.exposure) for position in self._positions.values()]
        gross_exposure = sum(exposures)
        net_exposure = sum(position.exposure for position in self._positions.values())
        largest_position = max(exposures, default=0.0)
        var = self._value_at_risk()
        breaches: list[str] = []
        if gross_exposure > self.limits.max_gross_exposure:
            breaches.append("gross_exposure")
        if largest_position > self.limits.max_single_position:
            breaches.append("single_position")
        if var > self.limits.max_var:
            breaches.append("value_at_risk")
        telemetry = RiskTelemetry(
            gross_exposure=gross_exposure,
            net_exposure=net_exposure,
            largest_position=largest_position,
            value_at_risk=var,
            breaches=tuple(breaches),
        )
        self._emit_telemetry(telemetry)
        return telemetry

    def health(self) -> Mapping[str, object]:
        return self.snapshot().as_dict()

    def _emit_telemetry(self, telemetry: RiskTelemetry) -> None:
        collector = getattr(self, "data_collector", None)
        if not collector:
            return
        record_telemetry = getattr(collector, "record_telemetry", None)
        if not callable(record_telemetry):
            return

        payload: Dict[str, Any] = {
            "telemetry": _collection_payload(telemetry.as_dict()),
            "limits": _collection_payload(asdict(self.limits)),
            "positions": [
                _collection_payload(position.as_dict()) for position in self._positions.values()
            ],
            "portfolio_returns": [float(value) for value in self._portfolio_returns],
            "returns_horizon": self.returns_horizon,
            "captured_at": _utcnow().isoformat(),
        }

        try:
            record_telemetry(payload)
        except Exception:  # pragma: no cover - telemetry best effort
            logger.debug("Failed to submit risk telemetry to data collector", exc_info=True)

    def _bootstrap_data_collector(self) -> Any | None:
        if bootstrap_data_collection_api is None:
            return None
        try:
            return bootstrap_data_collection_api()
        except Exception:  # pragma: no cover - collector optional
            logger.debug("Risk data collection bootstrap failed", exc_info=True)
            return None
