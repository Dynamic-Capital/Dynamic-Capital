"""Dynamic proof exports via the consolidated namespace."""

from __future__ import annotations

from importlib import import_module
from types import ModuleType
from typing import TYPE_CHECKING, Any

_PROVIDER_MODULE = "dynamic_proof"

__all__ = [
    "DynamicProofAssembler",
    "EvidenceInsight",
    "EvidenceRecord",
    "OutstandingCriterion",
    "ProofAssessment",
    "ProofContext",
    "ProofCriterion",
]

if TYPE_CHECKING:  # pragma: no cover - only used for static analysis
    from dynamic_proof import (  # noqa: F401 (re-exported names)
        DynamicProofAssembler,
        EvidenceInsight,
        EvidenceRecord,
        OutstandingCriterion,
        ProofAssessment,
        ProofContext,
        ProofCriterion,
    )


def _load_provider() -> ModuleType:
    """Import and memoize the underlying proof provider module."""

    module = import_module(_PROVIDER_MODULE)
    globals()["_provider"] = module
    return module


def __getattr__(name: str) -> Any:
    """Proxy attribute access to the :mod:`dynamic_proof` provider."""

    if name not in __all__:
        raise AttributeError(f"module '{__name__}' has no attribute '{name}'")

    module: ModuleType
    if (module := globals().get("_provider")) is None:  # type: ignore[assignment]
        module = _load_provider()

    try:
        value = getattr(module, name)
    except AttributeError as exc:  # pragma: no cover - defensive hardening
        raise AttributeError(
            f"module '{_PROVIDER_MODULE}' has no attribute '{name}'"
        ) from exc

    globals()[name] = value
    return value


def __dir__() -> list[str]:
    return sorted(__all__)
