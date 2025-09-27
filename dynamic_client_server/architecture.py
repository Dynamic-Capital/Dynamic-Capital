"""Dynamic client-server communication architecture.

This module provides a minimal yet expressive toolkit for wiring together
clients and servers in-process.  The architecture focuses on three concerns:

1. **Resilient request/response plumbing** – every request is wrapped in an
   immutable envelope capturing metadata, correlation identifiers, and
   timestamps so tracing works even under heavy load.
2. **Event distribution** – servers can broadcast domain events to interested
   clients without coupling the components.  Subscriptions are registered with
   the transport which fans out messages concurrently.
3. **Observability-friendly context** – route handlers receive a structured
   :class:`RequestContext` that exposes helper methods for broadcasting events
   and composing typed responses.

The primitives are transport agnostic.  The provided
:class:`InMemoryTransport` is suitable for tests or local orchestration while a
real deployment could implement a custom transport backed by sockets, HTTP, or
message queues.
"""

from __future__ import annotations

import asyncio
import inspect
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from types import MappingProxyType
from typing import Any, Awaitable, Callable, Dict, Mapping, MutableMapping, Protocol

__all__ = [
    "ClientNotRegisteredError",
    "DynamicClient",
    "DynamicServer",
    "InMemoryTransport",
    "RequestContext",
    "RequestTimeoutError",
    "RouteNotFoundError",
    "RouteResponse",
]


class RouteNotFoundError(RuntimeError):
    """Raised when a server receives a request for an unknown route."""


class RequestTimeoutError(RuntimeError):
    """Raised when awaiting a response exceeds the configured timeout."""


class ClientNotRegisteredError(RuntimeError):
    """Raised when an operation references an unknown client."""


def _ensure_mapping(source: Mapping[str, Any] | None) -> Dict[str, Any]:
    if source is None:
        return {}
    if not isinstance(source, Mapping):
        raise TypeError("payload must be a mapping")
    return dict(source)


def _ensure_metadata(source: Mapping[str, Any] | None) -> Dict[str, str]:
    if source is None:
        return {}
    if not isinstance(source, Mapping):
        raise TypeError("metadata must be a mapping")
    metadata: Dict[str, str] = {}
    for key, value in source.items():
        metadata[str(key)] = str(value)
    return metadata


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str) -> str:
    identifier = str(value).strip()
    if not identifier:
        raise ValueError("identifier must not be empty")
    return identifier


def _generate_correlation_id() -> str:
    return secrets.token_hex(16)


@dataclass(slots=True, frozen=True)
class MessageEnvelope:
    """Immutable carrier for request, response, or event payloads."""

    message_type: str
    payload: Mapping[str, Any] = field(default_factory=dict)
    metadata: Mapping[str, str] = field(default_factory=dict)
    correlation_id: str = field(default_factory=_generate_correlation_id)
    timestamp: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:  # pragma: no cover - dataclass hook
        object.__setattr__(self, "message_type", _normalise_identifier(self.message_type))
        object.__setattr__(self, "payload", MappingProxyType(_ensure_mapping(self.payload)))
        object.__setattr__(self, "metadata", MappingProxyType(_ensure_metadata(self.metadata)))
        object.__setattr__(self, "timestamp", self.timestamp.astimezone(timezone.utc))


@dataclass(slots=True, frozen=True)
class ResponseEnvelope(MessageEnvelope):
    """Envelope representing a response to a request."""

    in_reply_to: str = field(default="")
    status: str = field(default="ok")

    def __post_init__(self) -> None:  # pragma: no cover - dataclass hook
        super().__post_init__()
        if not self.in_reply_to:
            raise ValueError("in_reply_to must reference a request correlation id")
        object.__setattr__(self, "status", _normalise_identifier(self.status))


@dataclass(slots=True, frozen=True)
class RouteResponse:
    """Typed structure returned from a route handler."""

    payload: Mapping[str, Any]
    metadata: Mapping[str, Any] = field(default_factory=dict)
    status: str = field(default="ok")

    def __post_init__(self) -> None:
        object.__setattr__(self, "payload", MappingProxyType(_ensure_mapping(self.payload)))
        object.__setattr__(self, "metadata", MappingProxyType(_ensure_metadata(self.metadata)))
        object.__setattr__(self, "status", _normalise_identifier(self.status))


EventHandler = Callable[[MessageEnvelope], Awaitable[None] | None]


RouteResult = RouteResponse | Mapping[str, Any]


RouteHandler = Callable[["RequestContext"], Awaitable[RouteResult] | RouteResult]


class Transport(Protocol):
    """Protocol describing the transport behaviour required by the server."""

    async def dispatch_request(
        self,
        client_id: str,
        route: str,
        envelope: MessageEnvelope,
        *,
        timeout: float | None = None,
    ) -> ResponseEnvelope:
        ...

    async def broadcast_event(self, event: MessageEnvelope) -> None:
        ...

    def register_client(self, client: "DynamicClient") -> None:
        ...

    def unregister_client(self, client_id: str) -> None:
        ...

    def register_subscription(self, client_id: str, event_type: str) -> None:
        ...

    def unregister_subscription(self, client_id: str, event_type: str) -> None:
        ...


@dataclass(slots=True)
class RequestContext:
    """Context object handed to route handlers."""

    server: "DynamicServer"
    client_id: str
    route: str
    request: MessageEnvelope

    async def broadcast(
        self,
        event_type: str,
        payload: Mapping[str, Any] | None = None,
        *,
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        """Broadcast a domain event to subscribed clients."""

        await self.server.broadcast(event_type, payload or {}, metadata=metadata)

    def respond(
        self,
        payload: Mapping[str, Any] | None = None,
        *,
        metadata: Mapping[str, Any] | None = None,
        status: str = "ok",
    ) -> RouteResponse:
        """Return a pre-built :class:`RouteResponse`."""

        return RouteResponse(payload or {}, metadata=metadata or {}, status=status)


class DynamicServer:
    """Coordinator that routes requests and publishes events."""

    def __init__(self, *, transport: Transport | None = None) -> None:
        self._handlers: Dict[str, RouteHandler] = {}
        self._transport: Transport | None = None
        if transport is not None:
            self.attach_transport(transport)

    def attach_transport(self, transport: Transport) -> None:
        self._transport = transport

    def register_route(self, route: str, handler: RouteHandler) -> None:
        route_name = _normalise_identifier(route)
        if route_name in self._handlers:
            raise ValueError(f"route '{route_name}' already registered")
        self._handlers[route_name] = handler

    async def handle_request(
        self,
        *,
        client_id: str,
        route: str,
        request: MessageEnvelope,
    ) -> ResponseEnvelope:
        handler = self._handlers.get(route)
        if handler is None:
            raise RouteNotFoundError(f"no handler registered for route '{route}'")

        context = RequestContext(server=self, client_id=client_id, route=route, request=request)
        result = handler(context)
        if inspect.isawaitable(result):
            result = await result  # type: ignore[assignment]

        if isinstance(result, RouteResponse):
            response_payload = result.payload
            response_metadata = result.metadata
            status = result.status
        else:
            response_payload = MappingProxyType(_ensure_mapping(result))
            response_metadata = MappingProxyType({})
            status = "ok"

        return ResponseEnvelope(
            message_type=f"{route}.response",
            payload=response_payload,
            metadata=response_metadata,
            in_reply_to=request.correlation_id,
            status=status,
        )

    async def broadcast(
        self,
        event_type: str,
        payload: Mapping[str, Any] | None = None,
        *,
        metadata: Mapping[str, Any] | None = None,
    ) -> None:
        if self._transport is None:
            raise RuntimeError("transport not attached to server")
        event = MessageEnvelope(
            message_type=event_type,
            payload=_ensure_mapping(payload),
            metadata=_ensure_metadata(metadata),
        )
        await self._transport.broadcast_event(event)

    async def dispatch_request(
        self,
        *,
        client_id: str,
        route: str,
        payload: Mapping[str, Any] | None = None,
        metadata: Mapping[str, Any] | None = None,
        timeout: float | None = None,
    ) -> ResponseEnvelope:
        if self._transport is None:
            raise RuntimeError("transport not attached to server")
        envelope = MessageEnvelope(
            message_type=route,
            payload=_ensure_mapping(payload),
            metadata=_ensure_metadata(metadata),
        )
        return await self._transport.dispatch_request(
            client_id, route, envelope, timeout=timeout
        )


class DynamicClient:
    """High-level client wrapper that communicates via a transport."""

    def __init__(
        self,
        client_id: str,
        transport: Transport,
        *,
        default_timeout: float | None = 10.0,
    ) -> None:
        self._client_id = _normalise_identifier(client_id)
        self._transport = transport
        self._default_timeout = default_timeout
        self._subscriptions: MutableMapping[str, set[EventHandler]] = {}
        self._error_handler: Callable[[Exception, MessageEnvelope], None] | None = None
        self._transport.register_client(self)

    @property
    def client_id(self) -> str:
        return self._client_id

    def set_error_handler(
        self,
        handler: Callable[[Exception, MessageEnvelope], None] | None,
    ) -> None:
        self._error_handler = handler

    async def send_request(
        self,
        route: str,
        payload: Mapping[str, Any] | None = None,
        *,
        metadata: Mapping[str, Any] | None = None,
        timeout: float | None = None,
    ) -> ResponseEnvelope:
        request_envelope = MessageEnvelope(
            message_type=route,
            payload=_ensure_mapping(payload),
            metadata=_ensure_metadata(metadata),
        )
        request_timeout = timeout if timeout is not None else self._default_timeout
        try:
            return await self._transport.dispatch_request(
                self._client_id, request_envelope.message_type, request_envelope, timeout=request_timeout
            )
        except asyncio.TimeoutError as exc:  # pragma: no cover - depends on runtime timing
            raise RequestTimeoutError(
                f"request to route '{route}' timed out after {request_timeout} seconds"
            ) from exc

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        event = _normalise_identifier(event_type)
        if not callable(handler):
            raise TypeError("event handler must be callable")
        handlers = self._subscriptions.setdefault(event, set())
        if not handlers:
            self._transport.register_subscription(self._client_id, event)
        handlers.add(handler)

    def unsubscribe(self, event_type: str, handler: EventHandler | None = None) -> None:
        event = _normalise_identifier(event_type)
        handlers = self._subscriptions.get(event)
        if not handlers:
            return
        if handler is None:
            handlers.clear()
        else:
            handlers.discard(handler)
        if not handlers:
            self._subscriptions.pop(event, None)
            self._transport.unregister_subscription(self._client_id, event)

    async def _deliver_event(self, envelope: MessageEnvelope) -> None:
        handlers = list(self._subscriptions.get(envelope.message_type, ()))
        if not handlers:
            return
        for handler in handlers:
            try:
                result = handler(envelope)
                if inspect.isawaitable(result):
                    await result
            except Exception as exc:  # pragma: no cover - defensive
                error_handler = self._error_handler
                if error_handler is not None:
                    error_handler(exc, envelope)

    def close(self) -> None:
        for event in list(self._subscriptions.keys()):
            self._transport.unregister_subscription(self._client_id, event)
        self._subscriptions.clear()
        self._transport.unregister_client(self._client_id)


class InMemoryTransport:
    """Simple transport that keeps communication in-process."""

    def __init__(self, server: DynamicServer | None = None) -> None:
        self._server = server
        self._clients: Dict[str, DynamicClient] = {}
        self._subscriptions: Dict[str, set[str]] = {}
        self._lock = asyncio.Lock()
        if server is not None:
            server.attach_transport(self)

    def register_client(self, client: DynamicClient) -> None:
        identifier = client.client_id
        if identifier in self._clients:
            raise ValueError(f"client '{identifier}' already registered")
        self._clients[identifier] = client

    def unregister_client(self, client_id: str) -> None:
        self._clients.pop(client_id, None)
        for subscribers in self._subscriptions.values():
            subscribers.discard(client_id)

    def register_subscription(self, client_id: str, event_type: str) -> None:
        subscribers = self._subscriptions.setdefault(event_type, set())
        subscribers.add(client_id)

    def unregister_subscription(self, client_id: str, event_type: str) -> None:
        subscribers = self._subscriptions.get(event_type)
        if not subscribers:
            return
        subscribers.discard(client_id)
        if not subscribers:
            self._subscriptions.pop(event_type, None)

    async def dispatch_request(
        self,
        client_id: str,
        route: str,
        envelope: MessageEnvelope,
        *,
        timeout: float | None = None,
    ) -> ResponseEnvelope:
        if self._server is None:
            raise RuntimeError("transport is not attached to a server")
        if client_id not in self._clients:
            raise ClientNotRegisteredError(f"client '{client_id}' is not registered")
        async with self._lock:
            coro = self._server.handle_request(client_id=client_id, route=route, request=envelope)
            if timeout is None:
                return await coro
            return await asyncio.wait_for(coro, timeout=timeout)

    async def broadcast_event(self, event: MessageEnvelope) -> None:
        subscribers = self._subscriptions.get(event.message_type)
        if not subscribers:
            return
        deliveries = [
            self._clients[client_id]._deliver_event(event)
            for client_id in tuple(subscribers)
            if client_id in self._clients
        ]
        if deliveries:
            await asyncio.gather(*deliveries)

    def attach_server(self, server: DynamicServer) -> None:
        self._server = server
        server.attach_transport(self)
