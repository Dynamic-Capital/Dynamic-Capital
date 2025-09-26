"""Shared utilities for orchestrating multi-LLM workflows."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Protocol, Sequence


class CompletionClient(Protocol):  # pragma: no cover - interface definition
    """Protocol describing the minimal surface of an LLM completion client."""

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        """Return a completion for the supplied prompt."""


@dataclass(slots=True)
class LLMRun:
    """Captures a single model invocation and its response."""

    name: str
    prompt: str
    response: str
    parameters: Mapping[str, Any] = field(default_factory=dict)

    def to_dict(self, *, include_prompt: bool = False) -> Dict[str, Any]:
        """Return a JSON-serialisable representation of the run."""

        payload: Dict[str, Any] = {"model": self.name, "response": self.response}
        if include_prompt and self.prompt:
            payload["prompt"] = self.prompt
        if self.parameters:
            payload["parameters"] = dict(self.parameters)
        return payload


@dataclass(slots=True)
class LLMConfig:
    """Immutable configuration for an LLM completion call."""

    name: str
    client: CompletionClient
    temperature: float
    nucleus_p: float
    max_tokens: int
    extra_parameters: Mapping[str, Any] = field(default_factory=dict)

    def run(self, prompt: str, *, strip: bool = True) -> LLMRun:
        """Execute the completion and capture the metadata for logging."""

        response = self.client.complete(
            prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            nucleus_p=self.nucleus_p,
        )
        if strip:
            response = response.strip()
        parameters = {
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "nucleus_p": self.nucleus_p,
        }
        if self.extra_parameters:
            parameters.update(self.extra_parameters)
        return LLMRun(name=self.name, prompt=prompt, response=response, parameters=parameters)


def collect_strings(*candidates: Optional[Iterable[Any] | Any]) -> list[str]:
    """Normalise heterogeneous string inputs into a unique list."""

    results: list[str] = []
    seen: set[str] = set()

    for candidate in candidates:
        if candidate is None:
            continue
        if isinstance(candidate, (str, bytes)):
            items: Iterable[Any] = (candidate,)
        elif isinstance(candidate, Iterable):
            items = candidate
        else:
            items = (candidate,)

        for item in items:
            text = str(item).strip()
            if not text or text in seen:
                continue
            seen.add(text)
            results.append(text)

    return results


def parse_json_response(response: str, *, fallback_key: str = "narrative") -> Optional[Dict[str, Any]]:
    """Best-effort parsing of model responses that may contain free-form text."""

    text = (response or "").strip()
    if not text:
        return None

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            snippet = text[start : end + 1]
            try:
                parsed = json.loads(snippet)
            except json.JSONDecodeError:
                return {fallback_key: text}
        else:
            return {fallback_key: text}

    if isinstance(parsed, MutableMapping):
        return dict(parsed)

    return {fallback_key: text}


def serialise_runs(
    runs: Sequence[LLMRun],
    *,
    include_prompt: bool = False,
) -> Optional[str]:
    """Return a JSON string describing completed LLM calls."""

    payloads = [run.to_dict(include_prompt=include_prompt) for run in runs if run.response]
    if not payloads:
        return None
    return json.dumps(payloads, indent=2, default=str, sort_keys=True)


__all__ = [
    "CompletionClient",
    "LLMConfig",
    "LLMRun",
    "collect_strings",
    "parse_json_response",
    "serialise_runs",
]

