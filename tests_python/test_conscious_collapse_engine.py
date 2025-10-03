import pytest

np = pytest.importorskip("numpy")

from dynamic_quantum import (
    ConsciousCollapseEngine,
    DomainConfig,
    LindbladChannel,
)


@pytest.fixture
def basic_domain() -> tuple[dict[str, np.ndarray], dict[str, DomainConfig]]:
    sigma_x = np.array([[0.0, 1.0], [1.0, 0.0]], dtype=np.complex128)
    sigma_z = np.array([[1.0, 0.0], [0.0, -1.0]], dtype=np.complex128)
    measurements = {
        "ground": np.array([[1.0, 0.0], [0.0, 0.0]], dtype=np.complex128),
        "excited": np.array([[0.0, 0.0], [0.0, 1.0]], dtype=np.complex128),
    }
    config = DomainConfig(
        hamiltonian=sigma_x,
        channels=(LindbladChannel(operator=sigma_z, rate=0.5),),
        measurements=measurements,
        quality_operator=np.array([[1.0, 0.0], [0.0, 0.0]], dtype=np.complex128),
    )
    initial_states = {
        "quantum": np.array([1.0 / np.sqrt(2.0), 1.0 / np.sqrt(2.0)], dtype=np.complex128)
    }
    configs = {"quantum": config}
    return initial_states, configs


def test_decoherence_reduces_purity_and_coherence(basic_domain: tuple[dict[str, np.ndarray], dict[str, DomainConfig]]) -> None:
    initial_states, configs = basic_domain
    engine = ConsciousCollapseEngine(initial_states, configs)
    snapshot = engine.step(0.4)["quantum"]
    assert snapshot.purity < pytest.approx(1.0)
    assert snapshot.coherence < pytest.approx(1.0)


def test_intention_biases_measurement_probability(basic_domain: tuple[dict[str, np.ndarray], dict[str, DomainConfig]]) -> None:
    initial_states, configs = basic_domain
    engine = ConsciousCollapseEngine(initial_states, configs)
    no_intention_prob = engine.step(0.2)["quantum"].measurement_probabilities["ground"]
    # reset engine with same initial conditions
    engine = ConsciousCollapseEngine(initial_states, configs)
    projector = {"quantum": np.array([[1.0, 0.0], [0.0, 0.0]], dtype=np.complex128)}
    snapshot = engine.step(0.2, intention_projectors=projector, intention_strength=0.8)["quantum"]
    assert snapshot.measurement_probabilities["ground"] > no_intention_prob


def test_collapse_projects_state_and_updates_quality(basic_domain: tuple[dict[str, np.ndarray], dict[str, DomainConfig]]) -> None:
    initial_states, configs = basic_domain
    engine = ConsciousCollapseEngine(initial_states, configs)
    pre_step = engine.step(0.2)["quantum"]
    probability_before = pre_step.measurement_probabilities["ground"]
    assert probability_before > 0.0
    collapsed = engine.collapse("quantum", "ground")
    assert collapsed.purity == pytest.approx(1.0)
    assert collapsed.coherence == pytest.approx(0.0)
    assert collapsed.measurement_probabilities["ground"] == pytest.approx(1.0)
    assert collapsed.renewal_quality == pytest.approx(1.0)
