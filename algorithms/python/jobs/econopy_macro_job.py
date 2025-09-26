"""Entrypoint for syncing macroeconomic series from EconoPy."""

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
class _MacroPoint:
    indicator: str
    region: str
    actual: float | None
    forecast: float | None
    previous: float | None
    unit: str | None
    released_at: datetime
    source: str


def _load_econopy() -> object:
    for module_name in ("econopy", "EconoPy"):
        try:
            return importlib.import_module(module_name)
        except ModuleNotFoundError:
            continue
    raise RuntimeError("EconoPy library is required to run the macro sync job")


def _initialise_client(module: object) -> object:
    for attr in ("EconoPy", "Client", "API"):
        factory = getattr(module, attr, None)
        if callable(factory):
            return factory()
    raise RuntimeError("Unable to locate an EconoPy client constructor")


def _to_float(value: object) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _parse_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    if isinstance(value, str):
        cleaned = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(cleaned)
        except ValueError:
            parsed = datetime.strptime(cleaned, "%Y-%m-%d")
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return datetime.now(tz=timezone.utc)


def _extract_series(
    client: object,
    indicator: str,
    region: str,
) -> Mapping[str, object] | None:
    fetchers = (
        ("indicator", {"name": indicator, "region": region}),
        ("fetch_indicator", {"indicator": indicator, "region": region}),
        ("get_indicator", {"indicator": indicator, "region": region}),
        ("series", {"indicator": indicator, "region": region}),
    )
    series: Sequence[Mapping[str, object]] | None = None
    for method_name, kwargs in fetchers:
        method = getattr(client, method_name, None)
        if callable(method):
            try:
                result = method(**kwargs)
            except TypeError:
                continue
            if isinstance(result, Mapping):
                return result
            if isinstance(result, Sequence) and result:
                series = result  # type: ignore[assignment]
                break
    if not series:
        return None
    # Prefer the latest entry
    latest = max(
        series,
        key=lambda row: _parse_datetime(row.get("released_at") or row.get("date")),
    )
    return latest


def _normalise_point(
    *,
    indicator: str,
    region: str,
    source: str,
    payload: Mapping[str, object],
) -> _MacroPoint:
    actual = _to_float(payload.get("actual") or payload.get("value"))
    forecast = _to_float(payload.get("forecast"))
    previous = _to_float(payload.get("previous"))
    unit = payload.get("unit") or payload.get("units")
    released_at = _parse_datetime(
        payload.get("released_at")
        or payload.get("release_date")
        or payload.get("date")
        or payload.get("timestamp")
    )
    resolved_region = payload.get("region") or payload.get("country") or region
    return _MacroPoint(
        indicator=indicator,
        region=str(resolved_region),
        actual=actual,
        forecast=forecast,
        previous=previous,
        unit=str(unit) if unit is not None else None,
        released_at=released_at,
        source=source,
    )


def _serialise_rows(points: Iterable[_MacroPoint]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for point in points:
        rows.append(
            {
                "indicator": point.indicator,
                "region": point.region,
                "actual": point.actual,
                "forecast": point.forecast,
                "previous": point.previous,
                "unit": point.unit,
                "released_at": point.released_at,
                "source": point.source,
            }
        )
    return rows


def sync_econopy_macro_series(
    *,
    indicators: Sequence[str] | None = None,
    region: str = "US",
    base_url: str | None = None,
    service_role_key: str | None = None,
    source: str = "econopy",
) -> int:
    indicators = indicators or (
        "CPI",
        "Unemployment Rate",
        "Retail Sales",
    )

    module = _load_econopy()
    client = _initialise_client(module)

    points: list[_MacroPoint] = []
    for indicator in indicators:
        payload = _extract_series(client, indicator, region)
        if not payload:
            LOGGER.debug("No data returned for indicator %s", indicator)
            continue
        point = _normalise_point(
            indicator=indicator,
            region=region,
            source=source,
            payload=payload,
        )
        points.append(point)

    writer = SupabaseTableWriter(
        table="macro_indicators",
        conflict_column="indicator,released_at",
        base_url=base_url,
        service_role_key=service_role_key,
    )

    rows = _serialise_rows(points)
    return writer.upsert(rows)


def main() -> None:  # pragma: no cover - CLI helper
    logging.basicConfig(level=logging.INFO)
    base_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    count = sync_econopy_macro_series(
        base_url=base_url,
        service_role_key=service_key,
    )
    LOGGER.info("Synced %s macro indicators", count)


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
