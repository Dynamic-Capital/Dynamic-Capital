"""Agents and helpers for optimising dynamic orderflow telemetry."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from typing import Iterable, Mapping, Sequence

from .engine import DynamicOrderFlow, OrderEvent, OrderFlowSummary

__all__ = [
    "OrderFlowDirective",
    "OrderFlowHelper",
    "OrderFlowBuilder",
    "OrderFlowAgent",
    "OrderFlowBot",
]


@dataclass(slots=True)
class OrderFlowDirective:
    """Represents a prioritised action derived from orderflow telemetry."""

    symbol: str
    action: str
    confidence: float
    bias: float
    total_notional: float

    def as_dict(self) -> Mapping[str, float | str]:
        return {
            "symbol": self.symbol,
            "action": self.action,
            "confidence": self.confidence,
            "bias": self.bias,
            "total_notional": self.total_notional,
        }


@dataclass(slots=True)
class OrderFlowHelper:
    """Utility helper that scores and filters orderflow summaries."""

    min_intensity: float = 0.15
    min_notional: float = 0.0

    def filter_candidates(self, summaries: Iterable[OrderFlowSummary]) -> list[OrderFlowSummary]:
        return [
            summary
            for summary in summaries
            if summary.intensity >= self.min_intensity and summary.total_notional >= self.min_notional
        ]

    def rank(self, summaries: Iterable[OrderFlowSummary]) -> list[OrderFlowSummary]:
        return sorted(
            summaries,
            key=lambda summary: (summary.intensity, summary.total_notional),
            reverse=True,
        )

    def to_directive(self, summary: OrderFlowSummary) -> OrderFlowDirective:
        action_map = {"buy": "accumulate", "sell": "distribute"}
        action = action_map.get(summary.dominant_side, "observe")
        confidence = max(min(summary.intensity, 1.0), 0.0)
        return OrderFlowDirective(
            symbol=summary.symbol,
            action=action,
            confidence=confidence,
            bias=summary.bias,
            total_notional=summary.total_notional,
        )


@dataclass(slots=True)
class OrderFlowBuilder:
    """Builder that constructs configured orderflow engines."""

    horizon: timedelta | float = field(default_factory=lambda: timedelta(seconds=120))
    max_samples: int = 180

    def build(self) -> DynamicOrderFlow:
        if isinstance(self.horizon, (int, float)):
            horizon = timedelta(seconds=float(self.horizon))
        else:
            horizon = self.horizon
        return DynamicOrderFlow(horizon=horizon, max_samples=self.max_samples)


@dataclass(slots=True)
class OrderFlowAgent:
    """Agent that optimises orderflow and produces actionable directives."""

    builder: OrderFlowBuilder = field(default_factory=OrderFlowBuilder)
    helper: OrderFlowHelper = field(default_factory=OrderFlowHelper)
    _flow: DynamicOrderFlow = field(init=False)

    def __post_init__(self) -> None:
        self._flow = self.builder.build()

    def ingest(self, events: Iterable[OrderEvent]) -> None:
        self._flow.ingest(events)

    def record(self, event: OrderEvent) -> None:
        self._flow.record(event)

    def optimise(self, *, top_n: int = 3) -> tuple[OrderFlowDirective, ...]:
        summaries = self._flow.overview()
        candidates = self.helper.filter_candidates(summaries)
        ranked = self.helper.rank(candidates)
        directives = [self.helper.to_directive(summary) for summary in ranked[: max(top_n, 0)]]
        return tuple(directives)

    def health(self) -> Mapping[str, object]:
        return self._flow.health()


@dataclass(slots=True)
class OrderFlowBot:
    """Automation bot that coordinates the orderflow agent lifecycle."""

    agent: OrderFlowAgent = field(default_factory=OrderFlowAgent)

    def cycle(self, events: Iterable[OrderEvent], *, top_n: int = 3) -> Mapping[str, object]:
        self.agent.ingest(events)
        plan = self.agent.optimise(top_n=top_n)
        return {
            "plan": [directive.as_dict() for directive in plan],
            "health": self.agent.health(),
        }

    def prioritise(self, events: Sequence[OrderEvent], *, top_n: int = 3) -> tuple[OrderFlowDirective, ...]:
        self.agent.ingest(events)
        return self.agent.optimise(top_n=top_n)
