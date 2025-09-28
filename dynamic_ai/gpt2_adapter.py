"""GPT-2 integration adapter for Dynamic AI reasoning workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Dict, Mapping, MutableMapping, Sequence

from .dolphin_adapter import LLMIntegrationError


@dataclass(slots=True)
class GPT2Config:
    """Configuration used to load and run a GPT-2 text-generation pipeline."""

    model_name: str = "openai-community/gpt2"
    device: str | int | None = None
    max_new_tokens: int = 256
    temperature: float = 0.8
    top_p: float = 0.95
    repetition_penalty: float = 1.05
    additional_kwargs: MutableMapping[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class GPT2PromptTemplate:
    """Prompt template specialised for GPT-2 style causal language models."""

    system_prompt: str = (
        "You are the Dynamic AGI core leveraging the open-source GPT-2 foundation model. "
        "Refine and expand upon the trading rationale while remaining grounded in the provided data."
    )
    instruction_suffix: str = (
        "Summarise the action, justify the confidence, and cite one supporting datapoint or risk consideration."
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
        """Compose a formatted prompt that conditions GPT-2 on the market context."""

        serialized_context = json.dumps(market_context, default=str, ensure_ascii=False)
        dialogue_lines: list[str] = []
        if prior_dialogue:
            for user, assistant in prior_dialogue:
                dialogue_lines.append(f"User: {user}")
                dialogue_lines.append(f"Assistant: {assistant}")

        dialogue_block = "\n".join(dialogue_lines)
        if dialogue_block:
            dialogue_block = f"\nDialogue history:\n{dialogue_block}\n"

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
class GPT2ReasoningAdapter:
    """Adapter that enhances reasoning via the open-source GPT-2 repository."""

    config: GPT2Config = field(default_factory=GPT2Config)
    prompt_template: GPT2PromptTemplate = field(default_factory=GPT2PromptTemplate)
    _generator: Any | None = field(init=False, default=None, repr=False)

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        """Generate enhanced reasoning using a locally loaded GPT-2 model."""

        generator = self._ensure_pipeline()
        prompt = self.prompt_template.build_prompt(
            action=action,
            confidence=confidence,
            base_reasoning=base_reasoning,
            market_context=market_context,
            prior_dialogue=prior_dialogue,
        )

        generation_kwargs: Dict[str, Any] = {
            "max_new_tokens": self.config.max_new_tokens,
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "repetition_penalty": self.config.repetition_penalty,
            "do_sample": True,
        }
        generation_kwargs.update(dict(self.config.additional_kwargs))

        tokenizer = getattr(generator, "tokenizer", None)
        if tokenizer is not None:
            pad_token_id = getattr(tokenizer, "pad_token_id", None)
            if pad_token_id is None:
                pad_token_id = getattr(tokenizer, "eos_token_id", None)
            if pad_token_id is not None:
                generation_kwargs.setdefault("pad_token_id", pad_token_id)

        try:
            outputs = generator(prompt, **generation_kwargs)
        except Exception as exc:  # pragma: no cover - runtime inference failure
            raise LLMIntegrationError("GPT-2 text-generation pipeline failed during inference") from exc

        text = self._extract_response(outputs)
        if not text:
            raise LLMIntegrationError("GPT-2 pipeline did not return any generated text")
        return text.strip()

    def _ensure_pipeline(self):
        """Lazily construct the Hugging Face text-generation pipeline."""

        if self._generator is None:
            try:
                from transformers import pipeline  # type: ignore[import-not-found]
            except ModuleNotFoundError as exc:  # pragma: no cover - optional dependency path
                raise LLMIntegrationError(
                    "GPT2ReasoningAdapter requires the 'transformers' package. Install it to enable GPT-2 support."
                ) from exc
            except Exception as exc:  # pragma: no cover - defensive import handling
                raise LLMIntegrationError("Failed to import Hugging Face transformers pipeline") from exc

            pipeline_kwargs: Dict[str, Any] = {}
            if self.config.device is not None:
                pipeline_kwargs["device"] = self.config.device

            try:
                self._generator = pipeline(
                    "text-generation",
                    model=self.config.model_name,
                    **pipeline_kwargs,
                )
            except Exception as exc:  # pragma: no cover - load failure
                raise LLMIntegrationError(
                    f"Unable to load GPT-2 model '{self.config.model_name}'. Ensure the repository is available."
                ) from exc
        return self._generator

    @staticmethod
    def _extract_response(outputs: Any) -> str:
        """Normalise the Hugging Face pipeline output into a plain string."""

        if isinstance(outputs, list) and outputs:
            candidate = outputs[0]
            if isinstance(candidate, Mapping):
                text = candidate.get("generated_text")
                if isinstance(text, str):
                    return text
        return ""
