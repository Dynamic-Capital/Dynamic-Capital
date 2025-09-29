"""Minimal router orchestrating Build Phase 1 components."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, List, Mapping, Tuple

from ..core_adapters import BaseCoreAdapter
from ..io_bus.message_bus import TaskBus
from ..io_bus.schema import ResultEnvelope, TaskEnvelope
from ..memory.l0_context import L0ContextManager
from .validator import BaselineValidator


@dataclass(slots=True)
class RoutingDecision:
    """Internal diagnostic capturing adapter selection."""

    adapter: str
    confidence: float


class MinimalRouter:
    """Coordinates the task bus, context manager, and adapters."""

    def __init__(
        self,
        *,
        adapters: Iterable[BaseCoreAdapter],
        validator: BaselineValidator,
        context_manager: L0ContextManager,
        bus: TaskBus,
    ) -> None:
        self._adapters: Tuple[BaseCoreAdapter, ...] = tuple(adapters)
        if not self._adapters:
            raise ValueError("Router requires at least one adapter")
        self.validator = validator
        self.context_manager = context_manager
        self.bus = bus

    def process_next(self) -> ResultEnvelope | None:
        envelope = self.bus.dequeue_task()
        if not envelope:
            return None
        self.validator.validate_task(envelope)
        context = self.context_manager.prepare(envelope)
        ranked = self._rank_adapters(envelope, context)
        selected = ranked[0]
        decision = selected.run(envelope, context)
        result = ResultEnvelope(
            task_id=envelope.task_id,
            status="completed",
            payload=decision.as_payload(),
        )
        self.validator.validate_result(result, envelope.constraints)
        self.bus.publish_result(result)
        self.context_manager.update(envelope.task_id, last_adapter=selected.name, confidence=decision.confidence)
        if decision.action != "HOLD":
            self.context_manager.update(envelope.task_id, last_action=decision.action)
        return result

    def _rank_adapters(
        self,
        envelope: TaskEnvelope,
        context: Mapping[str, Any],
    ) -> List[BaseCoreAdapter]:
        scored: List[Tuple[float, BaseCoreAdapter]] = []
        for adapter in self._adapters:
            score = adapter.score_task(envelope, context)
            scored.append((score, adapter))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [adapter for _, adapter in scored]
