"""Dynamic market maker orchestrated by the Dynamic AI fusion layer."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any, Dict, Protocol, Tuple

from .fusion import DynamicFusionAlgo
from .supabase_client import log_signal, log_trade

LOGGER = logging.getLogger(__name__)


class VenueClient(Protocol):
    """Interface expected from exchange adapters."""

    def replace_quote(self, symbol: str, bid: float, ask: float) -> None:
        """Submit or replace the resting quote for a trading pair."""


@dataclass
class MarketMakerConfig:
    """Configuration parameters for the market maker."""

    gamma: float = 0.1
    kappa: float = 1.0
    horizon_seconds: int = 60
    spread_floor: float = 0.001
    inventory_soft_limit: float = 1000
    inventory_hard_limit: float = 2000


class DynamicMarketMaker:
    """Avellaneda–Stoikov style market maker with AI-guided parameters."""

    def __init__(self, venue_client: VenueClient, symbol: str = "DCT/USDT") -> None:
        self.symbol = symbol
        self.client = venue_client
        self.fusion = DynamicFusionAlgo()
        self.inventory: float = 0.0
        self.pnl: float = 0.0
        self.config = MarketMakerConfig()

    def update_params_from_dai(self, market_data: Dict[str, Any], treasury: Dict[str, Any]) -> None:
        """Ask the Dynamic AI layer for refreshed quoting parameters."""

        params = self.fusion.mm_parameters(
            market_data=market_data,
            treasury=treasury,
            inventory=self.inventory,
        )

        gamma = float(params.get("gamma", self.config.gamma))
        kappa = float(params.get("kappa", self.config.kappa))
        horizon = int(params.get("T", self.config.horizon_seconds))
        spread_floor = float(params.get("spread_floor", self.config.spread_floor))

        self.config.gamma = max(gamma, 1e-6)
        self.config.kappa = max(kappa, 1e-6)
        self.config.horizon_seconds = max(horizon, 1)
        self.config.spread_floor = max(spread_floor, 0.0)

    def quote(self, mid_price: float, sigma: float) -> Tuple[float, float]:
        """Generate bid and ask quotes based on current inventory and volatility."""

        gamma = self.config.gamma
        kappa = self.config.kappa
        horizon = self.config.horizon_seconds
        spread_floor = self.config.spread_floor

        variance_term = max(sigma, 0.0) ** 2
        reservation_price = mid_price - (self.inventory * gamma * variance_term * horizon) / 2
        raw_delta = (gamma * variance_term * horizon) / 2 + (1 / gamma) * math.log(1 + gamma / kappa)
        floor_delta = spread_floor * max(mid_price, 0.0)
        delta = max(raw_delta, floor_delta)

        bid = round(reservation_price - delta, 4)
        ask = round(reservation_price + delta, 4)
        return bid, ask

    def run_cycle(self, market_data: Dict[str, Any], treasury: Dict[str, Any]) -> Tuple[float, float]:
        """Execute a single quoting cycle using the latest market snapshot."""

        mid_price = float(market_data.get("mid_price", 1.0))
        sigma = float(market_data.get("volatility", 0.01))

        if abs(self.inventory) >= self.config.inventory_hard_limit:
            LOGGER.warning(
                "Inventory %.2f outside hard limit %.2f – skipping quote",
                self.inventory,
                self.config.inventory_hard_limit,
            )
            return (0.0, 0.0)

        self.update_params_from_dai(market_data, treasury)
        bid, ask = self.quote(mid_price, sigma)
        self.client.replace_quote(self.symbol, bid, ask)

        log_payload = {
            "symbol": self.symbol,
            "bid": bid,
            "ask": ask,
            "gamma": self.config.gamma,
            "kappa": self.config.kappa,
            "inventory": self.inventory,
        }
        log_signal(log_payload)

        LOGGER.info(
            "[DMM] %s | Bid=%.4f Ask=%.4f Inv=%.2f γ=%.3f",
            self.symbol,
            bid,
            ask,
            self.inventory,
            self.config.gamma,
        )
        return bid, ask

    def on_fill(self, side: str, qty: float, price: float) -> None:
        """Update inventory and realised PnL in response to a fill."""

        qty = float(qty)
        price = float(price)
        side_normalised = side.lower()

        if side_normalised == "buy":
            self.inventory += qty
            self.pnl -= qty * price
        elif side_normalised == "sell":
            self.inventory -= qty
            self.pnl += qty * price
        else:
            LOGGER.warning("Unknown fill side received: %s", side)
            return

        log_trade(
            {
                "symbol": self.symbol,
                "side": side_normalised,
                "qty": qty,
                "price": price,
                "inventory": self.inventory,
                "pnl": self.pnl,
            }
        )

        LOGGER.info(
            "[FILL] %s %.4f@%.4f | Inv=%.2f | PnL=%.2f",
            side_normalised.upper(),
            qty,
            price,
            self.inventory,
            self.pnl,
        )


__all__ = ["DynamicMarketMaker", "MarketMakerConfig", "VenueClient"]
