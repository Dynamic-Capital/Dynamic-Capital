from __future__ import annotations

import unittest

from dynamic.intelligence.agi import DynamicAGIModel
from dynamic_spheres import (
    DynamicSpheresEngine,
    SphereProfile,
    sync_dynamic_agi_collaborators,
)


class DynamicSpheresEngineAssignmentTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = DynamicSpheresEngine()

    def _make_profile(self, name: str) -> SphereProfile:
        return SphereProfile(
            name=name,
            radius_km=10.0,
            density_gcc=5.0,
            orbital_velocity_kms=3.0,
        )

    def test_collaboration_scores_follow_active_assignments(self) -> None:
        alpha = self._make_profile("Alpha")
        beta = self._make_profile("Beta")
        self.engine.upsert_profile(alpha)
        self.engine.upsert_profile(beta)

        collaborator = self.engine.upsert_keeper(
            "keeper-1",
            "Keeper One",
            spheres=("Alpha", "Ghost"),
        )

        state = self.engine.network_state()
        expected_single = collaborator.support_score()
        self.assertAlmostEqual(state.collaboration_health["Alpha"], expected_single)
        self.assertAlmostEqual(state.collaboration_health["Beta"], 0.0)

        collaborator = self.engine.assign_collaborator(
            "keeper-1", ["Beta", "Alpha", "Ghost"]
        )
        expected_split = collaborator.support_score() / 2.0
        state = self.engine.network_state()
        self.assertAlmostEqual(state.collaboration_health["Alpha"], expected_split)
        self.assertAlmostEqual(state.collaboration_health["Beta"], expected_split)

        self.engine.remove_profile("Beta")
        collaborator_after = next(
            entry for entry in self.engine.collaborators if entry.identifier == "keeper-1"
        )
        self.assertNotIn("beta", collaborator_after.spheres)

        state = self.engine.network_state()
        self.assertIn("Alpha", state.collaboration_health)
        self.assertAlmostEqual(state.collaboration_health["Alpha"], expected_single)

    def test_profile_activation_enables_pending_assignments(self) -> None:
        collaborator = self.engine.upsert_helper(
            "helper-1", "Helper One", spheres=("Shadow",)
        )

        initial_state = self.engine.network_state()
        self.assertEqual(initial_state.collaboration_health, {})

        self.engine.upsert_profile(self._make_profile("Shadow"))
        state = self.engine.network_state()
        self.assertAlmostEqual(
            state.collaboration_health["Shadow"], collaborator.support_score()
        )

    def test_configure_responsibilities_assigns_tasks_and_permissions(self) -> None:
        alpha = self._make_profile("Alpha")
        self.engine.upsert_profile(alpha)
        self.engine.upsert_agent("agent-1", "Agent One", spheres=("Alpha",))

        updated = self.engine.configure_responsibilities(
            "agent-1",
            {
                "Alpha": {
                    "tasks": (
                        "Stabilise resonance",
                        "Deploy harmonics",
                    ),
                    "permissions": ("adjust", "dispatch"),
                    "priority": 0.85,
                    "notes": "Primary operator",
                }
            },
        )
        self.assertIn("alpha", updated.responsibilities)
        responsibility = updated.responsibilities["alpha"]
        self.assertEqual(
            responsibility.tasks, ("Stabilise resonance", "Deploy harmonics")
        )
        self.assertEqual(responsibility.permissions, ("adjust", "dispatch"))
        self.assertAlmostEqual(responsibility.priority, 0.85)
        self.assertEqual(responsibility.notes, "Primary operator")

        state = self.engine.network_state()
        self.assertIn("Alpha", state.role_manifest)
        manifest_entries = state.role_manifest["Alpha"]
        self.assertEqual(len(manifest_entries), 1)
        entry = manifest_entries[0]
        self.assertEqual(entry.collaborator_id, "agent-1")
        self.assertEqual(entry.role, "agent")
        self.assertEqual(entry.tasks, responsibility.tasks)
        self.assertEqual(entry.permissions, responsibility.permissions)

        exported = self.engine.export_state()
        exported_entry = exported["role_manifest"]["Alpha"][0]
        self.assertEqual(exported_entry["collaborator_id"], "agent-1")
        self.assertEqual(exported_entry["tasks"], list(responsibility.tasks))
        self.assertEqual(
            exported_entry["permissions"], list(responsibility.permissions)
        )

    def test_configure_responsibilities_merges_new_assignments(self) -> None:
        alpha = self._make_profile("Alpha")
        beta = self._make_profile("Beta")
        self.engine.upsert_profile(alpha)
        self.engine.upsert_profile(beta)

        self.engine.upsert_keeper("keeper-1", "Keeper One", spheres=("Alpha",))
        self.engine.configure_responsibilities(
            "keeper-1",
            {"Alpha": {"tasks": ("Audit",), "permissions": ("read",)}},
        )

        updated = self.engine.configure_responsibilities(
            "keeper-1",
            {"Beta": {"tasks": ("Stabilise",), "permissions": ("adjust",)}},
            merge=True,
        )
        self.assertIn("alpha", updated.responsibilities)
        self.assertIn("beta", updated.responsibilities)

        state = self.engine.network_state()
        self.assertGreater(state.collaboration_health["Alpha"], 0.0)
        self.assertGreater(state.collaboration_health["Beta"], 0.0)
        self.assertIn("Beta", state.role_manifest)
        beta_entries = state.role_manifest["Beta"]
        self.assertEqual(len(beta_entries), 1)
        self.assertEqual(beta_entries[0].collaborator_id, "keeper-1")
        self.assertIn("Stabilise", beta_entries[0].tasks[0])


class DynamicSpheresAGISyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = DynamicSpheresEngine()
        self.engine.upsert_profile(
            SphereProfile(
                name="Alpha",
                radius_km=11.0,
                density_gcc=6.0,
                orbital_velocity_kms=4.0,
            )
        )
        self.agi = DynamicAGIModel()

    def test_sync_with_dynamic_agi_registers_all_roles(self) -> None:
        agent, keeper, bot, helper = self.engine.sync_with_dynamic_agi(self.agi)
        for collaborator, role in zip((agent, keeper, bot, helper), ("agent", "keeper", "bot", "helper")):
            self.assertEqual(collaborator.role, role)
            self.assertEqual(collaborator.metadata["agi_role"], role)
            identity = collaborator.metadata.get("agi_identity")
            self.assertIsInstance(identity, dict)
            self.assertEqual(identity["name"], self.agi.identity.name)
            self.assertIn("alpha", collaborator.spheres)
            self.assertEqual(collaborator.metadata.get("agi_version"), self.agi.version)
            self.assertIsInstance(collaborator.metadata.get("agi_version_info"), dict)
            self.assertIn("alpha", collaborator.responsibilities)
            responsibility = collaborator.responsibilities["alpha"]
            self.assertGreater(responsibility.priority, 0.0)
            self.assertTrue(responsibility.tasks)
            self.assertTrue(responsibility.permissions)

        manifest = self.engine.network_state().role_manifest["Alpha"]
        self.assertEqual(
            {entry.role for entry in manifest}, {"agent", "keeper", "bot", "helper"}
        )

    def test_sync_dynamic_agi_collaborators_updates_assignments(self) -> None:
        sync_dynamic_agi_collaborators(self.engine, self.agi, spheres=("Alpha",))
        self.engine.upsert_profile(
            SphereProfile(
                name="Beta",
                radius_km=12.0,
                density_gcc=6.5,
                orbital_velocity_kms=4.5,
            )
        )
        updated = sync_dynamic_agi_collaborators(
            self.engine, self.agi, spheres=("Alpha", "Beta")
        )
        for collaborator in updated:
            self.assertIn("beta", collaborator.spheres)
            self.assertIn("beta", collaborator.responsibilities)
        state = self.engine.network_state()
        self.assertIn("Alpha", state.collaboration_health)
        self.assertIn("Beta", state.collaboration_health)
        self.assertIn("Beta", state.role_manifest)
        self.assertEqual(len(state.role_manifest["Beta"]), 4)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
