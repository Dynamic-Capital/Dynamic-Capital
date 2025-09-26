"""High-level orchestration helpers for optimising the trading stack."""

from __future__ import annotations

import copy
import statistics
from dataclasses import dataclass, replace
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from .backtesting import BacktestResult
from .hyperparameter_search import HyperparameterSearch
from .realtime import BrokerConnector, HealthMonitor, RealtimeExecutor, StateStore
from .trade_logic import (
    FeaturePipeline,
    MarketSnapshot,
    RiskManager,
    RiskParameters,
    TradeConfig,
    TradeLogic,
)

try:  # pragma: no cover - optional dependency used for typing only
    from .grok_advisor import TradeAdvisor
except Exception:  # pragma: no cover - typing helper when grok advisor deps missing
    TradeAdvisor = object  # type: ignore[misc, assignment]


@dataclass(slots=True)
class OptimizationInsights:
    """Aggregated statistics that inform configuration tuning."""

    snapshot_count: int
    average_correlation: Optional[float]
    max_correlation: Optional[float]
    average_seasonal_bias: Optional[float]
    average_seasonal_confidence: Optional[float]
    average_range_pips: Optional[float]


@dataclass(slots=True)
class OptimizationPlan:
    """Results produced by :func:`optimize_trading_stack`."""

    pipeline: FeaturePipeline
    pipeline_state: Dict[str, object]
    base_config: TradeConfig
    tuned_config: TradeConfig
    best_config: TradeConfig
    backtest_result: BacktestResult
    history: List[Tuple[TradeConfig, BacktestResult]]
    risk_manager: RiskManager
    trade_logic: TradeLogic
    realtime_executor: Optional[RealtimeExecutor]
    insights: OptimizationInsights


def _prepare_pipeline(snapshots: Sequence[MarketSnapshot]) -> FeaturePipeline:
    pipeline = FeaturePipeline()
    feature_rows = (snapshot.feature_vector() for snapshot in snapshots)
    pipeline.fit(feature_rows)
    return pipeline


def _aggregate_insights(snapshots: Sequence[MarketSnapshot]) -> OptimizationInsights:
    correlations: List[float] = []
    seasonal_bias: List[float] = []
    seasonal_confidence: List[float] = []
    ranges: List[float] = []

    for snapshot in snapshots:
        if snapshot.correlation_scores:
            correlations.extend(abs(score) for score in snapshot.correlation_scores.values())
        if snapshot.seasonal_bias is not None:
            seasonal_bias.append(float(snapshot.seasonal_bias))
        if snapshot.seasonal_confidence is not None:
            seasonal_confidence.append(float(snapshot.seasonal_confidence))
        high = snapshot.daily_high or snapshot.high
        low = snapshot.daily_low or snapshot.low
        if high is not None and low is not None and snapshot.pip_size:
            ranges.append((high - low) / snapshot.pip_size)

    return OptimizationInsights(
        snapshot_count=len(snapshots),
        average_correlation=statistics.fmean(correlations) if correlations else None,
        max_correlation=max(correlations) if correlations else None,
        average_seasonal_bias=statistics.fmean(seasonal_bias) if seasonal_bias else None,
        average_seasonal_confidence=(
            statistics.fmean(seasonal_confidence) if seasonal_confidence else None
        ),
        average_range_pips=statistics.fmean(ranges) if ranges else None,
    )


def _tune_trade_config(base: TradeConfig, insights: OptimizationInsights) -> TradeConfig:
    config = replace(base)

    if insights.average_correlation is not None:
        config.correlation_threshold = max(
            base.correlation_threshold, round(insights.average_correlation, 2)
        )
        weight_hint = min(
            base.max_correlation_adjustment,
            max(base.correlation_weight, insights.average_correlation * 0.5),
        )
        config.correlation_weight = round(weight_hint, 3)

    if insights.average_seasonal_confidence is not None:
        seasonal_weight = min(
            base.max_seasonal_adjustment,
            max(
                base.seasonal_bias_weight,
                insights.average_seasonal_confidence * base.max_seasonal_adjustment,
            ),
        )
        config.seasonal_bias_weight = round(seasonal_weight, 3)

    if insights.average_range_pips is not None and insights.average_range_pips > 0:
        neutral_zone = max(base.neutral_zone_pips, insights.average_range_pips * 0.02)
        config.neutral_zone_pips = round(min(neutral_zone, base.neutral_zone_pips * 2), 3)
        if base.use_adr:
            range_pips = float(insights.average_range_pips)
            stop_floor = max(base.adr_stop_loss_factor, 0.5)
            take_floor = max(base.adr_take_profit_factor, 1.0)
            target_stop = max(base.manual_stop_loss_pips, range_pips * stop_floor)
            target_take = max(base.manual_take_profit_pips, range_pips * take_floor)

            stop_factor = target_stop / range_pips
            take_factor = target_take / range_pips
            if base.manual_stop_loss_pips > 0 and base.manual_take_profit_pips > 0:
                desired_rr = base.manual_take_profit_pips / base.manual_stop_loss_pips
                take_factor = max(take_factor, stop_factor * desired_rr)

            config.adr_stop_loss_factor = round(stop_factor, 3)
            config.adr_take_profit_factor = round(take_factor, 3)
            config.manual_stop_loss_pips = round(target_stop, 3)
            config.manual_take_profit_pips = round(target_take, 3)

    return config


def _calibrate_risk_parameters(
    snapshots: Sequence[MarketSnapshot], params: Optional[RiskParameters]
) -> RiskParameters:
    calibrated = replace(params or RiskParameters())
    if calibrated.max_daily_drawdown_pct is None:
        calibrated.max_daily_drawdown_pct = 5.0

    if calibrated.pip_value_per_standard_lot <= 0:
        pip_values = [snap.pip_value for snap in snapshots if snap.pip_value]
        if pip_values:
            calibrated.pip_value_per_standard_lot = statistics.fmean(pip_values)

    return calibrated


def optimize_trading_stack(
    snapshots: Sequence[MarketSnapshot],
    search_space: Mapping[str, Iterable],
    *,
    base_config: Optional[TradeConfig] = None,
    risk_parameters: Optional[RiskParameters] = None,
    scoring: Optional[Callable[[BacktestResult], float]] = None,
    initial_equity: float = 10_000.0,
    broker: Optional[BrokerConnector] = None,
    state_store: Optional[StateStore] = None,
    health_monitor: Optional[HealthMonitor] = None,
    advisor: "TradeAdvisor" | None = None,
) -> OptimizationPlan:
    """Execute the optimisation tasks recommended by the trading playbook."""

    snapshot_list = list(snapshots)
    if not snapshot_list:
        raise ValueError("snapshots must be a non-empty sequence")

    pipeline = _prepare_pipeline(snapshot_list)
    pipeline_state = pipeline.state_dict()
    insights = _aggregate_insights(snapshot_list)

    base = base_config or TradeConfig()
    tuned_config = _tune_trade_config(base, insights)

    risk_params = _calibrate_risk_parameters(snapshot_list, risk_parameters)

    search = HyperparameterSearch(
        snapshot_list,
        dict(search_space),
        base_config=tuned_config,
        scoring=scoring,
        initial_equity=initial_equity,
        pipeline_state=pipeline_state,
    )
    best_config, best_result, history = search.run()

    risk_manager = RiskManager(risk_params)
    trade_logic = TradeLogic(config=best_config, risk=risk_manager)
    trade_logic.strategy.pipeline.load_state_dict(copy.deepcopy(pipeline_state))

    realtime_executor: Optional[RealtimeExecutor] = None
    if broker is not None:
        realtime_executor = RealtimeExecutor(
            trade_logic,
            broker,
            state_store=state_store,
            health_monitor=health_monitor,
            advisor=advisor,
        )

    return OptimizationPlan(
        pipeline=pipeline,
        pipeline_state=pipeline_state,
        base_config=base,
        tuned_config=tuned_config,
        best_config=best_config,
        backtest_result=best_result,
        history=history,
        risk_manager=risk_manager,
        trade_logic=trade_logic,
        realtime_executor=realtime_executor,
        insights=insights,
    )


__all__ = [
    "OptimizationInsights",
    "OptimizationPlan",
    "optimize_trading_stack",
]

