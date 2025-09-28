"""Supabase configuration primitives for the Dynamic AGI stack."""

from __future__ import annotations

from typing import Callable, Mapping, Sequence

from dynamic_supabase import (
    DynamicSupabaseEngine,
    SupabaseBucketBlueprint,
    SupabaseFunctionBlueprint,
    SupabaseTableBlueprint,
)

__all__ = [
    "DYNAMIC_AGI_SUPABASE_TABLES",
    "DYNAMIC_AGI_SUPABASE_FUNCTIONS",
    "DYNAMIC_AGI_SUPABASE_BUCKETS",
    "build_dynamic_agi_supabase_engine",
    "verify_dynamic_agi_supabase_connectivity",
]


AGI_EVALUATIONS_TABLE = SupabaseTableBlueprint(
    name="agi_evaluations",
    schema="public",
    primary_keys=("id",),
    indexes=(
        "agi_evaluations_generated_idx",
        "agi_evaluations_version_idx",
        "agi_evaluations_signal_idx",
    ),
    row_estimate=12_000,
    freshness_score=0.92,
    retention_hours=24 * 180,
    description=(
        "Stores Dynamic AGI orchestrator outputs, diagnostics, and market synthesis."
    ),
)

AGI_LEARNING_SNAPSHOTS_TABLE = SupabaseTableBlueprint(
    name="agi_learning_snapshots",
    schema="public",
    primary_keys=("id",),
    indexes=(
        "agi_learning_snapshots_observed_idx",
        "agi_learning_snapshots_evaluation_idx",
    ),
    row_estimate=24_000,
    freshness_score=0.9,
    retention_hours=24 * 365,
    description="Telemetry for Dynamic AGI self-improvement and evaluation signals.",
)

DYNAMIC_AGI_SUPABASE_TABLES: tuple[SupabaseTableBlueprint, ...] = (
    AGI_EVALUATIONS_TABLE,
    AGI_LEARNING_SNAPSHOTS_TABLE,
)

DYNAMIC_AGI_SUPABASE_FUNCTIONS: tuple[SupabaseFunctionBlueprint, ...] = (
    SupabaseFunctionBlueprint(
        name="dynamic-agi-evaluate",
        endpoint="/functions/v1/dynamic-agi-evaluate",
        version="v1",
        invocation_count=128,
        error_rate=0.01,
        average_latency_ms=380.0,
        metadata={
            "description": "Edge function orchestrating Dynamic AGI end-to-end runs.",
            "writes": ["agi_evaluations", "agi_learning_snapshots"],
        },
    ),
    SupabaseFunctionBlueprint(
        name="dynamic-agi-digest",
        endpoint="/functions/v1/dynamic-agi-digest",
        version="v1",
        invocation_count=72,
        error_rate=0.0,
        average_latency_ms=215.0,
        metadata={
            "description": "Generates human oversight digests from AGI telemetry for review.",
            "reads": ["agi_evaluations", "agi_learning_snapshots"],
        },
    ),
)

DYNAMIC_AGI_SUPABASE_BUCKETS: tuple[SupabaseBucketBlueprint, ...] = (
    SupabaseBucketBlueprint(
        name="agi-artifacts",
        is_public=False,
        object_count=0,
        total_size_mb=0.0,
        lifecycle_rules=(
            "retain-latest-evaluation-packages",
            "archive-monthly-governance-reports",
        ),
        region="us-east-1",
        metadata={
            "description": "Model cards, fine-tuning exports, and governance artifacts from Dynamic AGI.",
        },
    ),
)


def build_dynamic_agi_supabase_engine(
    *,
    tables: Sequence[SupabaseTableBlueprint | Mapping[str, object]] | None = None,
    functions: Sequence[SupabaseFunctionBlueprint | Mapping[str, object]] | None = None,
    buckets: Sequence[SupabaseBucketBlueprint | Mapping[str, object]] | None = None,
) -> DynamicSupabaseEngine:
    """Instantiate a :class:`DynamicSupabaseEngine` preloaded for Dynamic AGI."""

    resolved_tables: list[SupabaseTableBlueprint | Mapping[str, object]] = list(
        DYNAMIC_AGI_SUPABASE_TABLES
    )
    if tables:
        resolved_tables.extend(tables)

    resolved_functions: list[SupabaseFunctionBlueprint | Mapping[str, object]] = list(
        DYNAMIC_AGI_SUPABASE_FUNCTIONS
    )
    if functions:
        resolved_functions.extend(functions)

    resolved_buckets: list[SupabaseBucketBlueprint | Mapping[str, object]] = list(
        DYNAMIC_AGI_SUPABASE_BUCKETS
    )
    if buckets:
        resolved_buckets.extend(buckets)

    return DynamicSupabaseEngine(
        tables=resolved_tables,
        functions=resolved_functions,
        buckets=resolved_buckets,
    )


def verify_dynamic_agi_supabase_connectivity(
    *,
    base_url: str,
    anon_key: str,
    timeout: float = 5.0,
    probe: Callable[[str, Mapping[str, str], float], int] | None = None,
) -> bool:
    """Ensure the Dynamic AGI Supabase project is reachable."""

    engine = build_dynamic_agi_supabase_engine()
    return engine.verify_connectivity(
        base_url=base_url,
        anon_key=anon_key,
        timeout=timeout,
        probe=probe,
    )
