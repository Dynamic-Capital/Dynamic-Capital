"""Automation utilities for coordinating reinforcement learning runs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Generic

from .agent import DynamicRLAgent
from .engine import ActionT, RLTrainingMetrics, SupportsRLEnvironment, StateT
from .helper import evaluate_policy

__all__ = ["ReinforcementLearningBot"]


@dataclass(slots=True)
class ReinforcementLearningBot(Generic[StateT, ActionT]):
    """Drive training and evaluation workflows for an RL agent."""

    agent: DynamicRLAgent[StateT, ActionT]

    def train_and_evaluate(
        self,
        training_environment: SupportsRLEnvironment[StateT, ActionT],
        *,
        episodes: int | None = None,
        evaluation_environment: SupportsRLEnvironment[StateT, ActionT] | None = None,
        evaluation_episodes: int = 5,
    ) -> dict[str, list[RLTrainingMetrics[StateT]]]:
        training_metrics = self.agent.train(training_environment, episodes=episodes)
        evaluation_env = evaluation_environment or training_environment
        evaluation_metrics = evaluate_policy(
            self.agent,
            evaluation_env,
            episodes=evaluation_episodes,
        )
        return {"training": training_metrics, "evaluation": evaluation_metrics}
