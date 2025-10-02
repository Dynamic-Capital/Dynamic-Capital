"""Optimised BTMM decision engine blending indicator and context scores."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Tuple

from .helpers import (
    score_cycle_alignment,
    score_indicator_alignment,
    score_pattern_structure,
    score_session_position,
)
from .model import (
    BTMMAction,
    BTMMDecision,
    BTMMEngineContext,
    BTMMIndicatorSnapshot,
)

__all__ = ["DynamicBTMMEngine", "EngineResult"]


@dataclass(slots=True)
class EngineResult:
    """Rich diagnostic payload returned alongside an engine decision."""

    decision: BTMMDecision
    indicator_score: float
    cycle_score: float
    session_score: float
    pattern_score: float
    notes: Tuple[str, ...] = field(default_factory=tuple)


class DynamicBTMMEngine:
    """Produce BTMM trade decisions from normalised market snapshots."""

    def __init__(self, *, context: BTMMEngineContext | None = None) -> None:
        self._context = context or BTMMEngineContext()

    @property
    def context(self) -> BTMMEngineContext:
        return self._context

    def evaluate(
        self,
        snapshot: BTMMIndicatorSnapshot,
        *,
        diagnostics: bool = False,
    ) -> BTMMDecision | EngineResult:
        """Evaluate a snapshot and return a decision or detailed diagnostics."""

        indicator_score, indicator_reasons = score_indicator_alignment(snapshot)
        cycle_score, cycle_reasons = score_cycle_alignment(snapshot)
        session_score, session_reasons = score_session_position(snapshot, self._context)
        pattern_score, pattern_reasons = score_pattern_structure(snapshot)

        weighted_score = (
            (indicator_score * 0.45)
            + (cycle_score * 0.2)
            + (session_score * 0.2)
            + (pattern_score * 0.15)
        )
        risk_factor = 0.35 + (self._context.normalised_risk() * 0.65)
        confidence = min(1.0, abs(weighted_score) * risk_factor + abs(indicator_score) * 0.1)

        action: BTMMAction
        bias: str
        if confidence < self._context.min_confidence or abs(weighted_score) < 0.15:
            action = BTMMAction.HOLD
            bias = "neutral"
        elif weighted_score > 0:
            action = BTMMAction.BUY
            bias = "bullish"
        else:
            action = BTMMAction.SELL
            bias = "bearish"

        reasons: list[str] = []
        reasons.extend(indicator_reasons)
        reasons.extend(cycle_reasons)
        reasons.extend(session_reasons)
        reasons.extend(pattern_reasons)
        if snapshot.annotations:
            reasons.extend(snapshot.annotations)

        decision = BTMMDecision(
            action=action,
            confidence=round(confidence, 3),
            bias=bias,
            reasons=tuple(reasons),
        )

        if diagnostics:
            notes = tuple(
                reason
                for reason in reasons
                if "neutral" not in reason.lower()
            )
            return EngineResult(
                decision=decision,
                indicator_score=indicator_score,
                cycle_score=cycle_score,
                session_score=session_score,
                pattern_score=pattern_score,
                notes=notes,
            )
        return decision

    def batch_evaluate(
        self,
        snapshots: Iterable[BTMMIndicatorSnapshot],
        *,
        diagnostics: bool = False,
    ) -> Tuple[BTMMDecision | EngineResult, ...]:
        """Evaluate multiple snapshots preserving order."""

        results: list[BTMMDecision | EngineResult] = []
        for snapshot in snapshots:
            results.append(self.evaluate(snapshot, diagnostics=diagnostics))
        return tuple(results)
