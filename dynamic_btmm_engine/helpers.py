"""Scoring helpers shared by the Dynamic BTMM engine stack."""

from __future__ import annotations

from typing import List, Sequence, Tuple

from .model import BTMMEngineContext, BTMMIndicatorSnapshot

__all__ = [
    "score_indicator_alignment",
    "score_cycle_alignment",
    "score_pattern_structure",
    "score_session_position",
]


def _clamp(value: float, lower: float = -1.0, upper: float = 1.0) -> float:
    return float(max(lower, min(upper, value)))


def score_indicator_alignment(snapshot: BTMMIndicatorSnapshot) -> Tuple[float, Tuple[str, ...]]:
    """Score EMA and TDI confluence."""

    ema_score = snapshot.ema_alignment()
    tdi_score = snapshot.tdi_inflexion()
    combined = _clamp((ema_score * 0.6) + (tdi_score * 0.4))

    reasons: List[str] = []
    if ema_score > 0.4:
        reasons.append("EMAs stacked bullishly")
    elif ema_score < -0.4:
        reasons.append("EMAs stacked bearishly")
    else:
        reasons.append("EMAs neutral")

    if tdi_score > 0.35:
        reasons.append("TDI momentum rising")
    elif tdi_score < -0.35:
        reasons.append("TDI momentum fading")
    else:
        reasons.append("TDI flat")

    return combined, tuple(reasons)


def score_cycle_alignment(snapshot: BTMMIndicatorSnapshot) -> Tuple[float, Tuple[str, ...]]:
    """Score the market maker cycle bias."""

    bias = snapshot.cycle_bias()
    if snapshot.cycle_level == 1:
        reason = "Cycle 1 accumulation" if bias >= 0 else "Cycle 1 anomaly"
    elif snapshot.cycle_level == 2:
        reason = "Cycle 2 manipulation" if bias <= 0 else "Cycle 2 breakout"
    elif snapshot.cycle_level == 3:
        reason = "Cycle 3 distribution"
    else:
        reason = "Cycle undefined"
    return _clamp(bias), (reason,)


def score_session_position(
    snapshot: BTMMIndicatorSnapshot, context: BTMMEngineContext
) -> Tuple[float, Tuple[str, ...]]:
    """Score the snapshot price relative to session anchors."""

    range_score = snapshot.range_position()
    session = (snapshot.session or "").strip().lower()
    bias_sessions: Sequence[str] = tuple(s.lower() for s in context.session_biases)
    session_weight = 0.2 if session in bias_sessions else 0.0
    combined = _clamp(range_score + session_weight)

    reason_parts: List[str] = []
    if range_score > 0.5:
        reason_parts.append("Price extended above range")
    elif range_score < -0.5:
        reason_parts.append("Price extended below range")
    else:
        reason_parts.append("Price inside range")
    if session_weight:
        reason_parts.append(f"Session focus: {session.title()}")
    return combined, tuple(reason_parts)


def score_pattern_structure(snapshot: BTMMIndicatorSnapshot) -> Tuple[float, Tuple[str, ...]]:
    """Score the candlestick pattern context."""

    pattern = (snapshot.candle_pattern or "").strip().lower()
    if not pattern:
        return 0.0, ("No pattern",)
    if pattern in {"m-top", "m", "double-top"}:
        return -0.65, ("Bearish M structure",)
    if pattern in {"w-bottom", "w", "double-bottom"}:
        return 0.65, ("Bullish W structure",)
    if "engulf" in pattern:
        return 0.45, ("Engulfing pattern",)
    if "pin" in pattern or "hammer" in pattern:
        return 0.35, ("Pin bar reversal",)
    return 0.1, (f"Pattern detected: {pattern}",)
