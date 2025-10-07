"""Configuration-driven hyperparameter search for the trading strategy."""

from __future__ import annotations

import copy
import itertools
import math
import os
from concurrent.futures import Future, ThreadPoolExecutor, as_completed
from dataclasses import asdict
from typing import Callable, Dict, Iterable, List, Sequence, Tuple

from .backtesting import Backtester, BacktestResult
from .trade_logic import TradeConfig, TradeLogic


class HyperparameterSearch:
    """Simple grid search helper around :class:`TradeLogic` with concurrency support."""

    def __init__(
        self,
        snapshots,
        search_space: Dict[str, Iterable],
        *,
        base_config: TradeConfig | None = None,
        scoring: Callable[[BacktestResult], float] | None = None,
        initial_equity: float = 10_000.0,
        pipeline_state: Dict[str, object] | None = None,
        max_workers: int | None = None,
    ) -> None:
        self.snapshots = list(snapshots)
        self.search_space = search_space
        self.base_config = base_config or TradeConfig()
        self._base_config_dict = asdict(self.base_config)
        self.scoring = scoring or (lambda result: result.performance.profit_factor)
        self.initial_equity = initial_equity
        self.pipeline_state = copy.deepcopy(pipeline_state) if pipeline_state else None
        self.max_workers = max_workers

    @staticmethod
    def _freeze_value(value: object) -> object:
        if isinstance(value, (list, tuple)):
            return tuple(HyperparameterSearch._freeze_value(item) for item in value)
        if isinstance(value, dict):
            return tuple(sorted((key, HyperparameterSearch._freeze_value(val)) for key, val in value.items()))
        return value

    def _evaluate(self, overrides: Dict[str, object]) -> Tuple[TradeConfig, BacktestResult, float]:
        config_dict = copy.deepcopy(self._base_config_dict)
        config_dict.update(overrides)
        config = TradeConfig(**config_dict)
        logic = TradeLogic(config=config)
        if self.pipeline_state is not None:
            logic.strategy.pipeline.load_state_dict(copy.deepcopy(self.pipeline_state))
        backtester = Backtester(logic, initial_equity=self.initial_equity)
        result = backtester.run(self.snapshots)
        score = self.scoring(result)
        return config, result, score

    def _determine_worker_count(self, task_count: int) -> int:
        if self.max_workers is not None:
            return max(1, self.max_workers)
        cpu_count = os.cpu_count() or 1
        # Keep worker count bounded so small grids do not spawn excessive threads.
        return min(task_count, max(1, min(cpu_count, math.ceil(cpu_count * 1.5))))

    def run(self) -> Tuple[TradeConfig, BacktestResult, List[Tuple[TradeConfig, BacktestResult]]]:
        keys = list(self.search_space.keys())
        values: List[Sequence[object]] = [tuple(self.search_space[key]) for key in keys]

        combinations: List[Dict[str, object]] = []
        seen: set[tuple[object, ...]] = set()
        for combo in itertools.product(*values):
            frozen = tuple(self._freeze_value(item) for item in combo)
            if frozen in seen:
                continue
            seen.add(frozen)
            combinations.append(dict(zip(keys, combo)))

        if not combinations:
            raise RuntimeError("hyperparameter search did not evaluate any configurations")

        worker_count = self._determine_worker_count(len(combinations))
        results: List[Tuple[TradeConfig, BacktestResult, float]] = [None] * len(combinations)  # type: ignore[list-item]

        if worker_count == 1:
            for idx, overrides in enumerate(combinations):
                results[idx] = self._evaluate(overrides)
        else:
            with ThreadPoolExecutor(max_workers=worker_count) as executor:
                futures: Dict[Future[Tuple[TradeConfig, BacktestResult, float]], int] = {}
                for idx, overrides in enumerate(combinations):
                    futures[executor.submit(self._evaluate, overrides)] = idx
                for future in as_completed(futures):
                    idx = futures[future]
                    results[idx] = future.result()

        best_score = float("-inf")
        best_config = self.base_config
        best_result: BacktestResult | None = None
        history: List[Tuple[TradeConfig, BacktestResult]] = []

        for config, result, score in results:
            history.append((config, result))
            if score > best_score:
                best_score = score
                best_config = config
                best_result = result

        if best_result is None:
            raise RuntimeError("hyperparameter search did not evaluate any configurations")
        return best_config, best_result, history


__all__ = ["HyperparameterSearch"]
