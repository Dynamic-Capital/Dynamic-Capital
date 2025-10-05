"""Core adapter implementations used by the Build Phase 1 router."""

from .base import BaseCoreAdapter, CoreDecision
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


def build_phase1_mesh() -> tuple[BaseCoreAdapter, ...]:
    """Return the default eleven-core mesh configured for Phase 1."""

    return (
        ChatCPT2Adapter(),
        GrokAdapter(),
        DolphinAdapter(),
        OllamaAdapter(),
        KimiK2Adapter(),
        DeepSeekV3Adapter(),
        DeepSeekR1Adapter(),
        Qwen3Adapter(),
        MiniMaxM1Adapter(),
        ZhipuAdapter(),
        HunyuanAdapter(),
    )


__all__ = [
    "BaseCoreAdapter",
    "CoreDecision",
    "ChatCPT2Adapter",
    "GrokAdapter",
    "DolphinAdapter",
    "OllamaAdapter",
    "KimiK2Adapter",
    "DeepSeekV3Adapter",
    "DeepSeekR1Adapter",
    "Qwen3Adapter",
    "MiniMaxM1Adapter",
    "ZhipuAdapter",
    "HunyuanAdapter",
    "build_phase1_mesh",
]
