"""Risk controls aligned with Dynamic Capital EA defaults."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional

from src.config.settings import Settings


@dataclass
class ExecutionPlan:
    signal: Dict[str, Any]
    volume: float
    stop_loss: Optional[float]
    take_profit: Optional[float]
    risk_amount: float


class RiskManager:
    """Small helper that mirrors the EA risk guards."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def build_execution_plan(self, signal: Dict[str, Any]) -> ExecutionPlan:
        balance = float(signal.get("account_balance", self.settings.risk_balance))
        risk_fraction = min(
            float(signal.get("risk_fraction", self.settings.risk_per_trade)),
            self.settings.risk_per_trade,
        )
        risk_amount = balance * risk_fraction

        stop_pips = float(signal.get("stop_loss_pips", self.settings.risk_default_stop_pips))
        pip_value = float(signal.get("pip_value", self.settings.risk_default_pip_value))
        if stop_pips <= 0 or pip_value <= 0:
            stop_pips = self.settings.risk_default_stop_pips
            pip_value = self.settings.risk_default_pip_value

        volume = risk_amount / (stop_pips * pip_value)
        volume = max(self.settings.risk_min_lot, min(self.settings.risk_max_lot, volume))

        stop_loss = signal.get("stop_loss")
        take_profit = signal.get("take_profit")
        if stop_loss is None and signal.get("entry") is not None:
            direction = (signal.get("side") or "buy").lower()
            entry = float(signal.get("entry"))
            stop_offset = float(signal.get("stop_offset", stop_pips)) * 0.0001
            stop_loss = entry - stop_offset if direction == "buy" else entry + stop_offset
        if take_profit is None and signal.get("entry") is not None:
            direction = (signal.get("side") or "buy").lower()
            entry = float(signal.get("entry"))
            tp_offset = float(signal.get("take_profit_offset", stop_pips)) * 0.0001
            take_profit = entry + tp_offset if direction == "buy" else entry - tp_offset

        stop_loss_value = float(stop_loss) if stop_loss is not None else None
        take_profit_value = float(take_profit) if take_profit is not None else None

        return ExecutionPlan(
            signal=signal,
            volume=round(volume, 2),
            stop_loss=stop_loss_value,
            take_profit=take_profit_value,
            risk_amount=risk_amount,
        )


__all__ = ["ExecutionPlan", "RiskManager"]
