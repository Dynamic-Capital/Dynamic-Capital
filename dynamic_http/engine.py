"""Dynamic HTTP/HTTPS routing and dispatch primitives."""

from __future__ import annotations

import json
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from time import perf_counter
from typing import Callable, Iterable, Mapping, MutableMapping, Sequence
from urllib.parse import parse_qsl

Protocol = str  # constrained via normalisation helpers

__all__ = [
    "CertificateAuthority",
    "DynamicHttp",
    "HttpMetrics",
    "HttpRequest",
    "HttpResponse",
    "RegisteredRoute",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_text(value: str, *, allow_empty: bool = False) -> str:
    cleaned = value.strip()
    if not cleaned and not allow_empty:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_method(value: str) -> str:
    cleaned = _normalise_text(value).upper()
    if any(ch.isspace() for ch in cleaned):
        raise ValueError("method must not contain whitespace")
    return cleaned


def _normalise_protocol(value: str) -> Protocol:
    cleaned = _normalise_text(value).lower()
    if cleaned not in {"http", "https"}:
        raise ValueError("protocol must be 'http' or 'https'")
    return cleaned


def _normalise_protocols(values: Sequence[str] | None) -> tuple[Protocol, ...]:
    if not values:
        return ("http", "https")
    normalised: list[Protocol] = []
    seen: set[str] = set()
    for value in values:
        protocol = _normalise_protocol(value)
        if protocol not in seen:
            seen.add(protocol)
            normalised.append(protocol)
    return tuple(normalised)


def _normalise_host(value: str) -> str:
    host = _normalise_text(value).lower()
    if " " in host:
        raise ValueError("host must not contain whitespace")
    return host


def _normalise_path(value: str) -> tuple[str, tuple[str, ...]]:
    cleaned = value.strip() or "/"
    path_part, _, query_string = cleaned.partition("?")
    if not path_part.startswith("/"):
        path_part = "/" + path_part
    segments = tuple(segment for segment in path_part.split("/") if segment)
    return path_part or "/", segments


def _normalise_headers(headers: Mapping[str, str] | Sequence[tuple[str, str]] | None) -> Mapping[str, str]:
    if headers is None:
        return {}
    items: Iterable[tuple[str, str]]
    if isinstance(headers, Mapping):
        items = headers.items()
    else:
        items = headers
    normalised: dict[str, str] = {}
    for key, value in items:
        header_name = _normalise_text(str(key)).lower()
        header_value = _normalise_text(str(value), allow_empty=True)
        normalised[header_name] = header_value
    return normalised


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = _normalise_text(tag).lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _coerce_query(
    query: Mapping[str, str] | Sequence[tuple[str, str]] | None,
    *,
    path_query: str | None = None,
) -> Mapping[str, str]:
    resolved: dict[str, str] = {}
    if path_query:
        for key, value in parse_qsl(path_query, keep_blank_values=True):
            resolved[_normalise_text(key)] = value
    if not query:
        return resolved
    items: Iterable[tuple[str, str]]
    if isinstance(query, Mapping):
        items = query.items()
    else:
        items = query
    for key, value in items:
        resolved[_normalise_text(str(key))] = str(value)
    return resolved


def _coerce_body(body: object | None) -> bytes | None:
    if body is None:
        return None
    if isinstance(body, bytes):
        return body
    if isinstance(body, str):
        return body.encode("utf-8")
    raise TypeError("body must be bytes or str if provided")


def _coerce_weight(weight: float | int) -> float:
    try:
        numeric = float(weight)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("weight must be numeric") from exc
    if numeric <= 0.0:
        raise ValueError("weight must be positive")
    return numeric


def _coerce_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _default_reason(status: int) -> str:
    lookup = {
        200: "OK",
        201: "Created",
        202: "Accepted",
        204: "No Content",
        301: "Moved Permanently",
        302: "Found",
        304: "Not Modified",
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        409: "Conflict",
        410: "Gone",
        415: "Unsupported Media Type",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        495: "Certificate Error",
    }
    return lookup.get(status, "") or "Response"


def _compile_pattern(pattern: str) -> tuple[str, tuple[tuple[str, str | None], ...]]:
    path, segments = _normalise_path(pattern)
    compiled: list[tuple[str, str | None]] = []
    for segment in segments:
        if segment.startswith("{") and segment.endswith("}"):
            parameter = _normalise_text(segment[1:-1])
            compiled.append(("param", parameter))
        else:
            compiled.append(("static", segment))
    return path, tuple(compiled)


# ---------------------------------------------------------------------------
# data models


Handler = Callable[
    ["HttpRequest"],
    "HttpResponse | tuple[int, Mapping[str, str] | None, object | None] | str | bytes | Mapping[str, object] | None",
]


@dataclass(slots=True)
class HttpRequest:
    """Represents an inbound HTTP/HTTPS request."""

    method: str
    path: str
    host: str
    protocol: Protocol = "http"
    query: Mapping[str, str] | Sequence[tuple[str, str]] | None = None
    headers: Mapping[str, str] | Sequence[tuple[str, str]] | None = None
    body: bytes | str | None = None
    timestamp: datetime = field(default_factory=_utcnow)
    tags: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None
    path_params: Mapping[str, str] | None = None

    _segments: tuple[str, ...] = field(init=False, repr=False)
    _query: Mapping[str, str] = field(init=False, repr=False)
    _headers: Mapping[str, str] = field(init=False, repr=False)
    _tags: tuple[str, ...] = field(init=False, repr=False)
    _metadata: Mapping[str, object] | None = field(init=False, repr=False)
    _body: bytes | None = field(init=False, repr=False)
    _path_params: Mapping[str, str] | None = field(init=False, repr=False)

    def __post_init__(self) -> None:
        method = _normalise_method(self.method)
        protocol = _normalise_protocol(self.protocol)
        host = _normalise_host(self.host)
        path, segments = _normalise_path(self.path)
        path_params = self.path_params
        if path_params is not None and not isinstance(path_params, Mapping):
            raise TypeError("path_params must be a mapping")
        metadata = _coerce_mapping(self.metadata)
        tags = _normalise_tags(self.tags)
        headers = _normalise_headers(self.headers)
        query_string = None
        if "?" in self.path:
            _, _, query_string = self.path.partition("?")
        query = _coerce_query(self.query, path_query=query_string)
        body = _coerce_body(self.body)
        timestamp = _coerce_timestamp(self.timestamp)

        object.__setattr__(self, "method", method)
        object.__setattr__(self, "protocol", protocol)
        object.__setattr__(self, "host", host)
        object.__setattr__(self, "path", path)
        object.__setattr__(self, "timestamp", timestamp)
        object.__setattr__(self, "headers", headers)
        object.__setattr__(self, "query", query)
        object.__setattr__(self, "tags", tags)
        object.__setattr__(self, "metadata", metadata)
        object.__setattr__(self, "body", body)
        object.__setattr__(self, "_segments", segments)
        object.__setattr__(self, "_query", query)
        object.__setattr__(self, "_headers", headers)
        object.__setattr__(self, "_tags", tags)
        object.__setattr__(self, "_metadata", metadata)
        object.__setattr__(self, "_body", body)
        if path_params is None:
            object.__setattr__(self, "path_params", None)
            object.__setattr__(self, "_path_params", None)
        else:
            normalised_params = {str(key): str(value) for key, value in path_params.items()}
            object.__setattr__(self, "path_params", normalised_params)
            object.__setattr__(self, "_path_params", normalised_params)

    @property
    def segments(self) -> tuple[str, ...]:
        return self._segments

    @property
    def headers_map(self) -> Mapping[str, str]:
        return self._headers

    @property
    def query_map(self) -> Mapping[str, str]:
        return self._query

    @property
    def metadata_map(self) -> Mapping[str, object] | None:
        return self._metadata

    @property
    def body_bytes(self) -> bytes | None:
        return self._body

    @property
    def tags_tuple(self) -> tuple[str, ...]:
        return self._tags

    @property
    def path_params_map(self) -> Mapping[str, str] | None:
        return self._path_params

    def with_path_params(self, params: Mapping[str, str]) -> "HttpRequest":
        return replace(self, path_params=dict(params))

    def get_header(self, name: str, default: str | None = None) -> str | None:
        return self._headers.get(name.lower(), default)


@dataclass(slots=True)
class HttpResponse:
    """Represents an outbound HTTP/HTTPS response."""

    status: int
    reason: str | None = None
    headers: Mapping[str, str] | Sequence[tuple[str, str]] | None = None
    body: bytes | str | None = None
    protocol: Protocol = "http"
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    _headers: Mapping[str, str] = field(init=False, repr=False)
    _body: bytes | None = field(init=False, repr=False)
    _metadata: Mapping[str, object] | None = field(init=False, repr=False)

    def __post_init__(self) -> None:
        status = int(self.status)
        if status < 100 or status > 599:
            raise ValueError("status must be a valid HTTP status code")
        reason = _normalise_text(self.reason or _default_reason(status))
        protocol = _normalise_protocol(self.protocol)
        headers = _normalise_headers(self.headers)
        body = _coerce_body(self.body)
        metadata = _coerce_mapping(self.metadata)
        timestamp = _coerce_timestamp(self.timestamp)

        object.__setattr__(self, "status", status)
        object.__setattr__(self, "reason", reason)
        object.__setattr__(self, "protocol", protocol)
        object.__setattr__(self, "headers", headers)
        object.__setattr__(self, "body", body)
        object.__setattr__(self, "metadata", metadata)
        object.__setattr__(self, "_headers", headers)
        object.__setattr__(self, "_body", body)
        object.__setattr__(self, "_metadata", metadata)
        object.__setattr__(self, "timestamp", timestamp)

    @property
    def headers_map(self) -> Mapping[str, str]:
        return self._headers

    @property
    def body_bytes(self) -> bytes | None:
        return self._body

    @property
    def metadata_map(self) -> Mapping[str, object] | None:
        return self._metadata

    def text(self, *, encoding: str = "utf-8") -> str | None:
        if self._body is None:
            return None
        return self._body.decode(encoding, errors="replace")


@dataclass(slots=True)
class CertificateAuthority:
    """Represents minimal certificate validation for HTTPS routing."""

    name: str
    serial: str
    issued_at: datetime
    expires_at: datetime
    allowed_hosts: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None

    _allowed_hosts: tuple[str, ...] = field(init=False, repr=False)
    _metadata: Mapping[str, object] | None = field(init=False, repr=False)
    _issued_at: datetime = field(init=False, repr=False)
    _expires_at: datetime = field(init=False, repr=False)

    def __post_init__(self) -> None:
        name = _normalise_text(self.name)
        serial = _normalise_text(self.serial)
        issued_at = _coerce_timestamp(self.issued_at)
        expires_at = _coerce_timestamp(self.expires_at)
        if expires_at <= issued_at:
            raise ValueError("expires_at must be later than issued_at")
        allowed = tuple(_normalise_host(host) for host in (self.allowed_hosts or ()))
        metadata = _coerce_mapping(self.metadata)

        object.__setattr__(self, "name", name)
        object.__setattr__(self, "serial", serial)
        object.__setattr__(self, "_issued_at", issued_at)
        object.__setattr__(self, "_expires_at", expires_at)
        object.__setattr__(self, "_allowed_hosts", allowed)
        object.__setattr__(self, "_metadata", metadata)

    @property
    def issued_at_utc(self) -> datetime:
        return self._issued_at

    @property
    def expires_at_utc(self) -> datetime:
        return self._expires_at

    @property
    def metadata_map(self) -> Mapping[str, object] | None:
        return self._metadata

    def is_valid(self, host: str, *, at: datetime | None = None) -> bool:
        moment = _coerce_timestamp(at or _utcnow())
        if moment < self._issued_at or moment > self._expires_at:
            return False
        if not self._allowed_hosts:
            return True
        host_name = _normalise_host(host)
        return host_name in self._allowed_hosts


@dataclass(slots=True)
class RegisteredRoute:
    """Represents a registered route within the dynamic HTTP engine."""

    method: str
    pattern: str
    handler: Handler
    name: str | None = None
    protocols: Sequence[str] | None = None
    weight: float = 1.0
    tags: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None
    created_at: datetime = field(default_factory=_utcnow)

    invocation_count: int = field(default=0, init=False)
    last_invoked: datetime | None = field(default=None, init=False)

    _path: str = field(init=False, repr=False)
    _segments: tuple[tuple[str, str | None], ...] = field(init=False, repr=False)
    _protocols: tuple[Protocol, ...] = field(init=False, repr=False)
    _tags: tuple[str, ...] = field(init=False, repr=False)
    _metadata: Mapping[str, object] | None = field(init=False, repr=False)

    def __post_init__(self) -> None:
        method = _normalise_method(self.method)
        path, segments = _compile_pattern(self.pattern)
        protocols = _normalise_protocols(self.protocols)
        weight = _coerce_weight(self.weight)
        tags = _normalise_tags(self.tags)
        metadata = _coerce_mapping(self.metadata)
        created_at = _coerce_timestamp(self.created_at)

        object.__setattr__(self, "method", method)
        object.__setattr__(self, "_path", path)
        object.__setattr__(self, "_segments", segments)
        object.__setattr__(self, "_protocols", protocols)
        object.__setattr__(self, "weight", weight)
        object.__setattr__(self, "_tags", tags)
        object.__setattr__(self, "_metadata", metadata)
        object.__setattr__(self, "created_at", created_at)

    @property
    def path(self) -> str:
        return self._path

    @property
    def protocols_tuple(self) -> tuple[Protocol, ...]:
        return self._protocols

    @property
    def tags_tuple(self) -> tuple[str, ...]:
        return self._tags

    @property
    def metadata_map(self) -> Mapping[str, object] | None:
        return self._metadata

    def match(self, request: HttpRequest) -> Mapping[str, str] | None:
        if request.method != self.method:
            return None
        if request.protocol not in self._protocols:
            return None
        if len(request.segments) != len(self._segments):
            return None
        params: dict[str, str] = {}
        for segment, request_segment in zip(self._segments, request.segments, strict=True):
            segment_type, value = segment
            if segment_type == "static":
                if request_segment != value:
                    return None
            elif segment_type == "param":
                params[value or "param"] = request_segment
            else:  # pragma: no cover - defensive guard
                return None
        return params

    def record_invocation(self, *, at: datetime | None = None) -> None:
        timestamp = _coerce_timestamp(at or _utcnow())
        object.__setattr__(self, "invocation_count", self.invocation_count + 1)
        object.__setattr__(self, "last_invoked", timestamp)


@dataclass(slots=True)
class HttpMetrics:
    """Aggregated metrics for HTTP/HTTPS dispatch."""

    total_requests: int = 0
    total_responses: int = 0
    protocol_totals: MutableMapping[str, int] = field(default_factory=dict)
    status_totals: MutableMapping[int, int] = field(default_factory=dict)
    average_latency_ms: float = 0.0
    last_request_at: datetime | None = None
    last_response_at: datetime | None = None

    def record_request(self, request: HttpRequest) -> None:
        self.total_requests += 1
        self.last_request_at = request.timestamp
        protocol_count = self.protocol_totals.get(request.protocol, 0)
        self.protocol_totals[request.protocol] = protocol_count + 1

    def record_response(self, *, status: int, latency_ms: float, timestamp: datetime | None = None) -> None:
        self.total_responses += 1
        self.last_response_at = _coerce_timestamp(timestamp or _utcnow())
        status_count = self.status_totals.get(status, 0)
        self.status_totals[status] = status_count + 1
        previous_average = self.average_latency_ms
        delta = latency_ms - previous_average
        self.average_latency_ms = previous_average + delta / float(self.total_responses)


class DynamicHttp:
    """Dynamic router that supports HTTP and HTTPS dispatch."""

    def __init__(
        self,
        *,
        authority: CertificateAuthority | None = None,
        default_protocols: Sequence[str] | None = None,
    ) -> None:
        self._routes: list[RegisteredRoute] = []
        self._metrics = HttpMetrics()
        self._authority = authority
        self._default_protocols = _normalise_protocols(default_protocols)

    @property
    def metrics(self) -> HttpMetrics:
        return self._metrics

    @property
    def routes(self) -> tuple[RegisteredRoute, ...]:
        return tuple(self._routes)

    def register(
        self,
        *,
        method: str,
        pattern: str,
        handler: Handler,
        name: str | None = None,
        protocols: Sequence[str] | None = None,
        weight: float = 1.0,
        tags: Sequence[str] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> RegisteredRoute:
        route = RegisteredRoute(
            method=method,
            pattern=pattern,
            handler=handler,
            name=name,
            protocols=protocols or self._default_protocols,
            weight=weight,
            tags=tags,
            metadata=metadata,
        )
        self._routes.append(route)
        self._routes.sort(key=lambda item: (-item.weight, item.created_at))
        return route

    def dispatch(self, request: HttpRequest) -> HttpResponse:
        self._metrics.record_request(request)
        start = perf_counter()
        if request.protocol == "https" and self._authority is not None:
            if not self._authority.is_valid(request.host, at=request.timestamp):
                latency = (perf_counter() - start) * 1000.0
                response = HttpResponse(
                    status=495,
                    reason=_default_reason(495),
                    body="invalid certificate",
                    protocol=request.protocol,
                )
                self._metrics.record_response(status=response.status, latency_ms=latency)
                return response

        matches: list[tuple[RegisteredRoute, Mapping[str, str]]] = []
        for route in self._routes:
            params = route.match(request)
            if params is not None:
                matches.append((route, params))
        if not matches:
            latency = (perf_counter() - start) * 1000.0
            response = HttpResponse(
                status=404,
                reason=_default_reason(404),
                body="route not found",
                protocol=request.protocol,
            )
            self._metrics.record_response(status=response.status, latency_ms=latency)
            return response

        def priority_key(item: tuple[RegisteredRoute, Mapping[str, str]]) -> tuple[float, datetime]:
            route, _ = item
            last_used = route.last_invoked or route.created_at
            return (route.weight, last_used)

        selected_route, params = max(matches, key=priority_key)
        enriched_request = request.with_path_params(params)
        try:
            raw_response = selected_route.handler(enriched_request)
            response = _coerce_response(raw_response, protocol=request.protocol)
        except Exception as exc:  # pragma: no cover - safety net
            response = HttpResponse(
                status=500,
                reason=_default_reason(500),
                body=f"internal error: {exc}",
                protocol=request.protocol,
            )
        selected_route.record_invocation(at=request.timestamp)
        latency = (perf_counter() - start) * 1000.0
        self._metrics.record_response(status=response.status, latency_ms=latency)
        return response


def _coerce_response(result: object, *, protocol: Protocol) -> HttpResponse:
    if isinstance(result, HttpResponse):
        if result.protocol != protocol:
            return HttpResponse(
                status=result.status,
                reason=result.reason,
                headers=result.headers_map,
                body=result.body_bytes,
                protocol=protocol,
                metadata=result.metadata_map,
            )
        return result
    if result is None:
        return HttpResponse(status=204, reason=_default_reason(204), protocol=protocol)
    if isinstance(result, tuple):
        if len(result) != 3:
            raise ValueError("tuple responses must contain three elements")
        status, headers, body = result
        return HttpResponse(
            status=int(status),
            headers=headers,
            body=body,
            protocol=protocol,
        )
    if isinstance(result, Mapping):
        payload = json.dumps(result, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        headers = {"content-type": "application/json; charset=utf-8"}
        return HttpResponse(status=200, headers=headers, body=payload, protocol=protocol)
    if isinstance(result, str):
        headers = {"content-type": "text/plain; charset=utf-8"}
        return HttpResponse(status=200, headers=headers, body=result, protocol=protocol)
    if isinstance(result, bytes):
        return HttpResponse(status=200, body=result, protocol=protocol)
    raise TypeError("handler must return an HttpResponse-compatible object")
