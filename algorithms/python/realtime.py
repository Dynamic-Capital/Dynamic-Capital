"""Realtime execution helpers that wrap :class:`TradeLogic`."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, List, Optional, Protocol, Sequence

from .trade_logic import ActivePosition, MarketSnapshot, TradeDecision, TradeLogic

logger = logging.getLogger(__name__)


class BrokerConnector(Protocol):  # pragma: no cover - interface definition
    def fetch_open_positions(self) -> Sequence[ActivePosition]:
        ...

    def execute(self, decision: TradeDecision) -> None:
        ...


class StateStore(Protocol):  # pragma: no cover - interface definition
    def load(self) -> Sequence[ActivePosition]:
        ...

    def save(self, positions: Sequence[ActivePosition]) -> None:
        ...


class HealthMonitor(Protocol):  # pragma: no cover - interface definition
    def record_status(self, status: str, *, timestamp: datetime, details: Optional[dict] = None) -> None:
        ...


@dataclass
class InMemoryStateStore:
    positions: List[ActivePosition] | None = None

    def load(self) -> Sequence[ActivePosition]:  # pragma: no cover - simple accessors
        return list(self.positions or [])

    def save(self, positions: Sequence[ActivePosition]) -> None:
        self.positions = list(positions)


class NullHealthMonitor:
    def record_status(self, status: str, *, timestamp: datetime, details: Optional[dict] = None) -> None:  # pragma: no cover
        logger.debug("Health status %s at %s: %s", status, timestamp.isoformat(), details)


class RealtimeExecutor:
    """Coordinates live snapshots, the trading logic, and broker execution."""

    def __init__(
        self,
        logic: TradeLogic,
        broker: BrokerConnector,
        *,
        state_store: Optional[StateStore] = None,
        health_monitor: Optional[HealthMonitor] = None,
    ) -> None:
        self.logic = logic
        self.broker = broker
        self.state_store = state_store or InMemoryStateStore()
        self.health_monitor = health_monitor or NullHealthMonitor()
        self._fallback_positions: List[ActivePosition] = list(self.state_store.load())

    def process_snapshot(
        self,
        snapshot: MarketSnapshot,
        *,
        account_equity: Optional[float] = None,
    ) -> List[TradeDecision]:
        try:
            open_positions = list(self.broker.fetch_open_positions())
        except Exception as exc:  # pragma: no cover - broker outages
            logger.warning("Falling back to cached positions after broker error: %s", exc)
            open_positions = list(self._fallback_positions)
        decisions = self.logic.on_bar(snapshot, open_positions=open_positions, account_equity=account_equity)
        for decision in decisions:
            try:
                self.broker.execute(decision)
                self._apply_decision(decision, snapshot, open_positions)
            except Exception:
                logger.exception("Failed to execute trade decision %s", decision)
        self.state_store.save(open_positions)
        self._fallback_positions = list(open_positions)
        self.health_monitor.record_status(
            "ok",
            timestamp=snapshot.timestamp,
            details={"decisions": len(decisions)},
        )
        return decisions

    def _apply_decision(
        self,
        decision: TradeDecision,
        snapshot: MarketSnapshot,
        positions: List[ActivePosition],
    ) -> None:
        if decision.action == "open":
            positions.append(
                ActivePosition(
                    symbol=decision.symbol,
                    direction=decision.direction or 0,
                    size=decision.size or 0.0,
                    entry_price=decision.entry or snapshot.close,
                    stop_loss=decision.stop_loss,
                    take_profit=decision.take_profit,
                    opened_at=snapshot.timestamp,
                )
            )
        elif decision.action == "close":
            for idx, pos in enumerate(positions):
                if pos.symbol == decision.symbol and pos.direction == decision.direction:
                    del positions[idx]
                    break


__all__ = [
    "BrokerConnector",
    "HealthMonitor",
    "InMemoryStateStore",
    "RealtimeExecutor",
    "StateStore",
]
