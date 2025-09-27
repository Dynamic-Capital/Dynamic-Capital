"""Adaptive index construction and monitoring primitives."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "IndexConstituent",
    "IndexSignal",
    "IndexSnapshot",
    "DynamicIndex",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_symbol(value: str) -> str:
    cleaned = value.strip().upper()
    if not cleaned:
        raise ValueError("symbol must not be empty")
    return cleaned


def _normalise_category(value: str | None) -> str:
    if value is None:
        return "GENERAL"
    cleaned = value.strip().upper() or "GENERAL"
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _weighted_mean(values: Sequence[float], weights: Sequence[float]) -> float:
    if not values:
        raise ValueError("values must not be empty")
    normalised = _normalise_weights(weights)
    return sum(value * weight for value, weight in zip(values, normalised))


def _normalise_weights(weights: Sequence[float]) -> tuple[float, ...]:
    total = float(sum(weights))
    if total <= 0:
        if not weights:
            return ()
        fallback = 1.0 / float(len(weights))
        return tuple(fallback for _ in weights)
    return tuple(max(weight, 0.0) / total for weight in weights)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class IndexConstituent:
    """Single component of the dynamic index."""

    symbol: str
    weight: float
    exposure: float = 0.0
    volatility: float = 0.2
    momentum: float = 0.0
    conviction: float = 0.5
    liquidity: float = 0.5
    category: str = "GENERAL"
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.weight = max(float(self.weight), 0.0)
        self.exposure = _clamp(float(self.exposure), lower=-1.0, upper=1.0)
        self.volatility = max(float(self.volatility), 0.0)
        self.momentum = _clamp(float(self.momentum), lower=-1.0, upper=1.0)
        self.conviction = _clamp(float(self.conviction), lower=0.0, upper=1.0)
        self.liquidity = _clamp(float(self.liquidity), lower=0.0, upper=1.0)
        self.category = _normalise_category(self.category)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)

    def apply_signal(self, signal: "IndexSignal") -> None:
        """Update state based on an index signal."""

        momentum_alpha = 0.35
        exposure_alpha = 0.25
        conviction_alpha = 0.25

        self.momentum = _clamp(
            (1.0 - momentum_alpha) * self.momentum + momentum_alpha * signal.return_pct,
            lower=-1.0,
            upper=1.0,
        )
        self.exposure = _clamp(
            self.exposure + exposure_alpha * signal.flow_bias,
            lower=-1.0,
            upper=1.0,
        )
        self.conviction = _clamp(
            (1.0 - conviction_alpha) * self.conviction
            + conviction_alpha * signal.confidence,
            lower=0.0,
            upper=1.0,
        )

        if signal.volatility is not None:
            self.volatility = max(signal.volatility, 0.0)

        if signal.liquidity is not None:
            self.liquidity = _clamp(signal.liquidity, lower=0.0, upper=1.0)


@dataclass(slots=True)
class IndexSignal:
    """Market or portfolio level event influencing a constituent."""

    symbol: str
    return_pct: float = 0.0
    flow_bias: float = 0.0
    confidence: float = 0.5
    volatility: float | None = None
    liquidity: float | None = None
    narrative: str | None = None
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.return_pct = _clamp(float(self.return_pct), lower=-1.0, upper=1.0)
        self.flow_bias = _clamp(float(self.flow_bias), lower=-1.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        if self.volatility is not None:
            self.volatility = max(float(self.volatility), 0.0)
        if self.liquidity is not None:
            self.liquidity = _clamp(float(self.liquidity), lower=0.0, upper=1.0)
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=timezone.utc)
        else:
            self.timestamp = self.timestamp.astimezone(timezone.utc)
        if self.narrative is not None:
            self.narrative = self.narrative.strip() or None


@dataclass(slots=True)
class IndexSnapshot:
    """Aggregated view of the index posture."""

    timestamp: datetime
    value: float
    net_exposure: float
    concentration: float
    breadth: float
    momentum: float
    stress: float
    liquidity: float
    top_constituents: tuple[str, ...]
    notes: tuple[str, ...]

    def as_dict(self) -> Mapping[str, object]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "value": self.value,
            "net_exposure": self.net_exposure,
            "concentration": self.concentration,
            "breadth": self.breadth,
            "momentum": self.momentum,
            "stress": self.stress,
            "liquidity": self.liquidity,
            "top_constituents": list(self.top_constituents),
            "notes": list(self.notes),
        }


# ---------------------------------------------------------------------------
# engine


class DynamicIndex:
    """Maintain a weighted index and derive contextual diagnostics."""

    def __init__(self, *, history: int = 120) -> None:
        self._constituents: dict[str, IndexConstituent] = {}
        self._signals: Deque[IndexSignal] = deque(maxlen=history)

    # --------------------------------------------------------------- constituents
    def upsert_constituent(
        self, constituent: IndexConstituent | Mapping[str, object]
    ) -> IndexConstituent:
        resolved = self._coerce_constituent(constituent)
        self._constituents[resolved.symbol] = resolved
        return resolved

    def extend(self, constituents: Iterable[IndexConstituent | Mapping[str, object]]) -> None:
        for constituent in constituents:
            self.upsert_constituent(constituent)

    def remove(self, symbol: str) -> None:
        self._constituents.pop(_normalise_symbol(symbol), None)

    def constituents(self) -> tuple[IndexConstituent, ...]:
        return tuple(self._constituents[symbol] for symbol in sorted(self._constituents))

    # -------------------------------------------------------------------- signals
    def record(self, signal: IndexSignal | Mapping[str, object]) -> IndexSignal:
        resolved = self._coerce_signal(signal)
        constituent = self._constituents.get(resolved.symbol)
        if constituent is None:
            constituent = IndexConstituent(symbol=resolved.symbol, weight=1.0)
            self._constituents[constituent.symbol] = constituent
        constituent.apply_signal(resolved)
        self._signals.append(resolved)
        return resolved

    def bulk_record(self, signals: Iterable[IndexSignal | Mapping[str, object]]) -> None:
        for signal in signals:
            self.record(signal)

    # ------------------------------------------------------------------- snapshots
    def snapshot(self) -> IndexSnapshot:
        if not self._constituents:
            return IndexSnapshot(
                timestamp=_utcnow(),
                value=0.0,
                net_exposure=0.0,
                concentration=0.0,
                breadth=0.0,
                momentum=0.0,
                stress=0.0,
                liquidity=0.0,
                top_constituents=(),
                notes=("index is empty",),
            )

        constituents = list(self._constituents.values())
        raw_weights = [constituent.weight for constituent in constituents]
        weights = _normalise_weights(raw_weights)

        net_exposure = sum(
            weight * constituent.exposure
            for weight, constituent in zip(weights, constituents)
        )
        momentum = sum(
            weight * constituent.momentum for weight, constituent in zip(weights, constituents)
        )
        liquidity = sum(
            weight * constituent.liquidity for weight, constituent in zip(weights, constituents)
        )
        stress_components = [
            weight * constituent.volatility * (1.0 - constituent.conviction)
            for weight, constituent in zip(weights, constituents)
        ]
        stress = _clamp(sum(stress_components), lower=0.0, upper=5.0)

        concentration = sum(weight * weight for weight in weights)
        breadth = max(0.0, 1.0 - concentration)

        value_components = [
            1.0 + 0.35 * constituent.momentum + 0.25 * constituent.exposure
            - 0.15 * constituent.volatility
            + 0.1 * constituent.conviction
            for constituent in constituents
        ]
        value = _weighted_mean(value_components, weights)

        top_symbols = tuple(
            symbol
            for symbol, _ in sorted(
                ((constituent.symbol, weight) for weight, constituent in zip(weights, constituents)),
                key=lambda item: item[1],
                reverse=True,
            )[:5]
        )

        notes = self._diagnostics(constituents, weights, net_exposure, stress)

        return IndexSnapshot(
            timestamp=_utcnow(),
            value=value,
            net_exposure=net_exposure,
            concentration=concentration,
            breadth=breadth,
            momentum=momentum,
            stress=stress,
            liquidity=liquidity,
            top_constituents=top_symbols,
            notes=notes,
        )

    def history(self) -> tuple[IndexSignal, ...]:
        return tuple(self._signals)

    # ------------------------------------------------------------------ internals
    def _diagnostics(
        self,
        constituents: Sequence[IndexConstituent],
        weights: Sequence[float],
        net_exposure: float,
        stress: float,
    ) -> tuple[str, ...]:
        notes: list[str] = []
        if abs(net_exposure) > 0.35:
            direction = "long" if net_exposure > 0 else "short"
            notes.append(f"net exposure {direction} {net_exposure:+.2f}")

        if stress > 1.5:
            notes.append(f"elevated stress {stress:.2f}")

        concentration = sum(weight * weight for weight in weights)
        if concentration > 0.3:
            notes.append(f"concentration high {concentration:.2f}")

        tag_counter: Counter[str] = Counter()
        for weight, constituent in zip(weights, constituents):
            for tag in constituent.tags:
                tag_counter[tag] += weight

        if tag_counter:
            dominant_tags = [f"{tag}:{score:.2f}" for tag, score in tag_counter.most_common(3)]
            notes.append("themes " + ", ".join(dominant_tags))

        high_exposure = [
            f"{constituent.symbol} {constituent.exposure:+.2f}"
            for constituent in constituents
            if abs(constituent.exposure) > 0.6
        ]
        if high_exposure:
            notes.append("tilts " + ", ".join(high_exposure))

        if not notes:
            notes.append("index stable")
        return tuple(notes)

    def _coerce_constituent(
        self, constituent: IndexConstituent | Mapping[str, object]
    ) -> IndexConstituent:
        if isinstance(constituent, IndexConstituent):
            return constituent
        if isinstance(constituent, Mapping):
            payload: MutableMapping[str, object] = dict(constituent)
            return IndexConstituent(**payload)  # type: ignore[arg-type]
        raise TypeError("constituent must be IndexConstituent or mapping")

    def _coerce_signal(self, signal: IndexSignal | Mapping[str, object]) -> IndexSignal:
        if isinstance(signal, IndexSignal):
            return signal
        if isinstance(signal, Mapping):
            payload: MutableMapping[str, object] = dict(signal)
            if "timestamp" not in payload:
                payload["timestamp"] = _utcnow()
            return IndexSignal(**payload)  # type: ignore[arg-type]
        raise TypeError("signal must be IndexSignal or mapping")


__all__ = [
    "IndexConstituent",
    "IndexSignal",
    "IndexSnapshot",
    "DynamicIndex",
]
