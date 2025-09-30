"""Quantitative intelligence engine for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, MutableSequence, Sequence

__all__ = [
    "QuantitativeSignal",
    "QuantitativeEnvironment",
    "QuantitativeSnapshot",
    "DynamicQuantitativeEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# public dataclasses


@dataclass(slots=True)
class QuantitativeSignal:
    """Structured quantitative pulse for a single tradable instrument."""

    instrument: str
    signal_strength: float
    conviction: float
    volatility: float
    liquidity_score: float
    horizon_minutes: int
    expected_alpha: float = 0.0
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=_utcnow)
    catalysts: Sequence[str] | None = None
    tags: Sequence[str] | None = None
    notes: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.instrument = _normalise_text(self.instrument)
        self.signal_strength = _clamp(float(self.signal_strength), lower=-1.0, upper=1.0)
        self.conviction = _clamp(float(self.conviction))
        self.volatility = float(self.volatility)
        if self.volatility < 0:
            raise ValueError("volatility must be non-negative")
        self.liquidity_score = _clamp(float(self.liquidity_score))
        if self.horizon_minutes <= 0:
            raise ValueError("horizon_minutes must be positive")
        self.expected_alpha = _clamp(float(self.expected_alpha), lower=-1.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence))
        self.timestamp = _coerce_timestamp(self.timestamp)
        self.catalysts = _normalise_tuple(self.catalysts)
        self.tags = _normalise_tuple(self.tags)
        self.notes = _normalise_optional_text(self.notes)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def direction(self) -> str:
        return "long" if self.signal_strength >= 0 else "short"

    @property
    def intensity(self) -> float:
        return _clamp(abs(self.signal_strength)) * self.conviction

    @property
    def weighted_bias(self) -> float:
        confidence_floor = max(self.confidence, 0.05)
        return self.signal_strength * self.conviction * confidence_floor


@dataclass(slots=True)
class QuantitativeEnvironment:
    """Macro and desk posture that shapes quantitative decision-making."""

    risk_appetite: float
    capital_utilization: float
    liquidity_buffer: float
    stress_level: float = 0.25
    tactical_bias: float = 0.0

    def __post_init__(self) -> None:
        self.risk_appetite = _clamp(float(self.risk_appetite))
        self.capital_utilization = _clamp(float(self.capital_utilization))
        self.liquidity_buffer = _clamp(float(self.liquidity_buffer))
        self.stress_level = _clamp(float(self.stress_level))
        self.tactical_bias = _clamp(float(self.tactical_bias), lower=-1.0, upper=1.0)

    @property
    def is_risk_off(self) -> bool:
        return self.risk_appetite < 0.4 or self.stress_level > 0.55

    @property
    def has_liquidity_strain(self) -> bool:
        return self.liquidity_buffer < 0.45 or self.capital_utilization > 0.75

    @property
    def directional_tilt(self) -> float:
        return self.tactical_bias


@dataclass(slots=True)
class QuantitativeSnapshot:
    """Aggregated quantitative outlook produced by the engine."""

    directional_bias: float
    conviction_momentum: float
    confidence_score: float
    volatility_pressure: float
    liquidity_outlook: float
    alpha_expectation: float
    environment_alignment: float | None
    priority_actions: tuple[str, ...]
    focus_instruments: tuple[str, ...]
    signals_processed: int


# ---------------------------------------------------------------------------
# engine implementation


class DynamicQuantitativeEngine:
    """Aggregates quantitative signals into a portfolio guidance snapshot."""

    def __init__(self, *, window: int = 240) -> None:
        if window <= 0:
            raise ValueError("window must be positive")
        self._window = window
        self._signals: Deque[QuantitativeSignal] = deque()
        self._totals: Dict[str, float] = {
            "conviction": 0.0,
            "confidence": 0.0,
            "liquidity": 0.0,
            "volatility": 0.0,
        }
        self._directional: Dict[str, float] = {
            "long": 0.0,
            "short": 0.0,
            "alpha": 0.0,
        }

    @property
    def window(self) -> int:
        return self._window

    @property
    def signals(self) -> tuple[QuantitativeSignal, ...]:
        return tuple(self._signals)

    def __len__(self) -> int:  # pragma: no cover - trivial delegation
        return len(self._signals)

    def clear(self) -> None:
        self._signals.clear()
        self._reset_totals()

    def register_signal(
        self, signal: QuantitativeSignal | Mapping[str, object]
    ) -> QuantitativeSignal:
        if isinstance(signal, Mapping):
            signal = QuantitativeSignal(**signal)
        elif not isinstance(signal, QuantitativeSignal):  # pragma: no cover - defensive guard
            raise TypeError("signal must be a QuantitativeSignal or mapping")
        if len(self._signals) == self._window:
            removed = self._signals.popleft()
            self._update_totals(removed, sign=-1.0)
        self._signals.append(signal)
        self._update_totals(signal, sign=1.0)
        return signal

    def iter_recent(self, limit: int | None = None) -> Iterable[QuantitativeSignal]:
        if limit is None or limit >= len(self._signals):
            yield from self._signals
        else:
            count = max(0, limit)
            for index in range(1, count + 1):
                yield self._signals[-index]

    def synthesize_snapshot(
        self, environment: QuantitativeEnvironment | None = None
    ) -> QuantitativeSnapshot:
        if not self._signals:
            raise ValueError("no signals registered")

        count = len(self._signals)
        avg_conviction = self._totals["conviction"] / count
        avg_confidence = self._totals["confidence"] / count
        avg_liquidity = self._totals["liquidity"] / count
        avg_volatility = self._totals["volatility"] / count

        long_pressure = self._directional["long"] / count
        short_pressure = self._directional["short"] / count
        imbalance = long_pressure - short_pressure
        denom = abs(long_pressure) + abs(short_pressure)
        directional_bias = 0.0 if denom == 0 else _clamp(imbalance / denom, lower=-1.0, upper=1.0)

        intensities = [signal.intensity for signal in self._signals]
        if count == 1:
            conviction_momentum = intensities[0]
        else:
            midpoint = count // 2
            head_avg = sum(intensities[:midpoint]) / (midpoint or 1)
            tail_avg = sum(intensities[midpoint:]) / (count - midpoint or 1)
            delta = tail_avg - head_avg
            conviction_momentum = _clamp(0.5 + delta / 2.0)

        volatility_pressure = _clamp(avg_volatility / (avg_volatility + 1.0))
        liquidity_outlook = _clamp(avg_liquidity)

        if environment is not None:
            env_adjustment = environment.liquidity_buffer - 0.5 * environment.capital_utilization
            liquidity_outlook = _clamp(0.6 * liquidity_outlook + 0.4 * (env_adjustment + 0.5))
        else:
            env_adjustment = None

        avg_alpha = self._directional["alpha"] / count
        alpha_expectation = _clamp(0.5 + avg_alpha / 2.0)

        environment_alignment: float | None
        if environment is None:
            environment_alignment = None
        else:
            env_bias = environment.directional_tilt
            environment_alignment = _clamp(1.0 - abs(env_bias - directional_bias) / 2.0)

        actions: MutableSequence[str] = []
        if directional_bias > 0.35:
            actions.append("reinforce long allocations")
        if directional_bias < -0.35:
            actions.append("reinforce short hedges")
        if avg_conviction < 0.4:
            actions.append("source higher conviction setups")
        if avg_confidence < 0.45:
            actions.append("increase signal validation")
        if volatility_pressure > 0.65:
            actions.append("tighten risk budgets")
        if liquidity_outlook < 0.45:
            actions.append("shore up liquidity providers")

        if environment is not None:
            if environment.is_risk_off:
                actions.append("reduce gross exposure")
            if environment.has_liquidity_strain:
                actions.append("rotate into high-liquidity assets")
            if environment.stress_level > 0.6:
                actions.append("activate stress protocols")
            if environment.directional_tilt > 0.25 and directional_bias < 0.2:
                actions.append("align book with bullish tilt")
            if environment.directional_tilt < -0.25 and directional_bias > -0.2:
                actions.append("increase downside protection")

        unique_actions = tuple(dict.fromkeys(actions))

        contributions: MutableMapping[str, float] = {}
        for signal in self._signals:
            contributions[signal.instrument] = contributions.get(signal.instrument, 0.0) + signal.weighted_bias
        focus_instruments = tuple(
            instrument
            for instrument, _ in sorted(
                contributions.items(), key=lambda item: abs(item[1]), reverse=True
            )[:5]
        )

        return QuantitativeSnapshot(
            directional_bias=directional_bias,
            conviction_momentum=conviction_momentum,
            confidence_score=_clamp(avg_confidence),
            volatility_pressure=volatility_pressure,
            liquidity_outlook=liquidity_outlook,
            alpha_expectation=alpha_expectation,
            environment_alignment=environment_alignment,
            priority_actions=unique_actions,
            focus_instruments=focus_instruments,
            signals_processed=count,
        )

    def estimate_portfolio_stress(self, environment: QuantitativeEnvironment) -> float:
        if not self._signals:
            raise ValueError("no signals registered")

        count = len(self._signals)
        avg_volatility = self._totals["volatility"] / count
        volatility_component = _clamp(avg_volatility / (avg_volatility + 1.5))
        directional_component = self._directional_imbalance()
        liquidity_component = _clamp(1.0 - environment.liquidity_buffer)

        stress = (
            0.4 * volatility_component
            + 0.25 * directional_component
            + 0.2 * environment.stress_level
            + 0.15 * liquidity_component
        )
        if environment.is_risk_off:
            stress += 0.05
        return _clamp(stress)

    def _directional_imbalance(self) -> float:
        long_pressure = self._directional["long"]
        short_pressure = self._directional["short"]
        total = abs(long_pressure) + abs(short_pressure)
        if total == 0:
            return 0.0
        imbalance = abs(long_pressure - short_pressure) / total
        return _clamp(imbalance)

    def _reset_totals(self) -> None:
        for key in self._totals:
            self._totals[key] = 0.0
        for key in self._directional:
            self._directional[key] = 0.0

    def _update_totals(self, signal: QuantitativeSignal, *, sign: float) -> None:
        self._totals["conviction"] += sign * signal.conviction
        self._totals["confidence"] += sign * signal.confidence
        self._totals["liquidity"] += sign * signal.liquidity_score
        self._totals["volatility"] += sign * signal.volatility
        if signal.signal_strength >= 0:
            self._directional["long"] += sign * signal.signal_strength * signal.conviction
        else:
            self._directional["short"] += sign * abs(signal.signal_strength) * signal.conviction
        self._directional["alpha"] += sign * signal.expected_alpha * signal.conviction
