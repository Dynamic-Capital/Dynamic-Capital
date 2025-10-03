"""Dynamic cosmic orchestration utilities."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Mapping

from .cosmic import (
    CosmicBridge,
    CosmicCoordinate,
    CosmicPhenomenon,
    CosmicSignal,
    CosmicTimelineEvent,
    DynamicCosmic,
)
from .__main__ import DEFAULT_SCENARIO, build_engine as _build_engine

__all__ = [
    "CosmicBridge",
    "CosmicCoordinate",
    "CosmicPhenomenon",
    "CosmicSignal",
    "CosmicTimelineEvent",
    "DynamicCosmic",
    "enable_engine",
]


def enable_engine(config: Mapping[str, Any] | None = None) -> DynamicCosmic:
    """Return a fully initialised :class:`DynamicCosmic` engine.

    Parameters
    ----------
    config:
        Optional configuration payload matching the JSON schema consumed by the
        command line interface. When omitted, the bundled default scenario is
        used. The provided mapping is deep-copied so callers can safely reuse
        shared configuration dictionaries without worrying about hidden
        mutations during normalisation.
    """

    if config is None:
        scenario: Mapping[str, Any] = deepcopy(DEFAULT_SCENARIO)
    elif isinstance(config, Mapping):
        scenario = deepcopy(dict(config))
    else:  # pragma: no cover - defensive guard
        raise TypeError("config must be a mapping if provided")
    engine = _build_engine(scenario)
    # Warm analytics caches so that immediate telemetry calls do not repeat
    # expensive aggregations. Subsequent mutations on the engine will
    # invalidate these caches automatically.
    engine.evaluate_resilience()
    engine.topology_metrics()
    return engine
