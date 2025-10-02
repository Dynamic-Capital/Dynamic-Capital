"""Compatibility layer exposing builder utilities lazily.

Historically the builder implementations lived in the ``algorithms.python``
namespace and were imported directly from there.  Downstream notebooks and
orchestration scripts, however, frequently relied on the shorthand
``dynamic_builders`` module.  When the algorithms package grew, importing the
module eagerly started to pull in heavy transitive dependencies which slowed
down process start-up.  The other dynamic shims – such as
``dynamic_agents`` and ``dynamic_helpers`` – already switched to a lazy
loading model powered by :mod:`dynamic_agents._lazy`.  This module mirrors that
approach so callers retain the concise import path without paying the import
penalty unless a specific builder is accessed.  The same mapping is also used
to expose the :mod:`dynamic_crawl` primitives so legacy notebooks can import
the crawler via ``dynamic_builders`` without eagerly importing the crawling
engine.
"""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_BUILDER_EXPORTS = {
    "algorithms.python.core_orchestration": ("OrchestrationBuilder",),
    "algorithms.python.awesome_api": ("AwesomeAPISnapshotBuilder",),
    "algorithms.python.dynamic_market_snapshot": ("DynamicMarketSnapshotBuilder",),
    "algorithms.python.dynamic_market_index": ("DynamicMarketIndexBuilder",),
    "dynamic_architecture.builder": ("DynamicArchitectureBuilder",),
    "dynamic_crawl": (
        "CrawlPlan",
        "DynamicCrawler",
        "FetchPayload",
        "FetchResult",
    ),
}

_LAZY = build_lazy_namespace(_BUILDER_EXPORTS, default_module="algorithms.python.core_orchestration")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    """Resolve builder symbols from the underlying algorithm modules lazily."""

    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - thin wrapper around helper
    return _LAZY.dir(globals())
