"""Experience crawling utilities for reinforcement learning."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Mapping, Sequence

from .agent import DynamicRLAgent
from .engine import ActionT, RLExperience, SupportsRLEnvironment, StateT

__all__ = ["ExperienceCrawler"]


@dataclass(slots=True)
class ExperienceCrawler:
    """Collect experiences from environments for offline replay."""

    explore: float = 0.2
    seed: int | None = None

    def __post_init__(self) -> None:
        if not 0.0 <= self.explore <= 1.0:
            raise ValueError("explore must be within [0, 1]")
        self._rng = random.Random(self.seed)

    def collect(
        self,
        agent: DynamicRLAgent[StateT, ActionT],
        environment: SupportsRLEnvironment[StateT, ActionT],
        *,
        episodes: int = 1,
        learn: bool = False,
    ) -> list[RLExperience[StateT, ActionT]]:
        raw_actions = environment.action_space
        if isinstance(raw_actions, Sequence):
            actions: Sequence[ActionT] = raw_actions
        elif hasattr(raw_actions, "__iter__"):
            actions = tuple(raw_actions)  # type: ignore[arg-type]
        elif hasattr(raw_actions, "n"):
            actions = tuple(range(int(getattr(raw_actions, "n"))))
        else:  # pragma: no cover - defensive guard
            raise TypeError("environment action_space must provide actions or an integer 'n' attribute")
        if not actions:
            raise ValueError("environment action_space must not be empty")

        experiences: list[RLExperience[StateT, ActionT]] = []
        for _ in range(episodes):
            state = environment.reset()
            for _ in range(agent.model.config.max_steps_per_episode):
                if self._rng.random() < self.explore:
                    action = self._rng.choice(tuple(actions))
                else:
                    action = agent.select_action(state, actions)
                step_result = environment.step(action)
                if len(step_result) == 4:
                    next_state, reward, done, info = step_result
                    if info is not None and not isinstance(info, Mapping):
                        raise TypeError("environment info payload must be a mapping or None")
                elif len(step_result) == 5:
                    next_state, reward, terminated_flag, truncated_flag, info = step_result
                    done = bool(terminated_flag or truncated_flag)
                    merged_info: dict[str, object]
                    if isinstance(info, Mapping):
                        merged_info = dict(info)
                    else:
                        merged_info = {}
                    merged_info.update({"terminated": bool(terminated_flag), "truncated": bool(truncated_flag)})
                    info = merged_info
                else:  # pragma: no cover - defensive guard
                    raise ValueError("environment step() must return a 4- or 5-tuple")

                experience = RLExperience(state, action, float(reward), next_state, bool(done), info)
                experiences.append(experience)
                agent.observe(experience, learn=learn)
                state = next_state
                if done:
                    break
        return experiences
