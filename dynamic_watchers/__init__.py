"""Dynamic Watchers namespace with lazy imports.

The observability stack recently introduced dedicated "watcher" personas that
focus on monitoring telemetry and surfacing anomalies.  The core
implementation lives in :mod:`dynamic_watchers.base`, but legacy automation
still imports directly from ``dynamic_watchers``.  To keep those integrations
working – and to match the behaviour of the other dynamic shims – the module
proxies attribute access through :func:`dynamic_agents._lazy.build_lazy_namespace`.
"""

from __future__ import annotations

from typing import Any

from dynamic_agents._lazy import build_lazy_namespace

_WATCHER_EXPORTS = {
    "dynamic_watchers.base": (
        "WatcherSignal",
        "WatcherRule",
        "WatcherAlert",
        "MetricSummary",
        "WatcherReport",
        "DynamicWatcher",
    ),
}

_LAZY = build_lazy_namespace(_WATCHER_EXPORTS, default_module="dynamic_watchers.base")
__all__ = list(_LAZY.exports)


def __getattr__(name: str) -> Any:
    """Expose watcher utilities lazily."""

    return _LAZY.resolve(name, globals())


def __dir__() -> list[str]:  # pragma: no cover - thin wrapper around helper
    return _LAZY.dir(globals())
