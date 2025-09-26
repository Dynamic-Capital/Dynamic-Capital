"""AwesomeAPI Commitments of Traders report ingestion."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Mapping, MutableSequence, Protocol, Sequence
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .awesome_api import BASE_URL, DEFAULT_TIMEOUT, USER_AGENT
from .supabase_sync import SupabaseTableWriter

__all__ = [
    "CotMarketConfig",
    "CotReportSnapshot",
    "CotReportProvider",
    "AwesomeAPICotClient",
    "AwesomeAPICotProvider",
    "CotReportSyncJob",
]


class AwesomeAPICotError(RuntimeError):
    """Raised when AwesomeAPI COT responses cannot be parsed."""


@dataclass(slots=True)
class CotMarketConfig:
    """Mapping between Supabase market name and AwesomeAPI identifier."""

    market: str
    code: str


@dataclass(slots=True)
class CotReportSnapshot:
    """Parsed COT report values ready for persistence."""

    market: str
    commercial_long: int
    commercial_short: int
    noncommercial_long: int
    noncommercial_short: int
    date: date


class CotReportProvider(Protocol):  # pragma: no cover - interface definition
    """Interface for providers that return COT report snapshots."""

    def fetch(self) -> Sequence[CotReportSnapshot]:
        """Return the latest report snapshot for each configured market."""


@dataclass(slots=True)
class AwesomeAPICotClient:
    """Minimal HTTP client for AwesomeAPI COT endpoints."""

    base_url: str = f"{BASE_URL}/cot"
    user_agent: str = USER_AGENT
    timeout: float = DEFAULT_TIMEOUT

    def fetch_series(self, code: str) -> Sequence[Mapping[str, object]]:
        code_clean = code.strip()
        url = f"{self.base_url}/{code_clean}"
        request = Request(url, headers={"User-Agent": self.user_agent})
        try:
            with urlopen(request, timeout=self.timeout) as response:  # type: ignore[arg-type]
                raw = response.read()
        except (HTTPError, URLError, TimeoutError) as exc:  # pragma: no cover - network variance
            raise AwesomeAPICotError(
                f"Failed to fetch AwesomeAPI COT data for {code_clean}: {exc}"
            ) from exc
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise AwesomeAPICotError(
                f"Invalid AwesomeAPI COT payload for {code_clean}: {exc}"
            ) from exc
        if isinstance(payload, list):
            return payload
        if isinstance(payload, Mapping):
            return [payload]
        raise AwesomeAPICotError(
            f"Unexpected AwesomeAPI COT response for {code_clean}: {type(payload).__name__}"
        )


def _coerce_date(value: object) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            raise ValueError("empty date value")
        try:
            return datetime.fromisoformat(raw).date()
        except ValueError:
            if len(raw) == 8 and raw.isdigit():
                return date(int(raw[:4]), int(raw[4:6]), int(raw[6:]))
    raise ValueError(f"invalid date value: {value!r}")


def _extract_report_date(entry: Mapping[str, object]) -> date:
    for key in ("date", "report_date", "reportDate"):
        if key in entry:
            try:
                return _coerce_date(entry[key])
            except ValueError as exc:
                raise AwesomeAPICotError(f"Invalid COT report date: {entry[key]!r}") from exc
    raise AwesomeAPICotError("AwesomeAPI COT payload missing report date")


def _parse_int(value: object, *, field: str) -> int:
    if value is None:
        raise AwesomeAPICotError(f"AwesomeAPI COT payload missing {field}")
    try:
        # Some AwesomeAPI payloads serialise numeric fields as strings.
        return int(float(str(value)))
    except (TypeError, ValueError) as exc:
        raise AwesomeAPICotError(f"Invalid COT value for {field}: {value!r}") from exc


@dataclass(slots=True)
class AwesomeAPICotProvider:
    """Provider that converts AwesomeAPI responses into COT snapshots."""

    markets: Sequence[CotMarketConfig]
    client: AwesomeAPICotClient = field(default_factory=AwesomeAPICotClient)

    def fetch(self) -> Sequence[CotReportSnapshot]:
        snapshots: MutableSequence[CotReportSnapshot] = []
        for config in self.markets:
            series = self.client.fetch_series(config.code)
            latest_entry = self._select_latest(series)
            snapshots.append(
                CotReportSnapshot(
                    market=config.market,
                    commercial_long=_parse_int(latest_entry["commercial_long"], field="commercial_long"),
                    commercial_short=_parse_int(latest_entry["commercial_short"], field="commercial_short"),
                    noncommercial_long=_parse_int(
                        latest_entry["noncommercial_long"], field="noncommercial_long"
                    ),
                    noncommercial_short=_parse_int(
                        latest_entry["noncommercial_short"], field="noncommercial_short"
                    ),
                    date=_extract_report_date(latest_entry),
                )
            )
        return list(snapshots)

    @staticmethod
    def _select_latest(series: Sequence[Mapping[str, object]]) -> Mapping[str, object]:
        dated_entries: MutableSequence[tuple[date, Mapping[str, object]]] = []
        for entry in series:
            try:
                report_date = _extract_report_date(entry)
            except AwesomeAPICotError:
                continue
            dated_entries.append((report_date, entry))
        if not dated_entries:
            raise AwesomeAPICotError("AwesomeAPI COT series contained no dated entries")
        dated_entries.sort(key=lambda item: item[0])
        return dated_entries[-1][1]


@dataclass(slots=True)
class CotReportSyncJob:
    """Persist COT report snapshots into Supabase."""

    provider: CotReportProvider
    writer: SupabaseTableWriter

    def run(self) -> int:
        rows = [
            {
                "market": snapshot.market,
                "commercialLong": snapshot.commercial_long,
                "commercialShort": snapshot.commercial_short,
                "noncommercialLong": snapshot.noncommercial_long,
                "noncommercialShort": snapshot.noncommercial_short,
                "date": snapshot.date,
            }
            for snapshot in self.provider.fetch()
        ]
        return self.writer.upsert(rows)
