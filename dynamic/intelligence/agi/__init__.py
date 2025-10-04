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
from .benchmarking import (
    BenchmarkDomainPlan,
    BenchmarkPreparation,
    load_benchmark_metrics,
    prepare_benchmark_plan,
    prepare_benchmark_plan_from_source,
    __all__ as _benchmarking_all,
)
from .knowledge_base import (
    DEFAULT_DOMAIN_KNOWLEDGE,
    DEFAULT_DOMAIN_KNOWLEDGE_PAYLOADS,
    build_snapshots_from_payloads,
    resolve_domain_snapshots,
    __all__ as _knowledge_base_all,
)
from .qa import (
    QASession,
    QAExchange,
    build_domain_qa_session,
    __all__ as _qa_all,
)
from .tuning_primitives import (
    DEFAULT_ACCURACY_TARGET,
    DEFAULT_COVERAGE_TARGET,
    DEFAULT_FAILED_CHECKS_TARGET,
    DEFAULT_STALENESS_TARGET,
    clamp,
    compute_deficits,
    focus_metric,
    priority_multiplier_from_severity,
    quality_floor_from_severity,
    severity_from_grade,
    severity_label,
    __all__ as _tuning_primitives_all,
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

__all__ = [
    *_build_all,
    *_model_all,
    *_self_improvement_all,
    *_fine_tune_all,
    *_local_machine_all,
    *_training_models_all,
    *_benchmarking_all,
    *_knowledge_base_all,
    *_qa_all,
    *_tuning_primitives_all,
]
