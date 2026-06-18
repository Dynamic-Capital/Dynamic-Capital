"""Entrypoint for syncing macroeconomic series from EconoPy."""

from __future__ import annotations

import importlib
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Callable, Iterable, Mapping, MutableMapping, Protocol, Sequence

import json
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen

from ..supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)


class ProviderError(RuntimeError):
    """Base error for provider interactions."""


class ProviderConfigurationError(ProviderError):
    """Raised when a provider is misconfigured."""


class ProviderResponseError(ProviderError):
    """Raised when a provider returns an unexpected payload."""


_HttpFetcher = Callable[[str, Mapping[str, str] | None, Mapping[str, str] | None], Mapping[str, object]]


def _default_fetch_json(
    url: str,
    params: Mapping[str, str] | None = None,
    headers: Mapping[str, str] | None = None,
) -> Mapping[str, object]:
    query = f"?{urlencode(params)}" if params else ""
    request = Request(url + query, headers=dict(headers or {}))
    with urlopen(request, timeout=30) as response:  # noqa: S310 - controlled domain
        payload = response.read()
    return json.loads(payload)


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
    source_metadata: Mapping[str, object]


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
    metadata: Mapping[str, object] | None = None,
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
    source_metadata: MutableMapping[str, object] = {
        "provider": source,
        "indicator_code": payload.get("indicator_code") or indicator,
    }
    if metadata:
        source_metadata.update(metadata)
    return _MacroPoint(
        indicator=indicator,
        region=str(resolved_region),
        actual=actual,
        forecast=forecast,
        previous=previous,
        unit=str(unit) if unit is not None else None,
        released_at=released_at,
        source=source,
        source_metadata=MappingProxyType(dict(source_metadata)),
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
                "source_metadata": dict(point.source_metadata),
            }
        )
    return rows


class _EconoPyAdapter:
    name = "econopy"

    def __init__(self) -> None:
        self._module: object | None = None
        self._client: object | None = None

    def _client_instance(self) -> object:
        if self._client is None:
            module = self._module or _load_econopy()
            self._module = module
            self._client = _initialise_client(module)
        return self._client

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        client = self._client_instance()
        payload = _extract_series(client, code or indicator, region)
        if not payload:
            return None
        metadata = {"indicator_code": code or indicator}
        return _normalise_point(
            indicator=indicator,
            region=region,
            source=self.name,
            payload=payload,
            metadata=metadata,
        )


class _FredAdapter:
    name = "fred"
    _BASE_URL = "https://api.stlouisfed.org/fred"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        fetch_json: _HttpFetcher | None = None,
    ) -> None:
        self._api_key = api_key or os.getenv("FRED_API_KEY")
        self._fetch_json = fetch_json or _default_fetch_json

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        if not self._api_key:
            raise ProviderConfigurationError("FRED API key missing")
        series_id = code or indicator
        payload = self._fetch_json(
            f"{self._BASE_URL}/series/observations",
            {
                "series_id": series_id,
                "api_key": self._api_key,
                "file_type": "json",
                "sort_order": "desc",
                "limit": "1",
            },
            None,
        )
        observations = payload.get("observations") if isinstance(payload, Mapping) else None
        if not isinstance(observations, Sequence):
            raise ProviderResponseError("FRED response missing observations")
        latest = next((row for row in observations if row.get("value") not in ("", ".")), None)
        if not latest:
            return None
        metadata = {
            "series_id": series_id,
            "frequency": payload.get("frequency"),
            "seasonal_adjustment": payload.get("seasonal_adjustment"),
            "units": payload.get("units"),
            "units_short": payload.get("units_short"),
        }
        normalised_payload: dict[str, object] = {
            "value": latest.get("value"),
            "released_at": latest.get("date"),
            "unit": payload.get("units_short") or payload.get("units"),
            "region": region,
            "indicator_code": series_id,
        }
        return _normalise_point(
            indicator=indicator,
            region=region,
            source=self.name,
            payload=normalised_payload,
            metadata=metadata,
        )


class _WorldBankAdapter:
    name = "world_bank"
    _BASE_URL = "https://api.worldbank.org/v2"

    def __init__(self, *, fetch_json: _HttpFetcher | None = None) -> None:
        self._fetch_json = fetch_json or _default_fetch_json

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        indicator_code = code or indicator
        response = self._fetch_json(
            f"{self._BASE_URL}/country/{region}/indicator/{indicator_code}",
            {"format": "json", "per_page": "10"},
            None,
        )
        if not isinstance(response, Sequence) or len(response) < 2:
            raise ProviderResponseError("World Bank response missing series data")
        metadata_block = response[0] if isinstance(response[0], Mapping) else {}
        series_rows = response[1]
        if not isinstance(series_rows, Sequence):
            raise ProviderResponseError("World Bank series payload malformed")
        filtered = [row for row in series_rows if row.get("value") not in (None, "")]
        if not filtered:
            return None
        latest = max(filtered, key=lambda row: row.get("date", ""))
        release_year = str(latest.get("date"))
        release_date = f"{release_year}-12-31" if release_year else None
        normalised_payload: dict[str, object] = {
            "value": latest.get("value"),
            "released_at": release_date,
            "unit": latest.get("unit") or metadata_block.get("unit"),
            "region": latest.get("countryiso3code") or region,
            "indicator_code": indicator_code,
        }
        indicator_meta = latest.get("indicator") if isinstance(latest, Mapping) else None
        indicator_id = indicator_meta.get("id") if isinstance(indicator_meta, Mapping) else None
        source_meta = metadata_block.get("source") if isinstance(metadata_block, Mapping) else None
        source_name = source_meta.get("value") if isinstance(source_meta, Mapping) else None
        metadata = {
            "indicator_id": indicator_id,
            "source": source_name,
            "last_updated": metadata_block.get("lastupdated") if isinstance(metadata_block, Mapping) else None,
        }
        return _normalise_point(
            indicator=indicator,
            region=region,
            source=self.name,
            payload=normalised_payload,
            metadata=metadata,
        )


class _OECDAdapter:
    name = "oecd"
    _BASE_URL = "https://stats.oecd.org/SDMX-JSON/data"

    def __init__(self, *, fetch_json: _HttpFetcher | None = None) -> None:
        self._fetch_json = fetch_json or _default_fetch_json

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        path_template = code or f"{indicator}/{region}.A"
        path = path_template.format(indicator=indicator, region=region)
        data = self._fetch_json(f"{self._BASE_URL}/{path}", {"contentType": "json"}, None)
        datasets = data.get("dataSets") if isinstance(data, Mapping) else None
        structures = data.get("structure") if isinstance(data, Mapping) else None
        if not isinstance(datasets, Sequence) or not datasets:
            raise ProviderResponseError("OECD response missing datasets")
        dataset = datasets[0]
        observations = dataset.get("observations") if isinstance(dataset, Mapping) else None
        if not isinstance(observations, Mapping):
            raise ProviderResponseError("OECD observations missing")
        time_dimension: Sequence[Mapping[str, object]] = []
        if isinstance(structures, Mapping):
            dims = structures.get("dimensions")
            if isinstance(dims, Mapping):
                observation_dims = dims.get("observation")
                if isinstance(observation_dims, Sequence):
                    for dim in observation_dims:
                        if isinstance(dim, Mapping) and dim.get("id") == "TIME_PERIOD":
                            values = dim.get("values")
                            if isinstance(values, Sequence):
                                time_dimension = [v for v in values if isinstance(v, Mapping)]
                            break
        latest_time: str | None = None
        latest_value: float | None = None
        for key, value in observations.items():
            if not isinstance(key, str) or not isinstance(value, Sequence) or not value:
                continue
            index_parts = key.split(":")
            time_idx = int(index_parts[-1]) if index_parts and index_parts[-1].isdigit() else None
            time_value = None
            if time_idx is not None and 0 <= time_idx < len(time_dimension):
                entry = time_dimension[time_idx]
                time_value = str(entry.get("id"))
            observed = _to_float(value[0])
            if observed is None:
                continue
            if not latest_time or (time_value and time_value > latest_time):
                latest_time = time_value or latest_time
                latest_value = observed
        if latest_value is None or not latest_time:
            return None
        structure_meta = structures if isinstance(structures, Mapping) else {}
        dataset_name = structure_meta.get("name") if isinstance(structure_meta, Mapping) else None
        metadata = {
            "dataset": dataset_name,
            "path": path,
        }
        normalised_payload: dict[str, object] = {
            "value": latest_value,
            "released_at": f"{latest_time}-12-31" if len(latest_time) == 4 else latest_time,
            "unit": None,
            "region": region,
            "indicator_code": path,
        }
        return _normalise_point(
            indicator=indicator,
            region=region,
            source=self.name,
            payload=normalised_payload,
            metadata=metadata,
        )


class _TradingEconomicsAdapter:
    name = "trading_economics"
    _BASE_URL = "https://api.tradingeconomics.com"

    def __init__(
        self,
        *,
        client_id: str | None = None,
        client_secret: str | None = None,
        fetch_json: _HttpFetcher | None = None,
    ) -> None:
        self._client_id = client_id or os.getenv("TRADING_ECONOMICS_CLIENT_ID")
        self._client_secret = client_secret or os.getenv("TRADING_ECONOMICS_CLIENT_SECRET")
        self._fetch_json = fetch_json or _default_fetch_json

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        if not self._client_id or not self._client_secret:
            raise ProviderConfigurationError("Trading Economics credentials missing")
        indicator_code = code or indicator
        encoded_indicator = quote(indicator_code, safe="")
        encoded_region = quote(region, safe="")
        paths = (
            f"indicators/country/{encoded_region}/{encoded_indicator}",
            f"indicators/{encoded_indicator}/{encoded_region}",
        )
        response: Sequence[Mapping[str, object]] | None = None
        resolved_path: str | None = None
        for path in paths:
            candidate = self._fetch_json(
                f"{self._BASE_URL}/{path}",
                {
                    "format": "json",
                    "c": f"{self._client_id}:{self._client_secret}",
                },
                None,
            )
            if isinstance(candidate, Sequence) and candidate:
                response = candidate
                resolved_path = path
                break
        if not response:
            return None
        latest = max(
            (entry for entry in response if isinstance(entry, Mapping)),
            key=lambda entry: entry.get("LatestValueDate") or entry.get("Date") or "",
        )
        metadata = {
            "symbol": latest.get("HistoricalDataSymbol"),
            "category": latest.get("Category"),
            "source": latest.get("Source"),
        }
        if resolved_path:
            metadata["endpoint_path"] = resolved_path
        normalised_payload: dict[str, object] = {
            "value": latest.get("LatestValue") or latest.get("Value"),
            "forecast": latest.get("LatestValueForecast"),
            "previous": latest.get("PreviousValue"),
            "released_at": latest.get("LatestValueDate") or latest.get("Date"),
            "unit": latest.get("Unit") or latest.get("UnitShort"),
            "region": latest.get("Country") or region,
            "indicator_code": indicator_code,
        }
        return _normalise_point(
            indicator=indicator,
            region=region,
            source=self.name,
            payload=normalised_payload,
            metadata=metadata,
        )


class _SupportsFetch(Protocol):
    name: str

    def fetch(
        self,
        *,
        indicator: str,
        region: str,
        code: str | None = None,
    ) -> _MacroPoint | None:
        """Fetch a macro data point."""


_PROVIDER_FACTORIES: Mapping[str, Callable[[], _SupportsFetch]] = {
    "econopy": _EconoPyAdapter,
    "fred": _FredAdapter,
    "world_bank": _WorldBankAdapter,
    "oecd": _OECDAdapter,
    "trading_economics": _TradingEconomicsAdapter,
}


def _resolve_provider(
    name: str,
    *,
    cache: MutableMapping[str, _SupportsFetch],
    overrides: Mapping[str, object],
) -> _SupportsFetch | None:
    override = overrides.get(name)
    if override is not None:
        if hasattr(override, "fetch"):
            return override  # type: ignore[return-value]
        LOGGER.warning("Override for provider %s missing fetch() method", name)
        return None
    adapter = cache.get(name)
    if adapter is not None:
        return adapter
    factory = _PROVIDER_FACTORIES.get(name)
    if not factory:
        LOGGER.debug("No provider registered for %s", name)
        return None
    instance = factory()
    cache[name] = instance
    return instance


def sync_econopy_macro_series(
    *,
    indicators: Sequence[str] | None = None,
    region: str = "US",
    base_url: str | None = None,
    service_role_key: str | None = None,
    source: str = "econopy",
    indicator_sources: Mapping[str, Sequence[str]] | None = None,
    indicator_codes: Mapping[str, Mapping[str, str]] | None = None,
    provider_overrides: Mapping[str, object] | None = None,
    default_sources: Sequence[str] | None = None,
) -> int:
    indicators = indicators or (
        "CPI",
        "Unemployment Rate",
        "Retail Sales",
    )

    providers_cache: dict[str, object] = {}
    overrides = dict(provider_overrides or {})
    base_order = list(default_sources or (
        "econopy",
        "fred",
        "world_bank",
        "oecd",
        "trading_economics",
    ))
    if source and source not in base_order:
        base_order.insert(0, source)
    default_provider_order: Sequence[str] = tuple(dict.fromkeys(base_order))
    points: list[_MacroPoint] = []
    for indicator in indicators:
        preferred_sources = indicator_sources.get(indicator) if indicator_sources else None
        if preferred_sources:
            provider_order = tuple(
                dict.fromkeys(tuple(preferred_sources) + tuple(default_provider_order))
            )
        else:
            provider_order = default_provider_order
        indicator_code_map = indicator_codes.get(indicator, {}) if indicator_codes else {}
        point: _MacroPoint | None = None
        for provider_name in provider_order:
            adapter = _resolve_provider(
                provider_name,
                cache=providers_cache,
                overrides=overrides,
            )
            if adapter is None:
                continue
            provider_code = indicator_code_map.get(provider_name)
            try:
                result = adapter.fetch(
                    indicator=indicator,
                    region=region,
                    code=provider_code,
                )
            except ProviderError as exc:
                LOGGER.warning(
                    "Provider %s failed for %s: %s",
                    provider_name,
                    indicator,
                    exc,
                )
                continue
            if result:
                point = result
                break
        if point is None:
            LOGGER.debug("No data returned for indicator %s", indicator)
            continue
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
