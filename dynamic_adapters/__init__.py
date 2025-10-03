"""Compatibility facade exposing Dynamic Capital's LLM adapter roster.

Historically downstream automations imported adapters via lightweight
``dynamic_adapters`` stubs. The implementations now live inside
``dynamic.intelligence.ai_apps`` alongside the rest of the fusion stack. This
module restores the ergonomic import path and normalises adapter loading so
callers always resolve the canonical implementation lazily.
"""

from __future__ import annotations

from importlib import import_module
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Mapping, Tuple


_EXPORT_MAP: Mapping[str, Tuple[str, str]] = MappingProxyType(
    {
        "DolphinLlamaCppAdapter": (
            "dynamic.intelligence.ai_apps.dolphin_adapter",
            "DolphinLlamaCppAdapter",
        ),
        "DolphinModelConfig": (
            "dynamic.intelligence.ai_apps.dolphin_adapter",
            "DolphinModelConfig",
        ),
        "DolphinPromptTemplate": (
            "dynamic.intelligence.ai_apps.dolphin_adapter",
            "DolphinPromptTemplate",
        ),
        "DolphinSamplingConfig": (
            "dynamic.intelligence.ai_apps.dolphin_adapter",
            "DolphinSamplingConfig",
        ),
        "LLMIntegrationError": (
            "dynamic.intelligence.ai_apps.dolphin_adapter",
            "LLMIntegrationError",
        ),
        "KimiK2Adapter": (
            "dynamic.intelligence.ai_apps.kimi_k2_adapter",
            "KimiK2Adapter",
        ),
        "KimiK2Config": (
            "dynamic.intelligence.ai_apps.kimi_k2_adapter",
            "KimiK2Config",
        ),
        "KimiK2PromptTemplate": (
            "dynamic.intelligence.ai_apps.kimi_k2_adapter",
            "KimiK2PromptTemplate",
        ),
        "OllamaAdapter": (
            "dynamic.intelligence.ai_apps.ollama_adapter",
            "OllamaAdapter",
        ),
        "OllamaConfig": (
            "dynamic.intelligence.ai_apps.ollama_adapter",
            "OllamaConfig",
        ),
        "OllamaPromptTemplate": (
            "dynamic.intelligence.ai_apps.ollama_adapter",
            "OllamaPromptTemplate",
        ),
    }
)

__all__ = tuple(_EXPORT_MAP)


def __getattr__(name: str) -> Any:
    try:
        module_path, attribute_name = _EXPORT_MAP[name]
    except KeyError as exc:  # pragma: no cover - defensive
        raise AttributeError(f"module 'dynamic_adapters' has no attribute '{name}'") from exc
    module = import_module(module_path)
    return getattr(module, attribute_name)


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(__all__)


if TYPE_CHECKING:  # pragma: no cover - import for static analysis only
    from dynamic.intelligence.ai_apps.dolphin_adapter import (
        DolphinLlamaCppAdapter,
        DolphinModelConfig,
        DolphinPromptTemplate,
        DolphinSamplingConfig,
        LLMIntegrationError,
    )
    from dynamic.intelligence.ai_apps.kimi_k2_adapter import (
        KimiK2Adapter,
        KimiK2Config,
        KimiK2PromptTemplate,
    )
    from dynamic.intelligence.ai_apps.ollama_adapter import (
        OllamaAdapter,
        OllamaConfig,
        OllamaPromptTemplate,
    )
