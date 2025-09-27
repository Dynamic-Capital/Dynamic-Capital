import pytest

from dynamic_agents import (
    AtomAgent,
    AtomAgentResult,
    AtomEnsembleAgent,
    AtomEnsembleAgentResult,
)
from dynamic_atom import AtomicComposition, DynamicAtom, ElectronShell


def _build_atom() -> DynamicAtom:
    composition = AtomicComposition(symbol="Na", protons=11, neutrons=12, electrons=11)
    shells = (
        ElectronShell(name="K", principal_quantum_number=1, capacity=2, energy_ev=-31.0, electrons=2),
        ElectronShell(name="L", principal_quantum_number=2, capacity=8, energy_ev=-15.0, electrons=8),
        ElectronShell(name="M", principal_quantum_number=3, capacity=18, energy_ev=-5.0, electrons=1),
    )
    return DynamicAtom(composition, shells=shells)


def test_atom_agent_excitation_cycle():
    atom = _build_atom()
    agent = AtomAgent(atom)

    excitation = agent.run({"energy_ev": 12.0})
    assert isinstance(excitation, AtomAgentResult)
    assert excitation.mode == "excitation"
    assert excitation.transitions
    assert excitation.residual_energy_ev == pytest.approx(2.0)
    assert excitation.snapshot.shell_occupancy[1]["electrons"] == 7
    assert excitation.snapshot.shell_occupancy[2]["electrons"] == 2
    assert excitation.confidence == pytest.approx(10.0 / 12.0)

    relaxation = agent.run({"relax": True})
    assert relaxation.mode == "relaxation"
    assert relaxation.emitted_energy_ev == pytest.approx(10.0)
    assert not relaxation.residual_energy_ev
    assert relaxation.snapshot.excitation_energy_ev == pytest.approx(0.0)

    observation = agent.run({})
    assert observation.mode == "observation"
    assert observation.snapshot.excitation_energy_ev == pytest.approx(0.0)
    assert observation.confidence >= 0.8


def test_atom_agent_infers_atom_from_payload():
    agent = AtomAgent()
    payload = {
        "composition": {
            "symbol": "He",
            "protons": 2,
            "neutrons": 2,
            "electrons": 2,
        },
        "shells": [
            {
                "name": "K",
                "principal_quantum_number": 1,
                "capacity": 2,
                "energy_ev": -24.6,
                "electrons": 2,
            }
        ],
    }

    result = agent.run(payload)
    assert result.mode == "observation"
    assert result.snapshot.shell_occupancy[0]["electrons"] == 2

    with pytest.raises(ValueError):
        AtomAgent().run({"energy_ev": 5.0})


def test_atom_ensemble_agent_handles_multiple_atoms():
    sodium = _build_atom()
    ensemble = AtomEnsembleAgent({"Na": sodium})

    helium_payload = {
        "composition": {
            "symbol": "He",
            "protons": 2,
            "neutrons": 2,
            "electrons": 2,
        },
        "shells": [
            {
                "name": "K",
                "principal_quantum_number": 1,
                "capacity": 2,
                "energy_ev": -24.6,
                "electrons": 2,
            }
        ],
    }

    result = ensemble.run(
        {
            "atoms": [
                {"symbol": "He", "payload": helium_payload},
                {"symbol": "Na", "payload": {"energy_ev": 12.0}},
            ]
        }
    )

    assert isinstance(result, AtomEnsembleAgentResult)
    assert set(result.atoms.keys()) == {"He", "Na"}

    helium = result.atoms["He"]
    assert helium.mode == "observation"
    assert helium.snapshot.shell_occupancy[0]["electrons"] == 2

    sodium_excited = result.atoms["Na"]
    assert sodium_excited.mode == "excitation"
    assert sodium_excited.transitions

    follow_up = ensemble.run({})
    assert set(follow_up.atoms.keys()) == {"He", "Na"}
    assert follow_up.atoms["Na"].mode == "observation"


def test_atom_ensemble_agent_serialises_results():
    sodium = _build_atom()
    ensemble = AtomEnsembleAgent([sodium])

    outcome = ensemble.run({})
    payload = outcome.to_dict()

    assert isinstance(payload["atoms"], dict)
    assert "Na" in payload["atoms"]
    assert payload["atoms"]["Na"]["mode"] == outcome.atoms["Na"].mode
