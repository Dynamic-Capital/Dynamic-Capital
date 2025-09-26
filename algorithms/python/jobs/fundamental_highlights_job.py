"""Generate fundamental positioning highlights using Yahoo Finance signals."""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Mapping, Sequence
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from ..fundamental_positioning import (
    FundamentalHighlightsGenerator,
    FundamentalHighlightsSyncJob,
    FundamentalSnapshot,
)
from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)
USER_AGENT = "DynamicCapitalBot/1.0"

DEFAULT_TICKERS: Mapping[str, str] = {
    "NVDA": "Semiconductors",
    "MSFT": "Software",
    "XOM": "Energy",
    "AMZN": "Consumer Discretionary",
    "LULU": "Apparel",
}


@dataclass(slots=True)
class QuoteEnvelope:
    symbol: str
    sector: str
    quote: dict


def _fetch_quotes(tickers: Mapping[str, str]) -> Sequence[QuoteEnvelope]:
    params = urlencode({"symbols": ",".join(tickers.keys()), "lang": "en-US", "region": "US"})
    url = f"https://query1.finance.yahoo.com/v7/finance/quote?{params}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=10) as response:  # type: ignore[arg-type]
        payload = json.load(response)
    result = (payload.get("quoteResponse", {}) or {}).get("result", [])
    envelopes: list[QuoteEnvelope] = []
    for raw in result:
        symbol = raw.get("symbol")
        if not symbol or symbol not in tickers:
            continue
        envelopes.append(QuoteEnvelope(symbol=symbol, sector=tickers[symbol], quote=raw))
    return envelopes


def _score_from_ratio(value: float | None, *, inverse: bool = False, scale: float = 40.0) -> float:
    if value is None or value <= 0:
        return 45.0
    ratio = min(value, scale)
    base = (scale - ratio) / scale * 100 if inverse else min(ratio / scale * 100, 100)
    return max(5.0, min(95.0, base))


def _compute_growth_score(quote: Mapping[str, float | None]) -> float:
    earnings_growth = quote.get("earningsGrowth")
    revenue_growth = quote.get("revenueGrowth")
    change = quote.get("fiftyTwoWeekChange")
    components = []
    if isinstance(earnings_growth, (int, float)):
        components.append(earnings_growth * 100)
    if isinstance(revenue_growth, (int, float)):
        components.append(revenue_growth * 90)
    if isinstance(change, (int, float)):
        components.append(change * 75)
    if not components:
        return 50.0
    return max(5.0, min(95.0, sum(components) / len(components) + 50))


def _compute_value_score(quote: Mapping[str, float | None]) -> float:
    forward_pe = quote.get("forwardPE")
    trailing_pe = quote.get("trailingPE")
    scores = []
    if isinstance(forward_pe, (int, float)):
        scores.append(_score_from_ratio(forward_pe, inverse=True, scale=35.0))
    if isinstance(trailing_pe, (int, float)):
        scores.append(_score_from_ratio(trailing_pe, inverse=True, scale=40.0))
    if not scores:
        return 55.0
    return sum(scores) / len(scores)


def _compute_quality_score(quote: Mapping[str, float | None]) -> float:
    margin = quote.get("profitMargins")
    roe = quote.get("returnOnEquity")
    beta = quote.get("beta")
    components = []
    if isinstance(margin, (int, float)):
        components.append(min(max(margin * 200, -40.0), 120.0) + 40)
    if isinstance(roe, (int, float)):
        components.append(min(max(roe * 100, -50.0), 120.0) + 35)
    if isinstance(beta, (int, float)):
        components.append(80.0 if beta <= 1.1 else 55.0 if beta <= 1.4 else 40.0)
    if not components:
        return 50.0
    return max(5.0, min(95.0, sum(components) / len(components)))


def _build_catalysts(quote: Mapping[str, float | None]) -> Sequence[str]:
    catalysts: list[str] = []
    earnings_date = quote.get("earningsTimestamp")
    if isinstance(earnings_date, (int, float)):
        dt = datetime.fromtimestamp(earnings_date, tz=timezone.utc)
        catalysts.append(f"Next earnings window around {dt:%d %b %Y}")
    price_change = quote.get("regularMarketChangePercent")
    if isinstance(price_change, (int, float)) and abs(price_change) > 2.5:
        direction = "upside" if price_change > 0 else "drawdown"
        catalysts.append(f"{abs(price_change):.1f}% {direction} move today highlights positioning flow")
    return catalysts


def _build_risk_notes(quote: Mapping[str, float | None]) -> Sequence[str]:
    notes: list[str] = []
    beta = quote.get("beta")
    if isinstance(beta, (int, float)) and beta > 1.4:
        notes.append("Maintain staggered entries given elevated beta")
    if quote.get("shortName"):
        notes.append("Rebalance if catalysts slip or liquidity thins")
    return notes


def _build_metrics(quote: Mapping[str, float | None]) -> dict[str, str]:
    metrics: dict[str, str] = {}
    price = quote.get("regularMarketPrice")
    change = quote.get("regularMarketChangePercent")
    forward_pe = quote.get("forwardPE")
    dividend = quote.get("dividendYield")
    if isinstance(price, (int, float)):
        metrics["Last price"] = f"${price:,.2f}"
    if isinstance(change, (int, float)):
        metrics["Daily change"] = f"{change:+.2f}%"
    if isinstance(forward_pe, (int, float)):
        metrics["Forward P/E"] = f"{forward_pe:.1f}x"
    if isinstance(dividend, (int, float)) and dividend > 0:
        metrics["Dividend yield"] = f"{dividend * 100:.1f}%"
    return metrics


def build_snapshots(tickers: Mapping[str, str]) -> Iterable[FundamentalSnapshot]:
    try:
        envelopes = _fetch_quotes(tickers)
    except (URLError, TimeoutError) as exc:
        LOGGER.error("Failed to load quote data: %s", exc)
        return []

    snapshots: list[FundamentalSnapshot] = []
    for envelope in envelopes:
        quote = envelope.quote
        growth = _compute_growth_score(quote)
        value = _compute_value_score(quote)
        quality = _compute_quality_score(quote)
        catalysts = _build_catalysts(quote)
        risk_notes = _build_risk_notes(quote)
        metrics = _build_metrics(quote)
        base_narrative = quote.get("shortName") or envelope.symbol
        snapshots.append(
            FundamentalSnapshot(
                asset=envelope.symbol,
                sector=envelope.sector,
                growth_score=growth,
                value_score=value,
                quality_score=quality,
                catalysts=catalysts,
                risk_notes=risk_notes,
                metrics=metrics,
                base_narrative=base_narrative,
            )
        )
    return snapshots


def sync_fundamental_highlights(
    *,
    tickers: Mapping[str, str] | None = None,
    base_url: str | None = None,
    service_role_key: str | None = None,
) -> int:
    snapshots = build_snapshots(tickers or DEFAULT_TICKERS)
    generator = FundamentalHighlightsGenerator()
    highlights = generator.generate(snapshots)
    writer = SupabaseTableWriter(
        table="fundamental_positioning",
        conflict_column="asset",
        base_url=base_url,
        service_role_key=service_role_key,
    )
    sync_job = FundamentalHighlightsSyncJob(writer=writer)
    return sync_job.run(highlights)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_fundamental_highlights(base_url=base_url, service_role_key=service_key)
    LOGGER.info("Synced %s fundamental positioning highlights", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
