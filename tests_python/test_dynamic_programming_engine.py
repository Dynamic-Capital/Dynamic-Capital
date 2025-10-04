from dynamic_programming import DPState, DynamicProgrammingEngine


def test_dynamic_programming_blueprint_layers_and_notes() -> None:
    engine = DynamicProgrammingEngine()
    states = [
        DPState(
            identifier="base_zero",
            goal="F(0) base case",
            definition="Return 0 when n == 0",
            transition="return 0",
            is_base_case=True,
            complexity=0.1,
        ),
        DPState(
            identifier="base_one",
            goal="F(1) base case",
            definition="Return 1 when n == 1",
            transition="return 1",
            is_base_case=True,
            complexity=0.1,
        ),
        DPState(
            identifier="fib_n",
            goal="Compute F(n)",
            definition="Use previous two Fibonacci values",
            transition="dp[n-1] + dp[n-2]",
            dependencies=("base_zero", "base_one"),
            dimensions=("n",),
            complexity=1.5,
        ),
        DPState(
            identifier="prefix_sum",
            goal="Sum Fibonacci prefix",
            definition="Accumulate Fibonacci values up to n",
            transition="prefix_sum[n-1] + fib_n[n]",
            dependencies=("fib_n",),
            dimensions=("n",),
            complexity=0.5,
        ),
    ]

    blueprint = engine.plan(states, target="prefix_sum", objective="Fibonacci prefix")

    assert blueprint.target == "prefix_sum"
    assert blueprint.evaluation_order[:2] == ("base_one", "base_zero") or blueprint.evaluation_order[:2] == ("base_zero", "base_one")
    assert blueprint.layers[0] == (
        "base_one",
        "base_zero",
    ) or blueprint.layers[0] == ("base_zero", "base_one")
    assert blueprint.base_states == tuple(
        state for state in blueprint.evaluation_order if state.startswith("base_")
    )
    assert blueprint.transition_states == ("fib_n", "prefix_sum")
    assert blueprint.notes["state_count"] == 4
    assert blueprint.notes["base_state_count"] == 2
    assert blueprint.notes["transition_state_count"] == 2
    assert blueprint.notes["requires_memoization"] is True
    assert blueprint.notes["max_dependency_depth"] == 3
    assert blueprint.notes["layer_count"] == 3
    assert blueprint.narrative.startswith("Blueprint for Fibonacci prefix")

    serialised = blueprint.as_dict()
    assert serialised["target"] == "prefix_sum"
    assert serialised["notes"]["state_count"] == 4
