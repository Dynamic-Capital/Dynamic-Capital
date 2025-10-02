"""Configuration primitives for the Dynamic Framework engine."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Mapping

__all__ = ["FrameworkSettings"]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp *value* within a closed interval."""

    return max(lower, min(upper, value))


def _normalise_positive_pair(
    primary: float, guardrail: float
) -> tuple[float, float]:
    """Normalise positive-domain guardrail/target pairs."""

    normalised_primary = _clamp(float(primary))
    normalised_guardrail = _clamp(float(guardrail))
    if normalised_primary < normalised_guardrail:
        normalised_primary = normalised_guardrail
    return normalised_primary, normalised_guardrail


def _normalise_confidence_pair(
    positive_threshold: float, guardrail: float
) -> tuple[float, float]:
    """Normalise confidence guardrail thresholds."""

    return _normalise_positive_pair(positive_threshold, guardrail)


def _normalise_momentum_band(
    positive_threshold: float, negative_threshold: float
) -> tuple[float, float]:
    """Normalise momentum thresholds, ensuring the band straddles zero."""

    positive = max(0.0, _clamp(float(positive_threshold), lower=-1.0, upper=1.0))
    negative = min(0.0, _clamp(float(negative_threshold), lower=-1.0, upper=1.0))
    return positive, negative


@dataclass(slots=True)
class FrameworkSettings:
    """Thresholds controlling Dynamic Framework posture evaluation."""

    enablement_integrated_threshold: float = 0.6
    enablement_guardrail: float = 0.55
    resilience_integrated_threshold: float = 0.6
    resilience_guardrail: float = 0.5
    confidence_positive_threshold: float = 0.7
    confidence_guardrail: float = 0.5
    momentum_positive_threshold: float = 0.1
    momentum_negative_threshold: float = -0.1
    trend_decline_threshold: float = -0.1

    def __post_init__(self) -> None:
        (
            self.enablement_integrated_threshold,
            self.enablement_guardrail,
        ) = _normalise_positive_pair(
            self.enablement_integrated_threshold, self.enablement_guardrail
        )
        (
            self.resilience_integrated_threshold,
            self.resilience_guardrail,
        ) = _normalise_positive_pair(
            self.resilience_integrated_threshold, self.resilience_guardrail
        )
        (
            self.confidence_positive_threshold,
            self.confidence_guardrail,
        ) = _normalise_confidence_pair(
            self.confidence_positive_threshold, self.confidence_guardrail
        )
        (
            self.momentum_positive_threshold,
            self.momentum_negative_threshold,
        ) = _normalise_momentum_band(
            self.momentum_positive_threshold, self.momentum_negative_threshold
        )
        self.trend_decline_threshold = min(0.0, float(self.trend_decline_threshold))

    @classmethod
    def from_mapping(cls, payload: Mapping[str, object]) -> "FrameworkSettings":
        """Build settings from a mapping-like payload."""

        return cls(**dict(payload))

    def to_dict(self) -> dict[str, float]:
        """Return a serialisable dictionary representation of the settings."""

        return {key: float(value) for key, value in asdict(self).items()}
