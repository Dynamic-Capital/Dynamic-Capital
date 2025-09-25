"""Helpers for translating trade decisions into desk plan bullet points."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Iterable, List, Optional

from .trade_logic import TradeDecision


def _determine_decimals(pip_size: Optional[float]) -> int:
    if pip_size is None or pip_size <= 0:
        return 2
    try:
        quant = Decimal(str(pip_size)).normalize()
    except InvalidOperation:
        return 2
    exponent = -quant.as_tuple().exponent
    if exponent < 0:
        exponent = 0
    return max(0, min(6, exponent))


def _format_price(value: Optional[float], *, decimals: int) -> str:
    if value is None:
        return "n/a"
    return f"{value:.{decimals}f}"


def _format_percent(value: Optional[float]) -> Optional[str]:
    if value is None:
        return None
    return f"{value * 100:.0f}%"


def _direction_label(direction: Optional[int]) -> str:
    if direction is None or direction == 0:
        return "flat"
    return "long" if direction > 0 else "short"


def _describe_correlation(meta: Dict[str, Any]) -> Optional[str]:
    modifier = meta.get("modifier")
    if modifier is None or abs(modifier - 1.0) <= 1e-6:
        return None

    penalty = meta.get("penalty")
    boost = meta.get("boost")

    detail: Optional[str] = None
    source: Optional[Dict[str, Any]] = None
    label: Optional[str] = None

    penalised = meta.get("penalised")
    boosted = meta.get("boosted")

    if isinstance(penalised, Iterable):
        penalised = list(penalised)
        if penalised:
            source = penalised[0]
            label = "penalty"
            if penalty is not None:
                detail = f"{penalty * 100:.0f}% trim"
    if detail is None and isinstance(boosted, Iterable):
        boosted = list(boosted)
        if boosted:
            source = boosted[0]
            label = "boost"
            if boost is not None:
                detail = f"+{boost * 100:.0f}% add"

    description = f"correlation {modifier:.2f}x"
    if source:
        symbol = source.get("symbol", "correlated book")
        direction = _direction_label(source.get("position_direction"))
        description += f" from {symbol} {direction}"
        if detail:
            description += f" ({detail})"
    elif detail:
        description += f" ({detail})"

    if label and label == "penalty" and penalty is not None:
        pass
    return description


def _describe_seasonal(meta: Dict[str, Any]) -> Optional[str]:
    modifier = meta.get("modifier")
    if modifier is None or abs(modifier - 1.0) <= 1e-6:
        return None
    bias = meta.get("bias")
    confidence = meta.get("confidence")
    description = f"seasonal {modifier:.2f}x"
    if bias is not None and confidence is not None:
        description += f" (bias {bias:+.2f} @ {confidence * 100:.0f}% conviction)"
    elif bias is not None:
        description += f" (bias {bias:+.2f})"
    return description


def _describe_smc(meta: Dict[str, Any], *, decimals: int) -> Optional[str]:
    if not meta.get("enabled"):
        return None

    parts: List[str] = []
    levels = meta.get("levels", {})
    near_levels = levels.get("near") or []
    if near_levels:
        highlights: List[str] = []
        for level in near_levels[:2]:
            name = level.get("name", "level")
            relation = level.get("relation", "near")
            highlights.append(f"{name} {relation}")
        threshold = levels.get("threshold_pips")
        if threshold is not None:
            parts.append(
                f"Liquidity zones {' & '.join(highlights)} within {threshold:.0f} pips"
            )
        else:
            parts.append(f"Liquidity zones {' & '.join(highlights)}")

    round_number = levels.get("round_number")
    if isinstance(round_number, dict):
        value = round_number.get("value")
        relation = round_number.get("relation", "near")
        distance = round_number.get("distance_pips")
        rn_text = f"Round number { _format_price(value, decimals=decimals) } {relation}"
        if distance is not None:
            rn_text += f" ({distance:.1f} pips)"
        parts.append(rn_text)

    liquidity = meta.get("liquidity", {})
    penalised_levels = liquidity.get("penalised_levels") or []
    if penalised_levels:
        formatted = ", ".join(str(level) for level in penalised_levels[:3])
        parts.append(f"Liquidity pressure on {formatted}")

    adjustment = meta.get("adjustment")
    modifier = meta.get("modifier")
    if modifier is not None and abs(modifier - 1.0) > 1e-6:
        parts.append(f"SMC modifier {modifier:.2f}x (adj {adjustment:+.2f})")

    if not parts:
        return None

    return "SMC context: " + "; ".join(parts)


def render_desk_plan(
    decision: TradeDecision,
    *,
    pip_size: Optional[float] = None,
) -> List[str]:
    """Generate bullet points describing a trade decision for desk operators."""

    decimals = _determine_decimals(pip_size)
    plan: List[str] = []

    direction = _direction_label(decision.direction)
    entry = decision.entry
    stop = decision.stop_loss
    target = decision.take_profit
    size = decision.size or 0.0

    entry_text = (
        f"Lorentzian stack {direction} {decision.symbol}"
        if direction != "flat"
        else f"Lorentzian stack {decision.symbol}"
    )
    if entry is not None:
        entry_text += f" at {_format_price(entry, decimals=decimals)}"
    if size > 0:
        entry_text += f" (size {size:.2f})"
    entry_text += "."
    plan.append(entry_text)

    risk_bits: List[str] = []
    if stop is not None:
        risk_bits.append(f"stop {_format_price(stop, decimals=decimals)}")
    if target is not None:
        risk_bits.append(f"target {_format_price(target, decimals=decimals)}")

    risk_text_parts: List[str] = []
    risk_pips: Optional[float] = None
    reward_pips: Optional[float] = None
    rr: Optional[float] = None

    if pip_size and pip_size > 0 and entry is not None:
        if stop is not None:
            risk_pips = abs(entry - stop) / pip_size
        if target is not None:
            reward_pips = abs(target - entry) / pip_size
        if risk_pips and reward_pips:
            if risk_pips > 0:
                rr = reward_pips / risk_pips

    if risk_pips is not None:
        risk_text_parts.append(f"{risk_pips:.0f} pips risk")
    if rr is not None:
        risk_text_parts.append(f"≈{rr:.2f}R")

    if risk_bits:
        risk_text = "Risk plan: " + ", ".join(risk_bits)
        if risk_text_parts:
            risk_text += f" ({', '.join(risk_text_parts)})"
        risk_text += "."
        plan.append(risk_text)

    context = decision.context or {}
    original_conf = context.get("original_confidence")
    final_conf = context.get("final_confidence")
    correlation_meta = context.get("correlation", {})
    seasonal_meta = context.get("seasonal", {})
    smc_meta = context.get("smc", {})

    adjustment_bits: List[str] = []
    correlation_desc = _describe_correlation(correlation_meta)
    if correlation_desc:
        adjustment_bits.append(correlation_desc)
    seasonal_desc = _describe_seasonal(seasonal_meta)
    if seasonal_desc:
        adjustment_bits.append(seasonal_desc)
    smc_modifier = smc_meta.get("modifier")
    if smc_modifier is not None and abs(smc_modifier - 1.0) > 1e-6:
        adjustment_bits.append(f"SMC {smc_modifier:.2f}x")

    if original_conf is not None and final_conf is not None:
        confidence_line = (
            f"Confidence adjusted {_format_percent(original_conf)} → {_format_percent(final_conf)}"
        )
        if adjustment_bits:
            confidence_line += " via " + " and ".join(adjustment_bits)
        confidence_line += "."
        plan.append(confidence_line)
    elif adjustment_bits:
        plan.append("Context modifiers: " + " and ".join(adjustment_bits) + ".")

    smc_desc = _describe_smc(smc_meta, decimals=decimals)
    if smc_desc:
        plan.append(smc_desc + ".")

    return [line for line in plan if line]


__all__ = ["render_desk_plan"]
