"""Compatibility layer exposing dataset builders for Dynamic AGI surfaces.

The fine-tuning and training dataset primitives were consolidated under
``dynamic.intelligence.agi``. This module preserves the legacy
``dynamic_datasets`` entry-point and normalises symbol access so notebooks and
orchestration scripts can continue importing dataset utilities without
refactoring while deferring heavy imports until first use.
"""

from __future__ import annotations

from importlib import import_module
from types import MappingProxyType
from typing import TYPE_CHECKING, Any, Mapping, Tuple


_EXPORT_MAP: Mapping[str, Tuple[str, str]] = MappingProxyType(
    {
        "AGITrainingExample": (
            "dynamic.intelligence.agi.training_models",
            "AGITrainingExample",
        ),
        "BuildResult": (
            "dynamic.intelligence.agi.build",
            "BuildResult",
        ),
        "DynamicAGIFineTuner": (
            "dynamic.intelligence.agi.fine_tune",
            "DynamicAGIFineTuner",
        ),
        "DynamicAGITrainingModel": (
            "dynamic.intelligence.agi.training_models",
            "DynamicAGITrainingModel",
        ),
        "DynamicAGITrainingModelGenerator": (
            "dynamic.intelligence.agi.training_models",
            "DynamicAGITrainingModelGenerator",
        ),
        "DynamicFineTuneDataset": (
            "dynamic.intelligence.agi.fine_tune",
            "DynamicFineTuneDataset",
        ),
        "FineTuneBatch": (
            "dynamic.intelligence.agi.fine_tune",
            "FineTuneBatch",
        ),
        "FineTuneExample": (
            "dynamic.intelligence.agi.fine_tune",
            "FineTuneExample",
        ),
        "LearningSnapshot": (
            "dynamic.intelligence.agi.fine_tune",
            "LearningSnapshot",
        ),
        "build_fine_tune_dataset": (
            "dynamic.intelligence.agi.build",
            "build_fine_tune_dataset",
        ),
    }
)

__all__ = tuple(_EXPORT_MAP)


def __getattr__(name: str) -> Any:
    try:
        module_path, attribute_name = _EXPORT_MAP[name]
    except KeyError as exc:  # pragma: no cover - defensive
        raise AttributeError(f"module 'dynamic_datasets' has no attribute '{name}'") from exc
    module = import_module(module_path)
    return getattr(module, attribute_name)


def __dir__() -> list[str]:  # pragma: no cover - trivial
    return sorted(__all__)


if TYPE_CHECKING:  # pragma: no cover - import for static analysis only
    from dynamic.intelligence.agi.build import BuildResult, build_fine_tune_dataset
    from dynamic.intelligence.agi.fine_tune import (
        DynamicAGIFineTuner,
        DynamicFineTuneDataset,
        FineTuneBatch,
        FineTuneExample,
        LearningSnapshot,
    )
    from dynamic.intelligence.agi.training_models import (
        AGITrainingExample,
        DynamicAGITrainingModel,
        DynamicAGITrainingModelGenerator,
    )
