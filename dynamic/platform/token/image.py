"""Image generation helpers for Dynamic Capital NFTs."""

from __future__ import annotations

import importlib
import os
from dataclasses import dataclass, field
from types import MappingProxyType, ModuleType
from typing import Any, Mapping, MutableMapping, Sequence

__all__ = [
    "GeneratedNFTImage",
    "NanoBananaClient",
    "NanoBananaClientError",
    "NanoBananaImageGenerator",
    "create_nanobanana_generator_from_env",
]


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


class NanoBananaClientError(RuntimeError):
    """Raised when the Nano Banana API cannot serve a request."""


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
        self._request_exceptions: tuple[type[BaseException], ...] = (RuntimeError,)
        if self._session is None:
            try:
                requests_mod = _load_requests()
            except ModuleNotFoundError as exc:  # pragma: no cover - requires optional dependency
                raise NanoBananaClientError(
                    "NanoBananaClient requires the optional 'requests' package."
                ) from exc
            self._session = requests_mod.Session()
            self._owns_session = True
            request_exception = getattr(requests_mod, "RequestException", RuntimeError)
            if isinstance(request_exception, type) and issubclass(
                request_exception, BaseException
            ):
                self._request_exceptions = (request_exception,)
        else:
            request_exception = getattr(self._session, "RequestException", None)
            if isinstance(request_exception, type) and issubclass(request_exception, BaseException):
                self._request_exceptions = (request_exception,)

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

        negative_prompt_value = _coerce_str(negative_prompt)
        if negative_prompt_value:
            payload["negative_prompt"] = negative_prompt_value

        aspect_ratio_value = _coerce_str(aspect_ratio)
        if aspect_ratio_value:
            payload["aspect_ratio"] = aspect_ratio_value

        seed_value = _coerce_int(seed)
        if seed_value is not None:
            payload["seed"] = seed_value

        if context is not None:
            if not isinstance(context, Mapping):
                raise TypeError("context must be a mapping")
            payload["context"] = dict(context)

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
        except self._request_exceptions as exc:  # pragma: no cover - requires real HTTP failures
            raise NanoBananaClientError("Failed to reach Nano Banana AI API") from exc
        except Exception as exc:  # pragma: no cover - defensive fallback
            raise NanoBananaClientError("Nano Banana API request failed unexpectedly") from exc

        try:
            response.raise_for_status()
        except self._request_exceptions as exc:  # pragma: no cover - requires HTTP failure response
            raise NanoBananaClientError("Nano Banana AI API returned an error response") from exc
        except Exception as exc:  # pragma: no cover - defensive fallback
            raise NanoBananaClientError("Nano Banana AI API returned an unexpected error") from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise NanoBananaClientError("Nano Banana AI API returned invalid JSON") from exc

        image_payload = self._find_image_payload(data)
        if image_payload is None:
            raise NanoBananaClientError(
                "Nano Banana AI API response did not contain an image URL"
            )

        image_url = self._extract_image_url(image_payload)
        if image_url is None:
            raise NanoBananaClientError(
                "Nano Banana AI API response did not include a valid image URL"
            )

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


class NanoBananaImageGenerator:
    """Adapter that turns :class:`NanoBananaClient` into an image generator."""

    def __init__(
        self,
        *,
        client: NanoBananaClient | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
        prompt_prefix: str | None = None,
        negative_prompt: str | None = None,
        aspect_ratio: str | None = None,
        seed: int | None = None,
        context_defaults: Mapping[str, Any] | None = None,
    ) -> None:
        if client is not None and api_key is not None:
            raise ValueError("Provide either an existing client or API credentials, not both")

        owns_client = client is None
        if client is None:
            base_url_value = _coerce_str(base_url)
            if base_url_value:
                base_url_value = base_url_value.rstrip("/")
            client = NanoBananaClient(api_key=api_key, base_url=base_url_value)

        self._client = client
        self._owns_client = owns_client
        prompt_prefix_value = _coerce_str(prompt_prefix)
        self._prompt_prefix = prompt_prefix_value or ""
        self._negative_prompt = _coerce_str(negative_prompt)
        self._aspect_ratio = _coerce_str(aspect_ratio)
        self._seed = _coerce_int(seed)

        if context_defaults is not None and not isinstance(context_defaults, Mapping):
            raise TypeError("context_defaults must be a mapping")

        defaults_dict = None
        if context_defaults:
            defaults_dict = MappingProxyType(dict(context_defaults))
        self._context_defaults: Mapping[str, Any] | None = defaults_dict

    def generate(
        self,
        prompt: str,
        *,
        context: Mapping[str, Any] | None = None,
    ) -> GeneratedNFTImage:
        if not isinstance(prompt, str) or not prompt.strip():
            raise ValueError("prompt must be a non-empty string")

        resolved_prompt = prompt.strip()
        if self._prompt_prefix:
            resolved_prompt = f"{self._prompt_prefix} {resolved_prompt}".strip()

        base_context = self._context_defaults
        merged_context: Mapping[str, Any] | MutableMapping[str, Any] | None
        if context is not None:
            if not isinstance(context, Mapping):
                raise TypeError("context must be a mapping")
            context_payload = dict(context)
            if base_context:
                merged_context = {**base_context, **context_payload}
            else:
                merged_context = context_payload
        else:
            merged_context = base_context

        return self._client.generate_image(
            resolved_prompt,
            negative_prompt=self._negative_prompt,
            aspect_ratio=self._aspect_ratio,
            seed=self._seed,
            context=merged_context,
        )

    def close(self) -> None:
        """Close the underlying client if this generator owns it."""

        if self._owns_client:
            self._client.close()

    def __enter__(self) -> "NanoBananaImageGenerator":  # pragma: no cover - convenience API
        return self

    def __exit__(self, exc_type, exc, tb) -> None:  # pragma: no cover - convenience API
        self.close()


def create_nanobanana_generator_from_env(
    *,
    env: Mapping[str, str] | None = None,
    context_defaults: Mapping[str, Any] | None = None,
) -> NanoBananaImageGenerator | None:
    """Create a :class:`NanoBananaImageGenerator` if API credentials are present."""

    environment = env or os.environ
    api_key = _coerce_str(environment.get("NANOBANANA_API_KEY"))
    if not api_key:
        return None

    base_url = _coerce_str(environment.get("NANOBANANA_BASE_URL"))
    if base_url:
        base_url = base_url.rstrip("/")
    prompt_prefix = _coerce_str(environment.get("NANOBANANA_PROMPT_PREFIX"))
    negative_prompt = _coerce_str(environment.get("NANOBANANA_NEGATIVE_PROMPT"))
    aspect_ratio = _coerce_str(environment.get("NANOBANANA_ASPECT_RATIO"))
    seed = _coerce_int(environment.get("NANOBANANA_SEED"))

    try:
        return NanoBananaImageGenerator(
            api_key=api_key,
            base_url=base_url,
            prompt_prefix=prompt_prefix,
            negative_prompt=negative_prompt,
            aspect_ratio=aspect_ratio,
            seed=seed,
            context_defaults=context_defaults,
        )
    except NanoBananaClientError:
        # ``NanoBananaClient`` raises ``NanoBananaClientError`` when the optional
        # ``requests`` dependency is missing. Treat this as "image generation
        # unavailable" so the caller can continue minting NFTs without artwork.
        return None
