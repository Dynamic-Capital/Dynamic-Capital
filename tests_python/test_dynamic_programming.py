from __future__ import annotations

import pytest

from dynamic_programming import (
    Decision,
    DynamicProgrammingEngine,
    DynamicProgrammingProblem,
)


def _build_problem() -> DynamicProgrammingProblem:
    transitions = {
        (0, "start"): (
            {"action": "invest", "next_state": "grow", "reward": 5.0},
            {"action": "hold", "next_state": "exit", "reward": 1.0},
        ),
        (1, "grow"): (
            Decision(action="scale", next_state="exit", reward=4.0),
            Decision(action="stop", next_state="exit", reward=2.0),
        ),
    }
    return DynamicProgrammingProblem(
        horizon=2,
        states=("start", "grow", "exit"),
        transitions=transitions,
        terminal_rewards={"exit": 3.0},
        discount=0.95,
    )


def test_dynamic_programming_engine_finds_optimal_policy() -> None:
    problem = _build_problem()
    engine = DynamicProgrammingEngine(problem)

    solution = engine.solve("start")

    assert solution.total_value == pytest.approx(11.5075, rel=1e-6)
    assert solution.action_plan() == ("invest", "scale")
    assert solution.value_for(1, "grow") == pytest.approx(6.85, rel=1e-6)

    # Ensure the policy reconstruction includes the terminal state step.
    assert solution.steps[-1].stage == problem.horizon
    assert solution.steps[-1].state == "exit"
    assert solution.steps[-1].action is None
    assert solution.steps[-1].value == pytest.approx(3.0)

    # The evaluate_policy helper should match the solver's objective.
    assert engine.evaluate_policy(solution.steps) == pytest.approx(
        solution.total_value, rel=1e-6
    )


def test_invalid_start_state_raises_key_error() -> None:
    problem = _build_problem()
    engine = DynamicProgrammingEngine(problem)

    with pytest.raises(KeyError):
        engine.solve("unknown")


def test_transitions_for_validates_stage_and_state() -> None:
    problem = _build_problem()

    with pytest.raises(ValueError):
        problem.transitions_for(-1, "start")

    with pytest.raises(ValueError):
        problem.transitions_for(3, "start")

    with pytest.raises(KeyError):
        problem.transitions_for(0, "missing")

    # Existing transitions should be returned as immutable tuples
    transitions = problem.transitions_for(0, "start")
    assert isinstance(transitions, tuple)
    assert {decision.action for decision in transitions} == {"invest", "hold"}


def test_problem_rejects_invalid_transition_payload() -> None:
    transitions = {
        (0, "start"): (
            {"action": "invest", "next_state": "grow", "reward": 1},
            {"action": "invest", "next_state": "exit", "reward": 2},
        )
    }

    with pytest.raises(ValueError):
        DynamicProgrammingProblem(
            horizon=1,
            states=("start", "grow", "exit"),
            transitions=transitions,
        )

    with pytest.raises(KeyError):
        DynamicProgrammingProblem(
            horizon=1,
            states=("start", "grow"),
            transitions={(0, "start"): ({"action": "invest", "next_state": "unknown"},)},
        )


def test_engine_exposes_dynamic_calculations() -> None:
    problem = _build_problem()
    engine = DynamicProgrammingEngine(problem)

    action_values = engine.action_values(0, "start")
    assert set(action_values) == {"invest", "hold"}
    assert action_values["invest"] == pytest.approx(11.5075, rel=1e-6)
    assert action_values["hold"] == pytest.approx(3.85, rel=1e-6)

    with pytest.raises(TypeError):
        action_values["invest"] = 0.0  # type: ignore[index]

    assert engine.state_value(1, "grow") == pytest.approx(6.85, rel=1e-6)
    assert engine.state_value(2, "exit") == pytest.approx(3.0, rel=1e-6)

    solution = engine.solve("start")
    assert engine.value_table[0]["start"] == pytest.approx(solution.total_value, rel=1e-6)
    assert engine.value_table[1]["grow"] == pytest.approx(6.85, rel=1e-6)

    with pytest.raises(ValueError):
        engine.action_values(-1, "start")

    with pytest.raises(ValueError):
        engine.action_values(problem.horizon, "start")

    with pytest.raises(KeyError):
        engine.action_values(0, "unknown")

    with pytest.raises(ValueError):
        engine.state_value(problem.horizon + 1, "start")

    with pytest.raises(KeyError):
        engine.state_value(0, "unknown")
