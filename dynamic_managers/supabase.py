"""Supabase management utilities built on Dynamic Supabase Engine primitives."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Iterable, Mapping

from dynamic_supabase import (
    DynamicSupabaseEngine,
    SupabaseOptimizationHint,
    build_all_domain_supabase_engines,
    build_domain_supabase_engine,
)

__all__ = ["SupabaseDomainOverview", "DynamicSupabaseManager"]


_IMPACT_PRIORITY = {"high": 2, "medium": 1, "low": 0}
_UNSET = object()


def _normalise_domain(domain: str) -> str:
    cleaned = domain.strip()
    if not cleaned:
        raise ValueError("domain must not be empty")
    return cleaned.lower()


@dataclass(slots=True)
class SupabaseDomainOverview:
    """Aggregated Supabase footprint and optimisation backlog for a domain."""

    domain: str
    table_count: int
    function_count: int
    bucket_count: int
    recent_query_count: int
    pending_hints: tuple[SupabaseOptimizationHint, ...] = field(default_factory=tuple)

    def as_dict(self) -> dict[str, object]:
        return {
            "domain": self.domain,
            "tables": self.table_count,
            "functions": self.function_count,
            "buckets": self.bucket_count,
            "recent_queries": self.recent_query_count,
            "pending_hints": [hint.as_dict() for hint in self.pending_hints],
        }

    @property
    def hint_count(self) -> int:
        return len(self.pending_hints)


class DynamicSupabaseManager:
    """Coordinate Supabase orchestration engines across operational domains."""

    def __init__(
        self,
        *,
        engines: Mapping[str, DynamicSupabaseEngine] | None = None,
    ) -> None:
        self._engines: dict[str, DynamicSupabaseEngine] = {}
        self._labels: dict[str, str] = {}
        self._factories: dict[str, Callable[[], DynamicSupabaseEngine] | None] = {}

        if engines is None:
            engines = build_all_domain_supabase_engines()

        for domain, engine in engines.items():
            self.register_engine(
                domain,
                engine,
                factory=lambda domain=domain: build_domain_supabase_engine(domain),
            )

    # ------------------------------------------------------------------ helpers
    def _iter_engines(self) -> Iterable[tuple[str, DynamicSupabaseEngine]]:
        for key in sorted(self._engines):
            yield self._labels[key], self._engines[key]

    # ---------------------------------------------------------------- registry
    def register_engine(
        self,
        domain: str,
        engine: DynamicSupabaseEngine,
        *,
        factory: Callable[[], DynamicSupabaseEngine] | None = _UNSET,
    ) -> None:
        key = _normalise_domain(domain)
        self._engines[key] = engine
        self._labels[key] = domain
        if factory is _UNSET:
            # Preserve any existing factory unless explicitly overridden
            if key not in self._factories:
                self._factories[key] = None
        else:
            self._factories[key] = factory

    def get_engine(self, domain: str) -> DynamicSupabaseEngine:
        key = _normalise_domain(domain)
        if key not in self._engines:
            engine = build_domain_supabase_engine(domain)
            self.register_engine(
                domain,
                engine,
                factory=lambda domain=domain: build_domain_supabase_engine(domain),
            )
        return self._engines[key]

    @property
    def domains(self) -> tuple[str, ...]:
        return tuple(self._labels[key] for key in sorted(self._labels))

    # --------------------------------------------------------------- lifecycle
    def refresh_domain(self, domain: str) -> DynamicSupabaseEngine:
        key = _normalise_domain(domain)
        label = self._labels.get(key, domain)

        if key not in self._engines:
            # Domain is unknown; build it using the canonical builder.
            engine = build_domain_supabase_engine(label)
            self.register_engine(
                label,
                engine,
                factory=lambda domain=label: build_domain_supabase_engine(domain),
            )
            return engine

        factory = self._factories.get(key)
        if not callable(factory):
            raise RuntimeError(
                f"No refresh factory registered for Supabase domain '{label}'. "
                "Provide a callable via register_engine(..., factory=...) to enable refreshes."
            )

        engine = factory()
        self.register_engine(label, engine, factory=factory)
        return engine

    def refresh_all(self) -> tuple[tuple[str, DynamicSupabaseEngine], ...]:
        refreshed: list[tuple[str, DynamicSupabaseEngine]] = []
        for key in sorted(self._labels):
            label = self._labels[key]
            refreshed.append((label, self.refresh_domain(label)))
        return tuple(refreshed)

    def refresh(
        self, domain: str | None = None
    ) -> DynamicSupabaseEngine | tuple[tuple[str, DynamicSupabaseEngine], ...]:
        if domain is not None:
            return self.refresh_domain(domain)
        return self.refresh_all()

    # ----------------------------------------------------------- data products
    def catalogue(self, *, domain: str | None = None) -> dict[str, object]:
        if domain is not None:
            return self.get_engine(domain).catalogue()

        return {name: engine.catalogue() for name, engine in self._iter_engines()}

    def health_dashboard(
        self,
        *,
        domain: str | None = None,
        lookback: int = 25,
    ) -> dict[str, object]:
        if domain is not None:
            return self.get_engine(domain).export_health_dashboard(lookback=lookback)

        return {
            name: engine.export_health_dashboard(lookback=lookback)
            for name, engine in self._iter_engines()
        }

    def optimisation_backlog(
        self,
        *,
        domain: str | None = None,
        **hint_kwargs: object,
    ) -> tuple[tuple[str, SupabaseOptimizationHint], ...] | tuple[SupabaseOptimizationHint, ...]:
        if domain is not None:
            hints = self.get_engine(domain).optimisation_hints(**hint_kwargs)
            return tuple(hints)

        backlog: list[tuple[str, SupabaseOptimizationHint]] = []
        for name, engine in self._iter_engines():
            for hint in engine.optimisation_hints(**hint_kwargs):
                backlog.append((name, hint))

        backlog.sort(
            key=lambda item: (_IMPACT_PRIORITY.get(item[1].impact, 0), item[0], item[1].target),
            reverse=True,
        )
        return tuple(backlog)

    def overview(
        self,
        *,
        lookback: int = 25,
        optimisation_kwargs: Mapping[str, object] | None = None,
    ) -> tuple[SupabaseDomainOverview, ...]:
        hint_params = dict(optimisation_kwargs or {})

        overviews: list[SupabaseDomainOverview] = []
        for name, engine in self._iter_engines():
            hints = tuple(engine.optimisation_hints(**hint_params))
            recent_history = engine.recent_history(limit=lookback)
            overviews.append(
                SupabaseDomainOverview(
                    domain=name,
                    table_count=len(engine.tables),
                    function_count=len(engine.functions),
                    bucket_count=len(engine.buckets),
                    recent_query_count=len(recent_history),
                    pending_hints=hints,
                )
            )

        overviews.sort(key=lambda item: (item.hint_count, item.recent_query_count, item.domain), reverse=True)
        return tuple(overviews)

    # ----------------------------------------------------------- data products
