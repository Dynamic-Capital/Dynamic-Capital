"""Dynamic AGI package exposing orchestrator utilities."""

from .fine_tune import (
    DynamicAGIFineTuner,
    DynamicFineTuneDataset,
    FineTuneBatch,
    FineTuneExample,
    __all__ as _fine_tune_all,
)
from .build import (
    BuildResult,
    build_dynamic_agi_payload,
    main,
    run_cli,
    __all__ as _build_all,
)
from .local_machine import (
    AGILocalMachineTaskConfig,
    build_local_machine_plan_from_improvement,
    build_local_machine_plan_from_output,
    __all__ as _local_machine_all,
)
from .training_models import (
    AGITrainingExample,
    DynamicAGITrainingModel,
    DynamicAGITrainingModelGenerator,
    __all__ as _training_models_all,
)
from .model import (
    AGIDiagnostics,
    AGIOutput,
    DynamicAGIIdentity,
    DynamicAGIModel,
    MODEL_VERSION,
    MODEL_VERSION_INFO,
    MODEL_VERSION_PLAN,
    DYNAMIC_AGI_EXPANSION,
    __all__ as _model_all,
)
from .self_improvement import (
    DynamicSelfImprovement,
    ImprovementPlan,
    ImprovementSignal,
    LearningSnapshot,
    __all__ as _self_improvement_all,
)
from .multi_ll import (
    AGIAdapter,
    DynamicAGIMultiLLCoordinator,
    EnsembleAGIPlan,
    __all__ as _multi_ll_all,
)

__all__ = [
    *_build_all,
    *_model_all,
    *_self_improvement_all,
    *_fine_tune_all,
    *_local_machine_all,
    *_training_models_all,
    *_multi_ll_all,
]
