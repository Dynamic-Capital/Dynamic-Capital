"""Integration helpers for Dolphin LLaMA.cpp inference."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Any, Dict, Mapping, Sequence


class LLMIntegrationError(RuntimeError):
    """Raised when an external LLM backend cannot be executed."""


@dataclass(slots=True)
class DolphinModelConfig:
    """Configuration describing a Dolphin LLaMA.cpp checkpoint."""

    repo_id: str = "bartowski/Dolphin3.0-Qwen2.5-0.5B-GGUF"
    filename: str = "Dolphin3.0-Qwen2.5-0.5B-Q6_K.gguf"
    local_dir: Path = Path("models")
    context_window: int = 4096
    batch_size: int = 16
    threads: int = 2
    thread_batch: int = 2
    gpu_layers: int = 0

    def resolved_path(self) -> Path:
        """Return the on-disk checkpoint path."""

        return self.local_dir / self.filename


@dataclass(slots=True)
class DolphinSamplingConfig:
    """Sampling parameters applied to Dolphin generations."""

    temperature: float = 0.7
    top_p: float = 0.95
    top_k: int = 40
    max_tokens: int = 1024
    repeat_penalty: float = 1.1


@dataclass(slots=True)
class DolphinPromptTemplate:
    """Prompt template for enhancing Dynamic AI reasoning."""

    system_prompt: str = (
        "You are Dolphin, a concise institutional trading analyst. "
        "Refine the provided reasoning using the market context."
    )
    instruction_prefix: str = (
        "Summarise the trading action, explain the confidence, "
        "and mention one key risk or validation data point."
    )

    def build_prompt(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
    ) -> str:
        """Compose the structured prompt for the LLM."""

        serialized_context = json.dumps(market_context, default=str, ensure_ascii=False)
        return (
            f"Action: {action}\n"
            f"Confidence: {confidence:.2f}\n"
            f"Prior reasoning: {base_reasoning}\n"
            f"Context JSON: {serialized_context}\n\n"
            f"Instructions: {self.instruction_prefix}"
        )


@dataclass
class DolphinLlamaCppAdapter:
    """Thin wrapper that mirrors the upstream Dolphin LLaMA.cpp project."""

    model_config: DolphinModelConfig = field(default_factory=DolphinModelConfig)
    sampling_config: DolphinSamplingConfig = field(default_factory=DolphinSamplingConfig)
    prompt_template: DolphinPromptTemplate = field(default_factory=DolphinPromptTemplate)
    auto_download: bool = False
    _provider: Any | None = field(init=False, default=None, repr=False)
    _agent: Any | None = field(init=False, default=None, repr=False)
    _history_cls: Any | None = field(init=False, default=None, repr=False)

    def ensure_backend(self) -> None:
        """Ensure the Dolphin backend and model weights are available."""

        if self._agent is not None:
            return

        llama_cpp, llama_cpp_agent = self._import_dependencies()
        llama_cls = llama_cpp["Llama"]
        provider_cls = llama_cpp_agent["provider_cls"]
        agent_cls = llama_cpp_agent["agent_cls"]
        messages_formatter = llama_cpp_agent["messages_formatter"]
        history_cls = llama_cpp_agent["history_cls"]

        model_path = self.model_config.resolved_path()
        if not model_path.exists():
            if not self.auto_download:
                raise LLMIntegrationError(
                    f"Dolphin model missing at {model_path}. Enable auto_download to fetch automatically."
                )
            self._download_weights()

        llm = llama_cls(
            model_path=str(model_path),
            n_ctx=self.model_config.context_window,
            n_gpu_layers=self.model_config.gpu_layers,
            n_batch=self.model_config.batch_size,
            n_threads=self.model_config.threads,
            n_threads_batch=self.model_config.thread_batch,
            flash_attn=False,
        )
        provider = provider_cls(llm)
        agent = agent_cls(
            provider,
            system_prompt=self.prompt_template.system_prompt,
            predefined_messages_formatter_type=messages_formatter,
            debug_output=False,
        )

        self._provider = provider
        self._agent = agent
        self._history_cls = history_cls

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        """Return refined reasoning produced by the Dolphin agent."""

        self.ensure_backend()
        assert self._provider is not None
        assert self._agent is not None
        history_cls = self._history_cls
        if history_cls is None:  # pragma: no cover - defensive guard
            raise LLMIntegrationError("Chat history class was not initialised for Dolphin adapter")

        prompt = self.prompt_template.build_prompt(
            action=action,
            confidence=confidence,
            base_reasoning=base_reasoning,
            market_context=market_context,
        )

        history = history_cls()
        if prior_dialogue:
            for user, assistant in prior_dialogue:
                history.add_message({"role": "user", "content": user})
                history.add_message({"role": "assistant", "content": assistant})

        settings = self._provider.get_provider_default_settings()
        settings.temperature = self.sampling_config.temperature
        settings.top_p = self.sampling_config.top_p
        settings.top_k = self.sampling_config.top_k
        settings.max_tokens = self.sampling_config.max_tokens
        settings.repeat_penalty = self.sampling_config.repeat_penalty
        settings.stream = False

        response = self._agent.get_chat_response(
            prompt,
            llm_sampling_settings=settings,
            chat_history=history,
            returns_streaming_generator=False,
            print_output=False,
        )

        return self._coerce_response(response, fallback=base_reasoning)

    # Internal helpers -------------------------------------------------
    def _import_dependencies(self) -> Dict[str, Any]:
        try:
            from llama_cpp import Llama  # type: ignore[import]
            from llama_cpp_agent import LlamaCppAgent  # type: ignore[import]
            from llama_cpp_agent import MessagesFormatterType  # type: ignore[import]
            from llama_cpp_agent.providers import LlamaCppPythonProvider  # type: ignore[import]
            from llama_cpp_agent.chat_history import BasicChatHistory  # type: ignore[import]
        except Exception as exc:  # pragma: no cover - optional dependency
            raise LLMIntegrationError(
                "llama-cpp-python and llama-cpp-agent are required for Dolphin integration"
            ) from exc

        return {
            "Llama": Llama,
            "provider_cls": LlamaCppPythonProvider,
            "agent_cls": LlamaCppAgent,
            "messages_formatter": MessagesFormatterType.CHATML,
            "history_cls": BasicChatHistory,
        }

    def _download_weights(self) -> None:
        try:
            from huggingface_hub import hf_hub_download  # type: ignore[import]
        except Exception as exc:  # pragma: no cover - optional dependency
            raise LLMIntegrationError("huggingface-hub is required to auto-download Dolphin weights") from exc

        self.model_config.local_dir.mkdir(parents=True, exist_ok=True)
        hf_hub_download(
            repo_id=self.model_config.repo_id,
            filename=self.model_config.filename,
            local_dir=str(self.model_config.local_dir),
        )

    def _coerce_response(self, response: Any, *, fallback: str) -> str:
        if isinstance(response, str):
            candidate = response.strip()
            return candidate or fallback

        if isinstance(response, Mapping) and "output" in response:
            candidate = str(response.get("output", "")).strip()
            return candidate or fallback

        if hasattr(response, "output"):
            candidate = str(getattr(response, "output")).strip()
            if candidate:
                return candidate

        return fallback
