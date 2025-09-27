"""Kaiko market depth provider."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from . import MarketDepthSnapshot, ProviderError, create_snapshot, parse_timestamp

JsonDispatcher = Callable[[str, Mapping[str, str]], Mapping[str, object]]


def _default_dispatcher(url: str, headers: Mapping[str, str]) -> Mapping[str, object]:
    request = Request(url, headers=headers)
    try:
        with urlopen(request) as response:  # type: ignore[arg-type]
            if response.status < 200 or response.status >= 300:
                raise ProviderError(f"Kaiko HTTP error {response.status}")
            body = response.read()
    except HTTPError as error:  # pragma: no cover - network guard
        raise ProviderError(f"Kaiko HTTP error {error.code}") from error
    except URLError as error:  # pragma: no cover - network guard
        raise ProviderError(f"Kaiko network error: {error.reason}") from error

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise ProviderError("Kaiko returned invalid JSON") from error


class KaikoProvider:
    """Fetch aggregated order book data from Kaiko's API."""

    base_url: str
    api_key: str | None
    dispatcher: JsonDispatcher

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str = "https://us.market-api.kaiko.io/v2/data/order_book.v1/spot",
        dispatcher: JsonDispatcher | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.dispatcher = dispatcher or _default_dispatcher

    def snapshot(self, market: str, *, depth: int = 5) -> MarketDepthSnapshot | None:
        instrument = market.replace("/", "-").lower()
        params = urlencode({"depth": str(depth)})
        url = f"{self.base_url}/{instrument}?{params}"
        headers: Mapping[str, str] = {"accept": "application/json"}
        if self.api_key:
            headers = {"accept": "application/json", "x-api-key": self.api_key}
        payload = self.dispatcher(url, headers)

        orderbook = payload.get("data") if isinstance(payload, dict) else None
        bids = []
        asks = []
        if isinstance(orderbook, dict):
            bids = orderbook.get("bids") or orderbook.get("Bids") or []
            asks = orderbook.get("asks") or orderbook.get("Asks") or []
        elif isinstance(payload, dict):
            bids = payload.get("bids") or []
            asks = payload.get("asks") or []

        timestamp = None
        if isinstance(payload, dict):
            timestamp = payload.get("time") or payload.get("timestamp")
            if isinstance(orderbook, dict) and timestamp is None:
                timestamp = orderbook.get("timestamp") or orderbook.get("time")

        observed_at: datetime = parse_timestamp(timestamp)
        return create_snapshot(
            symbol=market,
            provider="kaiko",
            bids=bids,
            asks=asks,
            depth=depth,
            observed_at=observed_at,
        )


__all__ = ["KaikoProvider"]
