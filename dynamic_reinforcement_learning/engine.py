"""Tabular reinforcement learning engine with experience replay support."""

from __future__ import annotations

from collections import deque
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import (
    Callable,
    Deque,
    Dict,
    Generic,
    Hashable,
    Mapping,
    MutableMapping,
    Protocol,
    Sequence,
    TypeVar,
    runtime_checkable,
)
import random

__all__ = [
    "RLExperience",
    "RLTrainingConfig",
    "RLTrainingMetrics",
    "DynamicReinforcementLearningEngine",
    "SupportsRLEnvironment",
]


StateT = TypeVar("StateT", bound=Hashable)
ActionT = TypeVar("ActionT", bound=Hashable)


@runtime_checkable
class SupportsRLEnvironment(Protocol[StateT, ActionT]):
    """Protocol describing the minimal API required for training."""

    action_space: Iterable[ActionT]

    def reset(self) -> StateT:
        ...

    def step(
        self, action: ActionT
    ) -> tuple[StateT, float, bool, Mapping[str, object]] | tuple[StateT, float, bool, bool, Mapping[str, object]]:
        ...


@dataclass(slots=True)
class RLExperience(Generic[StateT, ActionT]):
    """Transition observed while interacting with the environment."""

    state: StateT
    action: ActionT
    reward: float
    next_state: StateT
    done: bool
    info: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.reward = float(self.reward)
        self.done = bool(self.done)


@dataclass(slots=True)
class RLTrainingConfig:
    """Configuration parameters controlling the learning schedule."""

    episodes: int = 100
    max_steps_per_episode: int = 500
    discount_factor: float = 0.99
    learning_rate: float = 0.1
    epsilon_start: float = 1.0
    epsilon_end: float = 0.05
    epsilon_decay: float = 0.995
    replay_capacity: int | None = 10_000
    batch_size: int = 32
    min_replay_size: int = 128
    reward_clipping: tuple[float, float] | None = (-1.0, 1.0)
    target_sync_interval: int | None = 250
    seed: int | None = None

    def __post_init__(self) -> None:
        if self.episodes <= 0:
            raise ValueError("episodes must be positive")
        if self.max_steps_per_episode <= 0:
            raise ValueError("max_steps_per_episode must be positive")
        if not (0.0 < self.discount_factor <= 1.0):
            raise ValueError("discount_factor must be in (0, 1]")
        if self.learning_rate <= 0.0:
            raise ValueError("learning_rate must be positive")
        if self.epsilon_start < 0.0 or self.epsilon_end < 0.0:
            raise ValueError("epsilon values must be non-negative")
        if self.epsilon_start < self.epsilon_end:
            raise ValueError("epsilon_start must be greater than or equal to epsilon_end")
        self.epsilon_decay = float(self.epsilon_decay)
        if self.epsilon_decay <= 0.0:
            raise ValueError("epsilon_decay must be positive")
        if self.replay_capacity is not None and self.replay_capacity <= 0:
            raise ValueError("replay_capacity must be positive when provided")
        if self.batch_size <= 0:
            raise ValueError("batch_size must be positive")
        if self.min_replay_size < 0:
            raise ValueError("min_replay_size cannot be negative")
        if self.reward_clipping is not None:
            low, high = self.reward_clipping
            if low > high:
                raise ValueError("reward_clipping lower bound must not exceed upper bound")
        if self.target_sync_interval is not None and self.target_sync_interval <= 0:
            raise ValueError("target_sync_interval must be positive when provided")
        if self.seed is not None:
            self.seed = int(self.seed)


@dataclass(slots=True)
class RLTrainingMetrics(Generic[StateT]):
    """Aggregate statistics produced for every training episode."""

    episode: int
    total_reward: float
    steps: int
    epsilon: float
    average_td_error: float
    max_td_error: float
    final_state: StateT
    terminated: bool
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class DynamicReinforcementLearningEngine(Generic[StateT, ActionT]):
    """Implements epsilon-greedy Q-learning with optional experience replay."""

    def __init__(
        self,
        *,
        config: RLTrainingConfig | None = None,
        q_table: MutableMapping[tuple[StateT, ActionT], float] | None = None,
        value_initializer: Callable[[StateT, Sequence[ActionT]], float] | None = None,
    ) -> None:
        self.config = config or RLTrainingConfig()
        self._rng = random.Random(self.config.seed)
        self._q_table: MutableMapping[tuple[StateT, ActionT], float]
        self._q_table = q_table or {}
        self._target_q_table: Dict[tuple[StateT, ActionT], float] | None = None
        if self.config.target_sync_interval is not None:
            self._target_q_table = dict(self._q_table)
        self._value_initializer = value_initializer or (lambda _state, _actions: 0.0)
        self._replay_buffer: Deque[RLExperience[StateT, ActionT]] | None = None
        if self.config.replay_capacity:
            self._replay_buffer = deque(maxlen=self.config.replay_capacity)
        self._epsilon = self.config.epsilon_start
        self._actions: tuple[ActionT, ...] = ()

    def policy(self, state: StateT, actions: Sequence[ActionT]) -> ActionT:
        """Return the greedy action for a given state."""

        action_values = self._action_values(state, actions)
        best_value = max(action_values.values())
        best_actions = [action for action, value in action_values.items() if value == best_value]
        return self._rng.choice(best_actions)

    def ingest_experience(
        self,
        experience: RLExperience[StateT, ActionT],
        *,
        learn: bool = False,
    ) -> float:
        """Store an externally generated transition and optionally learn from it."""

        self._register_action(experience.action)
        self._store_experience(experience)
        if learn:
            return self._learn_from_experience(experience)
        return 0.0

    def replay(self, *, batch_size: int | None = None) -> float:
        """Perform a replay-driven learning step when experiences are available."""

        if self._replay_buffer is None or not self._replay_buffer:
            return 0.0
        experience = self._rng.choice(tuple(self._replay_buffer))
        if batch_size is None or batch_size <= 0 or batch_size == self.config.batch_size:
            return self._learn_from_experience(experience)
        original_batch = self.config.batch_size
        try:
            self.config.batch_size = batch_size
            return self._learn_from_experience(experience)
        finally:
            self.config.batch_size = original_batch

    def train(
        self,
        environment: SupportsRLEnvironment[StateT, ActionT],
        *,
        episodes: int | None = None,
    ) -> list[RLTrainingMetrics[StateT]]:
        """Train the agent on the provided environment."""

        if not isinstance(environment, SupportsRLEnvironment):  # pragma: no cover - defensive guard
            raise TypeError("environment does not satisfy the SupportsRLEnvironment protocol")

        raw_actions = environment.action_space
        if isinstance(raw_actions, Iterable):
            actions = tuple(raw_actions)
        elif hasattr(raw_actions, "n"):
            actions = tuple(range(int(getattr(raw_actions, "n"))))
        else:  # pragma: no cover - defensive guard
            raise TypeError(
                "environment action_space must be iterable or expose an integer 'n' attribute",
            )
        if not actions:
            raise ValueError("environment action_space must contain at least one action")
        self._actions = actions

        env_reset = environment.reset
        env_step = environment.step

        episode_count = episodes or self.config.episodes
        metrics: list[RLTrainingMetrics[StateT]] = []

        for episode in range(1, episode_count + 1):
            state = env_reset()
            total_reward = 0.0
            td_errors: list[float] = []
            terminated = False

            for _ in range(1, self.config.max_steps_per_episode + 1):
                action = self._select_action(state, actions)
                step_result = env_step(action)
                if not isinstance(step_result, tuple):  # pragma: no cover - defensive guard
                    raise TypeError("environment step() must return a tuple")
                if len(step_result) == 4:
                    next_state, reward, done, info = step_result
                    if info is not None and not isinstance(info, Mapping):
                        raise TypeError("environment info payload must be a mapping or None")
                elif len(step_result) == 5:
                    next_state, reward, terminated_flag, truncated_flag, info = step_result
                    done = bool(terminated_flag or truncated_flag)
                    base_info: Mapping[str, object] | None
                    if info is None:
                        base_info = None
                    elif isinstance(info, Mapping):
                        base_info = info
                    else:  # pragma: no cover - defensive guard
                        raise TypeError("environment info payload must be a mapping or None")
                    info = {
                        "terminated": bool(terminated_flag),
                        "truncated": bool(truncated_flag),
                        **(dict(base_info) if base_info is not None else {}),
                    }
                else:  # pragma: no cover - defensive guard
                    raise ValueError("environment step() must return a 4- or 5-tuple")

                reward = self._clip_reward(reward)
                experience = RLExperience(state, action, reward, next_state, bool(done), info)
                self._store_experience(experience)
                td_error = self._learn_from_experience(experience)
                td_errors.append(abs(td_error))
                total_reward += reward
                state = next_state

                if done:
                    terminated = True
                    break

            metrics.append(
                RLTrainingMetrics(
                    episode=episode,
                    total_reward=total_reward,
                    steps=len(td_errors),
                    epsilon=self._epsilon,
                    average_td_error=sum(td_errors) / len(td_errors) if td_errors else 0.0,
                    max_td_error=max(td_errors) if td_errors else 0.0,
                    final_state=state,
                    terminated=terminated,
                )
            )

            self._epsilon = max(
                self.config.epsilon_end,
                self._epsilon * self.config.epsilon_decay,
            )

            if self._target_q_table is not None and self.config.target_sync_interval is not None:
                if episode % self.config.target_sync_interval == 0:
                    self._target_q_table = dict(self._q_table)

        return metrics

    # ------------------------------------------------------------------
    # internal helpers

    def _clip_reward(self, reward: float) -> float:
        if self.config.reward_clipping is None:
            return float(reward)
        low, high = self.config.reward_clipping
        return float(max(low, min(high, reward)))

    def _select_action(self, state: StateT, actions: Sequence[ActionT]) -> ActionT:
        if self._rng.random() < self._epsilon:
            return self._rng.choice(tuple(actions))
        return self.policy(state, actions)

    def _store_experience(self, experience: RLExperience[StateT, ActionT]) -> None:
        if self._replay_buffer is not None:
            self._replay_buffer.append(experience)

    def _learn_from_experience(self, latest: RLExperience[StateT, ActionT]) -> float:
        batch = [latest]
        if (
            self._replay_buffer is not None
            and len(self._replay_buffer) >= max(self.config.min_replay_size, self.config.batch_size)
            and self.config.batch_size > 1
        ):
            batch = list(self._rng.sample(self._replay_buffer, self.config.batch_size))

        total_error = 0.0
        for experience in batch:
            target = self._target_value(experience)
            q_key = (experience.state, experience.action)
            current = self._q_table.get(q_key)
            if current is None:
                current = self._value_initializer(experience.state, self._actions or (experience.action,))
            td_error = target - current
            updated = current + self.config.learning_rate * td_error
            self._q_table[q_key] = updated
            total_error += td_error
        return total_error / len(batch)

    def _action_values(self, state: StateT, actions: Sequence[ActionT]) -> Dict[ActionT, float]:
        if not actions:
            actions = self._actions
            if not actions:
                raise ValueError("action space is undefined; call train() before querying policies")
        values: Dict[ActionT, float] = {}
        for action in actions:
            q_key = (state, action)
            value = self._q_table.get(q_key)
            if value is None:
                value = self._value_initializer(state, actions)
                self._q_table[q_key] = value
            values[action] = value
        return values

    def _target_value(self, experience: RLExperience[StateT, ActionT]) -> float:
        if experience.done:
            return experience.reward
        next_actions = self._action_values(experience.next_state, self._actions)
        next_best = max(next_actions.values(), default=0.0)
        if self._target_q_table is not None:
            next_best = self._target_best_value(experience.next_state)
        return experience.reward + self.config.discount_factor * next_best

    def _target_best_value(self, state: StateT) -> float:
        assert self._target_q_table is not None  # for type-checkers
        best = float("-inf")
        for action in self._actions:
            candidate = self._target_q_table.get((state, action))
            if candidate is None:
                candidate = self._value_initializer(state, self._actions)
            if candidate > best:
                best = candidate
        return 0.0 if best == float("-inf") else best

    def q_value(self, state: StateT, action: ActionT) -> float:
        """Return the learned Q-value for a state/action pair."""

        return self._q_table.get((state, action), 0.0)

    def export_policy(self) -> Dict[StateT, ActionT]:
        """Return the greedy policy for all known states."""

        policy: Dict[StateT, ActionT] = {}
        for state, _ in {(s, a) for (s, a) in self._q_table.keys()}:
            policy[state] = self.policy(state, self._actions)
        return policy

    def _register_action(self, action: ActionT) -> None:
        if self._actions:
            if action not in self._actions:
                self._actions = (*self._actions, action)
        else:
            self._actions = (action,)
