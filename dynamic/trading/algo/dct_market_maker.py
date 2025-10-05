"""Helpers for integrating the DCT market maker into Dynamic Trading stacks."""
from __future__ import annotations

import math
from dataclasses import fields
from decimal import Decimal
from typing import Any, Mapping, MutableMapping

from algorithms.python.dct_market_maker import (
    DCTMarketMakerInputs as _DCTMarketMakerInputs,
    DCTMarketMakerModel as _DCTMarketMakerModel,
    DCTMarketMakerQuote as _DCTMarketMakerQuote,
)

__all__ = [
    "DCTMarketMakerInputs",
    "DCTMarketMakerQuote",
    "DCTMarketMakerModel",
    "DCTMarketMakerService",
    "coerce_market_inputs",
]

DCTMarketMakerInputs = _DCTMarketMakerInputs
DCTMarketMakerQuote = _DCTMarketMakerQuote
DCTMarketMakerModel = _DCTMarketMakerModel

_REQUIRED_FIELDS = (
    "mid_price",
    "inventory",
    "target_inventory",
    "inventory_limit",
    "volatility",
    "ton_reference_price",
    "onchain_depth",
    "offchain_depth",
    "recent_volume",
)
def _normalise_value(field_name: str, value: Any) -> float:
    """Best-effort conversion to ``float`` with guard rails."""

    if isinstance(value, bool) or value is None:
        raise TypeError(f"{field_name} must be a real number, received {value!r}")

    if isinstance(value, Decimal):
        coerced = float(value)
    else:
        try:
            coerced = float(value)
        except (TypeError, ValueError) as exc:
            raise TypeError(f"{field_name} must be numeric, received {value!r}") from exc

    if not math.isfinite(coerced):
        raise ValueError(f"{field_name} must be finite, received {value!r}")

    return coerced


def _as_mapping(data: Mapping[str, Any] | DCTMarketMakerInputs | None) -> Mapping[str, Any]:
    if data is None:
        return {}
    if isinstance(data, DCTMarketMakerInputs):
        return {field.name: getattr(data, field.name) for field in fields(DCTMarketMakerInputs)}
    if isinstance(data, Mapping):
        return data
    raise TypeError(
        "data must be a mapping or DCTMarketMakerInputs instance, "
        f"received {type(data).__name__}",
    )


def coerce_market_inputs(
    data: Mapping[str, Any] | DCTMarketMakerInputs | None = None,
    **overrides: Any,
) -> DCTMarketMakerInputs:
    """Return :class:`DCTMarketMakerInputs` from *data* and ``overrides``."""

    source = dict(_as_mapping(data))
    source.update(overrides)

    payload: MutableMapping[str, float] = {}
    for field in fields(DCTMarketMakerInputs):
        if field.name in source:
            payload[field.name] = _normalise_value(field.name, source[field.name])

    missing = [name for name in _REQUIRED_FIELDS if name not in payload]
    if missing:
        missing_list = ", ".join(sorted(missing))
        raise KeyError(f"Missing required DCT market inputs: {missing_list}")

    return DCTMarketMakerInputs(**payload)


class DCTMarketMakerService:
    """Thin convenience wrapper around :class:`DCTMarketMakerModel`."""

    def __init__(self, model: DCTMarketMakerModel | None = None) -> None:
        self.model = model or DCTMarketMakerModel()

    def build_inputs(
        self,
        data: Mapping[str, Any] | DCTMarketMakerInputs,
        **overrides: Any,
    ) -> DCTMarketMakerInputs:
        """Normalise raw telemetry into :class:`DCTMarketMakerInputs`."""

        if isinstance(data, DCTMarketMakerInputs) and not overrides:
            return data
        return coerce_market_inputs(data, **overrides)

    def quote(
        self,
        data: Mapping[str, Any] | DCTMarketMakerInputs,
        **overrides: Any,
    ) -> DCTMarketMakerQuote:
        """Return a quote for the provided market snapshot."""

        inputs = self.build_inputs(data, **overrides)
        return self.model.generate_quote(inputs)

    def note_summary(self, quote: DCTMarketMakerQuote) -> str:
        """Return human readable notes for dashboards and alerts."""

        return self.model.summarise_notes(quote)
