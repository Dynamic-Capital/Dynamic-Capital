"""Utility helpers powering the dynamic macro-aware pipeline."""

from __future__ import annotations

from typing import Iterable, Mapping, Sequence

from dynamic_macro_model import MacroSignal, normalise_sequence

__all__ = [
    "ensure_macro_signals",
    "summarise_signals",
    "select_top_signals",
    "format_objectives",
]


def ensure_macro_signals(values: Iterable[MacroSignal | Mapping[str, object]]) -> list[MacroSignal]:
    """Coerce an iterable of signal-like objects into :class:`MacroSignal` instances."""

    signals: list[MacroSignal] = []
    for value in values:
        if isinstance(value, MacroSignal):
            signals.append(value)
        elif isinstance(value, Mapping):
            signals.append(MacroSignal.from_mapping(value))
        else:
            raise TypeError(f"Unsupported signal type: {type(value)!r}")
    signals.sort(key=lambda signal: signal.weight, reverse=True)
    return signals


def select_top_signals(signals: Sequence[MacroSignal], *, limit: int | None = 3) -> list[MacroSignal]:
    """Return the top weighted signals preserving stability."""

    if limit is None or limit >= len(signals):
        return list(signals)
    return list(signals[:limit])


def summarise_signals(signals: Sequence[MacroSignal], *, limit: int | None = 3) -> str:
    """Generate a bullet summary of the provided signals."""

    if not signals:
        return "- No significant macro signals registered."

    ranked = select_top_signals(signals, limit=limit)
    lines = [f"- {signal.format_summary()}" for signal in ranked]
    return "\n".join(lines)


def format_objectives(objectives: Iterable[str]) -> str:
    """Return a formatted objective list suitable for prompt inclusion."""

    normalised = normalise_sequence(objectives)
    if not normalised:
        return "- Maintain observation until new data arrives."
    return "\n".join(f"- {objective}" for objective in normalised)
