"""High level agent facade orchestrating the Dynamic BTMM engine."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Deque, Iterable, Tuple

from .engine import DynamicBTMMEngine, EngineResult
from .model import (
    BTMMAction,
    BTMMDecision,
    BTMMEngineContext,
    BTMMIndicatorSnapshot,
)

__all__ = ["BTMMAgent", "BTMMAgentState"]


@dataclass(slots=True)
class BTMMAgentState:
    """Mutable state tracked by :class:`BTMMAgent`."""

    history: Deque[EngineResult] = field(default_factory=lambda: deque(maxlen=64))
    last_timestamp: datetime | None = None

    def record(self, snapshot: BTMMIndicatorSnapshot, result: EngineResult) -> None:
        self.history.append(result)
        self.last_timestamp = snapshot.timestamp


class BTMMAgent:
    """Agent facade providing sequential decision support for BTMM workflows."""

    def __init__(
        self,
        *,
        context: BTMMEngineContext | None = None,
        engine: DynamicBTMMEngine | None = None,
        window: int = 20,
    ) -> None:
        self._context = context or BTMMEngineContext()
        self._engine = engine or DynamicBTMMEngine(context=self._context)
        self._window = max(5, window)
        self._state = BTMMAgentState(history=deque(maxlen=self._window))

    @property
    def context(self) -> BTMMEngineContext:
        return self._context

    @property
    def engine(self) -> DynamicBTMMEngine:
        return self._engine

    def ingest(self, snapshot: BTMMIndicatorSnapshot) -> EngineResult:
        """Process a snapshot and store diagnostics in the rolling window."""

        result = self._engine.evaluate(snapshot, diagnostics=True)
        if not isinstance(result, EngineResult):  # pragma: no cover - safety guard
            raise TypeError("engine did not return diagnostics")
        self._state.record(snapshot, result)
        return result

    def latest(self) -> EngineResult | None:
        """Return the most recent engine result if available."""

        if not self._state.history:
            return None
        return self._state.history[-1]

    def bias(self) -> str:
        """Return the aggregated bias from the rolling window."""

        if not self._state.history:
            return "neutral"
        bullish = sum(1 for item in self._state.history if item.decision.bias == "bullish")
        bearish = sum(1 for item in self._state.history if item.decision.bias == "bearish")
        if bullish > bearish:
            return "bullish"
        if bearish > bullish:
            return "bearish"
        return "neutral"

    def batch_ingest(self, snapshots: Iterable[BTMMIndicatorSnapshot]) -> Tuple[EngineResult, ...]:
        """Ingest multiple snapshots returning the recorded diagnostics."""

        results: list[EngineResult] = []
        for snapshot in snapshots:
            results.append(self.ingest(snapshot))
        return tuple(results)

    def consolidated_decision(self) -> BTMMDecision:
        """Combine the rolling decisions into one actionable suggestion."""

        if not self._state.history:
            return BTMMDecision(action=BTMMAction.HOLD, confidence=0.0, bias="neutral")
        decisions = tuple(item.decision for item in self._state.history)
        return BTMMDecision.combine(decisions)
