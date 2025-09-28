"""Unit tests for the quantum mechanics helpers."""

from __future__ import annotations

import math
import unittest

from dynamic_physics.quantum import (
    H_BAR,
    PAULI_MATRICES,
    QuantumState,
    bell_state_phi_plus,
    commutator,
    dirac_equation_residual,
    harmonic_oscillator_energy,
    heisenberg_uncertainty_limit,
    klein_gordon_residual,
    minimal_coupling_momentum,
    normalise_amplitudes,
    schrodinger_time_derivative,
    stationary_state_residual,
)


class QuantumHelpersTest(unittest.TestCase):
    def test_normalisation_and_probabilities(self) -> None:
        state = QuantumState(normalise_amplitudes([1 + 0j, 1 + 0j]))
        self.assertTrue(math.isclose(state.probability(0), 0.5, rel_tol=1e-9))
        self.assertTrue(math.isclose(state.probability(1), 0.5, rel_tol=1e-9))

    def test_expectation_sigma_z(self) -> None:
        state = QuantumState((1 + 0j, 0 + 0j))
        expectation = state.expectation(PAULI_MATRICES["sigma_z"])
        self.assertTrue(math.isclose(expectation.real, 1.0, rel_tol=1e-9))
        self.assertTrue(math.isclose(expectation.imag, 0.0, abs_tol=1e-9))

    def test_commutator_matches_pauli_algebra(self) -> None:
        sigma_x = PAULI_MATRICES["sigma_x"]
        sigma_y = PAULI_MATRICES["sigma_y"]
        sigma_z = PAULI_MATRICES["sigma_z"].matrix
        comm = commutator(sigma_x, sigma_y)
        expected = tuple(tuple(2j * element for element in row) for row in sigma_z)
        self.assertEqual(comm.matrix, expected)

    def test_schrodinger_time_derivative(self) -> None:
        hamiltonian = PAULI_MATRICES["sigma_z"]
        state = QuantumState((1 / math.sqrt(2), 1 / math.sqrt(2)))
        derivative = schrodinger_time_derivative(hamiltonian, state, hbar=H_BAR)
        self.assertEqual(len(derivative), 2)

    def test_stationary_state_residual_zero_for_eigenstate(self) -> None:
        hamiltonian = PAULI_MATRICES["sigma_z"]
        state = QuantumState((1 + 0j, 0 + 0j))
        residual = stationary_state_residual(hamiltonian, state, 1.0)
        self.assertTrue(all(abs(component) < 1e-9 for component in residual))

    def test_heisenberg_uncertainty(self) -> None:
        margin = heisenberg_uncertainty_limit(1e-12, 1e-27, hbar=H_BAR)
        self.assertLess(margin, 0.0)

    def test_harmonic_oscillator_energy(self) -> None:
        energy = harmonic_oscillator_energy(1, angular_frequency=5.0, hbar=H_BAR)
        self.assertTrue(math.isclose(energy, H_BAR * 5.0 * 1.5))

    def test_bell_state_is_normalised(self) -> None:
        state = bell_state_phi_plus()
        self.assertTrue(math.isclose(sum(state.probability(i) for i in range(state.dimension)), 1.0))

    def test_minimal_coupling_momentum(self) -> None:
        updated = minimal_coupling_momentum((1.0, 2.0, 3.0), charge=2.0, potential=(0.1, 0.0, -0.2))
        self.assertEqual(updated, (0.8, 2.0, 3.4))

    def test_dirac_equation_residual(self) -> None:
        gamma_0 = PAULI_MATRICES["sigma_z"]
        spinor = (1 + 0j, 0 + 0j)
        residual = dirac_equation_residual((gamma_0,), (1.0,), spinor, mass=1.0)
        self.assertEqual(residual, (1j - 1.0, 0j))

    def test_klein_gordon_residual_zero_when_on_shell(self) -> None:
        phi = 1.0 + 0j
        prefactor = (1.0**2) * (299_792_458.0**2) / (H_BAR**2)
        residual = klein_gordon_residual(-prefactor * phi, phi, mass=1.0)
        self.assertAlmostEqual(residual, 0.0)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
