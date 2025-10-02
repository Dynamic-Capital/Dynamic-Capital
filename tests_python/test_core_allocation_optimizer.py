from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from core import (  # noqa: E402  (runtime path mutation)
    CoreAllocationOptimizer,
    benchmark_all_cores,
    list_all_cores,
)


def test_baseline_allocation_matches_defaults() -> None:
    optimizer = CoreAllocationOptimizer()

    allocation = optimizer.optimise()

    assert allocation == {"dai": 11, "dagi": 9, "dags": 5}
    assert optimizer.total_capacity == 25


def test_list_all_cores_returns_defaults() -> None:
    assert list_all_cores() == {"dai": 11, "dagi": 9, "dags": 5}


def test_benchmark_all_cores_emphasises_each_domain() -> None:
    optimizer = CoreAllocationOptimizer()

    scenarios = benchmark_all_cores(optimizer, demand_multiplier=4.0)

    assert set(scenarios) == {"baseline", "dai", "dagi", "dags"}
    assert scenarios["baseline"] == optimizer.optimise()
    for domain in optimizer.domains:
        scenario = scenarios[domain]
        assert sum(scenario.values()) == optimizer.total_capacity
        assert scenario[domain] >= scenarios["baseline"][domain]


def test_benchmark_all_cores_validates_multiplier() -> None:
    with pytest.raises(ValueError):
        benchmark_all_cores(demand_multiplier=0.0)


def test_demand_weights_shift_allocations() -> None:
    optimizer = CoreAllocationOptimizer()

    allocation = optimizer.optimise({"dai": 0.5, "dagi": 3.0, "dags": 0.2})

    assert sum(allocation.values()) == optimizer.total_capacity
    assert allocation["dagi"] > optimizer.dagi_cores
    assert allocation["dai"] < optimizer.dai_cores
    assert allocation["dags"] >= optimizer.default_minimum
    assert allocation["dagi"] > allocation["dai"] > allocation["dags"]


def test_custom_total_and_minimums_are_respected() -> None:
    optimizer = CoreAllocationOptimizer()

    allocation = optimizer.optimise(
        {"dai": 2.0, "dagi": 1.0, "dags": 0.5},
        total_cores=20,
        minimums={"dags": 3},
    )

    assert sum(allocation.values()) == 20
    assert allocation["dags"] >= 3
    assert allocation["dai"] > allocation["dagi"]
    assert allocation["dai"] >= optimizer.dai_cores * 20 / optimizer.total_capacity


def test_invalid_total_vs_minimums() -> None:
    optimizer = CoreAllocationOptimizer()

    with pytest.raises(ValueError):
        optimizer.optimise(total_cores=2, minimums={"dai": 1, "dagi": 1, "dags": 1})

