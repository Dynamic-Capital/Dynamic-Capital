"""Factory helpers for assembling the Build Phase 1 core mesh."""

from __future__ import annotations

from typing import Tuple, Type

from .base import BaseCoreAdapter
from .core1_chatcpt2 import ChatCPT2Adapter
from .core2_grok import GrokAdapter
from .core3_dolphin import DolphinAdapter
from .core4_ollama import OllamaAdapter
from .core5_kimi_k2 import KimiK2Adapter
from .core6_deepseek_v3 import DeepSeekV3Adapter
from .core7_deepseek_r1 import DeepSeekR1Adapter
from .core8_qwen3 import Qwen3Adapter
from .core9_minimax_m1 import MiniMaxM1Adapter
from .core10_zhipu import ZhipuAdapter
from .core11_hunyuan import HunyuanAdapter

Phase1CoreClass = Type[BaseCoreAdapter]
Phase1Mesh = Tuple[BaseCoreAdapter, ...]

PHASE1_CORE_CLASSES: Tuple[Phase1CoreClass, ...] = (
    ChatCPT2Adapter,
    GrokAdapter,
    DolphinAdapter,
    OllamaAdapter,
    KimiK2Adapter,
    DeepSeekV3Adapter,
    DeepSeekR1Adapter,
    Qwen3Adapter,
    MiniMaxM1Adapter,
    ZhipuAdapter,
    HunyuanAdapter,
)


def build_phase1_mesh() -> Phase1Mesh:
    """Instantiate and return the default eleven-core mesh."""

    return tuple(adapter_cls() for adapter_cls in PHASE1_CORE_CLASSES)


__all__ = [
    "Phase1CoreClass",
    "Phase1Mesh",
    "PHASE1_CORE_CLASSES",
    "build_phase1_mesh",
]
