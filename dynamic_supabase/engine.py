"""Dynamic Supabase orchestration and telemetry primitives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence
from urllib import error as urllib_error
from urllib import request as urllib_request

__all__ = [
    "SupabaseTableBlueprint",
    "SupabaseFunctionBlueprint",
    "SupabaseBucketBlueprint",
    "SupabaseConnectivityError",
    "SupabaseQueryProfile",
    "SupabaseResourceHealth",
    "DynamicSupabaseEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field_name} must not be empty")
    return cleaned


def _normalise_identifier(value: str, *, field_name: str) -> str:
    return _normalise_text(value, field_name=field_name).lower()


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_tuple(values: Iterable[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if not cleaned:
            continue
        lowered = cleaned.lower()
        if lowered not in seen:
            seen.add(lowered)
            normalised.append(cleaned)
    return tuple(normalised)


def _ensure_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):
        raise TypeError("metadata must be a mapping if provided")
    return dict(mapping)


def _ensure_datetime(timestamp: datetime) -> datetime:
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def _default_connectivity_probe(
    url: str, headers: Mapping[str, str], timeout: float
) -> int:
    request = urllib_request.Request(url, headers=dict(headers))
    with urllib_request.urlopen(request, timeout=timeout) as response:  # type: ignore[arg-type]
        status = getattr(response, "status", None)
        if status is None:
            status = response.getcode()
        return int(status)


ConnectivityProbe = Callable[[str, Mapping[str, str], float], int]


class SupabaseConnectivityError(RuntimeError):
    """Raised when Supabase connectivity verification fails."""


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class SupabaseTableBlueprint:
    """Blueprint describing a Supabase table and its operating posture."""

    name: str
    schema: str = "public"
    primary_keys: tuple[str, ...] = field(default_factory=tuple)
    indexes: tuple[str, ...] = field(default_factory=tuple)
    row_estimate: int = 0
    freshness_score: float = 0.5
    retention_hours: int = 720
    description: str | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name")
        self.schema = _normalise_text(self.schema, field_name="schema")
        self.primary_keys = _ensure_tuple(self.primary_keys)
        if not self.primary_keys:
            raise ValueError("a Supabase table requires at least one primary key")
        self.indexes = _ensure_tuple(self.indexes)
        self.row_estimate = max(int(self.row_estimate), 0)
        self.freshness_score = _clamp(float(self.freshness_score))
        self.retention_hours = max(int(self.retention_hours), 1)
        if self.description is not None:
            self.description = _normalise_text(self.description, field_name="description")

    @property
    def canonical_identifier(self) -> str:
        return f"{self.schema.lower()}.{self.name.lower()}"

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "schema": self.schema,
            "primary_keys": self.primary_keys,
            "indexes": self.indexes,
            "row_estimate": self.row_estimate,
            "freshness_score": self.freshness_score,
            "retention_hours": self.retention_hours,
            "description": self.description,
        }


@dataclass(slots=True)
class SupabaseFunctionBlueprint:
    """Operational view of a Supabase Edge Function."""

    name: str
    endpoint: str
    version: str = "v1"
    invocation_count: int = 0
    error_rate: float = 0.0
    average_latency_ms: float = 120.0
    last_deployed_at: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name")
        self.endpoint = _normalise_text(self.endpoint, field_name="endpoint")
        self.version = _normalise_text(self.version, field_name="version")
        self.invocation_count = max(int(self.invocation_count), 0)
        self.error_rate = _clamp(float(self.error_rate))
        self.average_latency_ms = max(float(self.average_latency_ms), 0.0)
        self.last_deployed_at = _ensure_datetime(self.last_deployed_at)
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def canonical_name(self) -> str:
        return self.name.lower()

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "endpoint": self.endpoint,
            "version": self.version,
            "invocation_count": self.invocation_count,
            "error_rate": self.error_rate,
            "average_latency_ms": self.average_latency_ms,
            "last_deployed_at": self.last_deployed_at.isoformat(),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class SupabaseBucketBlueprint:
    """Representation of a Supabase Storage bucket."""

    name: str
    is_public: bool = False
    object_count: int = 0
    total_size_mb: float = 0.0
    lifecycle_rules: tuple[str, ...] = field(default_factory=tuple)
    region: str = "us-east-1"
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name")
        self.is_public = bool(self.is_public)
        self.object_count = max(int(self.object_count), 0)
        self.total_size_mb = max(float(self.total_size_mb), 0.0)
        self.lifecycle_rules = _ensure_tuple(self.lifecycle_rules)
        self.region = _normalise_text(self.region, field_name="region")
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def canonical_name(self) -> str:
        return self.name.lower()

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "is_public": self.is_public,
            "object_count": self.object_count,
            "total_size_mb": self.total_size_mb,
            "lifecycle_rules": self.lifecycle_rules,
            "region": self.region,
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class SupabaseQueryProfile:
    """Telemetry captured from an interaction with a Supabase resource."""

    query_id: str
    resource_type: str
    resource_name: str
    operation: str
    duration_ms: float
    rows_processed: int = 0
    status: str = "success"
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.query_id = _normalise_text(self.query_id, field_name="query_id")
        self.resource_type = _normalise_identifier(self.resource_type, field_name="resource_type")
        self.resource_name = _normalise_text(self.resource_name, field_name="resource_name")
        self.operation = _normalise_identifier(self.operation, field_name="operation")
        self.duration_ms = max(float(self.duration_ms), 0.0)
        self.rows_processed = max(int(self.rows_processed), 0)
        self.status = _normalise_identifier(self.status, field_name="status")
        self.timestamp = _ensure_datetime(self.timestamp)
        self.metadata = _ensure_mapping(self.metadata)

    @property
    def canonical_resource(self) -> str:
        return f"{self.resource_type}:{self.resource_name.lower()}"

    def as_dict(self) -> dict[str, object]:
        return {
            "query_id": self.query_id,
            "resource_type": self.resource_type,
            "resource_name": self.resource_name,
            "operation": self.operation,
            "duration_ms": self.duration_ms,
            "rows_processed": self.rows_processed,
            "status": self.status,
            "timestamp": self.timestamp.isoformat(),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class SupabaseResourceHealth:
    """Summary describing the current health of a Supabase resource."""

    resource: str
    latency_ms: float
    availability: float
    throughput_per_minute: float
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.resource = _normalise_text(self.resource, field_name="resource")
        self.latency_ms = max(float(self.latency_ms), 0.0)
        self.availability = _clamp(float(self.availability))
        self.throughput_per_minute = max(float(self.throughput_per_minute), 0.0)
        self.notes = _ensure_tuple(self.notes)

    def as_dict(self) -> dict[str, object]:
        return {
            "resource": self.resource,
            "latency_ms": self.latency_ms,
            "availability": self.availability,
            "throughput_per_minute": self.throughput_per_minute,
            "notes": self.notes,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicSupabaseEngine:
    """Orchestrate Supabase tables, functions, buckets, and telemetry."""

    def __init__(
        self,
        *,
        tables: Sequence[SupabaseTableBlueprint | Mapping[str, object]] | None = None,
        functions: Sequence[SupabaseFunctionBlueprint | Mapping[str, object]] | None = None,
        buckets: Sequence[SupabaseBucketBlueprint | Mapping[str, object]] | None = None,
        max_history: int = 512,
    ) -> None:
        self._tables: MutableMapping[str, SupabaseTableBlueprint] = {}
        self._functions: MutableMapping[str, SupabaseFunctionBlueprint] = {}
        self._buckets: MutableMapping[str, SupabaseBucketBlueprint] = {}
        self._history: Deque[SupabaseQueryProfile] = deque(maxlen=max_history)

        for table in tables or ():
            self.register_table(table)
        for function in functions or ():
            self.register_function(function)
        for bucket in buckets or ():
            self.register_bucket(bucket)

    # ------------------------------------------------------------------ helpers
    def _table_key(self, table: SupabaseTableBlueprint) -> str:
        return table.canonical_identifier

    def _function_key(self, function: SupabaseFunctionBlueprint) -> str:
        return function.canonical_name

    def _bucket_key(self, bucket: SupabaseBucketBlueprint) -> str:
        return bucket.canonical_name

    @staticmethod
    def _coerce_table(table: SupabaseTableBlueprint | Mapping[str, object]) -> SupabaseTableBlueprint:
        if isinstance(table, SupabaseTableBlueprint):
            return table
        if isinstance(table, Mapping):
            return SupabaseTableBlueprint(**table)
        raise TypeError("table must be a SupabaseTableBlueprint or mapping")

    @staticmethod
    def _coerce_function(
        function: SupabaseFunctionBlueprint | Mapping[str, object]
    ) -> SupabaseFunctionBlueprint:
        if isinstance(function, SupabaseFunctionBlueprint):
            return function
        if isinstance(function, Mapping):
            return SupabaseFunctionBlueprint(**function)
        raise TypeError("function must be a SupabaseFunctionBlueprint or mapping")

    @staticmethod
    def _coerce_bucket(
        bucket: SupabaseBucketBlueprint | Mapping[str, object]
    ) -> SupabaseBucketBlueprint:
        if isinstance(bucket, SupabaseBucketBlueprint):
            return bucket
        if isinstance(bucket, Mapping):
            return SupabaseBucketBlueprint(**bucket)
        raise TypeError("bucket must be a SupabaseBucketBlueprint or mapping")

    @staticmethod
    def _coerce_query(
        profile: SupabaseQueryProfile | Mapping[str, object]
    ) -> SupabaseQueryProfile:
        if isinstance(profile, SupabaseQueryProfile):
            return profile
        if isinstance(profile, Mapping):
            return SupabaseQueryProfile(**profile)
        raise TypeError("query profile must be a SupabaseQueryProfile or mapping")

    # ----------------------------------------------------------------- registry
    def register_table(
        self, table: SupabaseTableBlueprint | Mapping[str, object]
    ) -> SupabaseTableBlueprint:
        resolved = self._coerce_table(table)
        self._tables[self._table_key(resolved)] = resolved
        return resolved

    def register_function(
        self, function: SupabaseFunctionBlueprint | Mapping[str, object]
    ) -> SupabaseFunctionBlueprint:
        resolved = self._coerce_function(function)
        self._functions[self._function_key(resolved)] = resolved
        return resolved

    def register_bucket(
        self, bucket: SupabaseBucketBlueprint | Mapping[str, object]
    ) -> SupabaseBucketBlueprint:
        resolved = self._coerce_bucket(bucket)
        self._buckets[self._bucket_key(resolved)] = resolved
        return resolved

    # --------------------------------------------------------------- accessors
    @property
    def tables(self) -> tuple[SupabaseTableBlueprint, ...]:
        return tuple(sorted(self._tables.values(), key=lambda table: table.canonical_identifier))

    @property
    def functions(self) -> tuple[SupabaseFunctionBlueprint, ...]:
        return tuple(sorted(self._functions.values(), key=lambda fn: fn.canonical_name))

    @property
    def buckets(self) -> tuple[SupabaseBucketBlueprint, ...]:
        return tuple(sorted(self._buckets.values(), key=lambda bucket: bucket.canonical_name))

    @property
    def history(self) -> tuple[SupabaseQueryProfile, ...]:
        return tuple(self._history)

    # -------------------------------------------------------------- telemetry
    def log_query(
        self, profile: SupabaseQueryProfile | Mapping[str, object]
    ) -> SupabaseQueryProfile:
        resolved = self._coerce_query(profile)
        self._history.append(resolved)
        return resolved

    def recent_history(
        self, *, limit: int = 50, resource: str | None = None
    ) -> tuple[SupabaseQueryProfile, ...]:
        if limit <= 0:
            return ()
        if resource is None:
            return tuple(list(self._history)[-limit:])
        target = _normalise_identifier(resource, field_name="resource")
        selected: list[SupabaseQueryProfile] = []
        for entry in reversed(self._history):
            if entry.canonical_resource == target:
                selected.append(entry)
            if len(selected) >= limit:
                break
        return tuple(reversed(selected))

    # --------------------------------------------------------------- analytics
    def resource_health(
        self,
        *,
        resource_type: str,
        resource_name: str,
        lookback: int = 50,
    ) -> SupabaseResourceHealth:
        canonical_type = _normalise_identifier(resource_type, field_name="resource_type")
        canonical_name = _normalise_identifier(resource_name, field_name="resource_name")
        combined = f"{canonical_type}:{canonical_name}"

        if lookback <= 0:
            lookback = 1

        observations: list[SupabaseQueryProfile] = []
        for entry in reversed(self._history):
            if entry.canonical_resource == combined:
                observations.append(entry)
            if len(observations) >= lookback:
                break

        if not observations:
            return SupabaseResourceHealth(
                resource=f"{canonical_type}:{canonical_name}",
                latency_ms=0.0,
                availability=0.0,
                throughput_per_minute=0.0,
                notes=("no telemetry available",),
            )

        total_latency = sum(entry.duration_ms for entry in observations)
        average_latency = total_latency / len(observations)
        availability = sum(1.0 for entry in observations if entry.status == "success") / len(observations)

        first = observations[-1].timestamp
        last = observations[0].timestamp
        elapsed_minutes = (last - first).total_seconds() / 60 or 1.0
        throughput = len(observations) / elapsed_minutes

        notes = [
            f"{entry.operation} {entry.query_id} failed with {entry.status}"
            for entry in observations
            if entry.status != "success"
        ]

        return SupabaseResourceHealth(
            resource=f"{canonical_type}:{canonical_name}",
            latency_ms=average_latency,
            availability=availability,
            throughput_per_minute=throughput,
            notes=tuple(notes),
        )

    def catalogue(self) -> dict[str, object]:
        """Return a serialisable catalogue of known Supabase assets."""

        return {
            "tables": [table.as_dict() for table in self.tables],
            "functions": [function.as_dict() for function in self.functions],
            "buckets": [bucket.as_dict() for bucket in self.buckets],
            "recent_queries": [entry.as_dict() for entry in self.recent_history(limit=25)],
        }

    def export_health_dashboard(
        self,
        *,
        lookback: int = 25,
    ) -> dict[str, object]:
        """Assemble a health overview covering all registered resources."""

        dashboard: dict[str, object] = {
            "tables": {},
            "functions": {},
            "buckets": {},
        }

        for table in self.tables:
            health = self.resource_health(
                resource_type="table",
                resource_name=table.canonical_identifier,
                lookback=lookback,
            )
            dashboard["tables"][table.canonical_identifier] = health.as_dict()

        for function in self.functions:
            health = self.resource_health(
                resource_type="function",
                resource_name=function.canonical_name,
                lookback=lookback,
            )
            dashboard["functions"][function.canonical_name] = health.as_dict()

        for bucket in self.buckets:
            health = self.resource_health(
                resource_type="bucket",
                resource_name=bucket.canonical_name,
                lookback=lookback,
            )
            dashboard["buckets"][bucket.canonical_name] = health.as_dict()

        return dashboard

    def verify_connectivity(
        self,
        *,
        base_url: str,
        anon_key: str,
        timeout: float = 5.0,
        probe: ConnectivityProbe | None = None,
    ) -> bool:
        """Check whether the Supabase REST endpoint is reachable.

        Parameters
        ----------
        base_url:
            The Supabase project URL, e.g. ``https://xyzcompany.supabase.co``.
        anon_key:
            The Supabase anon or service key used for the connectivity probe.
        timeout:
            Maximum number of seconds to wait for the HTTP probe to complete.
        probe:
            Optional callable used to override the default HTTP probe implementation.

        Returns
        -------
        bool
            ``True`` when the endpoint responds with a successful HTTP status code.

        Raises
        ------
        SupabaseConnectivityError
            Raised when the endpoint is unreachable or responds with an error status.
        """

        cleaned_base_url = _normalise_text(base_url, field_name="base_url").rstrip("/")
        cleaned_key = _normalise_text(anon_key, field_name="anon_key")
        if not cleaned_base_url:
            raise ValueError("base_url must not be empty")
        if not cleaned_key:
            raise ValueError("anon_key must not be empty")

        timeout_value = max(float(timeout), 0.1)
        rest_endpoint = f"{cleaned_base_url}/rest/v1/"
        headers = {
            "apikey": cleaned_key,
            "Authorization": f"Bearer {cleaned_key}",
        }
        probe_impl = probe or _default_connectivity_probe

        try:
            status_code = int(probe_impl(rest_endpoint, headers, timeout_value))
        except SupabaseConnectivityError:
            raise
        except (urllib_error.URLError, TimeoutError) as exc:  # pragma: no cover - network errors
            raise SupabaseConnectivityError(
                f"failed to contact Supabase endpoint {rest_endpoint}: {exc}"
            ) from exc
        except Exception as exc:  # pragma: no cover - unexpected probe failure
            raise SupabaseConnectivityError(
                f"unexpected error probing Supabase endpoint {rest_endpoint}: {exc}"
            ) from exc

        if not (200 <= status_code < 400):
            raise SupabaseConnectivityError(
                f"Supabase endpoint {rest_endpoint} responded with status {status_code}"
            )

        return True
