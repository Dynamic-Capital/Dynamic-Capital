"""Helpers for integrating the DCT market maker into Dynamic Trading stacks."""
from __future__ import annotations

from dataclasses import fields, replace
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


def coerce_market_inputs(
    data: Mapping[str, Any] | None = None,
    **overrides: Any,
) -> DCTMarketMakerInputs:
    """Return :class:`DCTMarketMakerInputs` from *data* and ``overrides``."""

    payload: MutableMapping[str, Any] = {}
    if data:
        for field in fields(DCTMarketMakerInputs):
            if field.name in data:
                payload[field.name] = data[field.name]

    payload.update(overrides)

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

        if isinstance(data, DCTMarketMakerInputs):
            return replace(data, **overrides) if overrides else data
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
