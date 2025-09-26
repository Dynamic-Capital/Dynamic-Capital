"""Entrypoint for capturing order book depth snapshots via Cryptofeed."""

from __future__ import annotations

import importlib
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping, Sequence

from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class _OrderBookSnapshot:
    symbol: str
    bid_price: float
    ask_price: float
    mid_price: float
    spread_bps: float
    depth_usd: float
    observed_at: datetime
    source: str


def _load_cryptofeed() -> object:
    try:
        return importlib.import_module("cryptofeed")
    except ModuleNotFoundError as exc:  # pragma: no cover - environment guard
        raise RuntimeError(
            "cryptofeed library is required to run the order book job"
        ) from exc


def _initialise_rest_client(module: object, exchange_id: str) -> object:
    rest = getattr(module, "rest", None)
    if rest is None:
        raise RuntimeError("cryptofeed installation is missing rest clients")
    try:
        factory = getattr(rest, exchange_id)
    except AttributeError as exc:
        raise RuntimeError(f"Unknown cryptofeed exchange '{exchange_id}'") from exc
    return factory()


def _normalise_symbol(symbol: str) -> str:
    return symbol.replace("/", "").replace("-", "")


def _best_price(levels: Sequence[Sequence[object]]) -> float | None:
    if not levels:
        return None
    price = levels[0][0]
    return float(price) if isinstance(price, (int, float)) else None


def _depth_notional(levels: Sequence[Sequence[object]], depth: int) -> float:
    notionals = []
    for price, size in levels[:depth]:
        if isinstance(price, (int, float)) and isinstance(size, (int, float)):
            notionals.append(float(price) * float(size))
    return sum(notionals)


def _normalise_orderbook(
    *,
    symbol: str,
    exchange_id: str,
    depth: int,
    payload: Mapping[str, object],
) -> _OrderBookSnapshot | None:
    bids = payload.get("bids") or payload.get("bid")
    asks = payload.get("asks") or payload.get("ask")
    if not isinstance(bids, Sequence) or not isinstance(asks, Sequence):
        LOGGER.debug("Skipping %s due to missing depth data", symbol)
        return None

    bid_price = _best_price(bids)
    ask_price = _best_price(asks)
    if bid_price is None or ask_price is None:
        LOGGER.debug("Skipping %s due to incomplete best prices", symbol)
        return None

    mid_price = (bid_price + ask_price) / 2
    spread_bps = ((ask_price - bid_price) / mid_price * 10_000) if mid_price else 0.0
    depth_usd = _depth_notional(bids, depth) + _depth_notional(asks, depth)

    timestamp = payload.get("timestamp")
    if isinstance(timestamp, (int, float)):
        observed_at = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    else:
        observed_at = datetime.now(tz=timezone.utc)

    return _OrderBookSnapshot(
        symbol=_normalise_symbol(symbol),
        bid_price=bid_price,
        ask_price=ask_price,
        mid_price=mid_price,
        spread_bps=spread_bps,
        depth_usd=depth_usd,
        observed_at=observed_at,
        source=exchange_id,
    )


def _serialise_rows(
    snapshots: Iterable[_OrderBookSnapshot],
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for snapshot in snapshots:
        rows.append(
            {
                "symbol": snapshot.symbol,
                "bid_price": snapshot.bid_price,
                "ask_price": snapshot.ask_price,
                "mid_price": snapshot.mid_price,
                "spread_bps": snapshot.spread_bps,
                "depth_usd": snapshot.depth_usd,
                "observed_at": snapshot.observed_at,
                "source": snapshot.source,
            }
        )
    return rows


def sync_cryptofeed_orderbooks(
    *,
    markets: Sequence[str] | None = None,
    exchange_id: str = "Binance",
    depth: int = 5,
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    markets = markets or (
        "BTC-USDT",
        "ETH-USDT",
        "SOL-USDT",
    )

    module = _load_cryptofeed()
    client = _initialise_rest_client(module, exchange_id)

    snapshots: list[_OrderBookSnapshot] = []
    for market in markets:
        try:
            payload = client.l2_book(symbol=market, depth=depth)
        except AttributeError:
            payload = client.book(symbol=market, depth=depth)
        except Exception as exc:  # pragma: no cover - defensive guard
            LOGGER.warning("Failed to fetch order book for %s: %s", market, exc)
            continue
        snapshot = _normalise_orderbook(
            symbol=market,
            exchange_id=exchange_id,
            depth=depth,
            payload=payload,
        )
        if snapshot:
            snapshots.append(snapshot)

    shutdown = getattr(client, "close", None)
    if callable(shutdown):  # pragma: no cover - external resource cleanup
        try:
            shutdown()
        except Exception:  # pragma: no cover - best-effort cleanup
            LOGGER.debug("Failed to close cryptofeed client %s", exchange_id)

    writer = SupabaseTableWriter(
        table="orderbook_snapshots",
        conflict_column="symbol,observed_at",
        base_url=base_url,
        service_role_key=service_role_key,
    )

    rows = _serialise_rows(snapshots)
    return writer.upsert(rows)


def main() -> None:  # pragma: no cover - CLI helper
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_cryptofeed_orderbooks(
        base_url=base_url,
        service_role_key=service_key,
    )
    LOGGER.info("Synced %s cryptofeed order books", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
