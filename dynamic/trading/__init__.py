"""Trading services for Dynamic Capital."""

from __future__ import annotations

import ast
from importlib import import_module
from pathlib import Path
from typing import TYPE_CHECKING, Dict, Iterable, Tuple, cast

_PACKAGE_ROOT = Path(__file__).resolve().parent


def _discover_module_sources(root: Path) -> Dict[str, Tuple[str, Path]]:
    """Map public submodules to their fully qualified names and source paths."""

    module_sources: Dict[str, Tuple[str, Path]] = {}
    package_name = __name__
    for entry in sorted(root.iterdir(), key=lambda path: path.name):
        if entry.name.startswith("_") or entry.name in {"__pycache__"}:
            continue
        if entry.is_dir():
            init_path = entry / "__init__.py"
            if init_path.exists():
                module_sources[entry.name] = (f"{package_name}.{entry.name}", init_path)
        elif entry.suffix == ".py" and entry.stem != "__init__":
            module_sources[entry.stem] = (f"{package_name}.{entry.stem}", entry)
    return module_sources


_MODULE_SOURCES = _discover_module_sources(_PACKAGE_ROOT)
_MODULES = {name: module for name, (module, _) in _MODULE_SOURCES.items()}


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
    key: _load_export_names(path) for key, (_, path) in _MODULE_SOURCES.items()
}
_SYMBOL_TO_MODULE = {
    symbol: _MODULES[key]
    for key, symbols in _EXPORTS.items()
    for symbol in symbols
}

if TYPE_CHECKING:  # pragma: no cover - static typing hook
    from types import ModuleType

    for _alias, _module_name in _MODULES.items():
        globals()[_alias] = cast(ModuleType, import_module(_module_name))

__all__ = list(_MODULES)
_seen = set(__all__)
for _symbols in _EXPORTS.values():
    for _symbol in _symbols:
        if _symbol not in _seen:
            __all__.append(_symbol)
            _seen.add(_symbol)


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
