"""Data models shared across the dynamic BTMM engine stack."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Iterable, Sequence, Tuple

__all__ = [
    "BTMMAction",
    "BTMMDecision",
    "BTMMEngineContext",
    "BTMMIndicatorSnapshot",
]


class BTMMAction(str, Enum):
    """Canonical trade actions returned by the BTMM engine."""

    BUY = "buy"
    SELL = "sell"
    HOLD = "hold"


@dataclass(slots=True)
class BTMMIndicatorSnapshot:
    """Normalised indicator payload describing the BTMM market state.

    The engine expects callers to pre-process raw price feeds into a concise
    snapshot.  The fields map directly to the heuristics used by the BTMM
    methodology while remaining friendly to automated crawlers and backtests.
    """

    timestamp: datetime
    price: float
    ema5: float
    ema13: float
    ema50: float
    tdi_rsi: float
    tdi_signal: float
    tdi_volatility_band: float
    asian_range_high: float
    asian_range_low: float
    cycle_level: int
    candle_pattern: str | None = None
    adr_high: float | None = None
    adr_low: float | None = None
    session: str | None = None
    annotations: Tuple[str, ...] = field(default_factory=tuple)

    def ema_alignment(self) -> float:
        """Return a directional EMA score in ``[-1, 1]``."""

        short_vs_mid = self.ema5 - self.ema13
        mid_vs_long = self.ema13 - self.ema50
        span = abs(short_vs_mid) + abs(mid_vs_long)
        if span == 0:
            return 0.0
        score = 0.0
        if short_vs_mid > 0 and mid_vs_long > 0:
            score = min(1.0, span / max(self.price, 1e-6))
        elif short_vs_mid < 0 and mid_vs_long < 0:
            score = -min(1.0, span / max(self.price, 1e-6))
        elif short_vs_mid > 0 or mid_vs_long > 0:
            score = 0.25
        elif short_vs_mid < 0 or mid_vs_long < 0:
            score = -0.25
        return float(max(-1.0, min(1.0, score)))

    def tdi_inflexion(self) -> float:
        """Return a score highlighting TDI momentum shifts."""

        delta = self.tdi_rsi - self.tdi_signal
        band = max(abs(self.tdi_volatility_band), 1e-6)
        normalised = max(-1.0, min(1.0, delta / band))
        return float(normalised)

    def range_position(self) -> float:
        """Return position relative to the Asian range and ADR extension."""

        high = self.asian_range_high
        low = self.asian_range_low
        if high <= low:
            return 0.0
        span = high - low
        position = (self.price - low) / span
        if self.adr_high is not None and self.price >= self.adr_high:
            position += 0.35
        if self.adr_low is not None and self.price <= self.adr_low:
            position -= 0.35
        return float(max(-1.0, min(1.0, (position - 0.5) * 2)))

    def cycle_bias(self) -> float:
        """Map the market maker cycle level to a directional bias."""

        mapping = {1: 0.2, 2: -0.2, 3: -0.6}
        return float(mapping.get(self.cycle_level, 0.0))


@dataclass(slots=True)
class BTMMEngineContext:
    """Configuration and state shared across engine evaluations."""

    risk_tolerance: float = 0.5
    min_confidence: float = 0.35
    session_biases: Sequence[str] = field(default_factory=lambda: ("london", "new_york"))

    def normalised_risk(self) -> float:
        """Return the bounded risk tolerance in ``[0, 1]``."""

        return float(max(0.0, min(1.0, self.risk_tolerance)))


@dataclass(slots=True)
class BTMMDecision:
    """Structured trade decision returned by the engine and agents."""

    action: BTMMAction
    confidence: float
    bias: str
    reasons: Tuple[str, ...] = field(default_factory=tuple)

    def with_reason(self, *messages: str) -> "BTMMDecision":
        """Return a copy of the decision enriched with extra reasoning."""

        filtered: list[str] = [*self.reasons]
        for message in messages:
            text = message.strip()
            if text:
                filtered.append(text)
        return BTMMDecision(
            action=self.action,
            confidence=self.confidence,
            bias=self.bias,
            reasons=tuple(filtered),
        )

    @staticmethod
    def combine(decisions: Iterable["BTMMDecision"]) -> "BTMMDecision":
        """Merge multiple decisions using the highest confidence signal."""

        winner: BTMMDecision | None = None
        for decision in decisions:
            if winner is None or decision.confidence > winner.confidence:
                winner = decision
        if winner is None:
            return BTMMDecision(action=BTMMAction.HOLD, confidence=0.0, bias="neutral")
        return winner
