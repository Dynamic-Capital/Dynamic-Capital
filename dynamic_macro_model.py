"""Macro-aware data models shared across the dynamic macro stack."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping, MutableSequence

__all__ = ["MacroSignal", "MacroContext", "normalise_sequence"]


@dataclass(frozen=True)
class MacroSignal:
    """Quantified macro observation used to brief downstream agents."""

    name: str
    value: Any
    weight: float = 1.0
    narrative: str | None = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("MacroSignal requires a non-empty name")
        if self.weight < 0:
            raise ValueError("MacroSignal weight must be non-negative")

    def as_dict(self) -> dict[str, Any]:
        """Return a serialisable representation for logging or prompts."""

        payload: dict[str, Any] = {
            "name": self.name.strip(),
            "value": self.value,
            "weight": float(self.weight),
        }
        if self.narrative:
            payload["narrative"] = self.narrative.strip()
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload

    def format_summary(self) -> str:
        """Return a concise, human readable description of the signal."""

        parts = [self.name.strip()]
        if self.value not in (None, ""):
            parts.append(str(self.value))
        if self.narrative:
            parts.append(self.narrative.strip())
        return " – ".join(parts)

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "MacroSignal":
        """Build a :class:`MacroSignal` from a generic mapping."""

        name = str(mapping.get("name", "")).strip()
        if not name:
            raise ValueError("Signal mapping must provide a name")
        weight_raw = mapping.get("weight", 1.0)
        weight = float(weight_raw) if not isinstance(weight_raw, (int, float)) else float(weight_raw)
        narrative = mapping.get("narrative")
        metadata = mapping.get("metadata") if isinstance(mapping.get("metadata"), Mapping) else None
        return cls(
            name=name,
            value=mapping.get("value"),
            weight=weight,
            narrative=str(narrative).strip() if narrative else None,
            metadata=dict(metadata) if metadata else {},
        )


@dataclass(slots=True)
class MacroContext:
    """Structured description of the macro environment feeding the agent."""

    persona: str
    objectives: MutableSequence[str] = field(default_factory=list)
    signals: MutableSequence[MacroSignal] = field(default_factory=list)
    actions: MutableSequence[str] = field(default_factory=list)
    timeframe: str = "current cycle"
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.persona or not self.persona.strip():
            raise ValueError("MacroContext requires a persona description")
        self.persona = self.persona.strip()
        self.objectives = list(normalise_sequence(self.objectives))
        self.actions = list(normalise_sequence(self.actions))
        self.signals = [signal if isinstance(signal, MacroSignal) else MacroSignal.from_mapping(signal) for signal in self.signals]
        self.signals.sort(key=lambda sig: sig.weight, reverse=True)
        if not isinstance(self.timeframe, str):
            self.timeframe = str(self.timeframe)

    def add_signal(self, signal: MacroSignal) -> None:
        """Append a new signal keeping the weight ordering stable."""

        self.signals.append(signal)
        self.signals.sort(key=lambda sig: sig.weight, reverse=True)

    def add_objective(self, objective: str) -> None:
        """Append a normalised objective."""

        normalised = objective.strip()
        if normalised and normalised not in self.objectives:
            self.objectives.append(normalised)

    def add_action(self, action: str) -> None:
        """Append a follow-up action."""

        normalised = action.strip()
        if normalised and normalised not in self.actions:
            self.actions.append(normalised)

    def to_prompt_context(self) -> dict[str, Any]:
        """Convert the context to a prompt-ready mapping."""

        payload: dict[str, Any] = {
            "persona": self.persona,
            "objectives": list(self.objectives),
            "signals": [signal.as_dict() for signal in self.signals],
            "actions": list(self.actions),
            "timeframe": self.timeframe,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


def normalise_sequence(values: Iterable[str]) -> list[str]:
    """Return a list of stripped, de-duplicated strings preserving order."""

    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value is None:
            continue
        normalised = str(value).strip()
        if not normalised or normalised.lower() in seen:
            continue
        seen.add(normalised.lower())
        ordered.append(normalised)
    return ordered
