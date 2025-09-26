"""Entrypoint for syncing live market movers from Yahoo Finance into Supabase."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import pstdev
from typing import Mapping, Sequence
from urllib.error import URLError
from urllib.request import Request, urlopen

from ..market_movers_sync import MarketMoversSyncJob, MomentumDataPoint
from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)
USER_AGENT = "DynamicCapitalBot/1.0"

DEFAULT_SYMBOLS: Mapping[str, str] = {
    "GC=F": "Gold futures",
    "SI=F": "Silver futures",
    "CL=F": "WTI crude",
    "^GSPC": "S&P 500",
    "^IXIC": "Nasdaq 100",
    "^RUT": "Russell 2000",
    "BTC-USD": "Bitcoin",
    "ETH-USD": "Ethereum",
    "DX-Y.NYB": "US Dollar Index",
}


def _fetch_chart(symbol: str, lookback_days: int) -> tuple[Sequence[int], Sequence[float]]:
    url = (
        "https://query1.finance.yahoo.com/v8/finance/chart/"
        f"{symbol}?range={lookback_days}d&interval=1h&includePrePost=false"
    )
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:  # type: ignore[arg-type]
        payload = json.load(response)
    result = (payload.get("chart", {}) or {}).get("result", [])
    if not result:
        raise RuntimeError(f"No chart data for {symbol}")
    chart = result[0]
    timestamps = chart.get("timestamp") or []
    quote = (chart.get("indicators") or {}).get("quote") or []
    closes = quote[0].get("close") if quote else []
    filtered_closes = [float(value) for value in closes if value is not None]
    if len(filtered_closes) < 2:
        raise RuntimeError(f"Insufficient pricing data for {symbol}")
    return timestamps, filtered_closes


def _momentum_score(prices: Sequence[float]) -> float:
    start = prices[0]
    end = prices[-1]
    change_pct = (end - start) / start * 100
    vol_penalty = pstdev(prices[-min(len(prices), 24):]) if len(prices) > 1 else 0.0
    score = 50 + change_pct - vol_penalty
    return max(0.0, min(100.0, score))


@dataclass(slots=True)
class YahooMomentumProvider:
    symbols: Mapping[str, str]
    lookback_days: int = 5

    def fetch(self) -> Sequence[MomentumDataPoint]:
        entries: list[MomentumDataPoint] = []
        for symbol, display in self.symbols.items():
            try:
                timestamps, closes = _fetch_chart(symbol, self.lookback_days)
                score = _momentum_score(closes)
                updated_at = datetime.fromtimestamp(
                    timestamps[-1], tz=timezone.utc
                ) if timestamps else datetime.now(tz=timezone.utc)
                entries.append(
                    MomentumDataPoint(
                        symbol=symbol,
                        display=display,
                        score=score,
                        updated_at=updated_at,
                    )
                )
            except (URLError, TimeoutError) as exc:
                LOGGER.warning("Network error fetching %s: %s", symbol, exc)
            except Exception as exc:  # pragma: no cover - defensive guard
                LOGGER.warning("Failed to build momentum entry for %s: %s", symbol, exc)
        return entries


def sync_market_movers(
    *,
    symbols: Mapping[str, str] | None = None,
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    provider = YahooMomentumProvider(symbols or DEFAULT_SYMBOLS)
    writer = SupabaseTableWriter(
        table="market_movers",
        conflict_column="symbol",
        base_url=base_url,
        service_role_key=service_role_key,
    )
    job = MarketMoversSyncJob(provider=provider, writer=writer, score_min=5.0)
    return job.run()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_market_movers(base_url=base_url, service_role_key=service_key)
    LOGGER.info("Synced %s market movers", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
