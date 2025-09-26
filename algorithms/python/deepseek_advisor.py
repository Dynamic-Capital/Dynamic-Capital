"""Utilities for requesting DeepSeek-backed advice on trading decisions."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional

from .grok_advisor import AdvisorFeedback, GrokAdvisor

DEFAULT_BASE_URL = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-chat"
API_KEY_ENV = "DEEPSEEK_API_KEY"
BASE_URL_ENV = "DEEPSEEK_API_BASE_URL"
MODEL_ENV = "DEEPSEEK_MODEL"
TIMEOUT_ENV = "DEEPSEEK_TIMEOUT"
TEMPERATURE_ENV = "DEEPSEEK_TEMPERATURE"
TOP_P_ENV = "DEEPSEEK_TOP_P"
MAX_TOKENS_ENV = "DEEPSEEK_MAX_TOKENS"

_RequestHandler = Callable[[str, bytes, Dict[str, str], float], tuple[int, str]]


@dataclass(slots=True)
class DeepSeekClient:
    """Completion client that talks to DeepSeek's OpenAI-compatible API."""

    api_key: str
    base_url: str = DEFAULT_BASE_URL
    model: str = DEFAULT_MODEL
    timeout: float = 30.0
    _request_handler: _RequestHandler | None = None

    def __post_init__(self) -> None:
        if self._request_handler is None:
            self._request_handler = self._perform_request

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        if not prompt:
            raise ValueError("prompt must not be empty")
        handler = self._request_handler
        if handler is None:  # pragma: no cover - defensive fallback
            raise RuntimeError("DeepSeek client is not initialised correctly")
        url = self._compose_url()
        payload = json.dumps(
            {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                "temperature": float(temperature),
                "top_p": float(nucleus_p),
                "max_tokens": int(max_tokens),
            }
        ).encode("utf-8")
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        status, body = handler(url, payload, headers, self.timeout)
        if status >= 400:
            raise RuntimeError(f"DeepSeek API error {status}: {body}")
        try:
            data = json.loads(body)
        except json.JSONDecodeError as exc:  # pragma: no cover - unexpected payloads
            raise RuntimeError("Failed to decode DeepSeek response") from exc
        return self._extract_message(data)

    def _compose_url(self) -> str:
        return f"{self.base_url.rstrip('/')}/chat/completions"

    @staticmethod
    def _perform_request(
        url: str,
        payload: bytes,
        headers: Dict[str, str],
        timeout: float,
    ) -> tuple[int, str]:
        request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 - controlled URL
                body = response.read().decode("utf-8", "replace")
                status = getattr(response, "status", 200)
                return status, body
        except urllib.error.HTTPError as exc:  # pragma: no cover - propagated to caller
            body = exc.read().decode("utf-8", "replace")
            return exc.code, body

    @staticmethod
    def _extract_message(payload: Dict[str, Any]) -> str:
        choices = payload.get("choices")
        if not isinstance(choices, list) or not choices:
            raise RuntimeError("DeepSeek response did not include any choices")
        message = choices[0]
        if isinstance(message, dict):
            if "message" in message and isinstance(message["message"], dict):
                content = message["message"].get("content")
                if content:
                    return str(content)
            if "text" in message and message["text"]:
                return str(message["text"])
        raise RuntimeError("DeepSeek response was missing message content")

    @classmethod
    def from_environment(cls) -> "DeepSeekClient":
        api_key = os.getenv(API_KEY_ENV)
        if not api_key:
            raise RuntimeError("DEEPSEEK_API_KEY must be set to use the DeepSeek advisor")
        base_url = os.getenv(BASE_URL_ENV) or DEFAULT_BASE_URL
        model = os.getenv(MODEL_ENV) or DEFAULT_MODEL
        timeout = _read_float(os.getenv(TIMEOUT_ENV), default=30.0)
        return cls(api_key=api_key, base_url=base_url, model=model, timeout=timeout)


class DeepSeekAdvisor(GrokAdvisor):
    """High-level adapter that surfaces DeepSeek risk adjustments."""

    source_name = "deepseek"

    def review(self, *args: Any, **kwargs: Any) -> Optional[AdvisorFeedback]:
        feedback = super().review(*args, **kwargs)
        if feedback is not None:
            feedback.metadata["source"] = self.source_name
        return feedback


def advisor_from_environment(
    *,
    temperature: Optional[float] = None,
    nucleus_p: Optional[float] = None,
    max_tokens: Optional[int] = None,
) -> DeepSeekAdvisor:
    client = DeepSeekClient.from_environment()
    resolved_temperature = temperature if temperature is not None else _read_float(
        os.getenv(TEMPERATURE_ENV),
        default=0.25,
    )
    resolved_top_p = nucleus_p if nucleus_p is not None else _read_float(
        os.getenv(TOP_P_ENV),
        default=0.9,
    )
    resolved_tokens = max_tokens if max_tokens is not None else _read_int(
        os.getenv(MAX_TOKENS_ENV),
        default=256,
    )
    return DeepSeekAdvisor(
        client=client,
        temperature=resolved_temperature,
        nucleus_p=resolved_top_p,
        max_tokens=resolved_tokens,
    )


def _read_float(value: Optional[str], *, default: float) -> float:
    if value is None:
        return float(default)
    try:
        return float(value)
    except (TypeError, ValueError):  # pragma: no cover - defensive casting
        return float(default)


def _read_int(value: Optional[str], *, default: int) -> int:
    if value is None:
        return int(default)
    try:
        return int(float(value))
    except (TypeError, ValueError):  # pragma: no cover - defensive casting
        return int(default)


__all__ = [
    "API_KEY_ENV",
    "BASE_URL_ENV",
    "DeepSeekAdvisor",
    "DeepSeekClient",
    "DEFAULT_BASE_URL",
    "DEFAULT_MODEL",
    "MODEL_ENV",
    "TEMPERATURE_ENV",
    "TIMEOUT_ENV",
    "TOP_P_ENV",
    "advisor_from_environment",
]
