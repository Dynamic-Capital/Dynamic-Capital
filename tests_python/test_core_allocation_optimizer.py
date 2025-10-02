from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from core import CoreAllocationOptimizer  # noqa: E402  (runtime path mutation)


def test_baseline_allocation_matches_defaults() -> None:
    optimizer = CoreAllocationOptimizer()

    allocation = optimizer.optimise()

    assert allocation == {"dai": 11, "dagi": 9, "dags": 5}
    assert optimizer.total_capacity == 25


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

