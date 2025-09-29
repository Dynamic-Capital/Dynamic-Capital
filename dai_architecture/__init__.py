"""Foundational Dynamic AI architecture components (Build Phase 1)."""

from .io_bus.schema import ConstraintSet, ResultEnvelope, TaskEnvelope
from .io_bus.message_bus import TaskBus
from .memory.l0_context import L0ContextManager
from .orchestrator.router import MinimalRouter
from .orchestrator.validator import BaselineValidator, TaskValidationError
from .core_adapters import (
    BaseCoreAdapter,
    CoreDecision,
    ChatCPT2Adapter,
    GrokAdapter,
    DolphinAdapter,
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
    "BaseCoreAdapter",
    "CoreDecision",
    "ChatCPT2Adapter",
    "GrokAdapter",
    "DolphinAdapter",
]
