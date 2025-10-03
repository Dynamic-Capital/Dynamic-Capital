"""Shared metadata helpers for Dynamic Capital models."""

from __future__ import annotations

from importlib import import_module
from typing import TYPE_CHECKING, Any, Tuple

from .versioning import ModelVersion, VersionNumber

__all__ = [
    "ModelVersion",
    "VersionNumber",
    "DynamicMetadataAlgo",
    "MetadataAttribute",
]

_DYNAMIC_METADATA_MODULE = "dynamic.trading.algo.dynamic_metadata"

if TYPE_CHECKING:
    from dynamic.trading.algo.dynamic_metadata import DynamicMetadataAlgo
    from dynamic.trading.algo.dynamic_metadata import MetadataAttribute


class _MissingExport:
    """Placeholder that raises a descriptive error when accessed."""

    __slots__ = ("_name", "_reason")

    def __init__(self, name: str, reason: str) -> None:
        self._name = name
        self._reason = reason

    def __call__(self, *args: Any, **kwargs: Any) -> Any:  # pragma: no cover - defensive
        raise RuntimeError(self._message()) from None

    def __getattr__(self, attr: str) -> Any:  # pragma: no cover - defensive
        raise RuntimeError(self._message()) from None

    def __repr__(self) -> str:
        return f"<missing export {self._name}: {self._reason}>"

    def __bool__(self) -> bool:
        return False

    def _message(self) -> str:
        return (
            f"{self._name} is unavailable because '{_DYNAMIC_METADATA_MODULE}' "
            f"could not be imported ({self._reason})."
        )


def _resolve_exports() -> Tuple[Any, Any]:
    """Load the heavy metadata helpers exactly once with context-aware errors."""

    try:
        module = import_module(_DYNAMIC_METADATA_MODULE)
    except ModuleNotFoundError as exc:
        reason = str(exc)
        placeholder = _MissingExport
        return placeholder("DynamicMetadataAlgo", reason), placeholder(
            "MetadataAttribute", reason
        )
    except Exception as exc:  # pragma: no cover - unexpected import failure
        raise RuntimeError(
            f"Failed to import '{_DYNAMIC_METADATA_MODULE}' due to: {exc}"
        ) from exc

    return module.DynamicMetadataAlgo, module.MetadataAttribute


DynamicMetadataAlgo, MetadataAttribute = _resolve_exports()
