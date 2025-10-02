"""Factory helpers to assemble reinforcement learning agents."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Generic, MutableMapping, Sequence

from .agent import DynamicRLAgent
from .engine import ActionT, DynamicReinforcementLearningEngine, RLTrainingConfig, StateT
from .model import RLModel

__all__ = ["DynamicRLBuilder"]


ValueInitializer = Callable[[StateT, Sequence[ActionT]], float]


@dataclass(slots=True)
class DynamicRLBuilder(Generic[StateT, ActionT]):
    """Incrementally configure components required for an RL agent."""

    config: RLTrainingConfig = field(default_factory=RLTrainingConfig)
    q_table: MutableMapping[tuple[StateT, ActionT], float] = field(default_factory=dict)
    value_initializer: ValueInitializer | None = None

    def with_config(self, config: RLTrainingConfig) -> "DynamicRLBuilder[StateT, ActionT]":
        self.config = config
        return self

    def with_q_table(
        self,
        q_table: MutableMapping[tuple[StateT, ActionT], float],
    ) -> "DynamicRLBuilder[StateT, ActionT]":
        self.q_table = q_table
        return self

    def with_value_initializer(
        self,
        initializer: ValueInitializer,
    ) -> "DynamicRLBuilder[StateT, ActionT]":
        self.value_initializer = initializer
        return self

    def from_model(self, model: RLModel[StateT, ActionT]) -> "DynamicRLBuilder[StateT, ActionT]":
        self.config = model.config
        self.q_table = model.q_table
        return self

    def build(self) -> DynamicRLAgent[StateT, ActionT]:
        shared_table = self.q_table if self.q_table is not None else {}
        agent = DynamicRLAgent(
            engine=DynamicReinforcementLearningEngine(
                config=self.config,
                q_table=shared_table,
                value_initializer=self.value_initializer,
            ),
            model=RLModel(q_table=shared_table, config=self.config),
        )
        return agent
