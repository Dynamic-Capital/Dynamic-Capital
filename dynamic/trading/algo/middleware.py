"""Dynamic middleware orchestration helpers for request pipelines.

This module offers a lightweight middleware execution engine inspired by the
patterns used in FastAPI/Express.  It is intentionally framework agnostic so
it can be embedded in research notebooks, Supabase edge functions, or other
Python services that need structured request pre-processing.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Iterable, List, Mapping, Optional

__all__ = [
    "MiddlewareContext",
    "MiddlewareExecutionError",
    "MiddlewareHandler",
    "DynamicMiddlewareAlgo",
]

MiddlewareNext = Callable[[], Any]
MiddlewareHandler = Callable[["MiddlewareContext", MiddlewareNext], Any]
MiddlewareRegistration = MiddlewareHandler | tuple[MiddlewareHandler, Mapping[str, Any]]


@dataclass(slots=True)
class MiddlewareContext:
    """Context object shared across middleware handlers."""

    payload: Any
    state: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    response: Any = None
    halted: bool = False
    logs: List[str] = field(default_factory=list)
    error: Exception | None = None

    def log(self, message: str) -> None:
        """Append ``message`` to the execution log."""

        self.logs.append(str(message))

    def set_state(self, key: str, value: Any) -> None:
        """Store ``value`` under ``key`` in the shared state."""

        self.state[key] = value

    def get_state(self, key: str, default: Any = None) -> Any:
        """Return the value stored under ``key`` in the shared state."""

        return self.state.get(key, default)

    def halt(self, response: Any) -> Any:
        """Stop pipeline execution and set the final ``response``."""

        self.halted = True
        self.response = response
        return response


class MiddlewareExecutionError(RuntimeError):
    """Raised when a middleware handler fails during execution."""

    def __init__(self, name: str, original: Exception) -> None:
        message = f"Middleware '{name}' failed: {original}"
        super().__init__(message)
        self.name = name
        self.original = original


@dataclass(order=True)
class _MiddlewareEntry:
    priority: int
    order: int
    name: str
    handler: MiddlewareHandler = field(compare=False)


class DynamicMiddlewareAlgo:
    """Composable middleware pipeline with priority-aware execution."""

    def __init__(
        self, handlers: Optional[Iterable[MiddlewareRegistration]] = None
    ) -> None:
        self._entries: List[_MiddlewareEntry] = []
        self._registry: Dict[str, _MiddlewareEntry] = {}
        self._order_counter = 0

        if handlers:
            for registration in handlers:
                self._register_from_spec(registration)

    def _register_from_spec(self, registration: MiddlewareRegistration) -> None:
        """Normalize different registration shapes into ``register`` calls."""

        if isinstance(registration, tuple):
            if len(registration) != 2:
                raise ValueError(
                    "Tuple registrations must be ``(handler, options)``"
                )

            handler, options = registration

            if not isinstance(options, Mapping):  # pragma: no cover - defensive
                raise TypeError("Handler options must be a mapping of keyword args")

            self.register(handler, **dict(options))
            return

        self.register(registration)

    # ---------------------------------------------------------------- register
    def register(
        self,
        handler: MiddlewareHandler,
        *,
        name: Optional[str] = None,
        priority: int = 0,
        replace: bool = False,
    ) -> None:
        """Register ``handler`` with optional ``priority`` and ``name``."""

        if not callable(handler):  # pragma: no cover - defensive guardrail
            raise TypeError("handler must be callable")

        resolved_name = name or getattr(handler, "__name__", None) or "handler"

        if resolved_name in self._registry:
            if replace:
                self.unregister(resolved_name)
            elif name is None:
                resolved_name = self._generate_unique_name(resolved_name)
            else:
                raise ValueError(f"Middleware '{resolved_name}' already registered")

        entry = _MiddlewareEntry(
            priority=-int(priority),  # negative for ascending order sorting
            order=self._order_counter,
            name=resolved_name,
            handler=handler,
        )
        self._order_counter += 1

        self._entries.append(entry)
        self._registry[resolved_name] = entry
        self._entries.sort()

    def unregister(self, name: str) -> bool:
        """Remove the middleware registered under ``name``."""

        entry = self._registry.pop(name, None)
        if entry is None:
            return False

        self._entries.remove(entry)
        return True

    # --------------------------------------------------------------- introspect
    def handlers(self) -> List[str]:
        """Return the registered middleware names in execution order."""

        return [entry.name for entry in self._entries]

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._entries)

    # ----------------------------------------------------------------- execution
    def execute(
        self,
        payload: Any,
        *,
        state: Optional[Mapping[str, Any]] = None,
        metadata: Optional[Mapping[str, Any]] = None,
        raise_errors: bool = False,
    ) -> MiddlewareContext:
        """Run the middleware pipeline for ``payload`` and return the context."""

        context = MiddlewareContext(
            payload=payload,
            state=dict(state or {}),
            metadata=dict(metadata or {}),
        )

        try:
            result = self._run(context, 0)
        except MiddlewareExecutionError as exc:
            if raise_errors:
                raise
            context.error = exc.original
            context.state.setdefault("errors", []).append(
                {"name": exc.name, "error": str(exc.original)}
            )
            context.log(f"{exc.name} failed: {exc.original}")
            context.halted = True
            if context.response is None:
                context.response = context.payload
            return context

        if context.response is None:
            context.response = result

        return context

    def _run(self, context: MiddlewareContext, index: int) -> Any:
        if context.halted:
            return context.response

        if index >= len(self._entries):
            return context.response if context.response is not None else context.payload

        entry = self._entries[index]

        def next_handler() -> Any:
            return self._run(context, index + 1)

        try:
            return entry.handler(context, next_handler)
        except Exception as exc:  # pragma: no cover - error path covered via execute
            raise MiddlewareExecutionError(entry.name, exc) from exc

    def _generate_unique_name(self, base_name: str) -> str:
        sanitized = base_name.strip() or "handler"
        counter = 2
        candidate = f"{sanitized}_{counter}"

        while candidate in self._registry:
            counter += 1
            candidate = f"{sanitized}_{counter}"

        return candidate
