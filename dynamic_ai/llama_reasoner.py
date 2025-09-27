"""Integration helpers for running llama.cpp as a trading signal refiner."""

from __future__ import annotations

import json
import logging
import os
import textwrap
from dataclasses import dataclass
from typing import Any, Dict, Optional
from urllib import request

logger = logging.getLogger(__name__)


@dataclass
class ReasonerOutput:
    """Structured response returned by the llama.cpp-backed reasoner."""

    action: str
    confidence: float
    reasoning: str


class LlamaSignalRefiner:
    """Calls a llama.cpp model (local or HTTP) to refine trading signals."""

    def __init__(
        self,
        *,
        model_path: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 256,
        context_window: int = 2048,
        system_prompt: Optional[str] = None,
    ) -> None:
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.context_window = context_window
        self.endpoint_url = endpoint_url
        self.system_prompt = system_prompt or self._default_system_prompt()
        self._llama_model = None

        if model_path:
            try:  # pragma: no cover - optional dependency
                from llama_cpp import Llama  # type: ignore

                self._llama_model = Llama(model_path=model_path, n_ctx=context_window)
                logger.info("Loaded llama.cpp model from %s", model_path)
            except Exception as exc:  # pragma: no cover - keep runtime resilient
                logger.warning("Failed to initialise local llama.cpp model: %s", exc)

        if not (self._llama_model or self.endpoint_url):
            raise ValueError("LlamaSignalRefiner requires a model_path or endpoint_url")

    @classmethod
    def from_env(cls) -> Optional["LlamaSignalRefiner"]:
        """Instantiate the refiner based on environment configuration."""

        if os.getenv("LLAMA_REASONER_DISABLED", "0").lower() in {"1", "true", "yes"}:
            return None

        model_path = os.getenv("LLAMA_MODEL_PATH")
        endpoint_url = os.getenv("LLAMA_SERVER_URL")

        if not model_path and not endpoint_url:
            return None

        temperature = float(os.getenv("LLAMA_TEMPERATURE", "0.2"))
        max_tokens = int(os.getenv("LLAMA_MAX_TOKENS", "256"))
        context_window = int(os.getenv("LLAMA_CONTEXT_WINDOW", "2048"))
        system_prompt = os.getenv("LLAMA_SYSTEM_PROMPT")

        try:
            return cls(
                model_path=model_path,
                endpoint_url=endpoint_url,
                temperature=temperature,
                max_tokens=max_tokens,
                context_window=context_window,
                system_prompt=system_prompt,
            )
        except ValueError:
            return None

    def refine_signal(self, raw_signal: str, market_data: Dict[str, Any]) -> Optional[ReasonerOutput]:
        """Generate a refined signal from llama.cpp.

        Returns ``None`` when the model fails so callers can fall back to heuristics.
        """

        prompt = self._build_prompt(raw_signal, market_data)
        try:
            completion = self._invoke_model(prompt)
        except Exception as exc:  # pragma: no cover - runtime safety
            logger.warning("llama.cpp completion failed: %s", exc)
            return None

        if not completion:
            return None

        return self._parse_completion(completion)

    def _build_prompt(self, raw_signal: str, market_data: Dict[str, Any]) -> str:
        instruction = textwrap.dedent(
            """
            You are an expert trading analyst that must convert raw market telemetry into
            actionable guidance. Respond strictly as minified JSON with keys
            "action", "confidence", and "reasoning".

            - "action" must be one of ["BUY", "SELL", "HOLD"].
            - "confidence" must be a number between 0 and 1.
            - "reasoning" should summarise the market drivers in 2 sentences or fewer.
            """
        ).strip()
        payload = json.dumps({"raw_signal": raw_signal, "market_data": market_data})

        return f"{self.system_prompt}\n\n{instruction}\n\nMarket context:\n```json\n{payload}\n```\n\nJSON Response:"

    def _invoke_model(self, prompt: str) -> str:
        if self._llama_model is not None:
            response = self._llama_model(
                prompt=prompt,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
            )
            text = response["choices"][0]["text"]
            return text.strip()

        assert self.endpoint_url is not None
        data = json.dumps(
            {
                "prompt": prompt,
                "temperature": self.temperature,
                "max_tokens": self.max_tokens,
                "stream": False,
            }
        ).encode("utf-8")
        http_request = request.Request(
            self.endpoint_url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(http_request, timeout=30) as response:  # pragma: no cover - network
            body = response.read().decode("utf-8")

        try:
            parsed = json.loads(body)
            if isinstance(parsed, dict) and "content" in parsed:
                return str(parsed["content"]).strip()
            if isinstance(parsed, dict) and "choices" in parsed:
                choice = parsed["choices"][0]
                text = choice.get("text") or choice.get("message", {}).get("content", "")
                return str(text).strip()
        except json.JSONDecodeError:
            return body.strip()

        return str(body).strip()

    def _parse_completion(self, completion: str) -> Optional[ReasonerOutput]:
        try:
            parsed = json.loads(completion)
        except json.JSONDecodeError:
            logger.warning("llama.cpp returned non-JSON response: %s", completion)
            return None

        if not isinstance(parsed, dict):
            return None

        action = str(parsed.get("action", "")).upper()
        try:
            confidence = float(parsed.get("confidence", 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        reasoning = str(parsed.get("reasoning", "")).strip()

        return ReasonerOutput(action=action, confidence=confidence, reasoning=reasoning)

    def _default_system_prompt(self) -> str:
        return (
            "You are Dynamic Capital's proprietary AI assistant. Prioritise risk-aware "
            "decisions and ensure outputs are machine readable."
        )

