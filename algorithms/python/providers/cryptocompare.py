"""CryptoCompare market depth provider."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Mapping, Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from . import MarketDepthSnapshot, ProviderError, create_snapshot, parse_timestamp, split_market

JsonDispatcher = Callable[[str, Mapping[str, str] | None], Mapping[str, object]]


def _default_dispatcher(url: str, headers: Mapping[str, str] | None = None) -> Mapping[str, object]:
    request = Request(url, headers=headers or {})
    try:
        with urlopen(request) as response:  # type: ignore[arg-type]
            if response.status < 200 or response.status >= 300:
                raise ProviderError(f"CryptoCompare HTTP error {response.status}")
            body = response.read()
    except HTTPError as error:  # pragma: no cover - network guard
        raise ProviderError(f"CryptoCompare HTTP error {error.code}") from error
    except URLError as error:  # pragma: no cover - network guard
        raise ProviderError(f"CryptoCompare network error: {error.reason}") from error

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise ProviderError("CryptoCompare returned invalid JSON") from error


class CryptoCompareProvider:
    """Fetch order book snapshots from CryptoCompare's REST API."""

    base_url: str
    api_key: str | None
    dispatcher: JsonDispatcher

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str = "https://min-api.cryptocompare.com/data/orderbook",
        dispatcher: JsonDispatcher | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.dispatcher = dispatcher or _default_dispatcher

    def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot | None:
        base, quote = split_market(market)
        params = {"fsym": base, "tsym": quote, "depth": str(depth)}
        if self.api_key:
            params["api_key"] = self.api_key
        url = f"{self.base_url}?{urlencode(params)}"
        payload = self.dispatcher(url, None)

        data = payload.get("Data") if isinstance(payload, dict) else None
        bids = []
        asks = []
        if isinstance(data, dict):
            bids = data.get("Bids") or data.get("bids") or []
            asks = data.get("Asks") or data.get("asks") or []
        else:
            bids = payload.get("bids") if isinstance(payload, dict) else []
            asks = payload.get("asks") if isinstance(payload, dict) else []

        timestamp = None
        if isinstance(payload, dict):
            timestamp = payload.get("LastUpdate") or payload.get("timestamp")
            if isinstance(data, dict) and timestamp is None:
                timestamp = data.get("lastUpdate")

        observed_at: datetime = parse_timestamp(timestamp)
        return create_snapshot(
            symbol=market,
            provider="cryptocompare",
            bids=bids,
            asks=asks,
            depth=depth,
            observed_at=observed_at,
        )


__all__ = ["CryptoCompareProvider"]
