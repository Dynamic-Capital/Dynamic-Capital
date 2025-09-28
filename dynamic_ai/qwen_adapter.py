"""Integration helpers for Qwen LLM checkpoints via Hugging Face transformers."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Any, Dict, Mapping, MutableMapping, Sequence

from .dolphin_adapter import LLMIntegrationError


@dataclass(slots=True)
class QwenConfig:
    """Configuration describing how to load a Qwen checkpoint."""

    model_name: str = "Qwen/Qwen2.5-1.5B-Instruct"
    device: str = "cpu"
    dtype: str | None = None
    trust_remote_code: bool = True
    rope_scaling: Mapping[str, Any] | None = None
    attn_implementation: str | None = None
    token: str | None = None


@dataclass(slots=True)
class QwenGenerationConfig:
    """Sampling parameters applied to Qwen generations."""

    max_new_tokens: int = 512
    temperature: float = 0.6
    top_p: float = 0.9
    top_k: int | None = None
    repetition_penalty: float = 1.05


@dataclass(slots=True)
class QwenPromptTemplate:
    """Prompt template tuned for the Dynamic Capital trading domain."""

    system_prompt: str = (
        "You are Qwen, an institutional trading strategist who enhances reasoning "
        "for Dynamic Capital. Keep responses concise, factual, and risk-aware."
    )
    guidance: str = (
        "Summarise the action, justify the confidence, and mention a key validation "
        "signal or risk factor relevant to execution."
    )

    def build_messages(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> list[Dict[str, str]]:
        """Return chat-formatted messages for the Qwen chat template."""

        serialized_context = json.dumps(market_context, default=str, ensure_ascii=False)
        messages: list[Dict[str, str]] = [
            {"role": "system", "content": self.system_prompt},
        ]

        if prior_dialogue:
            for user_text, assistant_text in prior_dialogue:
                if user_text:
                    messages.append({"role": "user", "content": str(user_text)})
                if assistant_text:
                    messages.append({"role": "assistant", "content": str(assistant_text)})

        prompt = (
            f"Action: {action}\n"
            f"Confidence: {confidence:.2f}\n"
            f"Prior reasoning: {base_reasoning}\n"
            f"Context JSON: {serialized_context}\n"
            f"Instructions: {self.guidance}"
        )
        messages.append({"role": "user", "content": prompt})
        return messages


@dataclass
class QwenAdapter:
    """Adapter that executes Qwen models via the transformers library."""

    config: QwenConfig = field(default_factory=QwenConfig)
    generation: QwenGenerationConfig = field(default_factory=QwenGenerationConfig)
    prompt_template: QwenPromptTemplate = field(default_factory=QwenPromptTemplate)
    extra_generate_kwargs: MutableMapping[str, Any] = field(default_factory=dict)
    _tokenizer: Any | None = field(init=False, default=None, repr=False)
    _model: Any | None = field(init=False, default=None, repr=False)

    def ensure_backend(self) -> None:
        """Load the Qwen checkpoint and tokenizer on-demand."""

        if self._model is not None and self._tokenizer is not None:
            return

        try:  # Optional heavy dependency import is deferred until needed.
            from transformers import AutoModelForCausalLM, AutoTokenizer  # type: ignore[import]
        except Exception as exc:  # pragma: no cover - optional dependency path
            raise LLMIntegrationError(
                "The 'transformers' package is required for Qwen integration"
            ) from exc

        torch = self._import_torch()

        load_kwargs: Dict[str, Any] = {
            "trust_remote_code": self.config.trust_remote_code,
        }
        if self.config.token:
            load_kwargs["token"] = self.config.token
        if self.config.dtype:
            dtype = getattr(torch, self.config.dtype, None)
            if dtype is None:
                raise LLMIntegrationError(
                    f"Unsupported torch dtype '{self.config.dtype}' configured for QwenAdapter"
                )
            load_kwargs["torch_dtype"] = dtype
        if self.config.rope_scaling:
            load_kwargs["rope_scaling"] = dict(self.config.rope_scaling)
        if self.config.attn_implementation:
            load_kwargs["attn_implementation"] = self.config.attn_implementation

        model = AutoModelForCausalLM.from_pretrained(
            self.config.model_name,
            **load_kwargs,
        )
        if self.config.device:
            model.to(self.config.device)
        model.eval()

        tokenizer = AutoTokenizer.from_pretrained(
            self.config.model_name,
            trust_remote_code=self.config.trust_remote_code,
            token=self.config.token,
        )
        if tokenizer.pad_token_id is None:
            tokenizer.pad_token = tokenizer.eos_token

        self._model = model
        self._tokenizer = tokenizer

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        """Generate refined reasoning using a Qwen checkpoint."""

        self.ensure_backend()
        assert self._model is not None
        assert self._tokenizer is not None

        torch = self._import_torch()
        messages = self.prompt_template.build_messages(
            action=action,
            confidence=confidence,
            base_reasoning=base_reasoning,
            market_context=market_context,
            prior_dialogue=prior_dialogue,
        )

        input_ids = self._tokenizer.apply_chat_template(
            messages,
            return_tensors="pt",
            add_generation_prompt=True,
        )
        device = self._resolve_model_device(torch)
        input_ids = input_ids.to(device)

        generation_kwargs: Dict[str, Any] = {
            "max_new_tokens": self.generation.max_new_tokens,
            "temperature": self.generation.temperature,
            "top_p": self.generation.top_p,
            "do_sample": self.generation.temperature > 0,
            "repetition_penalty": self.generation.repetition_penalty,
            "pad_token_id": self._tokenizer.pad_token_id,
            "eos_token_id": self._tokenizer.eos_token_id,
        }
        if self.generation.top_k is not None:
            generation_kwargs["top_k"] = self.generation.top_k
        if self.extra_generate_kwargs:
            generation_kwargs.update(self.extra_generate_kwargs)

        with torch.no_grad():
            output = self._model.generate(
                input_ids,
                **generation_kwargs,
            )

        generated_tokens = output[0, input_ids.shape[-1] :]
        text = self._tokenizer.decode(generated_tokens, skip_special_tokens=True).strip()
        return text or base_reasoning

    @staticmethod
    def _import_torch():
        try:
            import torch  # type: ignore[import]
        except Exception as exc:  # pragma: no cover - optional dependency
            raise LLMIntegrationError("PyTorch is required for Qwen integration") from exc
        return torch

    def _resolve_model_device(self, torch_module: Any):
        assert self._model is not None
        try:
            parameter = next(self._model.parameters())
            return parameter.device
        except StopIteration:
            try:
                buffer = next(self._model.buffers())
                return buffer.device
            except StopIteration:
                target = self.config.device or "cpu"
                return torch_module.device(target)


__all__ = [
    "QwenAdapter",
    "QwenConfig",
    "QwenGenerationConfig",
    "QwenPromptTemplate",
]
