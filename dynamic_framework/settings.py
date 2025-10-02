"""Configuration primitives for the Dynamic Framework engine."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Mapping

__all__ = ["FrameworkSettings"]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


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
        self.enablement_integrated_threshold = _clamp(
            float(self.enablement_integrated_threshold)
        )
        self.enablement_guardrail = _clamp(float(self.enablement_guardrail))
        if self.enablement_integrated_threshold < self.enablement_guardrail:
            self.enablement_integrated_threshold = self.enablement_guardrail

        self.resilience_integrated_threshold = _clamp(
            float(self.resilience_integrated_threshold)
        )
        self.resilience_guardrail = _clamp(float(self.resilience_guardrail))
        if self.resilience_integrated_threshold < self.resilience_guardrail:
            self.resilience_integrated_threshold = self.resilience_guardrail

        self.confidence_positive_threshold = _clamp(
            float(self.confidence_positive_threshold)
        )
        self.confidence_guardrail = _clamp(float(self.confidence_guardrail))
        if self.confidence_positive_threshold < self.confidence_guardrail:
            self.confidence_positive_threshold = self.confidence_guardrail

        self.momentum_positive_threshold = _clamp(
            float(self.momentum_positive_threshold), lower=-1.0, upper=1.0
        )
        if self.momentum_positive_threshold < 0.0:
            self.momentum_positive_threshold = 0.0

        self.momentum_negative_threshold = _clamp(
            float(self.momentum_negative_threshold), lower=-1.0, upper=1.0
        )
        if self.momentum_negative_threshold > 0.0:
            self.momentum_negative_threshold = 0.0

        self.trend_decline_threshold = float(self.trend_decline_threshold)
        if self.trend_decline_threshold > 0.0:
            self.trend_decline_threshold = 0.0

    @classmethod
    def from_mapping(cls, payload: Mapping[str, object]) -> "FrameworkSettings":
        """Build settings from a mapping-like payload."""

        return cls(**dict(payload))

    def to_dict(self) -> dict[str, float]:
        """Return a serialisable dictionary representation of the settings."""

        return {key: float(value) for key, value in asdict(self).items()}
