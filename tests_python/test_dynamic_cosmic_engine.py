import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_cosmic import enable_engine  # noqa: E402
from dynamic_cosmic.cosmic import (  # noqa: E402
    CosmicBridge,
    CosmicCoordinate,
    CosmicPhenomenon,
    CosmicSignal,
    DynamicCosmic,
)


def _phenomenon(identifier: str, magnitude: float = 5.0) -> CosmicPhenomenon:
    return CosmicPhenomenon(
        identifier=identifier,
        location=CosmicCoordinate(0.0, 0.0, 0.0),
        magnitude=magnitude,
        volatility=0.2,
        signals=(
            CosmicSignal(
                identifier=f"{identifier}-signal",
                wavelength_nm=500.0,
                amplitude=3.0,
                coherence=0.8,
            ),
        ),
    )


def _bridge(source: str, target: str, *, stability: float = 0.7) -> CosmicBridge:
    return CosmicBridge(
        source=source,
        target=target,
        stability=stability,
        flux=4.0,
        route_length=1.2,
    )


def test_resilience_cache_invalidates_on_updates() -> None:
    engine = DynamicCosmic()
    engine.register_phenomenon(_phenomenon("alpha"))

    first = engine.evaluate_resilience()
    assert engine._resilience_cache == first  # noqa: SLF001 - validate cache value

    # Second call should re-use the cached value.
    second = engine.evaluate_resilience()
    assert second == first

    # Ingesting a new signal should invalidate the cache.
    engine.ingest_signal(
        "alpha",
        {
            "identifier": "alpha-extra",
            "wavelength_nm": 610.0,
            "amplitude": 2.5,
            "coherence": 0.6,
        },
    )
    assert engine._resilience_cache is None  # noqa: SLF001 - ensure cache invalidated

    refreshed = engine.evaluate_resilience()
    assert refreshed != first
    assert engine._resilience_cache == refreshed  # noqa: SLF001 - cache updated


def test_bridge_introspection_helpers() -> None:
    engine = DynamicCosmic(phenomena=[_phenomenon("alpha"), _phenomenon("beta")])
    bridge = engine.register_bridge(_bridge("alpha", "beta"))

    assert engine.get_bridge("alpha", "beta") == bridge

    bridges = engine.bridges_for("beta")
    assert len(bridges) == 1
    assert bridges[0].source == "alpha"
    assert bridges[0].target == "beta"


def test_topology_metrics_include_expected_aggregates() -> None:
    engine = DynamicCosmic(phenomena=[_phenomenon("alpha"), _phenomenon("beta", magnitude=7.5)])
    engine.register_bridge(_bridge("alpha", "beta", stability=0.9))

    metrics = engine.topology_metrics()

    assert metrics["phenomena"] == 2
    assert metrics["bridges"] == 1
    assert 0.0 <= metrics["mean_resonance"]
    assert 0.0 <= metrics["mean_bridge_efficiency"] <= 10.0
    assert 0.0 <= metrics["volatility_index"] <= 1.0

    snapshot = engine.snapshot()
    assert snapshot["metrics"] == metrics


def test_enable_engine_uses_default_scenario() -> None:
    engine = enable_engine()

    snapshot = engine.snapshot()
    assert len(snapshot["phenomena"]) == 3
    assert snapshot["metrics"]["bridges"] == 2.0


def test_enable_engine_accepts_custom_configuration() -> None:
    config = {
        "history_limit": 5,
        "phenomena": [
            {
                "identifier": "sol",
                "location": {"x": 0.0, "y": 0.0, "z": 0.0},
                "magnitude": 9.5,
                "volatility": 0.12,
                "signals": [
                    {
                        "identifier": "sol-spectrum",
                        "wavelength_nm": 600.0,
                        "amplitude": 5.0,
                        "coherence": 0.7,
                    }
                ],
            }
        ],
        "events": [
            {
                "description": "Solar telemetry baseline established",
                "impact": 0.4,
            }
        ],
    }

    engine = enable_engine(config)
    snapshot = engine.snapshot()

    assert [phenomenon["identifier"] for phenomenon in snapshot["phenomena"]] == ["sol"]
    assert snapshot["events"][0]["description"] == "Solar telemetry baseline established"
    assert snapshot["metrics"]["bridges"] == 0.0
