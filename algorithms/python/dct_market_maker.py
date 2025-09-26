"""Inventory-aware market maker for the Dynamic Capital Token (DCT)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Tuple

__all__ = [
    "DCTMarketMakerInputs",
    "DCTMarketMakerQuote",
    "DCTMarketMakerModel",
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
class DCTMarketMakerInputs:
    """Current state of the DCT market relevant for quoting liquidity."""

    mid_price: float
    inventory: float
    target_inventory: float
    inventory_limit: float
    volatility: float
    ton_reference_price: float
    onchain_depth: float
    offchain_depth: float
    recent_volume: float
    buy_pressure: float = 0.0
    sell_pressure: float = 0.0
    treasury_support: float = 0.0
    basis_adjustment: float = 0.0

    def validate(self) -> None:
        if self.mid_price <= 0:
            raise ValueError("mid_price must be positive")
        if self.inventory_limit <= 0:
            raise ValueError("inventory_limit must be positive")
        if self.ton_reference_price <= 0:
            raise ValueError("ton_reference_price must be positive")


@dataclass(slots=True)
class DCTMarketMakerQuote:
    """Quote produced by :class:`DCTMarketMakerModel`."""

    bid_price: float
    ask_price: float
    bid_size: float
    ask_size: float
    spread_bps: float
    fair_value: float
    inventory_ratio: float
    notes: Tuple[str, ...] = field(default_factory=tuple)
    rebalance_required: bool = False


@dataclass(slots=True)
class DCTMarketMakerModel:
    """Generate symmetric two-sided quotes for DCT while managing inventory risk."""

    base_spread_bps: float = 38.0
    volatility_spread_bps: float = 110.0
    flow_spread_bps: float = 45.0
    treasury_spread_offset_bps: float = 22.0
    min_spread_bps: float = 18.0
    max_spread_bps: float = 220.0
    inventory_fair_value_weight: float = 0.12
    flow_fair_value_weight: float = 0.08
    treasury_bias_weight: float = 0.05
    peg_reversion_weight: float = 0.1
    inventory_skew_strength: float = 0.35
    max_inventory_skew: float = 0.6
    liquidity_size_factor: float = 0.65
    volume_size_factor: float = 0.35
    flow_size_skew: float = 0.35
    inventory_size_penalty: float = 0.5
    min_quote_size: float = 120.0
    max_quote_size: float = 5_000.0
    rebalance_ratio_threshold: float = 0.35

    def generate_quote(self, inputs: DCTMarketMakerInputs) -> DCTMarketMakerQuote:
        """Return a :class:`DCTMarketMakerQuote` for the provided market state."""

        inputs.validate()

        notes: list[str] = []

        inventory_ratio = _clamp(
            _safe_divide(inputs.inventory - inputs.target_inventory, inputs.inventory_limit),
            lower=-1.0,
            upper=1.0,
        )
        if abs(inventory_ratio) >= self.rebalance_ratio_threshold:
            notes.append(
                "Inventory outside comfort band; schedule treasury rebalance window.",
            )

        flow_imbalance = _clamp(inputs.buy_pressure - inputs.sell_pressure, lower=-1.0, upper=1.0)
        peg_offset = _safe_divide(
            inputs.mid_price - inputs.ton_reference_price,
            inputs.ton_reference_price,
        )

        fair_value_multiplier = 1.0 + inputs.basis_adjustment
        fair_value_multiplier -= inventory_ratio * self.inventory_fair_value_weight
        fair_value_multiplier += flow_imbalance * self.flow_fair_value_weight
        fair_value_multiplier += _clamp(inputs.treasury_support, lower=0.0, upper=1.0) * self.treasury_bias_weight
        fair_value_multiplier -= peg_offset * self.peg_reversion_weight

        fair_value = max(inputs.mid_price * fair_value_multiplier, 0.01)

        spread_bps = self.base_spread_bps
        spread_bps += max(0.0, inputs.volatility) * self.volatility_spread_bps
        spread_bps += abs(flow_imbalance) * self.flow_spread_bps
        spread_bps -= _clamp(inputs.treasury_support, lower=0.0, upper=1.0) * self.treasury_spread_offset_bps
        spread_bps = _clamp(spread_bps, lower=self.min_spread_bps, upper=self.max_spread_bps)

        if inputs.volatility > 0.5:
            notes.append("Elevated volatility widening spreads and reducing clip sizes.")
        if inputs.treasury_support >= 0.8:
            notes.append("Treasury support active; spreads tightened for programme execution.")

        spread_value = fair_value * (spread_bps / 10_000.0)
        half_spread = spread_value / 2.0

        skew_component = _clamp(
            inventory_ratio * self.inventory_skew_strength,
            lower=-self.max_inventory_skew,
            upper=self.max_inventory_skew,
        )
        skew_adjustment = half_spread * skew_component

        bid_price = fair_value - half_spread - skew_adjustment
        ask_price = fair_value + half_spread + skew_adjustment

        depth_component = max(0.0, inputs.onchain_depth + inputs.offchain_depth) * self.liquidity_size_factor
        volume_component = max(0.0, inputs.recent_volume) * self.volume_size_factor
        size_base = self.min_quote_size + depth_component + volume_component

        size_multiplier = 1.0 - (abs(inventory_ratio) * self.inventory_size_penalty)
        size = size_base * max(size_multiplier, 0.2)
        size = _clamp(size, lower=self.min_quote_size, upper=self.max_quote_size)

        flow_size = _clamp(flow_imbalance, lower=-1.0, upper=1.0) * self.flow_size_skew
        bid_size = max(self.min_quote_size * 0.25, size * (1.0 - flow_size))
        ask_size = max(self.min_quote_size * 0.25, size * (1.0 + flow_size))

        return DCTMarketMakerQuote(
            bid_price=bid_price,
            ask_price=ask_price,
            bid_size=bid_size,
            ask_size=ask_size,
            spread_bps=spread_bps,
            fair_value=fair_value,
            inventory_ratio=inventory_ratio,
            notes=tuple(notes),
            rebalance_required=abs(inventory_ratio) >= self.rebalance_ratio_threshold,
        )

    def summarise_notes(self, quote: DCTMarketMakerQuote) -> str:
        """Return a human readable bullet list for dashboards."""

        if not quote.notes:
            return "• Market making within normal parameters."
        bullets: Iterable[str] = (f"• {note}" for note in quote.notes)
        return "\n".join(bullets)
