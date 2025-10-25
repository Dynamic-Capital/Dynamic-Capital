"""Ollama integration helpers for Dynamic AI reasoning enhancements."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Dict, Mapping, MutableMapping, Sequence

from .dolphin_adapter import LLMIntegrationError


@dataclass(slots=True)
class OllamaConfig:
    """Configuration describing how to contact an Ollama server."""

    host: str = "http://localhost:11434"
    model: str = "llama3"
    keep_alive: float | None = None
    options: MutableMapping[str, Any] = field(default_factory=dict)
    headers: Mapping[str, str] | None = None


@dataclass(slots=True)
class OllamaPromptTemplate:
    """Prompt template tailored for Ollama compatible models."""

    system_prompt: str = (
        "You are an institutional trading co-pilot. Refine the reasoning while keeping it concise."
    )
    instruction_suffix: str = (
        "Summarise the action, justify the confidence level, and surface one key risk or validation datapoint."
    )

    def build_prompt(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        """Compose a structured prompt for the Ollama API."""

        serialized_context = json.dumps(market_context, default=str, ensure_ascii=False)
        dialogue_lines: list[str] = []
        if prior_dialogue:
            for user, assistant in prior_dialogue:
                dialogue_lines.append(f"User: {user}")
                dialogue_lines.append(f"Assistant: {assistant}")

        dialogue_block = "\n".join(dialogue_lines)
        if dialogue_block:
            dialogue_block = f"\nPrevious dialogue:\n{dialogue_block}\n"

        return (
            f"{self.system_prompt}\n"
            f"Action: {action}\n"
            f"Confidence: {confidence:.2f}\n"
            f"Prior reasoning: {base_reasoning}\n"
            f"Context JSON: {serialized_context}\n"
            f"{dialogue_block}"
            f"Instructions: {self.instruction_suffix}"
        )


@dataclass
class OllamaAdapter:
    """Adapter that communicates with a running Ollama instance."""

    config: OllamaConfig = field(default_factory=OllamaConfig)
    prompt_template: OllamaPromptTemplate = field(default_factory=OllamaPromptTemplate)
    timeout: float = 30.0

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
        """Call the Ollama generate endpoint and return enhanced reasoning."""

        try:  # Deferred import keeps optional dependency truly optional.
            import requests  # type: ignore[import-not-found]
        except ModuleNotFoundError as exc:  # pragma: no cover - import path
            raise LLMIntegrationError(
                "OllamaAdapter requires the 'requests' package. Install the optional HTTP dependency."
            ) from exc
        except Exception as exc:  # pragma: no cover - defensive safety net
            raise LLMIntegrationError("Failed to import requests for OllamaAdapter") from exc

        RequestException = getattr(requests, "RequestException", Exception)

        selected_model = model.strip() if isinstance(model, str) else None
        payload: Dict[str, Any] = {
            "model": selected_model or self.config.model,
            "prompt": self.prompt_template.build_prompt(
                action=action,
                confidence=confidence,
                base_reasoning=base_reasoning,
                market_context=market_context,
                prior_dialogue=prior_dialogue,
            ),
            "stream": False,
        }

        if self.config.keep_alive is not None:
            payload["keep_alive"] = self.config.keep_alive

        if self.config.options:
            payload["options"] = dict(self.config.options)

        url = f"{self.config.host.rstrip('/')}/api/generate"

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self.config.headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
        except RequestException as exc:  # pragma: no cover - network failure path
            raise LLMIntegrationError(f"Failed to call Ollama generate endpoint at {url}") from exc

        try:
            data = response.json()
        except ValueError as exc:  # pragma: no cover - invalid payload
            raise LLMIntegrationError("Ollama response was not valid JSON") from exc

        text = self._extract_response_text(data)
        if not text:
            raise LLMIntegrationError("Ollama response did not include any text output")

        return text.strip()

    @staticmethod
    def _extract_response_text(data: Mapping[str, Any]) -> str:
        """Extract the generated text from the Ollama response payload."""

        if "response" in data and isinstance(data["response"], str):
            return data["response"]

        # Some Ollama builds nest the message content
        message = data.get("message")
        if isinstance(message, Mapping):
            content = message.get("content")
            if isinstance(content, str):
                return content

        return ""
