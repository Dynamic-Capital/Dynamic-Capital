"""Integration helpers for routing reasoning through the Kimi-K2 API."""

from __future__ import annotations
from dataclasses import dataclass, field
import json
from typing import Any, Dict, Mapping, MutableMapping, Sequence

from .dolphin_adapter import LLMIntegrationError


@dataclass(slots=True)
class KimiK2Config:
    """Configuration describing how to communicate with a Kimi-K2 endpoint."""

    base_url: str = "https://api.moonshot.cn/v1"
    path: str = "/chat/completions"
    model: str = "kimi-k2-chat"
    api_key: str | None = None
    temperature: float | None = 0.7
    top_p: float | None = 0.9
    max_output_tokens: int | None = 512
    extra_body: MutableMapping[str, Any] = field(default_factory=dict)
    extra_headers: Mapping[str, str] | None = None


@dataclass(slots=True)
class KimiK2PromptTemplate:
    """Prompt template optimised for Kimi-K2 reasoning refinement."""

    system_prompt: str = (
        "You are Kimi-K2 assisting Dynamic AGI."
        " Enhance institutional trading analysis while staying concise and factual."
    )
    instruction_suffix: str = (
        "Summarise the action, justify the confidence,"
        " and mention one key risk or validation datapoint."
    )

    def build_messages(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> list[dict[str, Any]]:
        """Compose a chat payload compatible with the Kimi-K2 API."""

        serialized_context = json.dumps(market_context, default=str, ensure_ascii=False)
        user_prompt = (
            f"Action: {action}\n"
            f"Confidence: {confidence:.2f}\n"
            f"Prior reasoning: {base_reasoning}\n"
            f"Context JSON: {serialized_context}\n"
            f"Instructions: {self.instruction_suffix}"
        )

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.system_prompt},
        ]

        if prior_dialogue:
            for user_text, assistant_text in prior_dialogue:
                messages.append({"role": "user", "content": str(user_text)})
                messages.append({"role": "assistant", "content": str(assistant_text)})

        messages.append({"role": "user", "content": user_prompt})
        return messages


@dataclass
class KimiK2Adapter:
    """Adapter that sends reasoning prompts to a hosted Kimi-K2 endpoint."""

    config: KimiK2Config = field(default_factory=KimiK2Config)
    prompt_template: KimiK2PromptTemplate = field(default_factory=KimiK2PromptTemplate)
    timeout: float = 45.0

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
        model: str | None = None,
    ) -> str:
        """Call the configured Kimi-K2 endpoint and return refined reasoning."""

        try:
            import requests  # type: ignore[import-not-found]
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency
            raise LLMIntegrationError(
                "KimiK2Adapter requires the 'requests' package. Install the optional HTTP dependency."
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive guard
            raise LLMIntegrationError("Failed to import requests for KimiK2Adapter") from exc

        RequestException = getattr(requests, "RequestException", Exception)

        selected_model = model.strip() if isinstance(model, str) else None
        payload: Dict[str, Any] = {
            "model": selected_model or self.config.model,
            "messages": self.prompt_template.build_messages(
                action=action,
                confidence=confidence,
                base_reasoning=base_reasoning,
                market_context=market_context,
                prior_dialogue=prior_dialogue,
            ),
        }

        if self.config.temperature is not None:
            payload["temperature"] = float(self.config.temperature)
        if self.config.top_p is not None:
            payload["top_p"] = float(self.config.top_p)
        if self.config.max_output_tokens is not None:
            payload["max_output_tokens"] = int(self.config.max_output_tokens)
        if self.config.extra_body:
            payload.update(dict(self.config.extra_body))

        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        if self.config.extra_headers:
            headers.update({str(k): str(v) for k, v in self.config.extra_headers.items()})

        url = self._build_url()

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=self.timeout)
            response.raise_for_status()
        except RequestException as exc:  # pragma: no cover - network failure path
            raise LLMIntegrationError(f"Failed to call Kimi-K2 endpoint at {url}") from exc

        try:
            data = response.json()
        except ValueError as exc:  # pragma: no cover - invalid payload
            raise LLMIntegrationError("Kimi-K2 response was not valid JSON") from exc

        text = self._extract_response_text(data)
        if not text:
            raise LLMIntegrationError("Kimi-K2 response did not include any text output")

        return text.strip()

    # Internal helpers -------------------------------------------------
    def _build_url(self) -> str:
        base = self.config.base_url.rstrip("/")
        path = self.config.path
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{base}{path}"

    @staticmethod
    def _extract_response_text(data: Mapping[str, Any]) -> str:
        """Extract text content from a Kimi-K2 style chat completion payload."""

        choices = data.get("choices")
        if isinstance(choices, list):
            for choice in choices:
                if not isinstance(choice, Mapping):
                    continue
                message = choice.get("message")
                if isinstance(message, Mapping):
                    content = message.get("content")
                    if isinstance(content, str):
                        return content
                    if isinstance(content, list):
                        text_parts: list[str] = []
                        for item in content:
                            if isinstance(item, Mapping):
                                if item.get("type") == "text" and isinstance(item.get("text"), str):
                                    text_parts.append(item["text"])
                        if text_parts:
                            return "".join(text_parts)
                content = choice.get("text")
                if isinstance(content, str):
                    return content

        message = data.get("message")
        if isinstance(message, Mapping):
            content = message.get("content")
            if isinstance(content, str):
                return content

        if "response" in data and isinstance(data["response"], str):
            return data["response"]

        return ""


__all__ = ["KimiK2Adapter", "KimiK2Config", "KimiK2PromptTemplate"]
