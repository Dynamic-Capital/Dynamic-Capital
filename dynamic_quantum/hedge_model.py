"""Quantum-guided hedge sizing and directives."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Mapping, MutableMapping, MutableSequence, Sequence

from .engine import DynamicQuantumEngine, QuantumEnvironment, QuantumPulse

Direction = Literal["LONG", "SHORT"]
HedgeAction = Literal["OPEN", "CLOSE"]


def _normalise_symbol(value: str) -> str:
    cleaned = value.strip().upper()
    if not cleaned:
        raise ValueError("symbol must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _round_quantity(value: float) -> float:
    return round(max(value, 0.0), 6)


@dataclass(slots=True)
class HedgeCandidate:
    """Potential hedge instrument coupled to an exposure."""

    symbol: str
    correlation: float
    volatility: float
    beta: float | None = None
    liquidity_score: float = 1.0

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.correlation = float(self.correlation)
        self.volatility = float(self.volatility)
        if self.volatility <= 0.0:
            raise ValueError("volatility must be positive")
        if self.beta is not None:
            self.beta = float(self.beta)
        self.liquidity_score = _clamp(float(self.liquidity_score), lower=0.0, upper=5.0)


@dataclass(slots=True)
class ExposureSnapshot:
    """Directional exposure observed by the hedge model."""

    symbol: str
    direction: Direction
    quantity: float
    price: float
    atr: float
    atr_median_ratio: float
    stop_distance: float
    pip_value: float
    beta: float = 1.0
    volatility: float | None = None
    hedge_candidates: Sequence[HedgeCandidate] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        if self.direction not in {"LONG", "SHORT"}:
            raise ValueError("direction must be LONG or SHORT")
        self.quantity = float(self.quantity)
        if self.quantity <= 0.0:
            raise ValueError("quantity must be positive")
        self.price = float(self.price)
        if self.price <= 0.0:
            raise ValueError("price must be positive")
        self.atr = float(self.atr)
        if self.atr < 0.0:
            raise ValueError("ATR must be non-negative")
        self.atr_median_ratio = float(self.atr_median_ratio)
        if self.atr_median_ratio <= 0.0:
            raise ValueError("ATR median ratio must be positive")
        self.stop_distance = float(self.stop_distance)
        if self.stop_distance <= 0.0:
            raise ValueError("stop distance must be positive")
        self.pip_value = float(self.pip_value)
        if self.pip_value <= 0.0:
            raise ValueError("pip value must be positive")
        self.beta = float(self.beta)
        if self.volatility is not None:
            vol = float(self.volatility)
            if vol <= 0.0:
                raise ValueError("volatility must be positive")
            self.volatility = vol
        if not self.hedge_candidates:
            raise ValueError("hedge_candidates must contain at least one candidate")


@dataclass(slots=True)
class ActiveHedge:
    """Existing hedge currently live in the ledger."""

    symbol: str
    hedge_symbol: str
    quantity: float
    reason: str
    stability_on_entry: float
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.hedge_symbol = _normalise_symbol(self.hedge_symbol)
        self.quantity = float(self.quantity)
        if self.quantity < 0.0:
            raise ValueError("quantity must be non-negative")
        self.reason = self.reason.strip() or "unknown"
        self.stability_on_entry = _clamp(float(self.stability_on_entry), lower=0.0, upper=1.0)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping")


@dataclass(slots=True)
class HedgeDirective:
    """Instruction for the execution stack."""

    action: HedgeAction
    symbol: str
    hedge_symbol: str
    quantity: float
    confidence: float
    reasons: tuple[str, ...]
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if self.action not in {"OPEN", "CLOSE"}:
            raise ValueError("action must be OPEN or CLOSE")
        self.symbol = _normalise_symbol(self.symbol)
        self.hedge_symbol = _normalise_symbol(self.hedge_symbol)
        self.quantity = _round_quantity(self.quantity)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        self.reasons = tuple(reason.strip() for reason in self.reasons if reason.strip())
        if not self.reasons:
            raise ValueError("reasons must contain at least one entry")
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping")


@dataclass(slots=True)
class QuantumHedgeConfig:
    """Risk guardrails and quantum sensitivity tuning."""

    risk_fraction: float = 0.01
    atr_trigger_multiplier: float = 1.3
    soft_loss_limit: float = 0.02
    hard_loss_limit: float = 0.05
    stability_floor: float = 0.72
    instability_risk_gain: float = 0.8
    decoherence_risk_gain: float = 1.2
    decoherence_horizon: int = 12
    decoherence_threshold: float = 0.45
    environment_noise_gain: float = 0.15
    measurement_risk_gain: float = 0.1
    environment_cooling_gain: float = 0.1
    max_risk_multiplier: float = 1.8
    max_correlation_multiplier: float = 2.5

    def __post_init__(self) -> None:
        if self.risk_fraction <= 0.0:
            raise ValueError("risk_fraction must be positive")
        if self.atr_trigger_multiplier <= 0.0:
            raise ValueError("atr_trigger_multiplier must be positive")
        if not (0.0 < self.soft_loss_limit < self.hard_loss_limit < 1.0):
            raise ValueError("loss limits must satisfy 0 < soft < hard < 1")
        self.stability_floor = _clamp(float(self.stability_floor), lower=0.0, upper=1.0)
        if self.instability_risk_gain < 0.0:
            raise ValueError("instability_risk_gain must be non-negative")
        if self.decoherence_risk_gain < 0.0:
            raise ValueError("decoherence_risk_gain must be non-negative")
        if self.decoherence_horizon <= 0:
            raise ValueError("decoherence_horizon must be positive")
        self.decoherence_threshold = _clamp(float(self.decoherence_threshold), lower=0.0, upper=1.0)
        if self.environment_noise_gain < 0.0:
            raise ValueError("environment_noise_gain must be non-negative")
        if self.measurement_risk_gain < 0.0:
            raise ValueError("measurement_risk_gain must be non-negative")
        if self.environment_cooling_gain < 0.0:
            raise ValueError("environment_cooling_gain must be non-negative")
        if self.max_risk_multiplier <= 0.0:
            raise ValueError("max_risk_multiplier must be positive")
        if self.max_correlation_multiplier <= 0.0:
            raise ValueError("max_correlation_multiplier must be positive")


class QuantumHedgeModel:
    """Fuse quantum stability telemetry with classical hedge sizing."""

    def __init__(
        self,
        *,
        engine: DynamicQuantumEngine | None = None,
        environment: QuantumEnvironment | None = None,
        config: QuantumHedgeConfig | None = None,
    ) -> None:
        self._engine = engine or DynamicQuantumEngine()
        self._environment = environment
        self._config = config or QuantumHedgeConfig()

    @property
    def engine(self) -> DynamicQuantumEngine:
        return self._engine

    @property
    def environment(self) -> QuantumEnvironment | None:
        return self._environment

    @property
    def config(self) -> QuantumHedgeConfig:
        return self._config

    def register_pulse(self, pulse: QuantumPulse | Mapping[str, object]) -> None:
        self._engine.register_pulse(pulse)

    def update_environment(self, environment: QuantumEnvironment | Mapping[str, float]) -> None:
        if isinstance(environment, QuantumEnvironment):
            self._environment = environment
        else:
            self._environment = QuantumEnvironment(**environment)

    def propose(
        self,
        exposures: Sequence[ExposureSnapshot],
        account_equity: float,
        *,
        active_hedges: Sequence[ActiveHedge] | None = None,
        open_loss: float = 0.0,
        environment: QuantumEnvironment | None = None,
        decoherence_horizon: int | None = None,
    ) -> tuple[HedgeDirective, ...]:
        if account_equity <= 0.0:
            raise ValueError("account_equity must be positive")
        env = environment or self._environment or QuantumEnvironment(
            vacuum_pressure=0.5,
            background_noise=0.5,
            gravity_gradient=0.5,
            measurement_rate=0.5,
        )
        if not self._engine.pulses:
            raise ValueError("no quantum pulses registered")

        frame = self._engine.synthesize_frame(env)
        horizon = decoherence_horizon or self._config.decoherence_horizon
        decoherence = self._engine.estimate_decoherence(horizon, env)
        instability_gap = max(0.0, self._config.stability_floor - frame.stability_outlook)

        multiplier = 1.0 + self._config.instability_risk_gain * instability_gap
        if decoherence > self._config.decoherence_threshold:
            multiplier += self._config.decoherence_risk_gain * (
                decoherence - self._config.decoherence_threshold
            )
        if env.is_noisy:
            multiplier += self._config.environment_noise_gain
        if env.is_measurement_aggressive:
            multiplier += self._config.measurement_risk_gain
        if env.requires_cooling:
            multiplier += self._config.environment_cooling_gain
        multiplier = _clamp(multiplier, lower=0.5, upper=self._config.max_risk_multiplier)

        drawdown_ratio = 0.0
        if account_equity > 0.0 and open_loss < 0.0:
            drawdown_ratio = min(-open_loss / account_equity, 5.0)
        reasons: MutableSequence[str] = []
        if instability_gap > 0.0:
            reasons.append("quantum-instability")
        if decoherence > self._config.decoherence_threshold:
            reasons.append("quantum-decoherence-pressure")
        if env.is_noisy:
            reasons.append("environment-noise")
        if env.is_measurement_aggressive:
            reasons.append("measurement-stress")
        if env.requires_cooling:
            reasons.append("thermal-load")
        if drawdown_ratio >= self._config.hard_loss_limit:
            multiplier = self._config.max_risk_multiplier
            reasons.append("hard-drawdown-cap")
        elif drawdown_ratio >= self._config.soft_loss_limit:
            multiplier = min(self._config.max_risk_multiplier, multiplier + 0.4)
            reasons.append("soft-drawdown-guard")

        risk_budget = account_equity * self._config.risk_fraction
        active = tuple(active_hedges or ())
        directives: MutableSequence[HedgeDirective] = []

        open_symbols: set[str] = set()
        for exposure in exposures:
            candidate = _select_primary_candidate(exposure.hedge_candidates)
            if candidate is None:
                continue

            atr_ratio = exposure.atr / exposure.price if exposure.price > 0 else 0.0
            triggered = atr_ratio > self._config.atr_trigger_multiplier * exposure.atr_median_ratio
            exposure_reasons = list(reasons)
            if triggered:
                exposure_reasons.append("atr-volatility-breach")

            if not exposure_reasons:
                continue

            base_quantity = _compute_base_quantity(exposure, candidate, self._config)
            scaled_quantity = base_quantity * multiplier

            max_allowed = min(
                exposure.quantity * self._config.max_risk_multiplier,
                (risk_budget / (exposure.stop_distance * exposure.pip_value))
                * self._config.max_risk_multiplier,
            )
            scaled_quantity = min(scaled_quantity, max_allowed)
            scaled_quantity *= max(0.2, min(candidate.liquidity_score, 1.0))

            if scaled_quantity <= 0.0:
                continue

            hedge_symbol = candidate.symbol
            confidence = _clamp(
                0.35 + 0.25 * multiplier + 0.08 * len(exposure_reasons),
                lower=0.0,
                upper=1.0,
            )
            metadata: MutableMapping[str, object] = {
                "instability_gap": round(instability_gap, 6),
                "decoherence": round(decoherence, 6),
                "quantum_multiplier": round(multiplier, 6),
                "atr_ratio": round(atr_ratio, 6),
                "atr_median_ratio": round(exposure.atr_median_ratio, 6),
                "hedge_direction": "SHORT_HEDGE" if exposure.direction == "LONG" else "LONG_HEDGE",
            }
            directives.append(
                HedgeDirective(
                    action="OPEN",
                    symbol=exposure.symbol,
                    hedge_symbol=hedge_symbol,
                    quantity=_round_quantity(scaled_quantity),
                    confidence=confidence,
                    reasons=tuple(exposure_reasons),
                    metadata=metadata,
                )
            )
            open_symbols.add(exposure.symbol)

        if (
            frame.stability_outlook >= self._config.stability_floor + 0.05
            and decoherence <= self._config.decoherence_threshold
            and not env.is_noisy
        ):
            for hedge in active:
                if hedge.symbol in open_symbols:
                    continue
                close_confidence = _clamp(
                    0.4 + 0.5 * max(0.0, frame.stability_outlook - self._config.stability_floor),
                    lower=0.0,
                    upper=1.0,
                )
                directives.append(
                    HedgeDirective(
                        action="CLOSE",
                        symbol=hedge.symbol,
                        hedge_symbol=hedge.hedge_symbol,
                        quantity=_round_quantity(hedge.quantity),
                        confidence=close_confidence,
                        reasons=("quantum-stability-restored",),
                        metadata={
                            "stability": round(frame.stability_outlook, 6),
                            "decoherence": round(decoherence, 6),
                        },
                    )
                )

        return tuple(directives)


def _select_primary_candidate(candidates: Sequence[HedgeCandidate]) -> HedgeCandidate | None:
    best: HedgeCandidate | None = None
    best_score = -1.0
    for candidate in candidates:
        weight = abs(candidate.correlation) * max(0.1, min(candidate.liquidity_score, 1.5))
        if candidate.beta is not None:
            weight *= 1.1
        if weight > best_score:
            best_score = weight
            best = candidate
    return best


def _compute_base_quantity(
    exposure: ExposureSnapshot,
    candidate: HedgeCandidate,
    config: QuantumHedgeConfig,
) -> float:
    base_qty = exposure.quantity
    base_vol = exposure.volatility or exposure.atr or 1.0
    candidate_vol = max(candidate.volatility, 1e-6)

    if candidate.beta is not None:
        return base_qty * abs(candidate.beta) * (base_vol / candidate_vol)

    correlation = abs(candidate.correlation)
    if correlation <= 0.0:
        return 0.0
    volatility_ratio = _clamp(
        candidate_vol / base_vol,
        lower=1.0 / config.max_correlation_multiplier,
        upper=config.max_correlation_multiplier,
    )
    return base_qty * correlation * volatility_ratio


__all__ = [
    "ActiveHedge",
    "ExposureSnapshot",
    "HedgeCandidate",
    "HedgeDirective",
    "QuantumHedgeConfig",
    "QuantumHedgeModel",
]


