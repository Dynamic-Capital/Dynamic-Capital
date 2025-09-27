"""A minimal subset of Flask used for testing the TradingView webhook."""
from __future__ import annotations

from dataclasses import dataclass
import contextvars
from typing import Any, Callable, Dict, Iterable, Mapping, MutableMapping, Optional, Tuple


class Headers(MutableMapping[str, str]):
    """A case-insensitive mapping for HTTP headers."""

    def __init__(self, data: Optional[Mapping[str, str]] = None) -> None:
        self._store: Dict[str, Tuple[str, str]] = {}
        if data:
            for key, value in data.items():
                self[key] = value

    def __setitem__(self, key: str, value: str) -> None:
        self._store[key.lower()] = (key, value)

    def __getitem__(self, key: str) -> str:
        return self._store[key.lower()][1]

    def __delitem__(self, key: str) -> None:
        del self._store[key.lower()]

    def __iter__(self) -> Iterable[str]:
        for original_key, _ in self._store.values():
            yield original_key

    def __len__(self) -> int:
        return len(self._store)

    def get(self, key: str, default: Optional[str] = None) -> Optional[str]:
        try:
            return self[key]
        except KeyError:
            return default

    def items(self) -> Iterable[Tuple[str, str]]:  # type: ignore[override]
        for original_key, value in self._store.values():
            yield original_key, value


@dataclass
class Response:
    """Simple response container mimicking Flask's response object."""

    data: Any
    status_code: int = 200
    headers: Headers | None = None

    def __post_init__(self) -> None:
        if self.headers is None:
            self.headers = Headers()
        self._json = self.data

    def get_json(self) -> Any:
        return self._json


class Request:
    """Represents an incoming request payload."""

    def __init__(self, json_data: Any = None, headers: Optional[Mapping[str, str]] = None) -> None:
        self._json = json_data
        self.headers = Headers(headers or {})

    def get_json(self, silent: bool = False) -> Any:
        if self._json is None and not silent:
            raise ValueError("No JSON payload provided")
        return self._json


_request_var: contextvars.ContextVar[Request] = contextvars.ContextVar("request")


class _RequestProxy:
    """Context-local proxy that exposes the current request."""

    def _get_current_request(self) -> Request:
        request = _request_var.get(None)  # type: ignore[arg-type]
        if request is None:
            raise RuntimeError("Request context is not available")
        return request

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get_current_request(), name)


request = _RequestProxy()


def jsonify(*args: Any, **kwargs: Any) -> Response:
    """Return a JSON response constructed from the provided data."""

    if args and kwargs:
        raise TypeError("jsonify accepts either positional or keyword arguments, not both")

    if len(args) == 1:
        payload = args[0]
    elif args:
        payload = list(args)
    else:
        payload = kwargs

    return Response(payload)


class FlaskClient:
    """A minimal test client implementing the subset used in tests."""

    def __init__(self, app: "Flask") -> None:
        self._app = app

    def post(
        self,
        path: str,
        *,
        json: Any = None,
        headers: Optional[Mapping[str, str]] = None,
    ) -> Response:
        return self._app._handle_request(path, "POST", Request(json_data=json, headers=headers))


ViewFunc = Callable[[], Any]


class Flask:
    """A very small HTTP routing container compatible with the tests."""

    def __init__(self, import_name: str) -> None:
        self.import_name = import_name
        self.testing = False
        self._routes: Dict[str, Dict[str, ViewFunc]] = {}

    def route(self, rule: str, methods: Optional[Iterable[str]] = None) -> Callable[[ViewFunc], ViewFunc]:
        methods = tuple(method.upper() for method in (methods or ["GET"]))

        def decorator(func: ViewFunc) -> ViewFunc:
            method_map = self._routes.setdefault(rule, {})
            for method in methods:
                method_map[method] = func
            return func

        return decorator

    def test_client(self) -> FlaskClient:
        return FlaskClient(self)

    # Internal API -----------------------------------------------------------------
    def _handle_request(self, path: str, method: str, request_obj: Request) -> Response:
        method_map = self._routes.get(path, {})
        view = method_map.get(method.upper())
        if view is None:
            return Response({"error": "Not Found"}, status_code=404)

        token = _request_var.set(request_obj)
        try:
            result = view()
        finally:
            _request_var.reset(token)

        return self._normalize_response(result)

    @staticmethod
    def _normalize_response(result: Any) -> Response:
        if isinstance(result, Response):
            return result

        if isinstance(result, tuple):
            body, status = result
            response = body if isinstance(body, Response) else jsonify(body)
            response.status_code = status
            return response

        return jsonify(result)


__all__ = ["Flask", "FlaskClient", "Request", "Response", "jsonify", "request"]
