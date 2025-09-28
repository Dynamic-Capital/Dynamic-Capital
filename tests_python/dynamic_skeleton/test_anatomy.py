from __future__ import annotations

import unittest

from dynamic_skeleton.anatomy import (
    APPENDICULAR_SKELETON,
    AXIAL_SKELETON,
    CORE_SKELETAL_FUNCTIONS,
    skeleton_body_overview,
)


class SkeletonAnatomyTest(unittest.TestCase):
    def test_skeleton_body_overview_totals(self) -> None:
        overview = skeleton_body_overview()

        self.assertEqual(overview["totals"], {"axial": 80, "appendicular": 126, "combined": 206})
        self.assertAlmostEqual(overview["axial_to_appendicular_ratio"], 80 / 126)
        self.assertEqual(len(overview["axial"]["sections"]), len(AXIAL_SKELETON))
        self.assertEqual(
            sum(section["total"] for section in overview["appendicular"]["sections"]),
            overview["appendicular"]["total_bones"],
        )

    def test_core_functions_are_present(self) -> None:
        names = {entry["name"] for entry in CORE_SKELETAL_FUNCTIONS}

        self.assertIn("Support and structure", names)
        self.assertIn("Protection", names)
        self.assertIn("Movement", names)
        self.assertEqual(len(CORE_SKELETAL_FUNCTIONS), 7)


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
