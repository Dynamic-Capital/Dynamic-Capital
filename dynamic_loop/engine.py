"""Feedback loop analytics for Dynamic Capital execution cadences."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from math import isfinite, pi
from statistics import fmean
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "LoopSignal",
    "LoopState",
    "LoopRecommendation",
    "CollapseStep",
    "CollapseResult",
    "DynamicLoopEngine",
]


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text value must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, float(value)))


def _normalise_tuple(items: Iterable[str] | None) -> tuple[str, ...]:
    if not items:
        return ()
    normalised: list[str] = []
    for item in items:
        cleaned = item.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(slots=True)
class LoopSignal:
    """Observation captured while monitoring a system or execution loop."""

    metric: str
    value: float
    weight: float = 1.0
    trend: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.metric = _normalise_text(self.metric).lower()
        self.value = float(self.value)
        self.weight = max(float(self.weight), 0.0)
        self.trend = _clamp(float(self.trend))
        self.tags = _normalise_tuple(self.tags)
        if self.metadata is not None and not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping if provided")


@dataclass(slots=True)
class LoopState:
    """Current health summary of a monitored feedback loop."""

    stability: float
    momentum: float
    fatigue: float
    insights: tuple[str, ...]
    updated_at: datetime = field(default_factory=_utcnow)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "stability": self.stability,
            "momentum": self.momentum,
            "fatigue": self.fatigue,
            "insights": list(self.insights),
            "updated_at": self.updated_at.isoformat(),
        }


@dataclass(slots=True)
class LoopRecommendation:
    """Actionable suggestion generated from loop diagnostics."""

    focus: str
    narrative: str
    priority: float
    tags: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "focus": self.focus,
            "narrative": self.narrative,
            "priority": self.priority,
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class CollapseStep:
    """Snapshot captured while iterating the collapse loop."""

    time: float
    mass: float
    radius: float
    mdot: float
    shock_radius: float
    compactness: float

    def as_dict(self) -> MutableMapping[str, float]:
        return {
            "time": self.time,
            "mass": self.mass,
            "radius": self.radius,
            "mdot": self.mdot,
            "shock_radius": self.shock_radius,
            "compactness": self.compactness,
        }


@dataclass(slots=True)
class CollapseResult:
    """Outcome of integrating the black hole collapse loop."""

    t_bh: float
    m_bh0: float
    radius: float
    compactness: float
    reason: str
    steps: tuple[CollapseStep, ...] = ()
    steps_evaluated: int = 0

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "t_bh": self.t_bh,
            "M_BH0": self.m_bh0,
            "radius": self.radius,
            "compactness": self.compactness,
            "reason": self.reason,
            "steps_evaluated": self.steps_evaluated,
            "steps": [step.as_dict() for step in self.steps],
        }


class DynamicLoopEngine:
    """Aggregate loop signals and highlight interventions."""

    def __init__(self) -> None:
        self._states: list[LoopState] = []
        self._recommendations: list[LoopRecommendation] = []

    def solve_collapse_equation(
        self,
        *,
        t_ff_core: float | Callable[[], float],
        M_core: float,
        R_PNS0: float,
        tau_R: float,
        p: float,
        M_max: float,
        dt: float,
        r_sh: Callable[[float], float],
        rho: Callable[[float], float],
        v_ff: Callable[[float], float],
        G: float = 6.67430e-8,
        c: float = 299_792_458.0,
        max_steps: int = 10_000,
        audit: bool = False,
    ) -> CollapseResult:
        """Integrate the black hole formation loop equation.

        The loop follows the collapse prescription:

        ``t = t_ff_core()``
        ``M = M_core``
        ``R = R_PNS0``
        ``while True:``
        ``    mdot = 4*pi*r_sh(t)^2 * rho(r_sh(t)) * v_ff(r_sh(t))``
        ``    M += mdot * dt``
        ``    R = R_PNS0 * (1 + t/tau_R)**(-p)``
        ``    if (2*G*M)/(c**2*R) >= 1 or M >= M_max:``
        ``        break``
        ``    t += dt``

        Args:
            t_ff_core: The core free-fall time or a callable returning it.
            M_core: Initial proto-neutron star mass at bounce.
            R_PNS0: Initial PNS radius.
            tau_R: Cooling timescale for the radius evolution.
            p: Power-law index for the radius contraction.
            M_max: Maximum stable mass threshold.
            dt: Integration timestep (must be positive).
            r_sh: Callable returning the shock radius for a given time.
            rho: Callable returning the density at a given radius.
            v_ff: Callable returning the free-fall velocity at a given radius.
            G: Gravitational constant (defaults to SI units).
            c: Speed of light (defaults to SI units).
            max_steps: Safety bound on the iteration count.
            audit: When ``True`` capture the per-step history for diagnostics.

        Returns:
            CollapseResult containing the black hole formation metrics and,
            if requested, the detailed step history.

        Raises:
            ValueError: If invalid parameters are provided.
            RuntimeError: If the collapse condition is not reached in
                ``max_steps`` iterations.
        """

        if callable(t_ff_core):
            t = float(t_ff_core())
        else:
            t = float(t_ff_core)
        if dt <= 0:
            raise ValueError("dt must be positive for integration")
        if tau_R <= 0:
            raise ValueError("tau_R must be positive to avoid singular radius")
        if R_PNS0 <= 0:
            raise ValueError("R_PNS0 must be positive")
        if M_core <= 0:
            raise ValueError("M_core must be positive")
        if M_max <= 0:
            raise ValueError("M_max must be positive")
        if max_steps <= 0:
            raise ValueError("max_steps must be positive")
        if not isfinite(G) or G <= 0:
            raise ValueError("G must be a positive finite constant")
        if not isfinite(c) or c <= 0:
            raise ValueError("c must be a positive finite constant")

        mass = float(M_core)
        base_radius = float(R_PNS0)
        steps_recorded = 0
        history: list[CollapseStep] | None = [] if audit else None

        for _ in range(int(max_steps)):
            shock_radius = float(r_sh(t))
            if shock_radius <= 0 or not isfinite(shock_radius):
                raise ValueError("r_sh must return a positive finite radius")

            density = float(rho(shock_radius))
            if not isfinite(density):
                raise ValueError("rho must return a finite density")

            free_fall_velocity = float(v_ff(shock_radius))
            if not isfinite(free_fall_velocity):
                raise ValueError("v_ff must return a finite velocity")

            mdot = 4.0 * pi * shock_radius**2 * density * free_fall_velocity
            mass += mdot * dt
            radius = base_radius * (1.0 + (t / tau_R)) ** (-p)
            compactness = (2.0 * G * mass) / (c**2 * radius)
            steps_recorded += 1

            if history is not None:
                history.append(
                    CollapseStep(
                        time=float(t),
                        mass=mass,
                        radius=radius,
                        mdot=mdot,
                        shock_radius=shock_radius,
                        compactness=compactness,
                    )
                )

            reason: str | None = None
            if compactness >= 1.0:
                reason = "compactness"
            elif mass >= M_max:
                reason = "mass_limit"

            if reason is not None:
                return CollapseResult(
                    t_bh=float(t),
                    m_bh0=mass,
                    radius=radius,
                    compactness=compactness,
                    reason=reason,
                    steps=tuple(history) if history is not None else (),
                    steps_evaluated=steps_recorded,
                )

            t += dt

        raise RuntimeError(
            "Collapse condition not reached within the maximum allowed steps"
        )

    def _compute_state(self, signals: Sequence[LoopSignal]) -> LoopState:
        if not signals:
            raise ValueError("loop signals are required to compute state")

        weighted_sum = sum(signal.value * signal.weight for signal in signals)
        total_weight = sum(signal.weight for signal in signals) or 1.0
        average_variance = weighted_sum / total_weight
        stability = _clamp(1.0 - min(abs(average_variance), 1.0))

        positive_trends = [signal.trend for signal in signals if signal.value >= 0]
        negative_trends = [signal.trend for signal in signals if signal.value < 0]
        if positive_trends:
            momentum = _clamp(fmean(positive_trends))
        else:
            momentum = 0.3
        if negative_trends:
            fatigue = _clamp(fmean(negative_trends))
        else:
            fatigue = 0.2

        metric_groups: dict[str, list[float]] = {}
        for signal in signals:
            metric_groups.setdefault(signal.metric, []).append(signal.value)

        insights = tuple(
            f"Signal '{metric}' variance {abs(fmean(values)):.2f}"
            for metric, values in sorted(metric_groups.items())
        )

        return LoopState(
            stability=stability,
            momentum=momentum,
            fatigue=fatigue,
            insights=insights,
        )

    def _derive_recommendations(self, state: LoopState) -> list[LoopRecommendation]:
        recommendations: list[LoopRecommendation] = []
        if state.stability < 0.4:
            recommendations.append(
                LoopRecommendation(
                    focus="stabilise",
                    narrative="Stability degraded; trigger incident review cadence.",
                    priority=0.9,
                    tags=("stability", "incident"),
                )
            )
        if state.momentum < 0.5:
            recommendations.append(
                LoopRecommendation(
                    focus="momentum",
                    narrative="Momentum trending low; introduce fast feedback experiments.",
                    priority=0.7,
                    tags=("experimentation", "loop"),
                )
            )
        if state.fatigue > 0.6:
            recommendations.append(
                LoopRecommendation(
                    focus="recovery",
                    narrative="Fatigue rising; schedule recovery window or rotate ownership.",
                    priority=0.8,
                    tags=("resilience", "capacity"),
                )
            )
        if not recommendations:
            recommendations.append(
                LoopRecommendation(
                    focus="sustain",
                    narrative="Loop healthy; maintain cadence and monitor leading signals.",
                    priority=0.4,
                    tags=("maintenance",),
                )
            )
        return recommendations

    def evaluate(self, signals: Sequence[LoopSignal]) -> LoopState:
        state = self._compute_state(signals)
        self._states.append(state)
        recommendations = self._derive_recommendations(state)
        self._recommendations.extend(recommendations)
        return state

    def latest_recommendations(self) -> tuple[LoopRecommendation, ...]:
        return tuple(self._recommendations)

    def history(self) -> tuple[LoopState, ...]:
        return tuple(self._states)
