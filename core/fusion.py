"""Adapter exposing AI fusion helpers for market-making services."""

from __future__ import annotations

from typing import Iterable, MutableMapping, Optional

from dynamic_ai.core import DynamicFusionAlgo
from dynamic_ai.qwen_adapter import (
    QwenAdapter,
    QwenConfig,
    QwenGenerationConfig,
    QwenPromptTemplate,
)

__all__ = [
    "DynamicFusionAlgo",
    "QwenAdapter",
    "QwenConfig",
    "QwenGenerationConfig",
    "QwenPromptTemplate",
    "create_qwen_fusion_algo",
]


def create_qwen_fusion_algo(
    *,
    neutral_confidence: float = 0.55,
    boost_topics: Optional[Iterable[str]] = None,
    reasoning_cache_size: int = 16,
    qwen_config: QwenConfig | None = None,
    generation_config: QwenGenerationConfig | None = None,
    prompt_template: QwenPromptTemplate | None = None,
    extra_generate_kwargs: MutableMapping[str, object] | None = None,
) -> DynamicFusionAlgo:
    """Return a :class:`DynamicFusionAlgo` pre-configured with Qwen reasoning."""

    adapter = QwenAdapter(
        config=qwen_config or QwenConfig(),
        generation=generation_config or QwenGenerationConfig(),
        prompt_template=prompt_template or QwenPromptTemplate(),
        extra_generate_kwargs=dict(extra_generate_kwargs or {}),
    )

    return DynamicFusionAlgo(
        neutral_confidence=neutral_confidence,
        boost_topics=boost_topics,
        llm_adapter=adapter,
        reasoning_cache_size=reasoning_cache_size,
    )
