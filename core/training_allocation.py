"""Utilities for optimising Dynamic AI/AGI/AGS core allocations."""

from __future__ import annotations

from dataclasses import dataclass, field
import math
from typing import Dict, Mapping

__all__ = ["CoreAllocationOptimizer", "benchmark_all_cores", "list_all_cores"]


def list_all_cores() -> Dict[str, int]:
    """Return the default allocation of DAI, DAGI, and DAGS cores."""

    optimizer = CoreAllocationOptimizer()
    return optimizer.baseline_allocation()


def benchmark_all_cores(
    optimizer: CoreAllocationOptimizer | None = None,
    *,
    demand_multiplier: float = 3.0,
    total_cores: int | None = None,
    minimums: Mapping[str, int] | None = None,
) -> Dict[str, Dict[str, int]]:
    """Return allocation scenarios that stress each domain individually.

    Parameters
    ----------
    optimizer:
        Optional :class:`CoreAllocationOptimizer` instance. When omitted a new
        optimiser is constructed with the default baseline capacities.
    demand_multiplier:
        Positive scalar applied to the demand weight of each domain when it is
        benchmarked. This value must be greater than zero.
    total_cores:
        Optional override for the total number of cores to distribute across
        all benchmark scenarios. Defaults to the optimiser's baseline total.
    minimums:
        Optional mapping of per-domain minimum allocations. The constraints are
        applied to every benchmark scenario.

    Returns
    -------
    dict
        Mapping of scenario names to allocation dictionaries. The ``"baseline"``
        key reflects the neutral distribution, followed by one entry per domain
        where its demand is boosted by ``demand_multiplier``.
    """

    multiplier = _coerce_positive(demand_multiplier, default=0.0)
    if multiplier <= 0.0:
        raise ValueError("demand_multiplier must be greater than zero")

    optimiser = optimizer or CoreAllocationOptimizer()
    baseline = optimiser.optimise(total_cores=total_cores, minimums=minimums)
    scenarios: Dict[str, Dict[str, int]] = {"baseline": baseline}

    for domain in optimiser.domains:
        allocation = optimiser.optimise(
            {domain: multiplier},
            total_cores=total_cores,
            minimums=minimums,
        )
        scenarios[domain] = allocation

    return scenarios


def _coerce_positive(value: object, default: float = 0.0) -> float:
    """Return a non-negative float for ``value``.

    Any value that cannot be converted to a finite float falls back to
    ``default``. Negative numbers are clamped to ``0.0``.
    """

    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    if not math.isfinite(number):
        return default
    return max(number, 0.0)


@dataclass(slots=True)
class CoreAllocationOptimizer:
    """Plan proportional core allocations for DAI, DAGI, and DAGS.

    The optimiser starts from a baseline capacity of eleven DAI cores,
    nine DAGI capability lanes, and five DAGS governance pillars. The
    :meth:`optimise` method redistributes the available cores according
    to demand weights while respecting optional minimum allocations for
    each domain.
    """

    dai_cores: int = 11
    dagi_cores: int = 9
    dags_cores: int = 5
    default_minimum: int = 1
    _baseline: Dict[str, int] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        for name in ("dai_cores", "dagi_cores", "dags_cores"):
            value = getattr(self, name)
            if int(value) != value or value <= 0:
                raise ValueError(f"{name} must be a positive integer")
        if self.default_minimum < 0:
            raise ValueError("default_minimum must be >= 0")
        self._baseline = {
            "dai": int(self.dai_cores),
            "dagi": int(self.dagi_cores),
            "dags": int(self.dags_cores),
        }

    @property
    def domains(self) -> tuple[str, ...]:
        """Return the managed domain identifiers."""

        return tuple(self._baseline)

    @property
    def total_capacity(self) -> int:
        """Return the baseline total number of cores across all domains."""

        return sum(self._baseline.values())

    def baseline_allocation(self) -> Dict[str, int]:
        """Return a copy of the baseline allocation mapping."""

        return dict(self._baseline)

    def optimise(
        self,
        demand: Mapping[str, float] | None = None,
        *,
        total_cores: int | None = None,
        minimums: Mapping[str, int] | None = None,
    ) -> Dict[str, int]:
        """Return an integer allocation of cores per domain.

        Parameters
        ----------
        demand:
            Optional mapping of domain identifiers to demand weights. Any
            domain omitted defaults to a neutral weight of ``1.0``. Values
            that are negative, non-numeric, or non-finite are treated as
            ``0.0``.
        total_cores:
            Override for the total number of cores to distribute. When
            omitted, the baseline total (``dai + dagi + dags``) is used.
        minimums:
            Optional mapping defining per-domain minimum allocations. Any
            domain absent from this mapping inherits ``default_minimum``.

        Returns
        -------
        dict
            Mapping of ``{"dai", "dagi", "dags"}`` to integer allocations
            that sum to ``total_cores``.
        """

        total = self.total_capacity if total_cores is None else int(total_cores)
        if total <= 0:
            raise ValueError("total_cores must be positive")

        minimum_allocations: Dict[str, int] = {}
        for domain, baseline in self._baseline.items():
            minimum = self.default_minimum
            if minimums is not None and domain in minimums:
                minimum = int(minimums[domain])
            if minimum < 0:
                raise ValueError("minimum allocations must be >= 0")
            minimum_allocations[domain] = minimum
            if minimum > total:
                raise ValueError(
                    f"minimum allocation for '{domain}' ({minimum}) exceeds total cores {total}"
                )

        if sum(minimum_allocations.values()) > total:
            raise ValueError("sum of minimum allocations exceeds total cores")

        weights: Dict[str, float] = {}
        requested = demand or {}
        for domain, baseline in self._baseline.items():
            if domain in requested:
                factor = _coerce_positive(requested[domain])
            else:
                factor = 1.0
            weights[domain] = baseline * factor

        total_weight = sum(weights.values())
        if total_weight <= 0:
            weights = {domain: float(baseline) for domain, baseline in self._baseline.items()}
            total_weight = sum(weights.values())

        raw_shares = {
            domain: (weights[domain] / total_weight) * total if total_weight else 0.0
            for domain in self._baseline
        }

        allocations: Dict[str, int] = {domain: math.floor(share) for domain, share in raw_shares.items()}
        assigned = sum(allocations.values())
        if assigned < total:
            remainder = total - assigned
            ordering = sorted(
                self._baseline.keys(),
                key=lambda domain: (
                    raw_shares[domain] - allocations[domain],
                    weights[domain],
                    self._baseline[domain],
                ),
                reverse=True,
            )
            for domain in ordering:
                if remainder == 0:
                    break
                allocations[domain] += 1
                remainder -= 1
        elif assigned > total:
            excess = assigned - total
            ordering = sorted(
                self._baseline.keys(),
                key=lambda domain: (
                    raw_shares[domain] - allocations[domain],
                    weights[domain],
                    self._baseline[domain],
                ),
            )
            for domain in ordering:
                if excess == 0:
                    break
                if allocations[domain] == 0:
                    continue
                allocations[domain] -= 1
                excess -= 1

        self._enforce_minimums(allocations, minimum_allocations)
        return allocations

    def _enforce_minimums(
        self,
        allocations: Dict[str, int],
        minimums: Mapping[str, int],
    ) -> None:
        """Mutate ``allocations`` to satisfy minimum per-domain capacity."""

        for domain, minimum in minimums.items():
            deficit = minimum - allocations.get(domain, 0)
            if deficit <= 0:
                continue
            allocations[domain] = allocations.get(domain, 0)
            while allocations[domain] < minimum:
                donor = self._select_donor(allocations, minimums, exclude=domain)
                if donor is None:
                    raise RuntimeError("unable to satisfy minimum allocations with given capacity")
                allocations[donor] -= 1
                allocations[domain] += 1

    def _select_donor(
        self,
        allocations: Mapping[str, int],
        minimums: Mapping[str, int],
        *,
        exclude: str,
    ) -> str | None:
        """Return a domain that can donate one core while respecting minimums."""

        candidates = [
            domain
            for domain in allocations
            if domain != exclude and allocations[domain] > minimums.get(domain, 0)
        ]
        if not candidates:
            return None
        candidates.sort(
            key=lambda domain: (
                allocations[domain] - minimums.get(domain, 0),
                self._baseline[domain],
            ),
            reverse=True,
        )
        return candidates[0]
