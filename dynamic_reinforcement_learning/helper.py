"""Utility helpers for evaluating reinforcement learning agents."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Generator, Iterable, Mapping, Sequence

from .agent import DynamicRLAgent
from .engine import ActionT, RLExperience, RLTrainingMetrics, SupportsRLEnvironment, StateT

__all__ = ["evaluate_policy", "rollout_episode"]


@contextmanager
def _temporary_epsilon(agent: DynamicRLAgent[StateT, ActionT], value: float) -> Generator[None, None, None]:
    original = agent.engine._epsilon  # noqa: SLF001 - temporary override for evaluation
    agent.engine._epsilon = value
    try:
        yield
    finally:
        agent.engine._epsilon = original


def rollout_episode(
    agent: DynamicRLAgent[StateT, ActionT],
    environment: SupportsRLEnvironment[StateT, ActionT],
    *,
    greedy: bool = True,
    max_steps: int | None = None,
) -> tuple[list[RLExperience[StateT, ActionT]], float, StateT, bool]:
    """Execute a single episode and return the collected experiences and reward."""

    actions: Sequence[ActionT]
    raw_actions = environment.action_space
    if isinstance(raw_actions, Iterable):
        actions = tuple(raw_actions)
    elif hasattr(raw_actions, "n"):
        actions = tuple(range(int(getattr(raw_actions, "n"))))
    else:  # pragma: no cover - defensive guard
        raise TypeError("environment action_space must be iterable or expose an integer 'n' attribute")
    if not actions:
        raise ValueError("environment action_space must not be empty")

    state = environment.reset()
    steps = max_steps or agent.model.config.max_steps_per_episode
    experiences: list[RLExperience[StateT, ActionT]] = []
    total_reward = 0.0
    terminated = False

    for _ in range(steps):
        if greedy:
            action = agent.select_action(state, actions)
        else:
            action = agent.engine._rng.choice(tuple(actions))  # noqa: SLF001 - evaluation sampling
        step_result = environment.step(action)
        if len(step_result) == 4:
            next_state, reward, done, info = step_result
            if info is not None and not isinstance(info, Mapping):
                raise TypeError("environment info payload must be a mapping or None")
        elif len(step_result) == 5:
            next_state, reward, terminated_flag, truncated_flag, info = step_result
            done = bool(terminated_flag or truncated_flag)
            merged_info: dict[str, object]
            if isinstance(info, dict):
                merged_info = dict(info)
            else:
                merged_info = {}
            merged_info.update({"terminated": bool(terminated_flag), "truncated": bool(truncated_flag)})
            info = merged_info
        else:  # pragma: no cover - defensive guard
            raise ValueError("environment step() must return a 4- or 5-tuple")

        experience = RLExperience(state, action, float(reward), next_state, bool(done), info)
        experiences.append(experience)
        total_reward += float(reward)
        state = next_state
        if done:
            terminated = True
            break

    return experiences, total_reward, state, terminated


def evaluate_policy(
    agent: DynamicRLAgent[StateT, ActionT],
    environment: SupportsRLEnvironment[StateT, ActionT],
    *,
    episodes: int = 5,
) -> list[RLTrainingMetrics[StateT]]:
    """Evaluate the greedy policy without modifying learned values."""

    metrics: list[RLTrainingMetrics[StateT]] = []
    with _temporary_epsilon(agent, 0.0):
        for episode in range(1, episodes + 1):
            experiences, total_reward, final_state, terminated = rollout_episode(agent, environment, greedy=True)
            metrics.append(
                RLTrainingMetrics(
                    episode=episode,
                    total_reward=total_reward,
                    steps=len(experiences),
                    epsilon=0.0,
                    average_td_error=0.0,
                    max_td_error=0.0,
                    final_state=final_state,
                    terminated=terminated,
                )
            )
    return metrics
