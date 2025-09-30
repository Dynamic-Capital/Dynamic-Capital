"""High-level accessors for the dynamic physics toolkit."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any

from .physics import (
    DynamicPhysicsEngine,
    ForceEvent,
    PhysicsBody,
    PhysicsSnapshot,
    Vector3,
    compute_energy_breakdown,
)

_OPTIONAL_EXPORTS = (
    "G",
    "C",
    "M_SUN",
    "NeutrinoCoolingModel",
    "ProtoNeutronStar",
    "SimulationConfig",
    "SimulationResult",
    "fallback_power_law_mdot",
)

if TYPE_CHECKING:  # pragma: no cover - type checkers only
    from .pns import (
        C,
        G,
        M_SUN,
        NeutrinoCoolingModel,
        ProtoNeutronStar,
        SimulationConfig,
        SimulationResult,
        fallback_power_law_mdot,
    )

__all__ = [
    "DynamicPhysicsEngine",
    "ForceEvent",
    "PhysicsBody",
    "PhysicsSnapshot",
    "Vector3",
    "compute_energy_breakdown",
]
__all__ += list(_OPTIONAL_EXPORTS)


def __getattr__(name: str) -> Any:
    """Lazily expose optional proto-neutron-star helpers."""

    if name in _OPTIONAL_EXPORTS:
        module = import_module(".pns", __name__)
        value = getattr(module, name)
        globals()[name] = value
        return value
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    """Ensure optional exports appear during introspection."""

    return sorted(__all__)
