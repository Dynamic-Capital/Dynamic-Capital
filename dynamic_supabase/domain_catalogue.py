"""Domain-specific Supabase catalogues for Dynamic Capital primitives."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Mapping, Sequence

from .engine import (
    DynamicSupabaseEngine,
    SupabaseBucketBlueprint,
    SupabaseFunctionBlueprint,
    SupabaseTableBlueprint,
)

__all__ = [
    "DomainSupabaseBlueprints",
    "DOMAIN_SUPABASE_BLUEPRINTS",
    "build_domain_supabase_engine",
    "build_all_domain_supabase_engines",
]


@dataclass(frozen=True, slots=True)
class DomainSupabaseBlueprints:
    """Grouped Supabase assets that power a specific Dynamic Capital domain."""

    tables: tuple[SupabaseTableBlueprint, ...]
    functions: tuple[SupabaseFunctionBlueprint, ...]
    buckets: tuple[SupabaseBucketBlueprint, ...] = ()


def _table(
    name: str,
    *,
    primary_keys: tuple[str, ...],
    schema: str = "public",
    indexes: tuple[str, ...] = (),
    row_estimate: int = 0,
    description: str | None = None,
) -> SupabaseTableBlueprint:
    """Create a :class:`SupabaseTableBlueprint` with repository defaults."""

    return SupabaseTableBlueprint(
        name=name,
        schema=schema,
        primary_keys=primary_keys,
        indexes=indexes,
        row_estimate=row_estimate,
        description=description,
    )


def _function(
    name: str,
    *,
    domain: str,
    description: str,
    version: str = "v1",
) -> SupabaseFunctionBlueprint:
    """Construct a :class:`SupabaseFunctionBlueprint` for a Supabase Edge Function."""

    return SupabaseFunctionBlueprint(
        name=name,
        endpoint=f"/functions/{version}/{name}",
        version=version,
        metadata={"domain": domain, "description": description},
    )


_EDGE_ENTRY_FILES: Sequence[str] = (
    "index.ts",
    "index.tsx",
)


def _is_edge_function_directory(path: Path) -> bool:
    """Return ``True`` when the directory looks like a Supabase Edge Function."""

    if not path.is_dir():
        return False

    name = path.name
    if name.startswith("_") or name.startswith("."):
        return False

    for candidate in _EDGE_ENTRY_FILES:
        if (path / candidate).is_file():
            return True

    return False


def _discover_supabase_functions(
    functions_root: Path | str | None = None,
) -> tuple[SupabaseFunctionBlueprint, ...]:
    """Discover Supabase Edge Functions from the repository tree.

    The helper inspects ``supabase/functions`` (or ``functions_root`` when
    provided) and constructs :class:`SupabaseFunctionBlueprint` instances for all
    detected edge function directories. The discovery is filesystem-based so the
    catalogue remains up to date as new functions are added.
    """

    if functions_root is None:
        repo_root = Path(__file__).resolve().parents[1]
        functions_dir = repo_root / "supabase" / "functions"
    else:
        functions_dir = Path(functions_root)

    if not functions_dir.exists():
        return ()

    blueprints: list[SupabaseFunctionBlueprint] = []

    for entry in sorted(functions_dir.iterdir(), key=lambda p: p.name):
        if not _is_edge_function_directory(entry):
            continue

        metadata = {
            "domain": "edge",
            "description": f"Auto-discovered Supabase edge function '{entry.name}'.",
            "path": str(entry.relative_to(functions_dir.parent)),
            "source": "filesystem",
        }

        blueprints.append(
            SupabaseFunctionBlueprint(
                name=entry.name,
                endpoint=f"/functions/v1/{entry.name}",
                metadata=metadata,
            ),
        )

    return tuple(blueprints)


DOMAIN_SUPABASE_BLUEPRINTS: Mapping[str, DomainSupabaseBlueprints] = {
    "dai": DomainSupabaseBlueprints(
        tables=(
            _table(
                "routine_prompts",
                primary_keys=("id",),
                indexes=("routine_prompts_time_slot_idx",),
                row_estimate=96,
                description=(
                    "Dynamic AI generated prompts that drive the daily routine allocator."
                ),
            ),
            _table(
                "analyst_insights",
                primary_keys=("id",),
                indexes=(
                    "analyst_insights_created_at_idx",
                    "analyst_insights_symbol_created_at_idx",
                ),
                row_estimate=720,
                description="Curated analyst narratives feeding AI rationale recall.",
            ),
            _table(
                "user_analytics",
                primary_keys=("id",),
                indexes=(
                    "idx_user_analytics_telegram_user_id",
                    "idx_user_analytics_event_type",
                    "idx_user_analytics_created_at",
                    "idx_user_analytics_session_id",
                ),
                row_estimate=50000,
                description="Event telemetry that tunes AI engagement and experiment loops.",
            ),
        ),
        functions=(
            _function(
                "analysis-ingest",
                domain="dai",
                description="Normalises research payloads before AI evaluation pipelines.",
            ),
            _function(
                "analytics-collector",
                domain="dai",
                description="Rolls up engagement telemetry for AI-driven reporting dashboards.",
            ),
            _function(
                "lorentzian-eval",
                domain="dai",
                description="Scores Lorentzian hedge hypotheses and persists audit trails.",
            ),
            _function(
                "web-app-analytics",
                domain="dai",
                description="Streams product analytics events to support AI prioritisation cues.",
            ),
        ),
    ),
    "dagi": DomainSupabaseBlueprints(
        tables=(
            _table(
                "infrastructure_jobs",
                primary_keys=("id",),
                indexes=(
                    "infrastructure_jobs_state_idx",
                    "infrastructure_jobs_resource_idx",
                    "infrastructure_jobs_created_idx",
                ),
                row_estimate=512,
                description="Automation ledger coordinating AGI-managed infrastructure tasks.",
            ),
            _table(
                "node_configs",
                primary_keys=("node_id",),
                row_estimate=128,
                description="Configuration manifest for AGI orchestration nodes and keepers.",
            ),
            _table(
                "mentor_feedback",
                primary_keys=("id",),
                indexes=("idx_mentor_feedback_submitted_at",),
                row_estimate=2048,
                description="Mentorship feedback loops that inform AGI skill refinement.",
            ),
        ),
        functions=(
            _function(
                "ops-health",
                domain="dagi",
                description="Aggregates operational telemetry so AGI custodians can triage drift.",
            ),
            _function(
                "system-health",
                domain="dagi",
                description="Publishes holistic health snapshots across the Dynamic Capital mesh.",
            ),
            _function(
                "linkage-audit",
                domain="dagi",
                description="Verifies cross-domain handoffs and dependency contracts for AGI nodes.",
            ),
            _function(
                "intent",
                domain="dagi",
                description="Captures AGI intent envelopes for downstream routing and review.",
            ),
        ),
    ),
    "dtl": DomainSupabaseBlueprints(
        tables=(
            _table(
                "market_news",
                primary_keys=("id",),
                indexes=("market_news_event_time_idx",),
                row_estimate=1440,
                description="Structured macro news feeds that seed strategy hypothesis scoring.",
            ),
            _table(
                "sentiment",
                primary_keys=("id",),
                indexes=("sentiment_symbol_idx", "sentiment_created_at_idx"),
                row_estimate=2880,
                description="Aggregated sentiment readings powering trading logic confluence.",
            ),
            _table(
                "cot_reports",
                primary_keys=("id",),
                indexes=("cot_reports_market_date_idx",),
                row_estimate=520,
                description="Commitment of Traders snapshots for bias and regime calibration.",
            ),
        ),
        functions=(
            _function(
                "collect-market-news",
                domain="dtl",
                description="Fetches and persists news catalysts for strategy routers.",
            ),
            _function(
                "collect-market-sentiment",
                domain="dtl",
                description="Harvests sentiment feeds to keep confluence panels refreshed.",
            ),
            _function(
                "market-movers-feed",
                domain="dtl",
                description="Serves ranked movers to DTL personas and trading dashboards.",
            ),
            _function(
                "trading-signal",
                domain="dtl",
                description="Accepts TradingView alerts and records structured strategy intents.",
            ),
        ),
    ),
    "dta": DomainSupabaseBlueprints(
        tables=(
            _table(
                "trading_accounts",
                primary_keys=("id",),
                indexes=("idx_trading_accounts_status_env",),
                row_estimate=64,
                description="Catalog of MT5 and copier accounts available to execution agents.",
            ),
            _table(
                "signals",
                primary_keys=("id",),
                indexes=("idx_signals_status_poll", "idx_signals_account_status"),
                row_estimate=4096,
                description="Normalised trade intents queued for Dynamic Trading Algo workers.",
            ),
            _table(
                "signal_dispatches",
                primary_keys=("id",),
                indexes=("idx_signal_dispatches_signal", "idx_signal_dispatches_status"),
                row_estimate=4096,
                description="Execution worker heartbeats that coordinate signal claim lifecycles.",
            ),
            _table(
                "trades",
                primary_keys=("id",),
                indexes=(
                    "idx_trades_status_opened",
                    "idx_trades_signal",
                    "idx_trades_open_accounts",
                ),
                row_estimate=2048,
                description="Executed trade receipts enriched with fill, risk, and treasury data.",
            ),
            _table(
                "hedge_actions",
                primary_keys=("id",),
                indexes=("hedge_actions_status_idx", "hedge_actions_symbol_idx"),
                row_estimate=512,
                description="Hedge lifecycle ledger synchronised with execution guardrails.",
            ),
            _table(
                "mt5_trade_logs",
                primary_keys=("id",),
                indexes=("idx_mt5_trade_logs_symbol_time",),
                row_estimate=8192,
                description="Heartbeat mirror of MT5 tickets for reconciliation and compliance.",
            ),
        ),
        functions=(
            _function(
                "dynamic-hedge",
                domain="dta",
                description="Manages hedge execution envelopes and mirrors actions into Supabase.",
            ),
            _function(
                "mt5",
                domain="dta",
                description="Upserts MT5 trade telemetry for downstream automation and audits.",
            ),
            _function(
                "trade-helper",
                domain="dta",
                description="Provides execution assistants with order routing context and limits.",
            ),
            _function(
                "ton-allocator-webhook",
                domain="dta",
                description="Bridges TON allocator events into the execution and treasury stack.",
            ),
        ),
    ),
    "edge": DomainSupabaseBlueprints(
        tables=(),
        functions=_discover_supabase_functions(),
    ),
}


def build_domain_supabase_engine(domain: str) -> DynamicSupabaseEngine:
    """Return a :class:`DynamicSupabaseEngine` seeded for the requested domain."""

    key = domain.lower()
    try:
        bundle = DOMAIN_SUPABASE_BLUEPRINTS[key]
    except KeyError as exc:  # pragma: no cover - defensive guardrail
        raise KeyError(f"Unknown domain '{domain}'. Available: {sorted(DOMAIN_SUPABASE_BLUEPRINTS)}") from exc

    return DynamicSupabaseEngine(
        tables=bundle.tables,
        functions=bundle.functions,
        buckets=bundle.buckets,
    )


def build_all_domain_supabase_engines() -> Mapping[str, DynamicSupabaseEngine]:
    """Materialise Supabase engines for every registered domain."""

    return {key: build_domain_supabase_engine(key) for key in DOMAIN_SUPABASE_BLUEPRINTS}

