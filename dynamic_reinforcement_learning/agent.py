"""High-level agent façade for the reinforcement learning engine."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic, Iterable, Sequence

from .engine import (
    ActionT,
    DynamicReinforcementLearningEngine,
    RLExperience,
    RLTrainingConfig,
    RLTrainingMetrics,
    SupportsRLEnvironment,
    StateT,
)
from .model import RLModel

__all__ = ["DynamicRLAgent"]


@dataclass(slots=True)
class DynamicRLAgent(Generic[StateT, ActionT]):
    """Wraps :class:`DynamicReinforcementLearningEngine` with model utilities."""

    engine: DynamicReinforcementLearningEngine[StateT, ActionT]
    model: RLModel[StateT, ActionT]

    @classmethod
    def create(
        cls,
        *,
        config: RLTrainingConfig | None = None,
        q_table: dict[tuple[StateT, ActionT], float] | None = None,
    ) -> "DynamicRLAgent[StateT, ActionT]":
        model = RLModel(
            q_table=q_table or {},
            config=config or RLTrainingConfig(),
        )
        engine = DynamicReinforcementLearningEngine(
            config=model.config,
            q_table=model.q_table,
        )
        return cls(engine=engine, model=model)

    def select_action(self, state: StateT, actions: Sequence[ActionT]) -> ActionT:
        """Return the current greedy action."""

        return self.engine.policy(state, actions)

    def train(
        self,
        environment: SupportsRLEnvironment[StateT, ActionT],
        *,
        episodes: int | None = None,
    ) -> list[RLTrainingMetrics[StateT]]:
        """Train using the underlying engine and synchronise model statistics."""

        return self.engine.train(environment, episodes=episodes)

    def observe(self, experience: RLExperience[StateT, ActionT], *, learn: bool = False) -> float:
        """Inject external experience into the replay buffer."""

        td_error = self.engine.ingest_experience(experience, learn=learn)
        if learn:
            self.model.update(experience.state, experience.action, self.engine.q_value(experience.state, experience.action))
        return td_error

    def warm_up(self, experiences: Iterable[RLExperience[StateT, ActionT]]) -> None:
        """Populate the replay buffer without updating model parameters."""

        for experience in experiences:
            self.observe(experience, learn=False)

    def greedy_policy(self) -> dict[StateT, ActionT]:
        """Export the agent's greedy policy."""

        return self.engine.export_policy()
