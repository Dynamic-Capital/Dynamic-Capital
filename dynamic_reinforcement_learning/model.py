"""Lightweight reinforcement learning model abstractions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Generic, MutableMapping

from .engine import ActionT, RLTrainingConfig, StateT

__all__ = ["RLModel"]


@dataclass(slots=True)
class RLModel(Generic[StateT, ActionT]):
    """Container for learned Q-values and training configuration."""

    q_table: MutableMapping[tuple[StateT, ActionT], float] = field(default_factory=dict)
    visit_counts: MutableMapping[tuple[StateT, ActionT], int] = field(default_factory=dict)
    config: RLTrainingConfig = field(default_factory=RLTrainingConfig)

    def value(self, state: StateT, action: ActionT, default: float = 0.0) -> float:
        """Return the stored Q-value for ``state`` and ``action``."""

        return float(self.q_table.get((state, action), default))

    def update(self, state: StateT, action: ActionT, value: float) -> None:
        """Persist a new Q-value and track visitation counts."""

        key = (state, action)
        self.q_table[key] = float(value)
        self.visit_counts[key] = self.visit_counts.get(key, 0) + 1

    def copy(self) -> "RLModel[StateT, ActionT]":
        """Create a shallow copy of the model for safe experimentation."""

        return RLModel(
            q_table=dict(self.q_table),
            visit_counts=dict(self.visit_counts),
            config=self.config,
        )

    def as_read_only(self) -> tuple[Dict[tuple[StateT, ActionT], float], RLTrainingConfig]:
        """Expose immutable snapshots of the model data."""

        return dict(self.q_table), self.config
