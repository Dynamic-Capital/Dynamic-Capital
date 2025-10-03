"""HTTP client for streaming trading telemetry to collection APIs."""

from __future__ import annotations

import logging
import os
import time
from dataclasses import asdict, is_dataclass
from datetime import date, datetime, timezone
from typing import Any, Callable, Mapping, MutableMapping

logger = logging.getLogger(__name__)

__all__ = [
    "DataCollectionAPI",
    "bootstrap_data_collection_api",
    "serialise_for_collection",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def serialise_for_collection(value: Any) -> Any:
    """Convert arbitrary payloads into JSON-friendly structures."""

    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat()
    if isinstance(value, date):
        dt = datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
        return dt.isoformat()
    if is_dataclass(value):
        try:
            return serialise_for_collection(asdict(value))
        except Exception:  # pragma: no cover - defensive
            return str(value)
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        try:
            mapping = to_dict()
        except Exception:  # pragma: no cover - user provided
            mapping = None
        if isinstance(mapping, Mapping):
            return {str(key): serialise_for_collection(val) for key, val in mapping.items()}
    as_dict = getattr(value, "as_dict", None)
    if callable(as_dict):
        try:
            mapping = as_dict()
        except Exception:  # pragma: no cover - user provided
            mapping = None
        if isinstance(mapping, Mapping):
            return {str(key): serialise_for_collection(val) for key, val in mapping.items()}
    if isinstance(value, Mapping):
        return {str(key): serialise_for_collection(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [serialise_for_collection(item) for item in value]
    if hasattr(value, "__dict__"):
        return {
            str(key): serialise_for_collection(val)
            for key, val in vars(value).items()
            if not key.startswith("_")
        }
    return str(value)


class DataCollectionAPI:
    """Minimal HTTP client that posts trade telemetry to collection services."""

    def __init__(
        self,
        base_url: str,
        *,
        api_key: str | None = None,
        client_id: str | None = None,
        dataset: str | None = None,
        timeout: float = 10.0,
        trade_endpoint: str = "/trades",
        telemetry_endpoint: str = "/telemetry",
        session: Any | None = None,
        max_attempts: int = 1,
        retry_backoff: float = 0.0,
    ) -> None:
        base = str(base_url).strip()
        if not base:
            raise ValueError("base_url must not be empty")
        self.base_url = base.rstrip("/")
        self.api_key = api_key
        self.client_id = client_id
        self.dataset = dataset
        self.timeout = float(timeout)
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")
        self.trade_endpoint = self._normalise_endpoint(trade_endpoint)
        self.telemetry_endpoint = self._normalise_endpoint(telemetry_endpoint)
        self.logger = logging.getLogger(self.__class__.__name__)

        attempts = int(max_attempts)
        if attempts < 1:
            raise ValueError("max_attempts must be at least 1")
        self.max_attempts = attempts

        self.retry_backoff = float(retry_backoff)
        if self.retry_backoff < 0:
            raise ValueError("retry_backoff cannot be negative")

        self._sleep: Callable[[float], None] = time.sleep

        if session is None:
            self._session = self._build_session()
            self._owns_session = True
        else:
            self._session = session
            self._owns_session = False

    def close(self) -> None:
        if self._owns_session and hasattr(self._session, "close"):
            try:
                self._session.close()
            except Exception:  # pragma: no cover - defensive logging
                self.logger.debug("Failed to close data collection session", exc_info=True)

    def record_trade(self, payload: Any) -> MutableMapping[str, Any]:
        body = self._prepare_payload(payload)
        body.setdefault("captured_at", _utcnow().isoformat())
        if self.dataset:
            body.setdefault("dataset", self.dataset)
        return self._request("POST", self.trade_endpoint, body)

    def record_telemetry(self, payload: Any) -> MutableMapping[str, Any]:
        body = self._prepare_payload(payload)
        body.setdefault("captured_at", _utcnow().isoformat())
        if self.dataset:
            body.setdefault("dataset", self.dataset)
        return self._request("POST", self.telemetry_endpoint, body)

    def record_event(self, endpoint: str, payload: Any) -> MutableMapping[str, Any]:
        body = self._prepare_payload(payload)
        body.setdefault("captured_at", _utcnow().isoformat())
        if self.dataset:
            body.setdefault("dataset", self.dataset)
        target = self._normalise_endpoint(endpoint)
        return self._request("POST", target, body)

    def _prepare_payload(self, payload: Any) -> MutableMapping[str, Any]:
        serialised = serialise_for_collection(payload)
        if isinstance(serialised, Mapping):
            return dict(serialised)
        if serialised is None:
            return {}
        return {"value": serialised}

    def _normalise_endpoint(self, endpoint: str) -> str:
        cleaned = str(endpoint).strip() or "/"
        if not cleaned.startswith("/"):
            cleaned = f"/{cleaned}"
        return cleaned

    def _build_url(self, endpoint: str) -> str:
        return f"{self.base_url}{self._normalise_endpoint(endpoint)}"

    def _build_session(self) -> Any:
        try:
            import requests  # type: ignore
        except Exception as exc:  # pragma: no cover - optional dependency
            raise RuntimeError(
                "DataCollectionAPI requires the 'requests' package when a custom session is not supplied"
            ) from exc
        return requests.Session()

    def _should_retry_response(self, response: Any) -> bool:
        status = getattr(response, "status_code", 0)
        if status in {408, 409, 425, 429}:
            return True
        return 500 <= status < 600

    def _request(self, method: str, endpoint: str, payload: Mapping[str, Any]) -> MutableMapping[str, Any]:
        url = self._build_url(endpoint)
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.client_id:
            headers["X-Client-Id"] = self.client_id

        response: Any | None = None
        last_error: Exception | None = None
        delay = self.retry_backoff

        for attempt in range(1, self.max_attempts + 1):
            try:
                response = self._session.request(
                    method.upper(),
                    url,
                    json=dict(payload),
                    headers=headers,
                    timeout=self.timeout,
                )
            except Exception as exc:  # pragma: no cover - network variability
                last_error = exc
                self.logger.warning(
                    "Data collection request to %s failed on attempt %s/%s: %s",
                    url,
                    attempt,
                    self.max_attempts,
                    exc,
                )
            else:
                if response.ok or not self._should_retry_response(response) or attempt == self.max_attempts:
                    break
                self.logger.warning(
                    "Data collection request to %s returned HTTP %s; retrying (%s/%s)",
                    url,
                    getattr(response, "status_code", "unknown"),
                    attempt,
                    self.max_attempts,
                )
            if attempt < self.max_attempts and delay > 0:
                try:
                    self._sleep(delay)
                except Exception:  # pragma: no cover - defensive sleep hook
                    pass
                delay *= 2

        if response is None:
            error = last_error or RuntimeError("request_failed")
            self.logger.error("Data collection request to %s failed: %s", url, error)
            return {
                "status": "error",
                "code": 0,
                "message": f"request_failed: {error}",
                "error": str(error),
            }

        data: Any
        try:
            data = response.json()
        except Exception:  # pragma: no cover - non JSON payloads
            data = {"raw": getattr(response, "text", "")}

        result: MutableMapping[str, Any]
        if isinstance(data, Mapping):
            result = dict(data)
        else:
            result = {"raw": data}

        status_code = getattr(response, "status_code", 0)
        result.setdefault("http_status", status_code)
        if response.ok:
            result.setdefault("status", "accepted")
        else:
            result.setdefault("status", "error")
            result.setdefault("message", getattr(response, "reason", "HTTP error"))
        return result

    def __del__(self) -> None:  # pragma: no cover - non-deterministic GC
        try:
            self.close()
        except Exception:
            pass


def bootstrap_data_collection_api(
    *, env: Mapping[str, str] | None = None
) -> DataCollectionAPI | None:
    """Initialise :class:`DataCollectionAPI` from environment variables."""

    environ = env or os.environ
    base_url = environ.get("DATA_COLLECTION_API_URL") or environ.get("TRADE_DATA_API_URL")
    if not base_url:
        return None

    kwargs: dict[str, Any] = {}
    api_key = environ.get("DATA_COLLECTION_API_KEY") or environ.get("TRADE_DATA_API_KEY")
    if api_key:
        kwargs["api_key"] = api_key
    client_id = environ.get("DATA_COLLECTION_CLIENT_ID") or environ.get("TRADE_DATA_CLIENT_ID")
    if client_id:
        kwargs["client_id"] = client_id
    dataset = environ.get("DATA_COLLECTION_DATASET") or environ.get("TRADE_DATA_DATASET")
    if dataset:
        kwargs["dataset"] = dataset
    trade_endpoint = environ.get("DATA_COLLECTION_TRADE_ENDPOINT")
    if trade_endpoint:
        kwargs["trade_endpoint"] = trade_endpoint
    telemetry_endpoint = environ.get("DATA_COLLECTION_TELEMETRY_ENDPOINT")
    if telemetry_endpoint:
        kwargs["telemetry_endpoint"] = telemetry_endpoint

    max_attempts_value = environ.get("DATA_COLLECTION_MAX_ATTEMPTS") or environ.get("TRADE_DATA_MAX_ATTEMPTS")
    if max_attempts_value:
        try:
            attempts = int(max_attempts_value)
        except ValueError:
            logger.warning(
                "Invalid data collection max attempts '%s'; using default",
                max_attempts_value,
            )
        else:
            if attempts > 0:
                kwargs["max_attempts"] = attempts

    retry_backoff_value = environ.get("DATA_COLLECTION_RETRY_BACKOFF") or environ.get("TRADE_DATA_RETRY_BACKOFF")
    if retry_backoff_value:
        try:
            retry_backoff = float(retry_backoff_value)
        except ValueError:
            logger.warning(
                "Invalid data collection retry backoff '%s'; using default",
                retry_backoff_value,
            )
        else:
            if retry_backoff >= 0:
                kwargs["retry_backoff"] = retry_backoff

    timeout_value = environ.get("DATA_COLLECTION_TIMEOUT") or environ.get("TRADE_DATA_TIMEOUT")
    if timeout_value:
        try:
            timeout = float(timeout_value)
        except ValueError:
            logger.warning("Invalid data collection timeout '%s'; using default", timeout_value)
        else:
            if timeout > 0:
                kwargs["timeout"] = timeout

    try:
        collector = DataCollectionAPI(base_url, **kwargs)
    except Exception as exc:  # pragma: no cover - dependency variability
        logger.error("Failed to initialise DataCollectionAPI: %s", exc)
        return None

    logger.info("Using DataCollectionAPI at %s", collector.base_url)
    return collector
