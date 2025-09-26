"""AwesomeAPI market data helpers for Dynamic Capital trading systems."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import List, Mapping, MutableSequence, Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .data_pipeline import InstrumentMeta, MarketDataIngestionJob, RawBar
from .trade_logic import MarketSnapshot

LOGGER = logging.getLogger(__name__)

BASE_URL = "https://economia.awesomeapi.com.br"
USER_AGENT = "DynamicCapitalBot/1.0"
DEFAULT_HISTORY = 256
DEFAULT_TIMEOUT = 10.0


class AwesomeAPIError(RuntimeError):
    """Raised when AwesomeAPI responses cannot be converted into market data."""


def _parse_float(value: object, *, field_name: str) -> float:
    if value is None:
        raise ValueError(f"missing {field_name}")
    try:
        return float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ValueError(f"invalid {field_name}: {value!r}") from exc


def _parse_timestamp(value: object) -> datetime:
    if value is None:
        raise ValueError("missing timestamp")
    try:
        epoch = int(str(value))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"invalid timestamp: {value!r}") from exc
    return datetime.fromtimestamp(epoch, tz=UTC)


def _extract_close(entry: Mapping[str, object]) -> float:
    candidates: MutableSequence[float] = []
    for key in ("bid", "ask", "close"):
        raw = entry.get(key)
        if raw in (None, ""):
            continue
        try:
            candidates.append(float(raw))
        except (TypeError, ValueError):
            continue
    if not candidates:
        raise ValueError("close price missing from AwesomeAPI payload")
    if len(candidates) == 1:
        return candidates[0]
    return sum(candidates) / len(candidates)


def _normalise_daily_payload(payload: Sequence[Mapping[str, object]]) -> List[RawBar]:
    entries = sorted(
        (entry for entry in payload if entry.get("timestamp") is not None),
        key=lambda row: int(str(row["timestamp"])),
    )
    bars: List[RawBar] = []
    previous_close: float | None = None
    for entry in entries:
        try:
            timestamp = _parse_timestamp(entry.get("timestamp"))
            high = _parse_float(entry.get("high"), field_name="high")
            low = _parse_float(entry.get("low"), field_name="low")
            close = _extract_close(entry)
        except ValueError as exc:
            LOGGER.debug("Skipping AwesomeAPI entry due to error: %s", exc)
            continue
        if high < low:
            high, low = low, high
        open_price = previous_close if previous_close is not None else close
        bars.append(
            RawBar(
                timestamp=timestamp,
                open=open_price,
                high=high,
                low=low,
                close=close,
                volume=0.0,
            )
        )
        previous_close = close
    return bars


@dataclass(slots=True)
class AwesomeAPIClient:
    """Lightweight HTTP client for AwesomeAPI FX and crypto endpoints."""

    base_url: str = BASE_URL
    user_agent: str = USER_AGENT
    timeout: float = DEFAULT_TIMEOUT

    def fetch_daily(self, pair: str, *, limit: int) -> Sequence[Mapping[str, object]]:
        if limit <= 0:
            raise ValueError("limit must be positive")
        pair_clean = pair.strip()
        url = f"{self.base_url}/json/daily/{pair_clean}/{limit}"
        request = Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urlopen(request, timeout=self.timeout) as response:  # type: ignore[arg-type]
                raw = response.read()
        except (HTTPError, URLError, TimeoutError) as exc:  # pragma: no cover - network variance
            raise AwesomeAPIError(f"Failed to fetch AwesomeAPI data for {pair_clean}: {exc}") from exc
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
            raise AwesomeAPIError(f"Invalid AwesomeAPI payload for {pair_clean}: {exc}") from exc
        if not isinstance(payload, list):
            raise AwesomeAPIError(
                f"Unexpected AwesomeAPI response for {pair_clean}: {type(payload).__name__}"
            )
        return payload

    def fetch_bars(self, pair: str, *, limit: int) -> List[RawBar]:
        payload = self.fetch_daily(pair, limit=limit)
        bars = _normalise_daily_payload(payload)
        if not bars:
            raise AwesomeAPIError(f"AwesomeAPI returned no usable bars for {pair}")
        return bars


@dataclass(slots=True)
class AwesomeAPISnapshotBuilder:
    """Build :class:`MarketSnapshot` sequences from AwesomeAPI market data."""

    client: AwesomeAPIClient = field(default_factory=AwesomeAPIClient)
    job: MarketDataIngestionJob = field(default_factory=MarketDataIngestionJob)
    history: int = DEFAULT_HISTORY

    def fetch_snapshots(
        self,
        pair: str,
        instrument: InstrumentMeta,
        *,
        history: int | None = None,
    ) -> List[MarketSnapshot]:
        window = self.history if history is None else history
        if window <= 0:
            raise ValueError("history must be positive")
        bars = self.client.fetch_bars(pair, limit=window)
        snapshots = self.job.run(bars, instrument)
        if not snapshots:
            raise AwesomeAPIError(
                f"Insufficient AwesomeAPI history for {pair}; received {len(bars)} bars"
            )
        return snapshots

    def latest_snapshot(
        self,
        pair: str,
        instrument: InstrumentMeta,
        *,
        history: int | None = None,
    ) -> MarketSnapshot:
        snapshots = self.fetch_snapshots(pair, instrument, history=history)
        return snapshots[-1]


__all__ = [
    "AwesomeAPIClient",
    "AwesomeAPIError",
    "AwesomeAPISnapshotBuilder",
]
