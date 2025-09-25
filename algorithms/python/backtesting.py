"""Simple backtesting harness for the Lorentzian k-NN strategy."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

from .trade_logic import (
    ActivePosition,
    CompletedTrade,
    MarketSnapshot,
    PerformanceMetrics,
    TradeDecision,
    TradeLogic,
)


@dataclass(slots=True)
class BacktestResult:
    decisions: List[TradeDecision]
    trades: List[CompletedTrade]
    performance: PerformanceMetrics
    ending_equity: float


class Backtester:
    """Streams historical bars through :class:`TradeLogic` to generate metrics."""

    def __init__(self, logic: TradeLogic, *, initial_equity: float = 10_000.0, slippage_pips: float = 0.0) -> None:
        self.logic = logic
        self.initial_equity = initial_equity
        self.slippage_pips = slippage_pips

    def run(self, snapshots: Sequence[MarketSnapshot]) -> BacktestResult:
        open_positions: List[ActivePosition] = []
        decisions: List[TradeDecision] = []
        trades: List[CompletedTrade] = []
        equity = self.initial_equity
        last_snapshot: Optional[MarketSnapshot] = None
        for snapshot in snapshots:
            self.logic.risk.update_equity(equity, timestamp=snapshot.timestamp)
            generated = self.logic.on_bar(snapshot, open_positions=open_positions, account_equity=equity)
            decisions.extend(generated)
            for decision in generated:
                if decision.action == "close":
                    trade = self._close_position(decision, snapshot, open_positions)
                    if trade:
                        equity += trade.profit
                        trades.append(trade)
                        self.logic.risk.record_closed_trade(trade)
                elif decision.action == "open":
                    self._open_position(decision, snapshot, open_positions)
                elif decision.action == "modify":
                    self._modify_position(decision, open_positions)
            last_snapshot = snapshot
        if last_snapshot is not None and open_positions:
            for pos in list(open_positions):
                forced = self._force_close(pos, last_snapshot)
                equity += forced.profit
                trades.append(forced)
                self.logic.risk.record_closed_trade(forced)
                open_positions.remove(pos)
        performance = self.logic.risk.metrics()
        return BacktestResult(decisions=decisions, trades=trades, performance=performance, ending_equity=equity)

    def _open_position(self, decision: TradeDecision, snapshot: MarketSnapshot, open_positions: List[ActivePosition]) -> None:
        entry_price = decision.entry or snapshot.close
        if self.slippage_pips:
            entry_price += self.slippage_pips * snapshot.pip_size * (1 if decision.direction > 0 else -1)
        open_positions.append(
            ActivePosition(
                symbol=decision.symbol,
                direction=decision.direction or 0,
                size=decision.size or 0.0,
                entry_price=entry_price,
                stop_loss=decision.stop_loss,
                take_profit=decision.take_profit,
                opened_at=snapshot.timestamp,
            )
        )

    def _close_position(
        self,
        decision: TradeDecision,
        snapshot: MarketSnapshot,
        open_positions: List[ActivePosition],
    ) -> Optional[CompletedTrade]:
        for idx, pos in enumerate(open_positions):
            if pos.symbol == decision.symbol and pos.direction == decision.direction:
                exit_price = snapshot.close
                if self.slippage_pips:
                    exit_price -= self.slippage_pips * snapshot.pip_size * (1 if pos.direction > 0 else -1)
                pips = (exit_price - pos.entry_price) / snapshot.pip_size * pos.direction
                profit = pips * snapshot.pip_value * pos.size
                trade = CompletedTrade(
                    symbol=pos.symbol,
                    direction=pos.direction,
                    size=pos.size,
                    entry_price=pos.entry_price,
                    exit_price=exit_price,
                    open_time=pos.opened_at or snapshot.timestamp,
                    close_time=snapshot.timestamp,
                    profit=profit,
                    pips=pips,
                    metadata={"reason": decision.reason},
                )
                del open_positions[idx]
                return trade
        return None

    def _force_close(self, pos: ActivePosition, snapshot: MarketSnapshot) -> CompletedTrade:
        pips = (snapshot.close - pos.entry_price) / snapshot.pip_size * pos.direction
        profit = pips * snapshot.pip_value * pos.size
        return CompletedTrade(
            symbol=pos.symbol,
            direction=pos.direction,
            size=pos.size,
            entry_price=pos.entry_price,
            exit_price=snapshot.close,
            open_time=pos.opened_at or snapshot.timestamp,
            close_time=snapshot.timestamp,
            profit=profit,
            pips=pips,
            metadata={"forced_exit": True},
        )

    def _modify_position(
        self, decision: TradeDecision, open_positions: List[ActivePosition]
    ) -> None:
        for pos in open_positions:
            if pos.symbol == decision.symbol and pos.direction == (decision.direction or pos.direction):
                if decision.stop_loss is not None:
                    pos.stop_loss = decision.stop_loss
                if decision.take_profit is not None:
                    pos.take_profit = decision.take_profit
                break


__all__ = ["Backtester", "BacktestResult"]
