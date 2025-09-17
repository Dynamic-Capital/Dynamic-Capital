"""Configuration-driven hyperparameter search for the trading strategy."""

from __future__ import annotations

import itertools
from dataclasses import asdict
from typing import Callable, Dict, Iterable, List, Tuple

from .backtesting import Backtester, BacktestResult
from .trade_logic import TradeConfig, TradeLogic


class HyperparameterSearch:
    """Simple grid search helper around :class:`TradeLogic`."""

    def __init__(
        self,
        snapshots,
        search_space: Dict[str, Iterable],
        *,
        base_config: TradeConfig | None = None,
        scoring: Callable[[BacktestResult], float] | None = None,
        initial_equity: float = 10_000.0,
    ) -> None:
        self.snapshots = list(snapshots)
        self.search_space = search_space
        self.base_config = base_config or TradeConfig()
        self.scoring = scoring or (lambda result: result.performance.profit_factor)
        self.initial_equity = initial_equity

    def run(self) -> Tuple[TradeConfig, BacktestResult, List[Tuple[TradeConfig, BacktestResult]]]:
        keys = list(self.search_space.keys())
        values = [self.search_space[key] for key in keys]
        best_score = float("-inf")
        best_config = self.base_config
        best_result: BacktestResult | None = None
        history: List[Tuple[TradeConfig, BacktestResult]] = []
        for combination in itertools.product(*values):
            config_dict = asdict(self.base_config)
            config_dict.update(dict(zip(keys, combination)))
            config = TradeConfig(**config_dict)
            logic = TradeLogic(config=config)
            backtester = Backtester(logic, initial_equity=self.initial_equity)
            result = backtester.run(self.snapshots)
            score = self.scoring(result)
            history.append((config, result))
            if score > best_score:
                best_score = score
                best_config = config
                best_result = result
        if best_result is None:
            raise RuntimeError("hyperparameter search did not evaluate any configurations")
        return best_config, best_result, history


__all__ = ["HyperparameterSearch"]
