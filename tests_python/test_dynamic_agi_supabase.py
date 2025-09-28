from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Mapping

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_agi import (  # noqa: E402 - added after sys.path mutation
    DYNAMIC_AGI_SUPABASE_BUCKETS,
    DYNAMIC_AGI_SUPABASE_FUNCTIONS,
    DYNAMIC_AGI_SUPABASE_TABLES,
    build_dynamic_agi_supabase_engine,
    verify_dynamic_agi_supabase_connectivity,
)
from dynamic_supabase import SupabaseConnectivityError  # noqa: E402


class DynamicAGISupabaseConfigTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = build_dynamic_agi_supabase_engine()

    def test_tables_registered(self) -> None:
        identifiers = {
            table.canonical_identifier for table in self.engine.tables
        }
        self.assertIn("public.agi_evaluations", identifiers)
        self.assertIn("public.agi_learning_snapshots", identifiers)

    def test_functions_registered(self) -> None:
        function_names = {function.canonical_name for function in self.engine.functions}
        expected = {fn.canonical_name for fn in DYNAMIC_AGI_SUPABASE_FUNCTIONS}
        self.assertTrue(expected.issubset(function_names))

    def test_bucket_registered(self) -> None:
        bucket_names = {bucket.canonical_name for bucket in self.engine.buckets}
        expected = {bucket.canonical_name for bucket in DYNAMIC_AGI_SUPABASE_BUCKETS}
        self.assertEqual(expected, bucket_names)

    def test_catalogue_contains_metadata(self) -> None:
        catalogue = self.engine.catalogue()
        tables = catalogue["tables"]
        names = {entry["name"] for entry in tables}
        self.assertIn("agi_evaluations", names)
        agi_table = next(
            entry for entry in tables if entry["name"] == "agi_evaluations"
        )
        self.assertIn("Dynamic AGI", agi_table["description"] or "")

    def test_health_defaults_without_queries(self) -> None:
        health = self.engine.resource_health(
            resource_type="table", resource_name="public.agi_evaluations"
        )
        self.assertIn("no telemetry available", health.notes)

    def test_verify_connectivity_success(self) -> None:
        captured: dict[str, object] = {}

        def probe(url: str, headers: Mapping[str, str], timeout: float) -> int:
            captured["url"] = url
            captured["headers"] = headers
            captured["timeout"] = timeout
            return 204

        result = verify_dynamic_agi_supabase_connectivity(
            base_url="https://example.supabase.co",
            anon_key="example-key",
            timeout=2.5,
            probe=probe,
        )

        self.assertTrue(result)
        self.assertEqual(
            "https://example.supabase.co/rest/v1/",
            captured["url"],
        )
        self.assertEqual("example-key", captured["headers"]["apikey"])
        self.assertEqual("example-key", captured["headers"]["Authorization"].split()[1])
        self.assertEqual(2.5, captured["timeout"])

    def test_verify_connectivity_failure(self) -> None:
        def probe(_: str, __: Mapping[str, str], ___: float) -> int:
            return 503

        with self.assertRaises(SupabaseConnectivityError):
            verify_dynamic_agi_supabase_connectivity(
                base_url="https://example.supabase.co",
                anon_key="bad-key",
                probe=probe,
            )


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
