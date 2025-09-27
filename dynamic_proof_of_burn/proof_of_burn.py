"""Adaptive ledger utilities for Dynamic Proof of Burn."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "BurnEvent",
    "BurnProof",
    "BurnWindow",
    "DynamicProofOfBurn",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_identifier(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _normalise_asset(value: str) -> str:
    return _normalise_identifier(value).upper()


def _normalise_optional_identifier(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _coerce_numeric(value: float | int, *, minimum: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("value must be numeric") from exc
    if numeric < minimum:
        raise ValueError(f"value must be >= {minimum}")
    return numeric


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _serialise_timestamp(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _coerce_event(value: BurnEvent | Mapping[str, object]) -> BurnEvent:
    if isinstance(value, BurnEvent):
        return value
    if not isinstance(value, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("event must be a BurnEvent or mapping")
    return BurnEvent(**value)


@dataclass(slots=True)
class BurnEvent:
    """Represents a single burn proof provided by a participant."""

    asset: str
    burner: str
    amount: float
    timestamp: datetime = field(default_factory=_utcnow)
    tx_hash: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.asset = _normalise_asset(self.asset)
        self.burner = _normalise_identifier(self.burner)
        self.amount = _coerce_numeric(self.amount, minimum=0.0)
        if self.amount <= 0:
            raise ValueError("burn amount must be positive")
        self.timestamp = _ensure_utc(self.timestamp)
        self.tx_hash = _normalise_optional_identifier(self.tx_hash)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "asset": self.asset,
            "burner": self.burner,
            "amount": self.amount,
            "timestamp": _serialise_timestamp(self.timestamp),
            "tx_hash": self.tx_hash,
            "tags": self.tags,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class BurnWindow:
    """Aggregated burn insight over a specified time interval."""

    asset: str
    start_at: datetime
    end_at: datetime
    total_burned: float
    events_count: int
    top_burners: tuple[tuple[str, float], ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "asset": self.asset,
            "start_at": _serialise_timestamp(self.start_at),
            "end_at": _serialise_timestamp(self.end_at),
            "total_burned": self.total_burned,
            "events_count": self.events_count,
            "top_burners": self.top_burners,
        }


@dataclass(slots=True)
class BurnProof:
    """Canonical digest describing supply reduction for an asset."""

    asset: str
    total_supply: float
    total_burned: float
    remaining_supply: float
    burn_ratio: float
    events_count: int
    first_burn_at: datetime | None
    last_burn_at: datetime | None
    burners: Mapping[str, float]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "asset": self.asset,
            "total_supply": self.total_supply,
            "total_burned": self.total_burned,
            "remaining_supply": self.remaining_supply,
            "burn_ratio": self.burn_ratio,
            "events_count": self.events_count,
            "first_burn_at": _serialise_timestamp(self.first_burn_at),
            "last_burn_at": _serialise_timestamp(self.last_burn_at),
            "burners": dict(self.burners),
        }


class DynamicProofOfBurn:
    """Maintains verifiable burn attestations for dynamic assets."""

    _TOLERANCE = 1e-9

    def __init__(self, *, supplies: Mapping[str, float] | None = None) -> None:
        self._supplies: dict[str, float] = {}
        self._events: dict[str, list[BurnEvent]] = {}
        if supplies:
            for asset, supply in supplies.items():
                self.register_asset(asset, supply)

    def register_asset(self, asset: str, total_supply: float) -> None:
        """Register or update an asset's circulating supply."""

        normalised_asset = _normalise_asset(asset)
        supply = _coerce_numeric(total_supply, minimum=0.0)
        if supply <= 0:
            raise ValueError("total supply must be positive")
        burned = self.total_burned(normalised_asset)
        if burned and supply + self._TOLERANCE < burned:
            raise ValueError("new supply cannot be lower than burned total")
        self._supplies[normalised_asset] = supply
        self._events.setdefault(normalised_asset, [])

    def record_burn(self, event: BurnEvent | Mapping[str, object]) -> BurnEvent:
        """Record a burn event and ensure supply invariants are maintained."""

        burn = _coerce_event(event)
        if burn.asset not in self._supplies:
            raise ValueError(f"asset '{burn.asset}' is not registered")

        events = self._events.setdefault(burn.asset, [])
        if events and burn.timestamp < events[-1].timestamp:
            raise ValueError("burn events must be recorded in chronological order")

        remaining = self.remaining_supply(burn.asset)
        if burn.amount > remaining + self._TOLERANCE:
            raise ValueError("burn exceeds remaining supply")

        events.append(burn)
        return burn

    def record_burns(self, events: Iterable[BurnEvent | Mapping[str, object]]) -> None:
        """Record multiple burns atomically."""

        staged: list[BurnEvent] = []
        for event in events:
            staged.append(_coerce_event(event))
        for burn in staged:
            self.record_burn(burn)

    def assets(self) -> tuple[str, ...]:
        return tuple(sorted(self._supplies))

    def total_supply(self, asset: str) -> float:
        normalised_asset = _normalise_asset(asset)
        if normalised_asset not in self._supplies:
            raise ValueError(f"asset '{normalised_asset}' is not registered")
        return self._supplies[normalised_asset]

    def burn_history(self, asset: str) -> tuple[BurnEvent, ...]:
        normalised_asset = _normalise_asset(asset)
        return tuple(self._events.get(normalised_asset, ()))

    def total_burned(self, asset: str) -> float:
        normalised_asset = _normalise_asset(asset)
        return sum(event.amount for event in self._events.get(normalised_asset, ()))

    def remaining_supply(self, asset: str) -> float:
        normalised_asset = _normalise_asset(asset)
        if normalised_asset not in self._supplies:
            raise ValueError(f"asset '{normalised_asset}' is not registered")
        return max(self._supplies[normalised_asset] - self.total_burned(normalised_asset), 0.0)

    def burn_ratio(self, asset: str) -> float:
        normalised_asset = _normalise_asset(asset)
        supply = self.total_supply(normalised_asset)
        if supply <= self._TOLERANCE:
            return 0.0
        return self.total_burned(normalised_asset) / supply

    def window(self, asset: str, start: datetime, end: datetime, *, top: int = 3) -> BurnWindow:
        """Summarise burn activity inside an interval."""

        normalised_asset = _normalise_asset(asset)
        start_at = _ensure_utc(start)
        end_at = _ensure_utc(end)
        if end_at < start_at:
            raise ValueError("end must not be earlier than start")

        events = [
            event
            for event in self._events.get(normalised_asset, ())
            if start_at <= event.timestamp <= end_at
        ]
        total_burned = sum(event.amount for event in events)
        counter: Counter[str] = Counter()
        for event in events:
            counter[event.burner] += event.amount
        top_burners = tuple(counter.most_common(max(top, 0)))
        return BurnWindow(
            asset=normalised_asset,
            start_at=start_at,
            end_at=end_at,
            total_burned=total_burned,
            events_count=len(events),
            top_burners=top_burners,
        )

    def generate_proof(self, asset: str) -> BurnProof:
        normalised_asset = _normalise_asset(asset)
        total_supply = self.total_supply(normalised_asset)
        events = self._events.get(normalised_asset, [])
        total_burned = sum(event.amount for event in events)
        remaining_supply = max(total_supply - total_burned, 0.0)
        burn_ratio = 0.0 if total_supply <= self._TOLERANCE else total_burned / total_supply
        burners = Counter({event.burner: 0.0 for event in events})
        for event in events:
            burners[event.burner] += event.amount
        first_burn_at = events[0].timestamp if events else None
        last_burn_at = events[-1].timestamp if events else None
        return BurnProof(
            asset=normalised_asset,
            total_supply=total_supply,
            total_burned=total_burned,
            remaining_supply=remaining_supply,
            burn_ratio=burn_ratio,
            events_count=len(events),
            first_burn_at=first_burn_at,
            last_burn_at=last_burn_at,
            burners=dict(burners),
        )

    def verify_proof(self, proof: BurnProof) -> bool:
        """Verify a proof by recomputing it from the ledger."""

        expected = self.generate_proof(proof.asset)
        return (
            abs(proof.total_supply - expected.total_supply) <= self._TOLERANCE
            and abs(proof.total_burned - expected.total_burned) <= self._TOLERANCE
            and abs(proof.remaining_supply - expected.remaining_supply) <= self._TOLERANCE
            and abs(proof.burn_ratio - expected.burn_ratio) <= self._TOLERANCE
            and proof.events_count == expected.events_count
            and proof.first_burn_at == expected.first_burn_at
            and proof.last_burn_at == expected.last_burn_at
            and dict(proof.burners) == dict(expected.burners)
        )
