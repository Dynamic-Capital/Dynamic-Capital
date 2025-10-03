"""Compatibility facade exposing Dynamic Capital's LLM adapter roster.

Historically downstream automations imported adapters via lightweight
"dynamic_adapters" stubs.  The implementations now live inside
``dynamic.intelligence.ai_apps`` alongside the rest of the fusion stack.  This
module restores the ergonomic import path without forcing callers to eagerly
load the full AI package – the exports below simply proxy to the canonical
implementations.
"""

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

__all__ = [
    "DolphinLlamaCppAdapter",
    "DolphinModelConfig",
    "DolphinPromptTemplate",
    "DolphinSamplingConfig",
    "LLMIntegrationError",
    "KimiK2Adapter",
    "KimiK2Config",
    "KimiK2PromptTemplate",
    "OllamaAdapter",
    "OllamaConfig",
    "OllamaPromptTemplate",
]
