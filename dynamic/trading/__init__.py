"""Trading services for Dynamic Capital."""

from __future__ import annotations

import ast
from importlib import import_module
from pathlib import Path
from typing import TYPE_CHECKING, Dict, Iterable, Tuple

_PACKAGE_ROOT = Path(__file__).resolve().parent
_MODULES = {
    "logic": "dynamic.trading.logic",
    "algo": "dynamic.trading.algo",
    "live_sync": "dynamic.trading.live_sync",
}


def _module_source_path(key: str) -> Path:
    if key == "live_sync":
        return _PACKAGE_ROOT / "live_sync.py"
    return _PACKAGE_ROOT / key / "__init__.py"


def _load_export_names(path: Path) -> Tuple[str, ...]:
    source = path.read_text(encoding="utf-8")
    module_ast = ast.parse(source, str(path))
    for node in module_ast.body:
        if isinstance(node, ast.Assign):
            targets: Iterable[ast.expr] = node.targets
            for target in targets:
                if isinstance(target, ast.Name) and target.id == "__all__":
                    evaluated = ast.literal_eval(node.value)
                    if not isinstance(evaluated, (list, tuple)):
                        raise TypeError(
                            f"__all__ in {path} must be a list or tuple of strings"
                        )
                    return tuple(str(item) for item in evaluated)
    return tuple()


_EXPORTS: Dict[str, Tuple[str, ...]] = {
    key: _load_export_names(_module_source_path(key)) for key in _MODULES
}
_SYMBOL_TO_MODULE = {
    symbol: _MODULES[key]
    for key, symbols in _EXPORTS.items()
    for symbol in symbols
}

if TYPE_CHECKING:  # pragma: no cover - static typing hook
    from . import algo, live_sync, logic  # noqa: F401 (re-exported modules)

__all__ = list(_MODULES)
for _symbols in _EXPORTS.values():
    for _symbol in _symbols:
        if _symbol not in __all__:
            __all__.append(_symbol)


def __getattr__(name: str):
    """Expose trading modules and their public services lazily."""

    if name in _MODULES:
        module = import_module(_MODULES[name])
        globals()[name] = module
        return module

    try:
        module_name = _SYMBOL_TO_MODULE[name]
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'") from exc

    module = import_module(module_name)
    value = getattr(module, name)
    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(set(globals()) | set(__all__))
