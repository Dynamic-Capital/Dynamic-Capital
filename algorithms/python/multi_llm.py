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


class ParameterScheduler(Protocol):  # pragma: no cover - interface definition
    """Protocol describing an adaptive strategy for LLM decoding parameters."""

    def __call__(
        self,
        run: "LLMRun",
        feedback: Mapping[str, Any],
    ) -> Mapping[str, float | int]:
        """Return updated decoding parameters after observing ``run``."""


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
    parameter_scheduler: ParameterScheduler | None = None

    def run(
        self,
        prompt: str,
        *,
        strip: bool = True,
        feedback: Mapping[str, Any] | None = None,
    ) -> LLMRun:
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
        run = LLMRun(name=self.name, prompt=prompt, response=response, parameters=parameters)
        self._apply_scheduler(run, feedback)
        return run

    def apply_feedback(self, run: LLMRun, feedback: Mapping[str, Any]) -> None:
        """Feed additional feedback into the scheduler after ``run`` has been evaluated."""

        self._apply_scheduler(run, feedback)

    def _apply_scheduler(
        self,
        run: LLMRun,
        feedback: Mapping[str, Any] | None,
    ) -> None:
        if self.parameter_scheduler is None:
            return
        enriched_feedback: Dict[str, Any] = {
            "response_length": len(run.response),
            "prompt_length": len(run.prompt),
        }
        if feedback:
            enriched_feedback.update(feedback)
        updates = self.parameter_scheduler(run, enriched_feedback)
        if not updates:
            return
        self._update_parameters(updates)

    def _update_parameters(self, updates: Mapping[str, float | int]) -> None:
        if "temperature" in updates:
            self.temperature = float(updates["temperature"])
        if "nucleus_p" in updates:
            self.nucleus_p = float(updates["nucleus_p"])
        if "max_tokens" in updates:
            self.max_tokens = int(updates["max_tokens"])


@dataclass(slots=True)
class AdaptiveParameterScheduler:
    """Default heuristic scheduler that nudges decoding settings over time."""

    min_temperature: float = 0.1
    max_temperature: float = 1.3
    temperature_step: float = 0.05
    min_nucleus_p: float = 0.2
    max_nucleus_p: float = 0.95
    nucleus_step: float = 0.05
    max_tokens_step: int = 128
    max_tokens_floor: int = 256
    max_tokens_ceiling: int | None = None

    def __call__(
        self,
        run: LLMRun,
        feedback: Mapping[str, Any],
    ) -> Mapping[str, float | int]:
        updates: Dict[str, float | int] = {}
        parameters = run.parameters
        previous_temperature = float(parameters.get("temperature", 0.0))
        previous_nucleus = float(parameters.get("nucleus_p", 0.0))
        previous_max_tokens = int(parameters.get("max_tokens", self.max_tokens_floor))

        parse_success = feedback.get("parse_success")
        if parse_success is False:
            updates["temperature"] = max(
                self.min_temperature,
                previous_temperature - self.temperature_step,
            )
            updates["nucleus_p"] = max(
                self.min_nucleus_p,
                previous_nucleus - self.nucleus_step,
            )
        elif parse_success is True and feedback.get("response_quality", 0.0) >= 0.8:
            updates["temperature"] = min(
                self.max_temperature,
                previous_temperature + (self.temperature_step / 2.0),
            )

        response_length = int(feedback.get("response_length", 0))
        truncated = feedback.get("truncated")
        if truncated or response_length >= int(previous_max_tokens * 0.95):
            proposed = previous_max_tokens + self.max_tokens_step
            if self.max_tokens_ceiling is not None:
                proposed = min(proposed, self.max_tokens_ceiling)
            updates["max_tokens"] = proposed
        elif response_length and response_length < int(previous_max_tokens * 0.35):
            proposed = max(self.max_tokens_floor, previous_max_tokens - (self.max_tokens_step // 2))
            if proposed < previous_max_tokens:
                updates["max_tokens"] = proposed

        return updates


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
    "ParameterScheduler",
    "AdaptiveParameterScheduler",
    "collect_strings",
    "parse_json_response",
    "serialise_runs",
]

