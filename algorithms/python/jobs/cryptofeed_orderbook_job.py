"""Entrypoint for capturing order book depth snapshots via multiple providers."""

from __future__ import annotations

import importlib
import logging
import os
from typing import Iterable, Mapping, MutableMapping, Sequence

from ..providers import (
    MarketDepthProvider,
    MarketDepthSnapshot,
    ProviderError,
    create_snapshot,
    parse_timestamp,
)
from ..providers.cryptocompare import CryptoCompareProvider
from ..providers.kaiko import KaikoProvider
from ..providers.polygon import PolygonProvider
from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)


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


def _normalise_orderbook(
    *,
    symbol: str,
    exchange_id: str,
    depth: int,
    payload: Mapping[str, object],
) -> MarketDepthSnapshot | None:
    bids = payload.get("bids") or payload.get("bid")
    asks = payload.get("asks") or payload.get("ask")
    if not isinstance(bids, Sequence) or not isinstance(asks, Sequence):
        LOGGER.debug("Skipping %s due to missing depth data", symbol)
        return None

    timestamp = payload.get("timestamp")
    observed_at = parse_timestamp(timestamp)

    return create_snapshot(
        symbol=symbol,
        provider=f"cryptofeed-{exchange_id.lower()}",
        bids=bids,
        asks=asks,
        depth=depth,
        observed_at=observed_at,
    )


def _serialise_rows(
    snapshots: Iterable[MarketDepthSnapshot],
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
                "bid_volume": snapshot.bid_volume,
                "ask_volume": snapshot.ask_volume,
                "tick_volume": snapshot.tick_volume,
                "observed_at": snapshot.observed_at,
                "provider": snapshot.provider,
                "source": snapshot.provider,
            }
        )
    return rows


def _build_provider(name: str) -> MarketDepthProvider:
    lowered = name.lower()
    if lowered == "cryptocompare":
        return CryptoCompareProvider(api_key=os.getenv("CRYPTOCOMPARE_API_KEY"))
    if lowered == "kaiko":
        return KaikoProvider(api_key=os.getenv("KAIKO_API_KEY"))
    if lowered == "polygon":
        return PolygonProvider(api_key=os.getenv("POLYGON_API_KEY"))
    raise ValueError(f"Unknown market depth provider '{name}'")


def sync_cryptofeed_orderbooks(
    *,
    markets: Sequence[str] | None = None,
    exchange_id: str = "Binance",
    depth: int = 5,
    base_url: str | None = None,
    service_role_key: str | None = None,
    provider_overrides: Mapping[str, str] | None = None,
    default_provider: str = "cryptofeed",
    providers: Mapping[str, MarketDepthProvider] | None = None,
) -> int:
    markets = markets or (
        "BTC-USDT",
        "ETH-USDT",
        "SOL-USDT",
    )

    snapshots: list[MarketDepthSnapshot] = []
    provider_cache: MutableMapping[str, MarketDepthProvider] = {
        key.lower(): value for key, value in (providers or {}).items()
    }
    overrides = {key: value for key, value in (provider_overrides or {}).items()}

    cryptofeed_client: object | None = None

    for market in markets:
        provider_name = overrides.get(market, default_provider)
        if provider_name.lower() == "cryptofeed":
            if cryptofeed_client is None:
                module = _load_cryptofeed()
                cryptofeed_client = _initialise_rest_client(module, exchange_id)
            snapshot = _fetch_cryptofeed_snapshot(
                client=cryptofeed_client,
                market=market,
                exchange_id=exchange_id,
                depth=depth,
            )
        else:
            snapshot = _fetch_external_snapshot(
                provider_name=provider_name,
                cache=provider_cache,
                market=market,
                depth=depth,
            )
        if snapshot:
            snapshots.append(snapshot)

    if cryptofeed_client is not None:
        _shutdown_client(cryptofeed_client)

    writer = SupabaseTableWriter(
        table="market_depth_snapshots",
        conflict_column="symbol,observed_at,provider",
        base_url=base_url,
        service_role_key=service_role_key,
    )

    rows = _serialise_rows(snapshots)
    return writer.upsert(rows)


def _fetch_external_snapshot(
    *,
    provider_name: str,
    cache: MutableMapping[str, MarketDepthProvider],
    market: str,
    depth: int,
) -> MarketDepthSnapshot | None:
    lowered = provider_name.lower()
    provider = cache.get(lowered)
    if provider is None:
        try:
            provider = _build_provider(lowered)
        except ValueError as error:
            LOGGER.warning("Skipping %s due to %s", market, error)
            return None
        cache[lowered] = provider
    try:
        return provider.snapshot(market, depth=depth)
    except ProviderError as error:
        LOGGER.warning("Provider %s failed for %s: %s", lowered, market, error)
        return None


def _fetch_cryptofeed_snapshot(
    *,
    client: object,
    market: str,
    exchange_id: str,
    depth: int,
) -> MarketDepthSnapshot | None:
    try:
        payload = client.l2_book(symbol=market, depth=depth)
    except AttributeError:
        payload = client.book(symbol=market, depth=depth)
    except Exception as exc:  # pragma: no cover - defensive guard
        LOGGER.warning("Failed to fetch order book for %s: %s", market, exc)
        return None
    snapshot = _normalise_orderbook(
        symbol=market,
        exchange_id=exchange_id,
        depth=depth,
        payload=payload,
    )
    return snapshot


def _shutdown_client(client: object) -> None:
    shutdown = getattr(client, "close", None)
    if callable(shutdown):  # pragma: no cover - external resource cleanup
        try:
            shutdown()
        except Exception as error:  # pragma: no cover - best-effort cleanup
            LOGGER.debug("Failed to close cryptofeed client: %s", error)


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
