"""Utilities for analysing backtest results and ranking configurations.

The helper functions defined in this module extend the core
``Backtester``/``BacktestResult`` pipeline by calculating higher level
performance statistics and surfacing actionable optimisation hints.  The
analysis layer is intentionally lightweight so it can be executed inside
notebooks, CLI utilities, or CI jobs without requiring external
dependencies.
"""

from __future__ import annotations

import math
import statistics
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, List, Optional, Sequence, Tuple, TypeVar

from .backtesting import BacktestResult
from .trade_logic import CompletedTrade


@dataclass(slots=True)
class BacktestSummary:
    """Aggregated statistics derived from a :class:`BacktestResult`."""

    initial_equity: float
    ending_equity: float
    total_return_pct: float
    cagr: Optional[float]
    sharpe_ratio: Optional[float]
    sortino_ratio: Optional[float]
    expectancy: float
    average_trade: float
    average_win: float
    average_loss: float
    win_rate: float
    loss_rate: float
    profit_factor: float
    max_drawdown_pct: float
    trade_count: int
    trade_frequency_per_day: Optional[float]
    holding_period_days: Optional[float]
    equity_curve: List[tuple[datetime, float]]


@dataclass(slots=True)
class OptimizationRecommendation:
    """Human readable hint generated from backtest diagnostics."""

    title: str
    description: str


@dataclass(slots=True)
class BacktestAnalysis:
    """Container returned by :func:`analyze_backtest`."""

    summary: BacktestSummary
    best_trades: List[CompletedTrade]
    worst_trades: List[CompletedTrade]
    recommendations: List[OptimizationRecommendation]


TConfig = TypeVar("TConfig")


@dataclass(slots=True)
class RankedBacktest:
    """Represents a scored backtest configuration."""

    config: TConfig
    result: BacktestResult
    summary: BacktestSummary
    score: float


def _resolve_initial_equity(result: BacktestResult, override: Optional[float]) -> float:
    if override is not None:
        return float(override)
    if result.performance.equity_curve:
        return float(result.performance.equity_curve[0][1])
    if result.trades:
        return float(result.ending_equity - sum(trade.profit for trade in result.trades))
    return float(result.ending_equity)


def _compute_duration_days(equity_curve: Sequence[tuple[datetime, float]]) -> Optional[float]:
    if len(equity_curve) < 2:
        return None
    start, end = equity_curve[0][0], equity_curve[-1][0]
    delta = (end - start).total_seconds() / 86_400
    return delta if delta > 0 else None


def _mean(values: Iterable[float]) -> float:
    data = list(values)
    if not data:
        return 0.0
    if len(data) == 1:
        return float(data[0])
    return float(statistics.fmean(data))


def _calculate_ratios(
    returns: Sequence[float],
    *,
    risk_free_rate: float = 0.0,
    periods_per_year: float = 252.0,
) -> tuple[Optional[float], Optional[float]]:
    if not returns:
        return None, None
    mean_return = statistics.fmean(returns)
    excess = mean_return - risk_free_rate / periods_per_year
    if len(returns) > 1:
        volatility = statistics.pstdev(returns)
    else:
        volatility = 0.0
    sharpe = excess / volatility * math.sqrt(periods_per_year) if volatility > 0 else None

    downside = [r for r in returns if r < 0]
    if downside:
        downside_vol = statistics.pstdev(downside) if len(downside) > 1 else 0.0
        sortino = (
            excess / downside_vol * math.sqrt(periods_per_year)
            if downside_vol > 0
            else None
        )
    else:
        sortino = None if sharpe is None else float("inf")

    return sharpe, sortino


def compute_backtest_summary(
    result: BacktestResult,
    *,
    initial_equity: Optional[float] = None,
    risk_free_rate: float = 0.0,
) -> BacktestSummary:
    """Calculate headline metrics for a completed backtest."""

    equity_curve = list(result.performance.equity_curve)
    start_equity = _resolve_initial_equity(result, initial_equity)
    end_equity = float(result.ending_equity)
    total_return_pct = (end_equity / start_equity - 1) * 100 if start_equity else 0.0

    duration_days = _compute_duration_days(equity_curve)
    if duration_days and duration_days > 0:
        cagr = (end_equity / start_equity) ** (365.0 / duration_days) - 1 if start_equity else None
    else:
        cagr = None

    returns: List[float] = []
    for previous, current in zip(equity_curve, equity_curve[1:]):
        prev_equity = previous[1]
        curr_equity = current[1]
        if prev_equity > 0:
            returns.append((curr_equity - prev_equity) / prev_equity)

    sharpe, sortino = _calculate_ratios(returns, risk_free_rate=risk_free_rate)

    trades = list(result.trades)
    profits = [float(trade.profit) for trade in trades]
    wins = [p for p in profits if p > 0]
    losses = [p for p in profits if p < 0]
    trade_count = len(trades)

    average_trade = _mean(profits)
    average_win = _mean(wins)
    average_loss = _mean(losses)
    win_rate = len(wins) / trade_count if trade_count else 0.0
    loss_rate = len(losses) / trade_count if trade_count else 0.0
    expectancy = win_rate * average_win + loss_rate * average_loss

    if duration_days and duration_days > 0:
        trade_frequency = trade_count / duration_days
    else:
        trade_frequency = None

    return BacktestSummary(
        initial_equity=start_equity,
        ending_equity=end_equity,
        total_return_pct=total_return_pct,
        cagr=cagr,
        sharpe_ratio=sharpe,
        sortino_ratio=sortino,
        expectancy=expectancy,
        average_trade=average_trade,
        average_win=average_win,
        average_loss=average_loss,
        win_rate=win_rate,
        loss_rate=loss_rate,
        profit_factor=float(result.performance.profit_factor),
        max_drawdown_pct=float(result.performance.max_drawdown_pct),
        trade_count=trade_count,
        trade_frequency_per_day=trade_frequency,
        holding_period_days=duration_days,
        equity_curve=equity_curve,
    )


def _generate_recommendations(summary: BacktestSummary) -> List[OptimizationRecommendation]:
    recommendations: List[OptimizationRecommendation] = []

    if summary.expectancy <= 0:
        recommendations.append(
            OptimizationRecommendation(
                title="Negative expectancy",
                description=(
                    "The system loses money on average per trade. Consider tightening "
                    "entry filters or reducing trade frequency through stricter signal "
                    "validation."
                ),
            )
        )

    if summary.profit_factor < 1:
        recommendations.append(
            OptimizationRecommendation(
                title="Sub-par profit factor",
                description=(
                    "Profit factor below 1.0 indicates net losses. Evaluate stop loss "
                    "placement and reward-to-risk ratios to improve win size relative to "
                    "losses."
                ),
            )
        )

    if summary.max_drawdown_pct > 15:
        recommendations.append(
            OptimizationRecommendation(
                title="High drawdown",
                description=(
                    "Maximum drawdown exceeded 15%. Review position sizing or introduce "
                    "dynamic risk limits to smooth the equity curve."
                ),
            )
        )

    if summary.trade_frequency_per_day and summary.trade_frequency_per_day > 10:
        recommendations.append(
            OptimizationRecommendation(
                title="Elevated trade frequency",
                description=(
                    "More than 10 trades per day detected. Confirm execution capacity "
                    "and slippage assumptions or consider throttling signal generation."
                ),
            )
        )

    if summary.sharpe_ratio is not None and summary.sharpe_ratio < 1:
        recommendations.append(
            OptimizationRecommendation(
                title="Low risk-adjusted returns",
                description=(
                    "Sharpe ratio below 1.0 suggests returns do not adequately compensate "
                    "for volatility. Investigate volatility filters or hedging tactics."
                ),
            )
        )

    return recommendations


def analyze_backtest(
    result: BacktestResult,
    *,
    initial_equity: Optional[float] = None,
    risk_free_rate: float = 0.0,
    top_trades: int = 3,
) -> BacktestAnalysis:
    """Produce an enriched analysis bundle for a backtest result."""

    summary = compute_backtest_summary(
        result,
        initial_equity=initial_equity,
        risk_free_rate=risk_free_rate,
    )
    sorted_trades = sorted(result.trades, key=lambda trade: trade.profit, reverse=True)
    best = list(sorted_trades[:top_trades])
    worst = list(reversed(sorted_trades[-top_trades:])) if sorted_trades else []

    return BacktestAnalysis(
        summary=summary,
        best_trades=best,
        worst_trades=worst,
        recommendations=_generate_recommendations(summary),
    )


def rank_backtests(
    history: Sequence[tuple[TConfig, BacktestResult]],
    *,
    metric: str = "expectancy",
    top_n: int = 5,
    min_trades: int = 0,
    risk_free_rate: float = 0.0,
) -> List[RankedBacktest]:
    """Rank historical backtests by a chosen metric and return the top results."""

    ranked: List[RankedBacktest] = []
    for config, result in history:
        summary = compute_backtest_summary(result, risk_free_rate=risk_free_rate)
        if summary.trade_count < min_trades:
            continue
        score = getattr(summary, metric, None)
        if score is None:
            continue
        ranked.append(RankedBacktest(config=config, result=result, summary=summary, score=float(score)))

    ranked.sort(key=lambda item: item.score, reverse=True)
    return ranked[:top_n]


__all__ = [
    "BacktestSummary",
    "OptimizationRecommendation",
    "BacktestAnalysis",
    "RankedBacktest",
    "compute_backtest_summary",
    "analyze_backtest",
    "rank_backtests",
]

