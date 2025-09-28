"""Dynamic AGI package exposing orchestrator utilities."""

from .fine_tune import (
    DynamicAGIFineTuner,
    DynamicFineTuneDataset,
    FineTuneBatch,
    FineTuneExample,
    __all__ as _fine_tune_all,
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
from .supabase import (
    DYNAMIC_AGI_SUPABASE_BUCKETS,
    DYNAMIC_AGI_SUPABASE_FUNCTIONS,
    DYNAMIC_AGI_SUPABASE_TABLES,
    build_dynamic_agi_supabase_engine,
    verify_dynamic_agi_supabase_connectivity,
    __all__ as _supabase_all,
)

__all__ = [*_model_all, *_self_improvement_all, *_fine_tune_all, *_supabase_all]
