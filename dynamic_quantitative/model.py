"""Core quantitative model dataclasses."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping

__all__ = ["DynamicQuantitativeModel", "QuantitativeSnapshot"]


@dataclass(slots=True)
class DynamicQuantitativeModel:
    """Structured view of the quantitative engine's aggregated state."""

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
    gross_exposure: float
    net_exposure: float
    risk_level: float
    quality_index: float
    metadata: Mapping[str, float] | None = None


# ``QuantitativeSnapshot`` is kept as an alias for backwards compatibility with
# earlier drafts of the module that exposed ``QuantitativeSnapshot`` instead of
# ``DynamicQuantitativeModel``.  Downstream imports continue to function while
# we transition to the model terminology.
QuantitativeSnapshot = DynamicQuantitativeModel

