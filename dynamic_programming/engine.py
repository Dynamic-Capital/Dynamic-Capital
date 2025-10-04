"""Core dynamic programming primitives for Dynamic Capital models."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Dict, Iterable, Mapping, Sequence


__all__ = [
    "Decision",
    "DynamicProgrammingProblem",
    "PolicyStep",
    "DynamicProgrammingSolution",
    "DynamicProgrammingEngine",
]


def _normalise_key(value: str, *, kind: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{kind} must not be empty")
    return cleaned


@dataclass(slots=True, frozen=True)
class Decision:
    """Single decision available from a state within a stage."""

    action: str
    next_state: str
    reward: float = 0.0

    def __post_init__(self) -> None:
        object.__setattr__(self, "action", _normalise_key(self.action, kind="action"))
        object.__setattr__(self, "next_state", _normalise_key(self.next_state, kind="next_state"))
        object.__setattr__(self, "reward", float(self.reward))


@dataclass(slots=True)
class DynamicProgrammingProblem:
    """Finite-horizon dynamic programming specification."""

    horizon: int
    states: Sequence[str]
    transitions: Mapping[tuple[int, str], Sequence[Decision | Mapping[str, object]]]
    terminal_rewards: Mapping[str, float] | None = None
    discount: float = 1.0

    _state_index: Mapping[str, int] = field(init=False, repr=False)
    _transitions: Mapping[tuple[int, str], tuple[Decision, ...]] = field(
        init=False, repr=False
    )
    _terminal_values: Mapping[str, float] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        if self.horizon <= 0:
            raise ValueError("horizon must be positive")
        if not self.states:
            raise ValueError("states must not be empty")

        normalised_states = []
        for state in self.states:
            normalised_states.append(_normalise_key(state, kind="state"))
        if len(set(normalised_states)) != len(normalised_states):
            raise ValueError("states must be unique")
        self.states = tuple(normalised_states)
        self._state_index = MappingProxyType({name: idx for idx, name in enumerate(self.states)})

        if not (0.0 <= float(self.discount) <= 1.0):
            raise ValueError("discount must be between 0 and 1 inclusive")
        self.discount = float(self.discount)

        cleaned_transitions: Dict[tuple[int, str], tuple[Decision, ...]] = {}
        for key, decisions in self.transitions.items():
            if not isinstance(key, tuple) or len(key) != 2:
                raise TypeError("transition keys must be (stage, state) tuples")
            raw_stage, raw_state = key
            stage = int(raw_stage)
            if stage < 0 or stage >= self.horizon:
                raise ValueError("transition stage must be within the planning horizon")
            state = _normalise_key(str(raw_state), kind="state")
            if state not in self._state_index:
                raise KeyError(f"unknown state '{state}' in transition table")
            cleaned_transitions[(stage, state)] = self._normalise_decisions(decisions)

        self._transitions = MappingProxyType(cleaned_transitions)

        terminal_rewards = self.terminal_rewards or {}
        cleaned_terminal: Dict[str, float] = {}
        for state in self.states:
            reward = float(terminal_rewards.get(state, 0.0))
            cleaned_terminal[state] = reward
        self._terminal_values = MappingProxyType(cleaned_terminal)

    def _normalise_decisions(
        self, decisions: Sequence[Decision | Mapping[str, object]]
    ) -> tuple[Decision, ...]:
        if not decisions:
            return ()
        normalised: list[Decision] = []
        seen_actions: set[str] = set()
        for item in decisions:
            decision = self._coerce_decision(item)
            if decision.next_state not in self._state_index:
                raise KeyError(
                    f"decision '{decision.action}' references unknown state '{decision.next_state}'"
                )
            if decision.action in seen_actions:
                raise ValueError(
                    f"duplicate action '{decision.action}' for the same stage/state"
                )
            seen_actions.add(decision.action)
            normalised.append(decision)
        return tuple(normalised)

    @staticmethod
    def _coerce_decision(entry: Decision | Mapping[str, object]) -> Decision:
        if isinstance(entry, Decision):
            return entry
        if isinstance(entry, Mapping):
            payload = dict(entry)
            if "action" not in payload or "next_state" not in payload:
                raise KeyError("decision mappings require 'action' and 'next_state'")
            reward = float(payload.get("reward", 0.0))
            return Decision(action=str(payload["action"]), next_state=str(payload["next_state"]), reward=reward)
        raise TypeError("decisions must be Decision instances or mapping payloads")

    def transitions_for(self, stage: int, state: str) -> tuple[Decision, ...]:
        stage_index = int(stage)
        if stage_index < 0 or stage_index >= self.horizon:
            raise ValueError("stage must be within the problem horizon")
        cleaned_state = _normalise_key(state, kind="state")
        if cleaned_state not in self._state_index:
            raise KeyError(f"unknown state '{cleaned_state}'")
        key = (stage_index, cleaned_state)
        return self._transitions.get(key, ())

    @property
    def terminal_values(self) -> Mapping[str, float]:
        return self._terminal_values

    @property
    def state_index(self) -> Mapping[str, int]:
        return self._state_index


@dataclass(slots=True)
class PolicyStep:
    """Represents the optimal action for a state at a given stage."""

    stage: int
    state: str
    value: float
    action: str | None = None


@dataclass(slots=True)
class DynamicProgrammingSolution:
    """Outcome of solving a :class:`DynamicProgrammingProblem`."""

    start_state: str
    total_value: float
    steps: tuple[PolicyStep, ...]
    value_table: Mapping[int, Mapping[str, float]]

    def trajectory(self) -> tuple[str, ...]:
        ordered: list[str] = []
        seen_stage: set[int] = set()
        for step in self.steps:
            if step.stage not in seen_stage:
                ordered.append(step.state)
                seen_stage.add(step.stage)
        return tuple(ordered)

    def action_plan(self) -> tuple[str, ...]:
        return tuple(step.action for step in self.steps if step.action)

    def value_for(self, stage: int, state: str) -> float:
        mapping = self.value_table.get(int(stage))
        if mapping is None:
            raise KeyError(f"unknown stage {stage}")
        cleaned_state = _normalise_key(state, kind="state")
        if cleaned_state not in mapping:
            raise KeyError(f"unknown state '{cleaned_state}'")
        return mapping[cleaned_state]


class DynamicProgrammingEngine:
    """Backward-induction solver for finite-horizon planning problems."""

    def __init__(self, problem: DynamicProgrammingProblem):
        self.problem = problem
        self._value_tables: tuple[Mapping[str, float], ...] | None = None
        self._value_tables_by_stage: Mapping[int, Mapping[str, float]] | None = None
        self._policy_table: Mapping[tuple[int, str], Decision | None] | None = None
        self._action_value_table: Mapping[
            tuple[int, str], Mapping[str, float]
        ] | None = None

    def _ensure_cache(self) -> None:
        if self._value_tables is not None:
            return

        horizon = self.problem.horizon
        states = self.problem.states

        value_table: list[Dict[str, float]] = [
            {state: 0.0 for state in states} for _ in range(horizon + 1)
        ]
        value_table[horizon].update(self.problem.terminal_values)

        policy: Dict[tuple[int, str], Decision | None] = {}
        action_values: Dict[tuple[int, str], Mapping[str, float]] = {}

        for stage in range(horizon - 1, -1, -1):
            next_values = value_table[stage + 1]
            current = value_table[stage]
            for state in states:
                decisions = self.problem.transitions_for(stage, state)
                if not decisions:
                    current[state] = next_values.get(state, 0.0)
                    policy[(stage, state)] = None
                    action_values[(stage, state)] = MappingProxyType({})
                    continue

                best_value = -math.inf
                best_decision: Decision | None = None
                q_values: Dict[str, float] = {}

                for decision in decisions:
                    continuation = next_values.get(decision.next_state, 0.0)
                    candidate = decision.reward + self.problem.discount * continuation
                    q_values[decision.action] = candidate
                    if candidate > best_value:
                        best_value = candidate
                        best_decision = decision

                action_values[(stage, state)] = MappingProxyType(dict(q_values))

                if best_decision is None:
                    current[state] = next_values.get(state, 0.0)
                    policy[(stage, state)] = None
                else:
                    current[state] = best_value
                    policy[(stage, state)] = best_decision

        stage_tables: list[Mapping[str, float]] = [
            MappingProxyType(dict(values)) for values in value_table
        ]

        self._value_tables = tuple(stage_tables)
        self._value_tables_by_stage = MappingProxyType(
            {stage: stage_tables[stage] for stage in range(len(stage_tables))}
        )
        self._policy_table = MappingProxyType(dict(policy))
        self._action_value_table = MappingProxyType(dict(action_values))

    def solve(self, start_state: str) -> DynamicProgrammingSolution:
        cleaned_state = _normalise_key(start_state, kind="state")
        if cleaned_state not in self.problem.state_index:
            raise KeyError(f"unknown start state '{cleaned_state}'")

        self._ensure_cache()
        assert self._value_tables is not None
        assert self._policy_table is not None
        assert self._value_tables_by_stage is not None

        horizon = self.problem.horizon
        steps: list[PolicyStep] = []
        state = cleaned_state
        for stage in range(horizon):
            value = self._value_tables[stage].get(state, 0.0)
            decision = self._policy_table.get((stage, state))
            action = decision.action if decision else None
            steps.append(PolicyStep(stage=stage, state=state, value=value, action=action))
            if decision:
                state = decision.next_state
        steps.append(
            PolicyStep(
                stage=horizon,
                state=state,
                value=self._value_tables[horizon].get(state, 0.0),
                action=None,
            )
        )

        return DynamicProgrammingSolution(
            start_state=cleaned_state,
            total_value=self._value_tables[0][cleaned_state],
            steps=tuple(steps),
            value_table=self._value_tables_by_stage,
        )

    def evaluate_policy(self, steps: Iterable[PolicyStep]) -> float:
        total = 0.0
        discount = 1.0
        ordered_steps = list(steps)
        if not ordered_steps:
            return 0.0

        for step in ordered_steps:
            if step.action is None:
                continue
            decisions = self.problem.transitions_for(step.stage, step.state)
            decision = next((item for item in decisions if item.action == step.action), None)
            if decision is None:
                raise ValueError(
                    f"policy references unknown action '{step.action}' for state '{step.state}'"
                )
            total += discount * decision.reward
            discount *= self.problem.discount

        terminal_state = ordered_steps[-1].state
        terminal_reward = self.problem.terminal_values.get(terminal_state, 0.0)
        return total + discount * terminal_reward

    def action_values(self, stage: int, state: str) -> Mapping[str, float]:
        stage_index = int(stage)
        if stage_index < 0 or stage_index >= self.problem.horizon:
            raise ValueError("stage must be within the problem horizon")
        cleaned_state = _normalise_key(state, kind="state")
        if cleaned_state not in self.problem.state_index:
            raise KeyError(f"unknown state '{cleaned_state}'")

        self._ensure_cache()
        assert self._action_value_table is not None

        mapping = self._action_value_table.get((stage_index, cleaned_state))
        if mapping is None:
            return MappingProxyType({})
        return mapping

    def state_value(self, stage: int, state: str) -> float:
        stage_index = int(stage)
        if stage_index < 0 or stage_index > self.problem.horizon:
            raise ValueError("stage must be within the problem horizon")
        cleaned_state = _normalise_key(state, kind="state")
        if cleaned_state not in self.problem.state_index:
            raise KeyError(f"unknown state '{cleaned_state}'")

        self._ensure_cache()
        assert self._value_tables is not None

        return self._value_tables[stage_index].get(cleaned_state, 0.0)

    @property
    def value_table(self) -> Mapping[int, Mapping[str, float]]:
        self._ensure_cache()
        assert self._value_tables_by_stage is not None
        return self._value_tables_by_stage
