from dynamic_method import DynamicMethodEngine, MethodContext, MethodSignal


def _context(**overrides: float | str) -> MethodContext:
    params: dict[str, float | str | tuple[str, ...]] = {
        "mission": "Scale the operating system",
        "horizon": "Next quarter",
        "urgency_bias": 0.4,
        "compliance_pressure": 0.3,
        "innovation_pull": 0.4,
        "ops_maturity": 0.5,
        "dependencies": (),
        "stakeholders": (),
    }
    params.update(overrides)
    return MethodContext(**params)  # type: ignore[arg-type]


def _signal(**overrides: float | str | tuple[str, ...]) -> MethodSignal:
    params: dict[str, float | str | tuple[str, ...]] = {
        "driver": "execution",
        "observation": "Signal registered",
        "urgency": 0.5,
        "ambiguity": 0.5,
        "risk": 0.5,
        "effort": 0.5,
        "leverage": 0.5,
        "discipline": 0.5,
        "tags": (),
    }
    params.update(overrides)
    return MethodSignal(**params)  # type: ignore[arg-type]


def test_blueprint_includes_all_pillars_by_default() -> None:
    engine = DynamicMethodEngine()
    blueprint = engine.build_blueprint(_context())

    assert blueprint.pillars == (
        "Mission clarity & stakeholder alignment",
        "Hypothesis-driven discovery loops",
        "Capability and playbook uplift",
        "Measured execution discipline",
        "Compounding leverage amplification",
        "Embedded governance & risk sensing",
    )


def test_blueprint_prioritises_relevant_pillars_and_adds_driver_focus() -> None:
    engine = DynamicMethodEngine()
    engine.register(
        _signal(
            driver="innovation",
            ambiguity=0.8,
            leverage=0.7,
            risk=0.65,
            discipline=0.65,
            tags=("innovation", "governance"),
        )
    )

    blueprint = engine.build_blueprint(
        _context(
            compliance_pressure=0.7,
            innovation_pull=0.7,
            ops_maturity=0.7,
        )
    )

    expected_pillars = {
        "Mission clarity & stakeholder alignment",
        "Hypothesis-driven discovery loops",
        "Capability and playbook uplift",
        "Measured execution discipline",
        "Compounding leverage amplification",
        "Embedded governance & risk sensing",
    }

    assert set(blueprint.pillars[:-1]) == expected_pillars
    assert blueprint.pillars[:4] == (
        "Hypothesis-driven discovery loops",
        "Measured execution discipline",
        "Compounding leverage amplification",
        "Embedded governance & risk sensing",
    )
    assert blueprint.pillars[-1] == "Driver focus: innovation"
