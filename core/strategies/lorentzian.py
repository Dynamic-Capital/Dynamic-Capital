"""Lorentzian distance helpers and rolling signal utilities."""

from __future__ import annotations

from dataclasses import dataclass
from statistics import mean, median, pstdev
from typing import Iterable, List, Literal, Optional, Sequence

from algorithms.python.trade_logic import _lorentzian_distance

LorentzianMode = Literal["cauchy", "l1"]
LorentzianStyle = Literal["mean_rev", "trend"]


@dataclass(slots=True)
class LorentzianSignalState:
    """Container for a normalised Lorentzian distance signal."""

    score: float
    distance: float
    signal: str
    regime: str
    style: LorentzianStyle
    mode: LorentzianMode
    alpha: float
    window: int
    reference: float
    history_mean: float
    history_std: float
    enter_z: float
    exit_z: float

    def to_dict(self) -> dict[str, float | str]:
        return {
            "score": self.score,
            "distance": self.distance,
            "signal": self.signal,
            "regime": self.regime,
            "style": self.style,
            "mode": self.mode,
            "alpha": self.alpha,
            "window": self.window,
            "reference": self.reference,
            "history_mean": self.history_mean,
            "history_std": self.history_std,
            "enter_z": self.enter_z,
            "exit_z": self.exit_z,
        }


def lorentzian_distance(
    x: Sequence[float],
    y: Sequence[float],
    *,
    mode: LorentzianMode = "cauchy",
    alpha: float = 1.0,
) -> float:
    """Proxy wrapper that exposes the shared Lorentzian helper."""

    return _lorentzian_distance(x, y, mode=mode, alpha=alpha)


def _build_history_distances(
    prices: List[float],
    *,
    window: int,
    mode: LorentzianMode,
    alpha: float,
) -> List[float]:
    distances: List[float] = []
    for end in range(window, len(prices)):
        window_slice = prices[end - window : end]
        if end >= 2 * window:
            reference_slice = prices[end - 2 * window : end - window]
        else:
            reference_slice = prices[: end - window]
        if not reference_slice:
            reference_value = median(prices[:end]) if end else prices[0]
        else:
            reference_value = median(reference_slice)
        reference_series = [reference_value] * window
        distances.append(
            lorentzian_distance(window_slice, reference_series, mode=mode, alpha=alpha)
        )
    return distances


def rolling_signal(
    prices: Iterable[float],
    *,
    window: int = 50,
    alpha: float = 0.5,
    mode: LorentzianMode = "cauchy",
    style: LorentzianStyle = "mean_rev",
    enter_z: float = 2.0,
    exit_z: float = 0.5,
) -> Optional[LorentzianSignalState]:
    """Compute a Lorentzian z-score and derive a trading bias."""

    price_list = [float(p) for p in prices]
    if len(price_list) < window * 2:
        return None

    reference_slice = price_list[-2 * window : -window]
    if not reference_slice:
        return None

    reference_value = median(reference_slice)
    current_window = price_list[-window:]
    reference_series = [reference_value] * window

    distance = lorentzian_distance(current_window, reference_series, mode=mode, alpha=alpha)

    history_distances = _build_history_distances(
        price_list, window=window, mode=mode, alpha=alpha
    )
    if not history_distances:
        return None

    history_mean = mean(history_distances)
    history_std = pstdev(history_distances) if len(history_distances) > 1 else 0.0
    epsilon = 1e-9
    score = (distance - history_mean) / (history_std + epsilon)

    if style == "trend":
        if score >= enter_z:
            signal = "BUY"
        elif score <= -enter_z:
            signal = "SELL"
        elif abs(score) <= exit_z:
            signal = "NEUTRAL"
        else:
            signal = "HOLD"
    else:  # mean reversion
        if score >= enter_z:
            signal = "SELL"
        elif score <= -enter_z:
            signal = "BUY"
        elif abs(score) <= exit_z:
            signal = "NEUTRAL"
        else:
            signal = "HOLD"

    if abs(score) >= enter_z:
        regime = "stressed"
    elif abs(score) <= exit_z:
        regime = "calm"
    else:
        regime = "transition"

    return LorentzianSignalState(
        score=score,
        distance=distance,
        signal=signal,
        regime=regime,
        style=style,
        mode=mode,
        alpha=alpha,
        window=window,
        reference=reference_value,
        history_mean=history_mean,
        history_std=history_std,
        enter_z=enter_z,
        exit_z=exit_z,
    )


__all__ = [
    "LorentzianSignalState",
    "lorentzian_distance",
    "rolling_signal",
]
