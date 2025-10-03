"""Compatibility layer exposing dataset builders for Dynamic AGI surfaces.

The fine-tuning and training dataset primitives were consolidated under
``dynamic.intelligence.agi``.  This module preserves the legacy
``dynamic_datasets`` entry-point so notebooks and orchestration scripts can
continue importing dataset utilities without refactoring.
"""

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

__all__ = [
    "AGITrainingExample",
    "BuildResult",
    "DynamicAGIFineTuner",
    "DynamicAGITrainingModel",
    "DynamicAGITrainingModelGenerator",
    "DynamicFineTuneDataset",
    "FineTuneBatch",
    "FineTuneExample",
    "LearningSnapshot",
    "build_fine_tune_dataset",
]
