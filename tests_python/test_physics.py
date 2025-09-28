"""Unit tests for the classical dynamic physics toolkit."""

from __future__ import annotations

import math
import unittest

from dynamic_physics import (
    DynamicPhysicsEngine,
    ForceEvent,
    PhysicsBody,
    Vector3,
    compute_energy_breakdown,
)


class VectorMathTest(unittest.TestCase):
    def test_vector_magnitude_and_normalisation(self) -> None:
        vector = Vector3(3.0, 4.0, 0.0)
        self.assertAlmostEqual(vector.magnitude(), 5.0)
        unit = vector.normalised()
        self.assertAlmostEqual(unit.magnitude(), 1.0)
        self.assertAlmostEqual(unit.x, 0.6)
        self.assertAlmostEqual(unit.y, 0.8)


class EnergyAccountingTest(unittest.TestCase):
    def test_compute_energy_breakdown_matches_engine(self) -> None:
        body = PhysicsBody(
            identifier="b1",
            mass=2.0,
            position=Vector3(0.0, 10.0, 0.0),
            velocity=Vector3(3.0, 0.0, 0.0),
        )
        kinetic, potential = compute_energy_breakdown([body], gravity=Vector3(0.0, -9.81, 0.0))
        self.assertAlmostEqual(kinetic, 0.5 * 2.0 * (3.0**2))
        self.assertAlmostEqual(potential, 2.0 * 9.81 * 10.0)


class EngineIntegrationTest(unittest.TestCase):
    def test_step_updates_positions_and_velocities(self) -> None:
        engine = DynamicPhysicsEngine(gravity=Vector3(0.0, -9.81, 0.0), damping=0.0)
        body = PhysicsBody("ball", 1.0, position=Vector3.zero(), velocity=Vector3.zero())
        engine.add_body(body)

        snapshot = engine.step(1.0)
        updated = snapshot.bodies["ball"]
        self.assertLess(updated["velocity"][1], 0.0)
        self.assertLess(updated["position"][1], 0.0)

    def test_run_forces_accelerates_body(self) -> None:
        engine = DynamicPhysicsEngine(gravity=Vector3(0.0, 0.0, 0.0), damping=0.0)
        body = PhysicsBody("probe", 2.0)
        engine.add_body(body)

        force = ForceEvent(body_id="probe", force=Vector3(4.0, 0.0, 0.0), duration=1.0)
        engine.run_forces([force], dt=1.0)

        snapshot = engine.snapshot()
        velocity_x = snapshot.bodies["probe"]["velocity"][0]
        self.assertGreater(velocity_x, 0.0)
        self.assertTrue(math.isclose(velocity_x, 2.0, rel_tol=1e-9))


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
