"""Utilities for building lightweight compatibility shims.

The :mod:`dynamic_agents` package largely re-exports the concrete
implementations that now live in :mod:`dynamic_ai`.  Historically each
module implemented its own ``__getattr__`` to defer importing those heavy
modules until they were actually needed.  That approach worked but it also
meant a fair amount of duplicated boilerplate scattered across every
persona specific shim.

To keep the individual modules focused on the public API we centralise the
lazy-loading mechanics here.  Modules only need to declare the names they
expose and optionally provide per-symbol overrides when the source module
differs from the default.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any, Iterable, Mapping


class LazyNamespace:
    """Resolve attributes on demand while keeping module code minimal."""

    __slots__ = ("_default_module", "_exports", "_export_set", "_overrides")

    def __init__(
        self,
        default_module: str,
        exports: Iterable[str],
        overrides: Mapping[str, str] | None = None,
    ) -> None:
        self._default_module = default_module
        self._exports = tuple(exports)
        self._export_set = frozenset(self._exports)
        self._overrides = dict(overrides or {})

    def resolve(self, name: str, namespace: dict[str, Any]) -> Any:
        """Return the attribute from the backing module lazily.

        The resolved object is cached on ``namespace`` (typically the module's
        ``globals()``) so subsequent lookups avoid the import machinery.
        """

        if name not in self._export_set:
            module_name = namespace.get("__name__", "module")
            raise AttributeError(f"module '{module_name}' has no attribute {name!r}")

        target_module = self._overrides.get(name, self._default_module)
        value = getattr(import_module(target_module), name)
        namespace[name] = value
        return value

    def dir(self, namespace: Mapping[str, Any]) -> list[str]:
        """Expose exported attributes alongside the existing namespace."""

        return sorted(set(namespace) | self._export_set)

    @property
    def exports(self) -> tuple[str, ...]:
        """Return the ordered exports for convenience."""

        return self._exports


def install_lazy_module(
    namespace: dict[str, Any],
    default_module: str,
    exports: Iterable[str],
    overrides: Mapping[str, str] | None = None,
) -> LazyNamespace:
    """Attach lazy-loading hooks to ``namespace`` and return the shim."""

    lazy_namespace = LazyNamespace(default_module, exports, overrides)

    def __getattr__(name: str) -> Any:
        return lazy_namespace.resolve(name, namespace)

    def __dir__() -> list[str]:  # pragma: no cover - trivial
        return lazy_namespace.dir(namespace)

    namespace["__getattr__"] = __getattr__
    namespace["__dir__"] = __dir__
    return lazy_namespace
