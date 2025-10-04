import pytest

from dynamic_quantum.engine import DynamicQuantumEngine, QuantumEnvironment, QuantumPulse
from dynamic_quantum.hedge_model import (
    ActiveHedge,
    ExposureSnapshot,
    HedgeCandidate,
    QuantumHedgeConfig,
    QuantumHedgeModel,
)


def _unstable_engine() -> tuple[DynamicQuantumEngine, QuantumEnvironment]:
    engine = DynamicQuantumEngine(window=5, equilibrium_target=0.72)
    for index in range(5):
        engine.register_pulse(
            QuantumPulse(
                system=f"sys-{index}",
                coherence=0.38,
                entanglement=0.32,
                temperature=55.0,
                flux=-0.82 if index % 2 else 0.79,
                phase_variance=0.68,
            )
        )
    environment = QuantumEnvironment(
        vacuum_pressure=0.42,
        background_noise=0.78,
        gravity_gradient=0.61,
        measurement_rate=0.7,
        thermal_load=0.66,
    )
    return engine, environment


def _stable_engine() -> tuple[DynamicQuantumEngine, QuantumEnvironment]:
    engine = DynamicQuantumEngine(window=5, equilibrium_target=0.72)
    for index in range(5):
        engine.register_pulse(
            QuantumPulse(
                system=f"calm-{index}",
                coherence=0.88,
                entanglement=0.8,
                temperature=28.0,
                flux=0.12,
                phase_variance=0.18,
            )
        )
    environment = QuantumEnvironment(
        vacuum_pressure=0.68,
        background_noise=0.32,
        gravity_gradient=0.28,
        measurement_rate=0.45,
        thermal_load=0.4,
    )
    return engine, environment


def test_quantum_instability_triggers_beta_sized_hedge() -> None:
    engine, environment = _unstable_engine()
    model = QuantumHedgeModel(
        engine=engine,
        environment=environment,
        config=QuantumHedgeConfig(risk_fraction=0.02, max_risk_multiplier=2.0),
    )

    exposure = ExposureSnapshot(
        symbol="XAUUSD",
        direction="LONG",
        quantity=3.0,
        price=1950.0,
        atr=30.0,
        atr_median_ratio=0.012,
        stop_distance=45.0,
        pip_value=10.0,
        beta=1.1,
        volatility=0.25,
        hedge_candidates=(
            HedgeCandidate(symbol="DXY", correlation=-0.82, volatility=0.18, beta=0.9),
        ),
    )

    directives = model.propose([exposure], 100_000.0)
    assert len(directives) == 1
    directive = directives[0]
    assert directive.action == "OPEN"
    assert directive.hedge_symbol == "DXY"
    assert directive.quantity > 0
    max_quantity = exposure.quantity * model.config.max_risk_multiplier
    assert directive.quantity <= max_quantity + 1e-6
    assert "quantum-instability" in directive.reasons
    assert directive.confidence > 0.5
    assert directive.metadata is not None
    assert directive.metadata["quantum_multiplier"] >= 1.0


def test_model_skips_when_stable_environment() -> None:
    engine, environment = _stable_engine()
    model = QuantumHedgeModel(engine=engine, environment=environment)
    exposure = ExposureSnapshot(
        symbol="EURUSD",
        direction="LONG",
        quantity=1.5,
        price=1.0850,
        atr=0.006,
        atr_median_ratio=0.005,
        stop_distance=40.0,
        pip_value=10.0,
        hedge_candidates=(
            HedgeCandidate(symbol="DXY", correlation=-0.55, volatility=0.2),
        ),
    )

    directives = model.propose([exposure], 50_000.0)
    assert directives == ()


def test_model_recommends_close_when_stability_restored() -> None:
    engine, environment = _stable_engine()
    model = QuantumHedgeModel(engine=engine, environment=environment)
    active = ActiveHedge(
        symbol="XAUUSD",
        hedge_symbol="DXY",
        quantity=1.2,
        reason="ATR_SPIKE",
        stability_on_entry=0.4,
    )

    directives = model.propose([], 40_000.0, active_hedges=[active])
    assert len(directives) == 1
    directive = directives[0]
    assert directive.action == "CLOSE"
    assert directive.hedge_symbol == "DXY"
    assert directive.confidence >= 0.45
    assert directive.reasons == ("quantum-stability-restored",)
