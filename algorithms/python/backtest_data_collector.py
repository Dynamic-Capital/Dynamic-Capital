"""Fetch historical bars and build MarketSnapshot CSVs for backtesting."""

from __future__ import annotations

import argparse
import csv
import io
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from .awesome_api import AwesomeAPIClient
from .data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from .training_workflow import PreparedSnapshotDataset, prepare_market_snapshot_dataset

YAHOO_BASE_URL = "https://query1.finance.yahoo.com/v7/finance/download/{symbol}"
SUPPORTED_INTERVALS = {
    "1m",
    "5m",
    "15m",
    "30m",
    "60m",
    "90m",
    "1h",
    "1d",
    "1wk",
    "1mo",
}


@dataclass(frozen=True)
class YahooDownloadConfig:
    """Parameters required to download bars from Yahoo Finance."""

    symbol: str
    start: datetime
    end: datetime
    interval: str = "1h"

    def __post_init__(self) -> None:
        if self.interval not in SUPPORTED_INTERVALS:
            raise ValueError(f"Unsupported interval '{self.interval}'")
        if self.start >= self.end:
            raise ValueError("start must be earlier than end")

    @property
    def query(self) -> dict:
        start_epoch = _to_epoch_seconds(self.start)
        # Yahoo treats period2 as exclusive; extend slightly to include the final bar.
        end_epoch = _to_epoch_seconds(self.end + timedelta(seconds=1))
        return {
            "period1": str(start_epoch),
            "period2": str(end_epoch),
            "interval": "1h" if self.interval == "60m" else self.interval,
            "events": "history",
            "includeAdjustedClose": "true",
        }


# ---------------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------------


def parse_yahoo_csv(csv_text: str) -> List[RawBar]:
    """Parse Yahoo Finance CSV payload into :class:`RawBar` instances."""

    reader = csv.DictReader(io.StringIO(csv_text))
    bars: List[RawBar] = []
    for row in reader:
        try:
            timestamp = _parse_timestamp(row.get("Date", ""))
            open_price = _parse_float(row.get("Open"))
            high = _parse_float(row.get("High"))
            low = _parse_float(row.get("Low"))
            close = _parse_float(row.get("Close"))
            volume = _parse_float(row.get("Volume"), allow_null=True)
        except ValueError:
            # Skip incomplete or placeholder rows (weekends/holidays).
            continue
        bars.append(
            RawBar(
                timestamp=timestamp,
                open=open_price,
                high=high,
                low=low,
                close=close,
                volume=volume,
            )
        )
    bars.sort(key=lambda bar: bar.timestamp)
    return bars


def download_yahoo_bars(config: YahooDownloadConfig) -> List[RawBar]:
    """Fetch OHLC data from Yahoo Finance and parse it into bars."""

    url = f"{YAHOO_BASE_URL.format(symbol=config.symbol)}?{urlencode(config.query)}"
    try:
        with urlopen(url) as response:  # type: ignore[arg-type]
            payload = response.read().decode("utf-8")
    except (HTTPError, URLError) as exc:  # pragma: no cover - network failure
        raise RuntimeError(f"Failed to download data for {config.symbol}: {exc}") from exc
    bars = parse_yahoo_csv(payload)
    if not bars:
        raise RuntimeError(f"Yahoo Finance returned no usable bars for {config.symbol}")
    return bars


def collect_backtest_data(
    *,
    dataset_symbol: str,
    vendor_symbol: Optional[str],
    start: datetime,
    end: datetime,
    interval: str,
    pip_size: float,
    pip_value: float,
    output_path: Optional[Path] = None,
    metadata_path: Optional[Path] = None,
    job: Optional[MarketDataIngestionJob] = None,
    bars: Optional[Sequence[RawBar]] = None,
    source: str = "yahoo",
    awesome_history: int = 256,
    awesome_client: Optional[AwesomeAPIClient] = None,
) -> PreparedSnapshotDataset:
    """Download OHLC data and build a :class:`PreparedSnapshotDataset`."""

    if start >= end:
        raise ValueError("start must be earlier than end")

    series: Sequence[RawBar]
    if bars is None:
        if source == "awesomeapi":
            if not vendor_symbol:
                raise ValueError("vendor_symbol is required when source='awesomeapi'")
            client = awesome_client or AwesomeAPIClient()
            series = client.fetch_bars(vendor_symbol, limit=awesome_history)
        elif source == "yahoo":
            config = YahooDownloadConfig(
                symbol=vendor_symbol or dataset_symbol,
                start=start,
                end=end,
                interval=interval,
            )
            series = download_yahoo_bars(config)
        else:
            raise ValueError("source must be either 'yahoo' or 'awesomeapi'")
    else:
        series = list(bars)
        if not series:
            raise ValueError("bars must be non-empty when provided explicitly")
    instrument = InstrumentMeta(symbol=dataset_symbol, pip_size=pip_size, pip_value=pip_value)
    return prepare_market_snapshot_dataset(
        series,
        instrument,
        job=job,
        snapshot_path=output_path,
        metadata_path=metadata_path,
    )


# ---------------------------------------------------------------------------
# CLI helpers
# ---------------------------------------------------------------------------


def _to_epoch_seconds(moment: datetime) -> int:
    if moment.tzinfo is None:
        aware = moment.replace(tzinfo=timezone.utc)
    else:
        aware = moment.astimezone(timezone.utc)
    return int(aware.timestamp())


def _parse_timestamp(raw: str) -> datetime:
    cleaned = raw.strip()
    if not cleaned:
        raise ValueError("timestamp missing")
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        try:
            parsed = datetime.strptime(cleaned, "%Y-%m-%d")
        except ValueError as exc:
            raise ValueError(f"Unrecognised timestamp: {raw}") from exc
        parsed = parsed.replace(tzinfo=UTC)
    else:
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        else:
            parsed = parsed.astimezone(UTC)
    return parsed


def _parse_float(value: Optional[str], *, allow_null: bool = False) -> float:
    if value is None:
        raise ValueError("missing numeric value")
    cleaned = value.strip()
    if not cleaned or cleaned.lower() == "null":
        if allow_null:
            return 0.0
        raise ValueError("null numeric value")
    return float(cleaned)


def _parse_cli_datetime(raw: str) -> datetime:
    cleaned = raw.strip()
    if not cleaned:
        raise ValueError("datetime argument cannot be empty")
    try:
        parsed = datetime.fromisoformat(cleaned)
    except ValueError:
        parsed = datetime.strptime(cleaned, "%Y-%m-%d")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)
    return parsed


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Collect Yahoo Finance data for backtesting")
    parser.add_argument("symbol", help="Instrument symbol to store in the dataset (e.g. XAUUSD)")
    parser.add_argument("output", type=Path, help="CSV path to write MarketSnapshot rows")
    parser.add_argument("--vendor-symbol", help="Override vendor symbol if it differs from dataset symbol")
    parser.add_argument("--start", required=True, help="Start datetime (YYYY-MM-DD or ISO8601)")
    parser.add_argument("--end", required=True, help="End datetime (YYYY-MM-DD or ISO8601)")
    parser.add_argument("--interval", default="1h", help="Yahoo Finance interval (default: 1h)")
    parser.add_argument("--pip-size", type=float, default=0.1, help="Instrument pip size")
    parser.add_argument("--pip-value", type=float, default=1.0, help="Instrument pip value")
    parser.add_argument("--metadata", type=Path, help="Optional metadata output path")
    parser.add_argument("--rsi-fast", type=int, default=9, help="Fast RSI period")
    parser.add_argument("--rsi-slow", type=int, default=14, help="Slow RSI period")
    parser.add_argument("--adx-fast", type=int, default=9, help="Fast ADX period")
    parser.add_argument("--adx-slow", type=int, default=14, help="Slow ADX period")
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    start = _parse_cli_datetime(args.start)
    end = _parse_cli_datetime(args.end)
    job = MarketDataIngestionJob(
        rsi_fast=args.rsi_fast,
        rsi_slow=args.rsi_slow,
        adx_fast=args.adx_fast,
        adx_slow=args.adx_slow,
    )

    result = collect_backtest_data(
        dataset_symbol=args.symbol,
        vendor_symbol=args.vendor_symbol,
        start=start,
        end=end,
        interval=args.interval,
        pip_size=args.pip_size,
        pip_value=args.pip_value,
        output_path=args.output,
        metadata_path=args.metadata,
        job=job,
    )

    print(
        f"Collected {len(result.snapshots)} snapshots for {args.symbol} "
        f"from {start.isoformat()} to {end.isoformat()}"
    )
    if result.snapshot_path:
        print(f"Snapshots saved to {result.snapshot_path}")
    if result.metadata_path:
        print(f"Metadata saved to {result.metadata_path}")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())


__all__ = [
    "YahooDownloadConfig",
    "collect_backtest_data",
    "download_yahoo_bars",
    "main",
    "parse_yahoo_csv",
]
