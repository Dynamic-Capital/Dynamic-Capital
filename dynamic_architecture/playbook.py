"""Dynamic architecture playbook capturing strategic improvement themes."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field

from .model import _normalise_text

__all__ = [
    "CoreInterconnectionDesign",
    "FeedbackLoopDesign",
    "AdvancedTrainingPlaybook",
    "ResourceAllocationStrategy",
    "EvaluationFramework",
    "AdaptiveEvolutionDesign",
    "KnowledgeTransferBlueprint",
    "ImplementationRoadmap",
    "SafetyFrameworkPlan",
    "DynamicArchitecturePlaybook",
]


def _normalise_sequence(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    return tuple(_normalise_text(str(item)) for item in values)


def _normalise_str_mapping(mapping: Mapping[str, str] | None) -> dict[str, str]:
    normalised: dict[str, str] = {}
    if not mapping:
        return normalised
    for key, value in mapping.items():
        normalised[_normalise_text(str(key))] = _normalise_text(str(value))
    return normalised


def _normalise_sequence_mapping(
    mapping: Mapping[str, Sequence[str]] | None,
) -> dict[str, tuple[str, ...]]:
    normalised: dict[str, tuple[str, ...]] = {}
    if not mapping:
        return normalised
    for key, values in mapping.items():
        normalised[_normalise_text(str(key))] = _normalise_sequence(values)
    return normalised


def _normalise_nested_str_mapping(
    mapping: Mapping[str, Mapping[str, str]] | None,
) -> dict[str, dict[str, str]]:
    normalised: dict[str, dict[str, str]] = {}
    if not mapping:
        return normalised
    for key, nested in mapping.items():
        if not isinstance(nested, Mapping):
            continue
        normalised[_normalise_text(str(key))] = _normalise_str_mapping(nested)
    return normalised


@dataclass(slots=True)
class CoreInterconnectionDesign:
    """Plans that coordinate core relationships and dependency flows."""

    cross_program_synergies: Mapping[str, tuple[str, ...]] = field(
        default_factory=dict
    )
    intra_program_dependencies: Mapping[str, Mapping[str, str]] = field(
        default_factory=dict
    )

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "cross_program_synergies",
            _normalise_sequence_mapping(self.cross_program_synergies),
        )
        object.__setattr__(
            self,
            "intra_program_dependencies",
            _normalise_nested_str_mapping(self.intra_program_dependencies),
        )

    @classmethod
    def default(cls) -> "CoreInterconnectionDesign":
        return cls(
            cross_program_synergies={
                "DAI-DAGI": ["core4-domain3", "core7-domain6"],
                "DAI-DAGS": ["core8-Memory", "core10-Governance"],
                "DAGI-DAGS": ["domain4-Observability", "domain7-Sync"],
            },
            intra_program_dependencies={
                "DAI": {"core1->core2->core3": "Data pipeline flow"},
                "DAGI": {
                    "domain1->domain4->domain7": "Language to knowledge to social",
                },
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "cross_program_synergies": {
                key: list(values) for key, values in self.cross_program_synergies.items()
            },
            "intra_program_dependencies": {
                key: dict(values) for key, values in self.intra_program_dependencies.items()
            },
        }


@dataclass(slots=True)
class FeedbackLoopDesign:
    """Feedback signals that keep the architecture responsive."""

    real_time_feedback: Mapping[str, str] = field(default_factory=dict)
    learning_loops: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "real_time_feedback",
            _normalise_str_mapping(self.real_time_feedback),
        )
        object.__setattr__(
            self,
            "learning_loops",
            _normalise_str_mapping(self.learning_loops),
        )

    @classmethod
    def default(cls) -> "FeedbackLoopDesign":
        return cls(
            real_time_feedback={
                "performance_metrics": "Continuous core performance monitoring",
                "adaptation_signals": "Dynamic retraining triggers",
                "collaboration_efficiency": "Cross-core communication effectiveness",
            },
            learning_loops={
                "single_loop": "Error correction within cores",
                "double_loop": "Core process improvement",
                "triple_loop": "Architecture evolution",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "real_time_feedback": dict(self.real_time_feedback),
            "learning_loops": dict(self.learning_loops),
        }


@dataclass(slots=True)
class AdvancedTrainingPlaybook:
    """Progressive training strategies coordinating specialised cores."""

    progressive_training: Mapping[str, str] = field(default_factory=dict)
    curriculum_learning: Mapping[str, str] = field(default_factory=dict)
    meta_learning: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "progressive_training",
            _normalise_str_mapping(self.progressive_training),
        )
        object.__setattr__(
            self,
            "curriculum_learning",
            _normalise_str_mapping(self.curriculum_learning),
        )
        object.__setattr__(
            self,
            "meta_learning",
            _normalise_str_mapping(self.meta_learning),
        )

    @classmethod
    def default(cls) -> "AdvancedTrainingPlaybook":
        return cls(
            progressive_training={
                "phase1": "Individual core specialization",
                "phase2": "Pairwise core collaboration",
                "phase3": "Multi-core ensemble training",
                "phase4": "Cross-program integration",
            },
            curriculum_learning={
                "difficulty_ramping": "Simple→Complex tasks",
                "concept_sequencing": "Prerequisite knowledge first",
                "transfer_acceleration": "Leverage learned concepts",
            },
            meta_learning={
                "learning_to_learn": "Optimize learning algorithms",
                "few_shot_adaptation": "Rapid new task acquisition",
                "architecture_search": "Self-improving core structure",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "progressive_training": dict(self.progressive_training),
            "curriculum_learning": dict(self.curriculum_learning),
            "meta_learning": dict(self.meta_learning),
        }


@dataclass(slots=True)
class ResourceAllocationStrategy:
    """Operational guardrails for compute, data, and energy usage."""

    compute_optimization: Mapping[str, str] = field(default_factory=dict)
    data_routing: Mapping[str, str] = field(default_factory=dict)
    energy_management: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "compute_optimization",
            _normalise_str_mapping(self.compute_optimization),
        )
        object.__setattr__(
            self,
            "data_routing",
            _normalise_str_mapping(self.data_routing),
        )
        object.__setattr__(
            self,
            "energy_management",
            _normalise_str_mapping(self.energy_management),
        )

    @classmethod
    def default(cls) -> "ResourceAllocationStrategy":
        return cls(
            compute_optimization={
                "critical_cores": "Priority resource allocation",
                "demand_scaling": "Dynamic compute distribution",
                "efficiency_monitoring": "Resource utilization tracking",
            },
            data_routing={
                "smart_data_flow": "Relevant data to appropriate cores",
                "cross_training_data": "Shared learning experiences",
                "privacy_preserving": "Secure data handling per core",
            },
            energy_management={
                "active_cores": "Task-relevant core activation",
                "sleep_modes": "Inactive core power saving",
                "performance_efficiency": "Balanced power-performance",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "compute_optimization": dict(self.compute_optimization),
            "data_routing": dict(self.data_routing),
            "energy_management": dict(self.energy_management),
        }


@dataclass(slots=True)
class EvaluationFramework:
    """Metrics keeping track of individual, collaborative, and system health."""

    individual_core_metrics: Mapping[str, str] = field(default_factory=dict)
    collaboration_metrics: Mapping[str, str] = field(default_factory=dict)
    system_level_metrics: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "individual_core_metrics",
            _normalise_str_mapping(self.individual_core_metrics),
        )
        object.__setattr__(
            self,
            "collaboration_metrics",
            _normalise_str_mapping(self.collaboration_metrics),
        )
        object.__setattr__(
            self,
            "system_level_metrics",
            _normalise_str_mapping(self.system_level_metrics),
        )

    @classmethod
    def default(cls) -> "EvaluationFramework":
        return cls(
            individual_core_metrics={
                "specialization_depth": "Domain expertise level",
                "adaptation_speed": "Learning curve steepness",
                "contribution_quality": "Output value assessment",
            },
            collaboration_metrics={
                "communication_efficiency": "Information transfer quality",
                "conflict_resolution": "Disagreement handling effectiveness",
                "synergy_coefficient": "1+1>2 amplification factor",
            },
            system_level_metrics={
                "emergent_intelligence": "Unexpected capability emergence",
                "robustness_index": "Performance under stress",
                "scalability_factor": "Performance at scale",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "individual_core_metrics": dict(self.individual_core_metrics),
            "collaboration_metrics": dict(self.collaboration_metrics),
            "system_level_metrics": dict(self.system_level_metrics),
        }


@dataclass(slots=True)
class AdaptiveEvolutionDesign:
    """Mechanisms for continual architectural adaptation."""

    self_monitoring: Mapping[str, str] = field(default_factory=dict)
    dynamic_reconfiguration: Mapping[str, str] = field(default_factory=dict)
    continuous_improvement: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "self_monitoring",
            _normalise_str_mapping(self.self_monitoring),
        )
        object.__setattr__(
            self,
            "dynamic_reconfiguration",
            _normalise_str_mapping(self.dynamic_reconfiguration),
        )
        object.__setattr__(
            self,
            "continuous_improvement",
            _normalise_str_mapping(self.continuous_improvement),
        )

    @classmethod
    def default(cls) -> "AdaptiveEvolutionDesign":
        return cls(
            self_monitoring={
                "performance_tracking": "Real-time metric collection",
                "anomaly_detection": "Deviation from expected patterns",
                "bottleneck_identification": "Performance constraint analysis",
            },
            dynamic_reconfiguration={
                "core_rewiring": "Adaptive connection patterns",
                "priority_reallocation": "Dynamic focus shifting",
                "architecture_optimization": "Structural self-improvement",
            },
            continuous_improvement={
                "incremental_learning": "Small, continuous updates",
                "breakthrough_detection": "Significant improvement identification",
                "knowledge_consolidation": "Long-term learning integration",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "self_monitoring": dict(self.self_monitoring),
            "dynamic_reconfiguration": dict(self.dynamic_reconfiguration),
            "continuous_improvement": dict(self.continuous_improvement),
        }


@dataclass(slots=True)
class KnowledgeTransferBlueprint:
    """Practices that move knowledge fluidly across domains."""

    analogy_mining: Mapping[str, str] = field(default_factory=dict)
    knowledge_distillation: Mapping[str, str] = field(default_factory=dict)
    composite_learning: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "analogy_mining",
            _normalise_str_mapping(self.analogy_mining),
        )
        object.__setattr__(
            self,
            "knowledge_distillation",
            _normalise_str_mapping(self.knowledge_distillation),
        )
        object.__setattr__(
            self,
            "composite_learning",
            _normalise_str_mapping(self.composite_learning),
        )

    @classmethod
    def default(cls) -> "KnowledgeTransferBlueprint":
        return cls(
            analogy_mining={
                "pattern_matching": "Find similar problems across domains",
                "solution_adaptation": "Adapt proven solutions to new contexts",
                "principle_extraction": "Extract fundamental principles",
            },
            knowledge_distillation={
                "expertise_sharing": "Skill transfer between cores",
                "model_compression": "Efficient knowledge representation",
                "concept_abstraction": "Generalizable learning extraction",
            },
            composite_learning={
                "multi_domain_synthesis": "Combine insights from multiple areas",
                "creative_recombination": "Novel solution generation",
                "emergent_strategies": "Unexpected effective approaches",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "analogy_mining": dict(self.analogy_mining),
            "knowledge_distillation": dict(self.knowledge_distillation),
            "composite_learning": dict(self.composite_learning),
        }


@dataclass(slots=True)
class ImplementationRoadmap:
    """Sequenced activities guiding capability rollout."""

    phases: Mapping[str, tuple[str, ...]] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "phases", _normalise_sequence_mapping(self.phases))

    @classmethod
    def default(cls) -> "ImplementationRoadmap":
        return cls(
            phases={
                "phase_1_immediate": [
                    "Add core interconnection mapping",
                    "Implement basic feedback loops",
                    "Set up cross-program communication",
                ],
                "phase_2_short_term": [
                    "Deploy progressive training strategies",
                    "Establish comprehensive metrics",
                    "Build real-time monitoring",
                ],
                "phase_3_medium_term": [
                    "Implement dynamic resource allocation",
                    "Add meta-learning capabilities",
                    "Enable architecture self-optimization",
                ],
                "phase_4_long_term": [
                    "Achieve full autonomous learning",
                    "Implement creative problem-solving",
                    "Enable strategic foresight capabilities",
                ],
            }
        )

    def as_dict(self) -> Mapping[str, object]:
        return {"phases": {key: list(values) for key, values in self.phases.items()}}


@dataclass(slots=True)
class SafetyFrameworkPlan:
    """Safety and ethics guardrails protecting architecture outcomes."""

    containment_layers: Mapping[str, str] = field(default_factory=dict)
    ethical_guidelines: Mapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "containment_layers",
            _normalise_str_mapping(self.containment_layers),
        )
        object.__setattr__(
            self,
            "ethical_guidelines",
            _normalise_str_mapping(self.ethical_guidelines),
        )

    @classmethod
    def default(cls) -> "SafetyFrameworkPlan":
        return cls(
            containment_layers={
                "core_isolation": "Prevent error propagation",
                "output_validation": "Verify all decisions",
                "emergency_shutdown": "Graceful failure modes",
            },
            ethical_guidelines={
                "value_alignment": "Ensure human-aligned goals",
                "bias_detection": "Continuous fairness monitoring",
                "transparency_requirements": "Explainable decision making",
            },
        )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "containment_layers": dict(self.containment_layers),
            "ethical_guidelines": dict(self.ethical_guidelines),
        }


@dataclass(slots=True)
class DynamicArchitecturePlaybook:
    """High-level wrapper combining improvement blueprints."""

    core_interconnection: CoreInterconnectionDesign = field(
        default_factory=CoreInterconnectionDesign.default
    )
    feedback_mechanisms: FeedbackLoopDesign = field(
        default_factory=FeedbackLoopDesign.default
    )
    training_strategies: AdvancedTrainingPlaybook = field(
        default_factory=AdvancedTrainingPlaybook.default
    )
    resource_allocation: ResourceAllocationStrategy = field(
        default_factory=ResourceAllocationStrategy.default
    )
    evaluation_framework: EvaluationFramework = field(
        default_factory=EvaluationFramework.default
    )
    adaptive_learning: AdaptiveEvolutionDesign = field(
        default_factory=AdaptiveEvolutionDesign.default
    )
    knowledge_transfer: KnowledgeTransferBlueprint = field(
        default_factory=KnowledgeTransferBlueprint.default
    )
    implementation_roadmap: ImplementationRoadmap = field(
        default_factory=ImplementationRoadmap.default
    )
    safety_framework: SafetyFrameworkPlan = field(
        default_factory=SafetyFrameworkPlan.default
    )

    def as_dict(self) -> Mapping[str, object]:
        return {
            "core_interconnection": self.core_interconnection.as_dict(),
            "feedback_mechanisms": self.feedback_mechanisms.as_dict(),
            "training_strategies": self.training_strategies.as_dict(),
            "resource_allocation": self.resource_allocation.as_dict(),
            "evaluation_framework": self.evaluation_framework.as_dict(),
            "adaptive_learning": self.adaptive_learning.as_dict(),
            "knowledge_transfer": self.knowledge_transfer.as_dict(),
            "implementation_roadmap": self.implementation_roadmap.as_dict(),
            "safety_framework": self.safety_framework.as_dict(),
        }

    def summary_keys(self) -> tuple[str, ...]:
        """Return the key improvement themes captured by the playbook."""

        return (
            "Dynamic Interconnectivity",
            "Dynamic Adaptive Learning",
            "Dynamic Cross-Program Synergy",
            "Dynamic Real-time Optimization",
            "Dynamic Comprehensive Evaluation",
            "Dynamic Safety & Ethics",
        )
