"""Python trading strategy utilities for Dynamic Capital."""

from . import trade_logic as _trade_logic
from .awesome_api import (
    AwesomeAPIAutoCalculator,
    AwesomeAPIAutoMetrics,
    AwesomeAPIClient,
    AwesomeAPIError,
    AwesomeAPISnapshotBuilder,
)

_trade_exports = list(getattr(_trade_logic, "__all__", []))  # type: ignore[attr-defined]

__all__ = _trade_exports + [
    "AwesomeAPIAutoCalculator",
    "AwesomeAPIAutoMetrics",
    "AwesomeAPIClient",
    "AwesomeAPIError",
    "AwesomeAPISnapshotBuilder",
]

globals().update({name: getattr(_trade_logic, name) for name in _trade_exports})
globals().update(
    {
        "AwesomeAPIAutoCalculator": AwesomeAPIAutoCalculator,
        "AwesomeAPIAutoMetrics": AwesomeAPIAutoMetrics,
        "AwesomeAPIClient": AwesomeAPIClient,
        "AwesomeAPIError": AwesomeAPIError,
        "AwesomeAPISnapshotBuilder": AwesomeAPISnapshotBuilder,
    }
)
