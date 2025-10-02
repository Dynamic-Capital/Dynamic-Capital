"""Foundational Dynamic AI architecture components (Build Phase 1)."""

from .io_bus.schema import ConstraintSet, ResultEnvelope, TaskEnvelope
from .io_bus.message_bus import TaskBus
from .memory.l0_context import L0ContextManager
from .orchestrator.router import MinimalRouter
from .orchestrator.validator import BaselineValidator, TaskValidationError
from .orchestrator.phase4_router import (
    AuditTrailLogger,
    DataResidencyPolicy,
    GovernanceError,
    ObservabilityCollector,
    Phase4Router,
    SafetyHarness,
    SafetyViolation,
)
from .core_adapters import (
    BaseCoreAdapter,
    CoreDecision,
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
    build_phase1_mesh,
)

__all__ = [
    "ConstraintSet",
    "ResultEnvelope",
    "TaskEnvelope",
    "TaskBus",
    "L0ContextManager",
    "MinimalRouter",
    "BaselineValidator",
    "TaskValidationError",
    "AuditTrailLogger",
    "DataResidencyPolicy",
    "GovernanceError",
    "ObservabilityCollector",
    "Phase4Router",
    "SafetyHarness",
    "SafetyViolation",
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
