"""Image generation helpers for Dynamic Capital NFTs."""

from __future__ import annotations

from dataclasses import dataclass, field
from types import ModuleType
from typing import Any, Mapping, MutableMapping, Sequence
import importlib


def _load_requests() -> ModuleType:
    """Return the :mod:`requests` module if it is installed."""

    return importlib.import_module("requests")


def _coerce_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        if isinstance(value, bool):
            return int(value)
        return int(str(value))
    except (TypeError, ValueError):
        return None


def _coerce_str(value: Any) -> str | None:
    if isinstance(value, str):
        value = value.strip()
        if value:
            return value
    return None


@dataclass(slots=True)
class GeneratedNFTImage:
    """Result from invoking an NFT image generator."""

    url: str
    prompt: str
    mime_type: str | None = None
    seed: int | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def as_metadata(self) -> MutableMapping[str, Any]:
        """Return a serialisable payload for NFT metadata."""

        payload: MutableMapping[str, Any] = {"url": self.url, "prompt": self.prompt}
        if self.mime_type:
            payload["mime_type"] = self.mime_type
        if self.seed is not None:
            payload["seed"] = self.seed
        if self.metadata:
            payload["extra"] = dict(self.metadata)
        return payload


class NanoBananaClient:
    """Thin HTTP client for the Nano Banana AI text-to-image API."""

    DEFAULT_ENDPOINT = "https://nanobananaai.org/api/generate"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 45.0,
        session: Any | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/") if base_url else self.DEFAULT_ENDPOINT
        self.timeout = float(timeout)
        self._session = session
        self._owns_session = False
        self._request_exception: type[BaseException] = RuntimeError
        if self._session is None:
            try:
                requests_mod = _load_requests()
            except ModuleNotFoundError as exc:  # pragma: no cover - requires optional dependency
                raise RuntimeError(
                    "NanoBananaClient requires the optional 'requests' package."
                ) from exc
            self._session = requests_mod.Session()
            self._owns_session = True
            self._request_exception = getattr(requests_mod, "RequestException", RuntimeError)
        else:
            request_exception = getattr(self._session, "RequestException", None)
            if isinstance(request_exception, type) and issubclass(request_exception, BaseException):
                self._request_exception = request_exception

    def close(self) -> None:
        """Close any owned HTTP resources."""

        if self._owns_session and hasattr(self._session, "close"):
            self._session.close()

    def __enter__(self) -> "NanoBananaClient":  # pragma: no cover - exercised indirectly
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # pragma: no cover - exercised indirectly
        self.close()

    def generate_image(
        self,
        prompt: str,
        *,
        negative_prompt: str | None = None,
        aspect_ratio: str | None = None,
        seed: int | None = None,
        context: Mapping[str, Any] | None = None,
    ) -> GeneratedNFTImage:
        """Generate an image from a text ``prompt`` using Nano Banana AI."""

        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("prompt must be a non-empty string")

        payload: MutableMapping[str, Any] = {"prompt": prompt.strip()}
        if negative_prompt:
            payload["negative_prompt"] = negative_prompt
        if aspect_ratio:
            payload["aspect_ratio"] = aspect_ratio
        if seed is not None:
            payload["seed"] = seed
        if context:
            payload["context"] = context

        headers: MutableMapping[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = self._session.post(
                self.base_url,
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )
        except self._request_exception as exc:  # pragma: no cover - requires real HTTP failures
            raise RuntimeError("Failed to reach Nano Banana AI API") from exc

        try:
            response.raise_for_status()
        except Exception as exc:  # pragma: no cover - requires HTTP failure response
            raise RuntimeError("Nano Banana AI API returned an error response") from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise RuntimeError("Nano Banana AI API returned invalid JSON") from exc

        image_payload = self._find_image_payload(data)
        if image_payload is None:
            raise RuntimeError("Nano Banana AI API response did not contain an image URL")

        image_url = self._extract_image_url(image_payload)
        if image_url is None:
            raise RuntimeError("Nano Banana AI API response did not include a valid image URL")

        mime_type = _coerce_str(
            image_payload.get("mime_type")
            or image_payload.get("content_type")
            or image_payload.get("type")
        )
        image_seed = _coerce_int(
            image_payload.get("seed")
            or (data.get("seed") if isinstance(data, Mapping) else None)
            or seed
        )

        metadata: MutableMapping[str, Any] = {}
        for key, value in image_payload.items():
            if key in {"url", "image_url", "download_url", "mime_type", "content_type", "type", "seed"}:
                continue
            metadata[key] = value
        if isinstance(data, Mapping):
            for key in ("id", "request_id", "seed"):
                if key in data and key not in metadata:
                    metadata[key] = data[key]

        return GeneratedNFTImage(
            url=image_url,
            prompt=payload["prompt"],
            mime_type=mime_type,
            seed=image_seed,
            metadata=metadata,
        )

    @classmethod
    def _find_image_payload(cls, data: Any) -> Mapping[str, Any] | None:
        if isinstance(data, Mapping):
            if cls._extract_image_url(data):
                return data
            for key in ("data", "images", "results", "output"):
                if key in data:
                    nested = cls._find_image_payload(data[key])
                    if nested is not None:
                        return nested
            for value in data.values():
                nested = cls._find_image_payload(value)
                if nested is not None:
                    return nested
        elif isinstance(data, Sequence) and not isinstance(data, (str, bytes, bytearray)):
            for item in data:
                nested = cls._find_image_payload(item)
                if nested is not None:
                    return nested
        return None

    @staticmethod
    def _extract_image_url(payload: Mapping[str, Any]) -> str | None:
        for key in ("image_url", "url", "download_url"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        images = payload.get("images")
        if isinstance(images, Sequence) and not isinstance(images, (str, bytes, bytearray)):
            for item in images:
                if isinstance(item, str) and item.strip():
                    return item.strip()
                if isinstance(item, Mapping):
                    nested = NanoBananaClient._extract_image_url(item)
                    if nested:
                        return nested
        return None
