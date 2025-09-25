"""DeepSeek-V3 advisor integration for Dynamic Capital trading workflows."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json

from .grok_advisor import (
    AdvisorFeedback,
    CompletionClient,
    GrokAdvisor,
    TradeAdvisor,
)


@dataclass(slots=True)
class DeepSeekAdvisor(GrokAdvisor):
    """Specialised advisor tuned for DeepSeek-V3 responses."""

    source: str = "deepseek-v3"
    temperature: float = 0.15
    nucleus_p: float = 0.9
    max_tokens: int = 512

    def _prompt_summary(self) -> str:
        base = GrokAdvisor._prompt_summary(self)
        return (
            f"{base}\n\n"
            "Leverage DeepSeek-V3's reasoning to stress-test risk controls. "
            "Return any supporting commentary under an \"analysis\" field when applicable."
        )

    def _base_metadata(self, prompt: str) -> Dict[str, Any]:
        metadata = GrokAdvisor._base_metadata(self, prompt)
        metadata.setdefault("model", "deepseek-v3")
        return metadata


@dataclass(slots=True)
class DeepSeekAPIClient:
    """Thin wrapper around the DeepSeek OpenAI-compatible API."""

    api_key: str
    base_url: str = "https://api.deepseek.com/v1"
    model: str = "deepseek-chat"
    system_prompt: str = "You are DeepSeek-V3 assisting the Dynamic Capital trading desk."
    timeout: float = 30.0

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": temperature,
            "top_p": nucleus_p,
            "max_tokens": max_tokens,
        }
        request = Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:  # nosec B310
                body = response.read().decode("utf-8")
        except HTTPError as exc:  # pragma: no cover - network variability
            detail = ""
            if getattr(exc, "fp", None) is not None:
                try:
                    detail = exc.read().decode("utf-8", errors="ignore")
                except Exception:  # pragma: no cover - best-effort diagnostics
                    detail = ""
            raise RuntimeError(f"DeepSeek API error {exc.code}: {detail}") from exc
        except URLError as exc:  # pragma: no cover - network variability
            raise RuntimeError(f"DeepSeek API request failed: {exc.reason}") from exc

        data = json.loads(body)
        choices = data.get("choices")
        if not choices:
            raise RuntimeError("DeepSeek API returned no choices")
        message = choices[0].get("message", {})
        content = message.get("content")
        if not content:
            raise RuntimeError("DeepSeek API response missing content")
        reasoning = message.get("reasoning_content")
        if reasoning:
            content = f"<think>{reasoning}</think>\n{content}".strip()
        return content


__all__ = [
    "AdvisorFeedback",
    "CompletionClient",
    "DeepSeekAdvisor",
    "DeepSeekAPIClient",
    "TradeAdvisor",
]
