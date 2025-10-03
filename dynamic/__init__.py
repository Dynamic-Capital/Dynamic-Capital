"""Dynamic Capital consolidated namespace.

The package exposes the core platform pillars as direct attributes so that
``from dynamic import platform`` works without an additional ``import
dynamic.platform`` side-effect. Submodules are imported lazily to avoid
unnecessary import overhead while still providing a convenient, discoverable
API surface.
"""

from __future__ import annotations

from importlib import import_module
from typing import Any, TYPE_CHECKING

__all__ = [
    "platform",
    "governance",
    "intelligence",
    "trading",
    "tools",
    "models",
    "brand",
    "wave",
]


def __getattr__(name: str) -> Any:
    """Dynamically import ``dynamic.<name>`` when accessed.

    This keeps the namespace light-weight while ensuring subpackages are exposed
    via attribute access on the root module.
    """

    if name in __all__:
        module = import_module(f"{__name__}.{name}")
        globals()[name] = module
        return module
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


def __dir__() -> list[str]:
    return sorted(list(globals().keys()) + __all__)


if TYPE_CHECKING:  # pragma: no cover - imported for type checkers only
    from . import brand as brand
    from . import governance as governance
    from . import intelligence as intelligence
    from . import models as models
    from . import platform as platform
    from . import tools as tools
    from . import trading as trading
    from . import wave as wave
