"""Entrypoint for capturing price snapshots from CCXT exchanges."""

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
class _Snapshot:
    symbol: str
    quote_currency: str
    price_usd: float
    signature: str
    signed_at: datetime


def _load_ccxt() -> object:
    try:
        return importlib.import_module("ccxt")
    except ModuleNotFoundError as exc:  # pragma: no cover - environment guard
        raise RuntimeError(
            "ccxt library is required to run the price snapshot job"
        ) from exc


def _initialise_exchange(module: object, exchange_id: str) -> object:
    try:
        factory = getattr(module, exchange_id)
    except AttributeError as exc:  # pragma: no cover - misconfiguration guard
        raise RuntimeError(f"Unknown CCXT exchange '{exchange_id}'") from exc
    exchange = factory()
    return exchange


def _normalise_symbol(market: str) -> tuple[str, str]:
    if "/" in market:
        base, quote = market.split("/", 1)
        return f"{base}{quote}", quote
    return market.replace("-", ""), "USD"


def _normalise_snapshot(
    *,
    market: str,
    exchange: str,
    ticker: Mapping[str, object],
) -> _Snapshot | None:
    last = ticker.get("last")
    close = ticker.get("close")
    price_raw = last if isinstance(last, (int, float)) else close
    if not isinstance(price_raw, (int, float)):
        LOGGER.debug("Skipping %s due to missing price field", market)
        return None

    timestamp = ticker.get("timestamp")
    if isinstance(timestamp, (int, float)):
        signed_at = datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
    else:
        signed_at = datetime.now(tz=timezone.utc)

    symbol, quote = _normalise_symbol(market)
    signature = f"{exchange}:{market}:{int(signed_at.timestamp())}"

    return _Snapshot(
        symbol=symbol,
        quote_currency=quote,
        price_usd=float(price_raw),
        signature=signature,
        signed_at=signed_at,
    )


def _serialise_rows(snapshots: Iterable[_Snapshot]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for snapshot in snapshots:
        rows.append(
            {
                "symbol": snapshot.symbol,
                "quote_currency": snapshot.quote_currency,
                "price_usd": snapshot.price_usd,
                "signature": snapshot.signature,
                "signed_at": snapshot.signed_at,
            }
        )
    return rows


def sync_ccxt_price_snapshots(
    *,
    markets: Sequence[str] | None = None,
    exchange_id: str = "binance",
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    markets = markets or (
        "BTC/USDT",
        "ETH/USDT",
        "SOL/USDT",
        "XRP/USDT",
        "DOGE/USDT",
    )

    module = _load_ccxt()
    exchange = _initialise_exchange(module, exchange_id)

    snapshots: list[_Snapshot] = []
    for market in markets:
        try:
            ticker = exchange.fetch_ticker(market)
        except Exception as exc:  # pragma: no cover - defensive network guard
            LOGGER.warning("Failed to fetch ticker for %s: %s", market, exc)
            continue
        snapshot = _normalise_snapshot(
            market=market,
            exchange=exchange_id,
            ticker=ticker,
        )
        if snapshot:
            snapshots.append(snapshot)

    close = getattr(exchange, "close", None)
    if callable(close):  # pragma: no cover - external resource cleanup
        try:
            close()
        except Exception:  # pragma: no cover - best-effort cleanup
            LOGGER.debug("Failed to close CCXT exchange %s", exchange_id)

    writer = SupabaseTableWriter(
        table="price_snapshots",
        conflict_column="symbol,signed_at",
        base_url=base_url,
        service_role_key=service_role_key,
    )

    rows = _serialise_rows(snapshots)
    return writer.upsert(rows)


def main() -> None:  # pragma: no cover - CLI helper
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_ccxt_price_snapshots(
        base_url=base_url,
        service_role_key=service_key,
    )
    LOGGER.info("Synced %s CCXT price snapshots", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
