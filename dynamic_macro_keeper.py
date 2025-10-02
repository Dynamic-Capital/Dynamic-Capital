"""Memory keeper maintaining historical macro context."""
from __future__ import annotations

from collections import deque
from typing import Deque, Iterator, Mapping

from dynamic_macro_helper import ensure_macro_signals, summarise_signals
from dynamic_macro_model import MacroContext, normalise_sequence

__all__ = ["MacroMemoryKeeper"]


class MacroMemoryKeeper:
    """Persist a rolling window of macro contexts and produce summaries."""

    def __init__(self, *, max_history: int = 5) -> None:
        if max_history <= 0:
            raise ValueError("max_history must be a positive integer")
        self._history: Deque[MacroContext] = deque(maxlen=max_history)

    def record(self, context: MacroContext | Mapping[str, object]) -> None:
        """Store a new context snapshot."""

        if isinstance(context, MacroContext):
            mapping = context.to_prompt_context()
            mapping.setdefault("persona", context.persona)
            mapping.setdefault("timeframe", context.timeframe)
        else:
            mapping = dict(context)

        macro_context = MacroContext(
            persona=str(mapping.get("persona", "Macro Strategist")),
            objectives=normalise_sequence(mapping.get("objectives", ())),
            signals=ensure_macro_signals(mapping.get("signals", ())),
            actions=normalise_sequence(mapping.get("actions", ())),
            timeframe=str(mapping.get("timeframe", "current cycle")),
        )
        self._history.append(macro_context)

    def latest(self) -> MacroContext | None:
        """Return the most recent context if one exists."""

        return self._history[-1] if self._history else None

    def iter_history(self) -> Iterator[MacroContext]:
        """Iterate from most recent to oldest context."""

        return reversed(tuple(self._history))

    def to_context_layer(self) -> dict[str, str]:
        """Produce a condensed context layer for prompt composition."""

        if not self._history:
            return {"historical_context": "- No previous briefing data captured."}

        summaries: list[str] = []
        for index, context in enumerate(self.iter_history(), start=1):
            summary = summarise_signals(context.signals, limit=3)
            objectives = "; ".join(context.objectives) if context.objectives else "Maintain observation"
            summaries.append(f"T-{index}: {objectives} | {summary.replace(chr(10), '; ')}")
        return {"historical_context": "\n".join(summaries)}
