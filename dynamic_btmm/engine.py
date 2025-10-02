"""Dynamic BTMM (Beat the Market Maker) execution engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Sequence

__all__ = [
    "BTMMInputs",
    "BTMMOpportunity",
    "BTMMDecision",
    "BTMMConfig",
    "DynamicBTMMEngine",
]


def _clamp(value: float, *, lower: float, upper: float) -> float:
    """Return *value* constrained to the provided bounds."""

    return max(lower, min(upper, value))


def _safe_divide(numerator: float, denominator: float) -> float:
    """Return ``numerator / denominator`` while handling divide-by-zero."""

    if denominator == 0:
        return 0.0
    return numerator / denominator


@dataclass(slots=True)
class BTMMInputs:
    """Inputs describing the state of the market and our positioning."""

    mid_price: float
    mm_bid: float
    mm_ask: float
    predicted_fair_value: float
    predicted_volatility: float
    signal_strength: float
    orderbook_imbalance: float
    mm_inventory_estimate: float
    mm_liquidity: float
    available_liquidity: float
    our_inventory: float
    inventory_limit: float
    max_position: float
    max_trade_size: float
    latency_ms: float
    risk_appetite: float

    def validate(self) -> None:
        if self.mid_price <= 0:
            raise ValueError("mid_price must be positive")
        if self.mm_bid <= 0 or self.mm_ask <= 0:
            raise ValueError("market maker quotes must be positive")
        if self.mm_bid >= self.mm_ask:
            raise ValueError("market maker bid must be below ask")
        if self.predicted_fair_value <= 0:
            raise ValueError("predicted_fair_value must be positive")
        if not -1.0 <= self.orderbook_imbalance <= 1.0:
            raise ValueError("orderbook_imbalance must be within [-1, 1]")
        if self.inventory_limit <= 0:
            raise ValueError("inventory_limit must be positive")
        if self.max_position <= 0:
            raise ValueError("max_position must be positive")
        if self.max_trade_size <= 0:
            raise ValueError("max_trade_size must be positive")
        if self.latency_ms < 0:
            raise ValueError("latency_ms cannot be negative")
        if not 0.0 <= self.signal_strength <= 1.0:
            raise ValueError("signal_strength must be within [0, 1]")
        if not 0.0 <= self.risk_appetite <= 1.0:
            raise ValueError("risk_appetite must be within [0, 1]")
        if self.mm_liquidity < 0:
            raise ValueError("mm_liquidity cannot be negative")
        if self.available_liquidity < 0:
            raise ValueError("available_liquidity cannot be negative")


@dataclass(slots=True)
class BTMMOpportunity:
    """Opportunity produced by the BTMM engine for a trading side."""

    side: Literal["buy", "sell"]
    raw_edge_bps: float
    adjusted_edge_bps: float
    expected_value: float
    size: float
    confidence: float
    rationale: Sequence[str] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, object]:
        """Return a serialisable representation of the opportunity."""

        return {
            "side": self.side,
            "raw_edge_bps": self.raw_edge_bps,
            "adjusted_edge_bps": self.adjusted_edge_bps,
            "expected_value": self.expected_value,
            "size": self.size,
            "confidence": self.confidence,
            "rationale": tuple(self.rationale),
        }


@dataclass(slots=True)
class BTMMDecision:
    """Summary of the BTMM engine evaluation."""

    opportunities: Sequence[BTMMOpportunity]
    best_opportunity: BTMMOpportunity | None
    should_trade: bool
    risk_score: float
    notes: Sequence[str] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, object]:
        """Return a serialisable representation of the decision."""

        return {
            "opportunities": tuple(op.as_dict() for op in self.opportunities),
            "best_opportunity": None
            if self.best_opportunity is None
            else self.best_opportunity.as_dict(),
            "should_trade": self.should_trade,
            "risk_score": self.risk_score,
            "notes": tuple(self.notes),
        }


@dataclass(slots=True)
class BTMMConfig:
    """Configuration weights that control the BTMM adjustments."""

    signal_weight: float = 0.55
    imbalance_weight: float = 0.25
    risk_appetite_weight: float = 0.2
    volatility_confidence_penalty: float = 0.35
    latency_confidence_penalty: float = 0.12
    latency_reference_ms: float = 120.0
    inventory_penalty_bps: float = 70.0
    volatility_penalty_bps: float = 55.0
    liquidity_penalty_bps: float = 24.0
    mm_pressure_bonus_bps: float = 32.0
    imbalance_bonus_bps: float = 26.0
    trade_trigger_bps: float = 11.0
    min_confidence: float = 0.25
    scale_exponent: float = 0.6
    max_position_fraction: float = 0.9
    inventory_risk_weight: float = 0.32
    volatility_risk_weight: float = 0.28
    latency_risk_weight: float = 0.22
    liquidity_risk_weight: float = 0.18
    volatility_risk_scale: float = 1.0
    latency_risk_scale: float = 1.4
    liquidity_risk_scale: float = 1.0
    risk_throttle_threshold: float = 0.6
    risk_throttle_strength: float = 0.7
    max_risk_score: float = 0.85

    def __post_init__(self) -> None:
        if self.latency_reference_ms <= 0:
            raise ValueError("latency_reference_ms must be positive")
        if self.trade_trigger_bps <= 0:
            raise ValueError("trade_trigger_bps must be positive")
        if not 0.0 < self.max_position_fraction <= 1.0:
            raise ValueError("max_position_fraction must be within (0, 1]")
        risk_weight_sum = (
            self.inventory_risk_weight
            + self.volatility_risk_weight
            + self.latency_risk_weight
            + self.liquidity_risk_weight
        )
        if risk_weight_sum <= 0:
            raise ValueError("risk weights must sum to a positive value")
        if not 0.0 < self.risk_throttle_threshold < 1.0:
            raise ValueError("risk_throttle_threshold must be within (0, 1)")
        if not 0.0 <= self.risk_throttle_strength <= 1.0:
            raise ValueError("risk_throttle_strength must be within [0, 1]")
        if not 0.0 < self.max_risk_score <= 1.0:
            raise ValueError("max_risk_score must be within (0, 1]")
        if self.volatility_risk_scale <= 0:
            raise ValueError("volatility_risk_scale must be positive")
        if self.latency_risk_scale <= 0:
            raise ValueError("latency_risk_scale must be positive")
        if self.liquidity_risk_scale <= 0:
            raise ValueError("liquidity_risk_scale must be positive")


class DynamicBTMMEngine:
    """Evaluate opportunities to beat the market maker quotes."""

    def __init__(self, config: BTMMConfig | None = None) -> None:
        self.config = config or BTMMConfig()

    def evaluate(self, inputs: BTMMInputs) -> BTMMDecision:
        """Return a :class:`BTMMDecision` for the provided :class:`BTMMInputs`."""

        inputs.validate()
        risk_profile = self._risk_profile(inputs)

        opportunities = (
            self._evaluate_side(inputs, "buy", risk_profile["risk_throttle"]),
            self._evaluate_side(inputs, "sell", risk_profile["risk_throttle"]),
        )

        best = max(
            (op for op in opportunities if op.size > 0 and op.adjusted_edge_bps > 0),
            default=None,
            key=lambda op: op.adjusted_edge_bps,
        )

        should_trade = (
            best is not None
            and best.adjusted_edge_bps >= self.config.trade_trigger_bps
            and best.confidence >= self.config.min_confidence
            and risk_profile["risk_score"] <= self.config.max_risk_score
        )

        notes: list[str] = []
        if should_trade and best is not None:
            notes.append(
                f"Execute opportunistic {best.side.upper()} capturing ~{best.adjusted_edge_bps:.1f} bps of edge."
            )
        else:
            notes.append("Stand down; no actionable edge after risk adjustments.")

        if risk_profile["risk_score"] > self.config.max_risk_score:
            notes.append(
                "Risk ceiling breached; pause deployment until exposures mean revert."
            )
        elif risk_profile["risk_throttle"] < 1.0:
            throttle_pct = int(risk_profile["risk_throttle"] * 100)
            notes.append(
                f"Aggregate risk elevated (score {risk_profile['risk_score']:.2f}); throttle caps sizing at ~{throttle_pct}% of baseline."
            )
        else:
            notes.append(
                f"Aggregate risk contained (score {risk_profile['risk_score']:.2f}); full sizing available."
            )

        inventory_ratio = risk_profile["inventory_ratio"]
        if abs(inventory_ratio) >= 0.7:
            notes.append(
                "Inventory stretched towards limits; prioritise recycling risk via hedges."
            )
        elif abs(inventory_ratio) >= 0.4:
            notes.append("Inventory bias present; tilt follow-up flow to mean revert positioning.")
        else:
            notes.append("Inventory neutral; maintain tactical flexibility.")

        volatility_level = risk_profile["volatility_level"]
        if volatility_level >= 0.8:
            notes.append("Volatility regime is elevated; expect quote decay and wider spreads.")
        elif volatility_level >= 0.4:
            notes.append("Volatility moderate; tighten slippage controls during execution.")

        if risk_profile["liquidity_gap"] >= 0.5:
            notes.append("Observed liquidity thins versus maker depth; stagger entry clips.")

        return BTMMDecision(
            opportunities=opportunities,
            best_opportunity=best,
            should_trade=should_trade,
            risk_score=risk_profile["risk_score"],
            notes=tuple(notes),
        )

    def _evaluate_side(
        self,
        inputs: BTMMInputs,
        side: Literal["buy", "sell"],
        risk_throttle: float,
    ) -> BTMMOpportunity:
        config = self.config
        rationale: list[str] = []

        if side == "buy":
            raw_edge = _safe_divide(
                inputs.predicted_fair_value - inputs.mm_ask, inputs.mm_ask
            ) * 10_000.0
            quote_price = inputs.mm_ask
            inventory_pressure = max(0.0, _safe_divide(inputs.our_inventory, inputs.inventory_limit))
            imbalance = max(0.0, inputs.orderbook_imbalance)
            mm_pressure = max(
                0.0,
                _safe_divide(inputs.mm_inventory_estimate, max(inputs.mm_liquidity, 1.0)),
            )
            position_room = max(0.0, inputs.max_position - inputs.our_inventory)
        else:
            raw_edge = _safe_divide(
                inputs.mm_bid - inputs.predicted_fair_value, inputs.mm_bid
            ) * 10_000.0
            quote_price = inputs.mm_bid
            inventory_pressure = max(
                0.0,
                -_safe_divide(inputs.our_inventory, inputs.inventory_limit),
            )
            imbalance = max(0.0, -inputs.orderbook_imbalance)
            mm_pressure = max(
                0.0,
                -_safe_divide(inputs.mm_inventory_estimate, max(inputs.mm_liquidity, 1.0)),
            )
            position_room = max(0.0, inputs.max_position + inputs.our_inventory)

        rationale.append(f"Model fair value edge {raw_edge:.1f} bps versus maker quotes.")

        volatility_penalty = max(0.0, inputs.predicted_volatility) * config.volatility_penalty_bps
        inventory_penalty = inventory_pressure * config.inventory_penalty_bps
        liquidity_ratio = _clamp(
            _safe_divide(inputs.available_liquidity, max(inputs.mm_liquidity, 1.0)),
            lower=0.0,
            upper=2.0,
        )
        liquidity_penalty = max(0.0, 1.0 - liquidity_ratio) * config.liquidity_penalty_bps
        pressure_bonus = mm_pressure * config.mm_pressure_bonus_bps
        imbalance_bonus = imbalance * config.imbalance_bonus_bps

        if inventory_penalty > 0:
            rationale.append("Inventory constraints dampen risk appetite on this side.")
        if pressure_bonus > 0:
            rationale.append("Counter-party inventory stress increases expected slippage in our favour.")
        if imbalance_bonus > 0:
            rationale.append("Orderbook flow skew aligns with trade direction, boosting conviction.")
        if volatility_penalty > 0:
            rationale.append("Volatility penalty applied to protect against regime shifts.")
        if liquidity_penalty > 0:
            rationale.append("Liquidity thin relative to maker depth; clip sizes reduced.")

        adjusted_edge = (
            raw_edge
            - inventory_penalty
            - volatility_penalty
            - liquidity_penalty
            + pressure_bonus
            + imbalance_bonus
        )

        confidence = (
            inputs.signal_strength * config.signal_weight
            + imbalance * config.imbalance_weight
            + inputs.risk_appetite * config.risk_appetite_weight
        )
        confidence -= inputs.predicted_volatility * config.volatility_confidence_penalty
        confidence -= (
            inputs.latency_ms / config.latency_reference_ms
        ) * config.latency_confidence_penalty
        confidence = _clamp(confidence, lower=0.0, upper=1.0)

        edge_surplus = max(0.0, adjusted_edge - config.trade_trigger_bps)
        if position_room <= 0 or confidence <= 0:
            size = 0.0
        else:
            scale = (edge_surplus / (config.trade_trigger_bps + 1e-6)) ** config.scale_exponent
            scaled_size = inputs.max_trade_size * scale * confidence
            size = min(scaled_size, inputs.max_trade_size, position_room * config.max_position_fraction)

        if size > 0 and risk_throttle < 1.0:
            size *= risk_throttle
            throttle_pct = int(risk_throttle * 100)
            rationale.append(
                f"Risk throttle engaged; clip size reduced to ~{throttle_pct}% to respect aggregate exposure limits."
            )

        expected_value = 0.0
        if adjusted_edge > 0 and size > 0:
            expected_value = (adjusted_edge / 10_000.0) * quote_price * size
            rationale.append(
                f"Expected edge after adjustments {adjusted_edge:.1f} bps for ~{expected_value:.2f} pnl units."
            )
        elif adjusted_edge <= 0:
            rationale.append("Negative adjusted edge; setup relegated to watchlist.")
        else:
            rationale.append("Sizing constrained by limits; trade optionality preserved.")

        return BTMMOpportunity(
            side=side,
            raw_edge_bps=raw_edge,
            adjusted_edge_bps=adjusted_edge,
            expected_value=expected_value,
            size=size,
            confidence=confidence,
            rationale=tuple(rationale),
        )

    def _risk_profile(self, inputs: BTMMInputs) -> dict[str, float]:
        config = self.config
        inventory_ratio = _clamp(
            _safe_divide(inputs.our_inventory, inputs.inventory_limit),
            lower=-1.0,
            upper=1.0,
        )
        inventory_component = abs(inventory_ratio)
        volatility_level = _clamp(inputs.predicted_volatility, lower=0.0, upper=2.0)
        volatility_risk = _clamp(
            volatility_level / config.volatility_risk_scale,
            lower=0.0,
            upper=1.0,
        )
        latency_level = _clamp(
            inputs.latency_ms / config.latency_reference_ms,
            lower=0.0,
            upper=2.0,
        )
        latency_risk = _clamp(
            latency_level / config.latency_risk_scale,
            lower=0.0,
            upper=1.0,
        )
        liquidity_gap = _clamp(
            1.0
            - _clamp(
                _safe_divide(inputs.available_liquidity, max(inputs.mm_liquidity, 1.0)),
                lower=0.0,
                upper=2.0,
            ),
            lower=0.0,
            upper=1.0,
        )
        liquidity_risk = _clamp(
            liquidity_gap / config.liquidity_risk_scale,
            lower=0.0,
            upper=1.0,
        )
        total_weight = (
            config.inventory_risk_weight
            + config.volatility_risk_weight
            + config.latency_risk_weight
            + config.liquidity_risk_weight
        )
        risk_score = (
            inventory_component * config.inventory_risk_weight
            + volatility_risk * config.volatility_risk_weight
            + latency_risk * config.latency_risk_weight
            + liquidity_risk * config.liquidity_risk_weight
        ) / total_weight
        risk_score = _clamp(risk_score, lower=0.0, upper=1.0)

        risk_throttle = 1.0
        if (
            risk_score > config.risk_throttle_threshold
            and config.risk_throttle_strength > 0.0
        ):
            risk_excess = risk_score - config.risk_throttle_threshold
            risk_throttle = _clamp(
                1.0 - risk_excess * config.risk_throttle_strength,
                lower=0.0,
                upper=1.0,
            )

        return {
            "inventory_ratio": inventory_ratio,
            "volatility_level": volatility_level,
            "liquidity_gap": liquidity_gap,
            "risk_score": risk_score,
            "risk_throttle": risk_throttle,
        }
