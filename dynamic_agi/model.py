"""Dynamic AGI orchestrator combining analysis, execution, and risk layers."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from dynamic_ai import (
    AISignal,
    DynamicAnalysis,
    DynamicFusionAlgo,
    GPT2Config,
    GPT2ReasoningAdapter,
    OllamaAdapter,
    OllamaConfig,
    PositionSizing,
    RiskContext,
    RiskManager,
)
from dynamic_ai.core import PreparedMarketContext, ReasoningAdapter
from dynamic_agi.self_improvement import DynamicSelfImprovement
from dynamic_metadata import ModelVersion
from dynamic_version import (
    DynamicVersionEngine,
    ReleasePlan,
    SemanticVersion,
    VersionPolicy,
)
from .cores import AGICoreProfile, CollaborativeReasoningCluster


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


DYNAMIC_AGI_EXPANSION = (
    "Driving Yield of New Advancements in Minds, Intelligence & Creation — "
    "Adapting Global Intelligence"
)

_DEFAULT_IDENTITY_PILLARS = (
    "Driving Yield of New Advancements in Minds",
    "Intelligence & Creation",
    "Adapting Global Intelligence",
)

_AGI_BASELINE_VERSION = SemanticVersion(major=0, minor=1, patch=0)
_AGI_VERSION_POLICY = VersionPolicy(
    thresholds={"major": 0.85, "minor": 0.55, "patch": 0.25},
    weights={"major": 1.2, "minor": 0.7, "patch": 0.4},
    recency_decay=0.9,
    stability_window=96,
    prerelease_label="agi-rc",
)
_AGI_VERSION_ENGINE = DynamicVersionEngine(
    baseline=_AGI_BASELINE_VERSION,
    policy=_AGI_VERSION_POLICY,
)
MODEL_VERSION_PLAN: ReleasePlan = _AGI_VERSION_ENGINE.plan(
    metadata={"component": "dynamic_agi", "policy": "agi"}
)
MODEL_VERSION_INFO = MODEL_VERSION_PLAN.to_model_version(
    "Dynamic AGI", source="dynamic_agi.model"
)
MODEL_VERSION = MODEL_VERSION_INFO.tag
_DEFAULT_LLAMA_MODEL = "llama3.3"

__all__ = [
    "AGIDiagnostics",
    "AGIOutput",
    "DynamicAGIIdentity",
    "DynamicAGIModel",
    "MODEL_VERSION",
    "MODEL_VERSION_INFO",
    "MODEL_VERSION_PLAN",
    "DYNAMIC_AGI_EXPANSION",
]


def _default_version_info() -> Dict[str, Any]:
    return MODEL_VERSION_INFO.as_dict()


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_options(options: Mapping[str, Any] | None) -> Dict[str, Any]:
    if not options:
        return {}
    return {str(key): value for key, value in options.items()}


def _coerce_headers(headers: Mapping[str, Any] | None) -> Dict[str, str] | None:
    if not headers:
        return None
    return {str(key): str(value) for key, value in headers.items()}


def _context_snapshot(context: PreparedMarketContext) -> Dict[str, Any]:
    """Compress the prepared context into JSON-serialisable primitives."""

    return {
        "source_signal": context.source_signal,
        "resolved_signal": context.resolved_signal,
        "momentum": context.momentum,
        "trend": context.trend,
        "sentiment_value": context.sentiment_value,
        "composite_trimmed_mean": context.composite_trimmed_mean,
        "volatility": context.volatility,
        "news_topics": list(context.news_topics),
        "alignment": context.alignment,
        "data_quality": context.data_quality,
        "risk_score": context.risk_score,
        "drawdown": context.drawdown,
        "base_confidence": context.base_confidence,
        "support_level": context.support_level,
        "resistance_level": context.resistance_level,
        "human_bias": context.human_bias,
        "human_weight": context.human_weight,
        "circuit_breaker": context.circuit_breaker,
    }


def _normalise_risk_context(
    context: RiskContext | Mapping[str, Any] | None,
) -> RiskContext:
    if context is None:
        return RiskContext()
    if isinstance(context, RiskContext):
        return context
    return RiskContext(
        daily_drawdown=_coerce_float(context.get("daily_drawdown"), 0.0),
        treasury_utilisation=_coerce_float(context.get("treasury_utilisation"), 0.0),
        treasury_health=_coerce_float(context.get("treasury_health"), 1.0),
        volatility=_coerce_float(context.get("volatility"), 0.0),
    )


def _build_ollama_adapter(
    *,
    model: str,
    host: str | None,
    options: Mapping[str, Any] | None,
    headers: Mapping[str, Any] | None,
    keep_alive: float | None,
    timeout: float | None,
) -> OllamaAdapter:
    config = OllamaConfig(model=model)
    if host is not None:
        config.host = host
    if keep_alive is not None:
        config.keep_alive = keep_alive
    extra_options = _coerce_options(options)
    if extra_options:
        config.options.update(extra_options)
    coerced_headers = _coerce_headers(headers)
    if coerced_headers is not None:
        config.headers = coerced_headers
    adapter = OllamaAdapter(config=config)
    if timeout is not None:
        adapter.timeout = timeout
    return adapter


def _build_gpt2_adapter(
    *,
    model_name: str,
    device: str | int | None,
    generation_options: Mapping[str, Any] | None,
) -> GPT2ReasoningAdapter:
    config = GPT2Config(model_name=model_name)
    if device is not None:
        config.device = device
    if generation_options:
        config.additional_kwargs.update({str(key): value for key, value in generation_options.items()})
    return GPT2ReasoningAdapter(config=config)


def _ensure_core_profile(profile: AGICoreProfile | Mapping[str, Any]) -> AGICoreProfile:
    if isinstance(profile, AGICoreProfile):
        return profile
    if not isinstance(profile, Mapping):
        raise TypeError("Core profile must be an AGICoreProfile or a mapping definition")

    adapter = profile.get("adapter")
    if adapter is None:
        raise ValueError("Core profile mapping requires an 'adapter' entry")
    name = str(profile.get("name") or getattr(adapter, "__class__", type(adapter)).__name__)
    specialties = frozenset(str(tag).strip().upper() for tag in profile.get("specialties", ()) if str(tag).strip())
    focus_topics = frozenset(str(topic).strip().lower() for topic in profile.get("focus_topics", ()) if str(topic).strip())
    weight = float(profile.get("weight", 1.0))
    metadata = dict(profile.get("metadata", {}))
    return AGICoreProfile(
        name=name,
        adapter=adapter,
        specialties=specialties,
        focus_topics=focus_topics,
        weight=weight,
        metadata=metadata,
    )


def _default_specialised_profiles(
    *,
    gpt2_model: str | None,
    gpt2_device: str | int | None,
    gpt2_generation_options: Mapping[str, Any] | None,
    llama_model: str | None,
    ollama_host: str | None,
    ollama_options: Mapping[str, Any] | None,
    ollama_headers: Mapping[str, Any] | None,
    ollama_keep_alive: float | None,
    ollama_timeout: float | None,
) -> list[AGICoreProfile]:
    profiles: list[AGICoreProfile] = []
    if gpt2_model:
        gpt2_adapter = _build_gpt2_adapter(
            model_name=gpt2_model,
            device=gpt2_device,
            generation_options=gpt2_generation_options,
        )
        profiles.append(
            AGICoreProfile(
                name="gpt2-core",
                adapter=gpt2_adapter,
                specialties=frozenset({"HOLD", "NEUTRAL"}),
                focus_topics=frozenset({"sentiment", "narrative", "context"}),
                weight=0.9,
            )
        )
    if llama_model:
        llama_adapter = _build_ollama_adapter(
            model=llama_model,
            host=ollama_host,
            options=ollama_options,
            headers=ollama_headers,
            keep_alive=ollama_keep_alive,
            timeout=ollama_timeout,
        )
        profiles.append(
            AGICoreProfile(
                name=f"ollama-{llama_model}",
                adapter=llama_adapter,
                specialties=frozenset({"BUY", "SELL"}),
                focus_topics=frozenset({"momentum", "trend", "volatility"}),
                weight=1.1,
            )
        )
    return profiles


@dataclass(slots=True)
class AGIDiagnostics:
    """Structured diagnostic payload emitted by the AGI model."""

    context: Dict[str, Any]
    composite: Dict[str, Any]
    consensus: Dict[str, float]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "context": self.context,
            "composite": self.composite,
            "consensus": self.consensus,
        }


@dataclass(frozen=True, slots=True)
class DynamicAGIIdentity:
    """Identity metadata describing the Dynamic AGI expansion."""

    name: str = "Dynamic AGI"
    acronym: str = "Dynamic AGI"
    expansion: str = DYNAMIC_AGI_EXPANSION
    pillars: tuple[str, ...] = _DEFAULT_IDENTITY_PILLARS

    def as_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "acronym": self.acronym,
            "expansion": self.expansion,
            "pillars": list(self.pillars),
        }


@dataclass(slots=True)
class AGIOutput:
    """Aggregated response combining signal, research, and risk views."""

    signal: AISignal
    research: Dict[str, Any]
    risk_adjusted: Dict[str, Any]
    sizing: Optional[PositionSizing]
    market_making: Dict[str, float]
    diagnostics: AGIDiagnostics
    improvement: Optional[Dict[str, Any]] = None
    version: str = MODEL_VERSION
    version_info: Dict[str, Any] = field(default_factory=_default_version_info)
    generated_at: datetime = field(default_factory=_utcnow)

    def to_dict(self) -> Dict[str, Any]:
        payload = {
            "signal": self.signal.to_dict(),
            "research": self.research,
            "risk_adjusted": self.risk_adjusted,
            "market_making": dict(self.market_making),
            "diagnostics": self.diagnostics.to_dict(),
        }
        if self.sizing is not None:
            payload["sizing"] = asdict(self.sizing)
        if self.improvement is not None:
            payload["improvement"] = self.improvement
        payload["version"] = self.version
        payload["version_info"] = deepcopy(self.version_info)
        payload["generated_at"] = self.generated_at.astimezone(timezone.utc).isoformat()
        return payload

    def __post_init__(self) -> None:
        if self.generated_at.tzinfo is None:
            self.generated_at = self.generated_at.replace(tzinfo=timezone.utc)
        else:
            self.generated_at = self.generated_at.astimezone(timezone.utc)


class DynamicAGIModel:
    """High level coordinator upgrading the Dynamic AI stack to AGI workflows."""

    def __init__(
        self,
        *,
        fusion: Optional[DynamicFusionAlgo] = None,
        analysis: Optional[DynamicAnalysis] = None,
        risk_manager: Optional[RiskManager] = None,
        self_improvement: Optional[DynamicSelfImprovement] = None,
        llm_adapter: ReasoningAdapter | None = None,
        llama_model: str | None = _DEFAULT_LLAMA_MODEL,
        ollama_host: str | None = None,
        ollama_options: Mapping[str, Any] | None = None,
        ollama_headers: Mapping[str, Any] | None = None,
        ollama_keep_alive: float | None = None,
        ollama_timeout: float | None = None,
        reasoning_cache_size: int | None = None,
        gpt2_model: str | None = None,
        gpt2_device: str | int | None = None,
        gpt2_generation_options: Mapping[str, Any] | None = None,
        core_profiles: Sequence[AGICoreProfile | Mapping[str, Any]] | None = None,
        core_cluster: CollaborativeReasoningCluster | None = None,
        core_cache_size: int | None = None,
    ) -> None:
        if fusion is None:
            adapter = llm_adapter
            if adapter is None:
                resolved_profiles: list[AGICoreProfile] = []
                if core_profiles:
                    resolved_profiles.extend(_ensure_core_profile(profile) for profile in core_profiles)

                if not resolved_profiles:
                    resolved_profiles.extend(
                        _default_specialised_profiles(
                            gpt2_model=gpt2_model,
                            gpt2_device=gpt2_device,
                            gpt2_generation_options=gpt2_generation_options,
                            llama_model=llama_model,
                            ollama_host=ollama_host,
                            ollama_options=ollama_options,
                            ollama_headers=ollama_headers,
                            ollama_keep_alive=ollama_keep_alive,
                            ollama_timeout=ollama_timeout,
                        )
                    )

                cluster = core_cluster
                if cluster is None and resolved_profiles:
                    cluster = CollaborativeReasoningCluster(
                        resolved_profiles,
                        cache_size=core_cache_size if core_cache_size is not None else 48,
                    )

                if cluster is not None:
                    adapter = cluster
                elif gpt2_model:
                    adapter = _build_gpt2_adapter(
                        model_name=gpt2_model,
                        device=gpt2_device,
                        generation_options=gpt2_generation_options,
                    )
                elif llama_model:
                    adapter = _build_ollama_adapter(
                        model=llama_model,
                        host=ollama_host,
                        options=ollama_options,
                        headers=ollama_headers,
                        keep_alive=ollama_keep_alive,
                        timeout=ollama_timeout,
                    )
            cache_size = reasoning_cache_size if reasoning_cache_size is not None else 64
            fusion = DynamicFusionAlgo(
                llm_adapter=adapter,
                reasoning_cache_size=cache_size,
            )

        self.fusion = fusion
        self.analysis = analysis or DynamicAnalysis()
        self.risk_manager = risk_manager or RiskManager()
        self.self_improvement = self_improvement
        self.version = MODEL_VERSION
        self.version_info = _default_version_info()
        self.version_plan: ReleasePlan = MODEL_VERSION_PLAN
        self._identity = DynamicAGIIdentity()

    @property
    def version_metadata(self) -> Dict[str, Any]:
        """Return a copy of the model version metadata."""

        return deepcopy(self.version_info)

    @property
    def identity(self) -> DynamicAGIIdentity:
        """Expose the canonical Dynamic AGI naming expansion."""

        return self._identity

    def evaluate(
        self,
        *,
        market_data: Mapping[str, Any],
        research: Optional[Mapping[str, Any]] = None,
        risk_context: RiskContext | Mapping[str, Any] | None = None,
        treasury: Optional[Mapping[str, Any]] = None,
        inventory: float = 0.0,
        performance: Optional[Mapping[str, Any]] = None,
        feedback_notes: Optional[Iterable[str]] = None,
        introspection_inputs: Optional[Mapping[str, Any]] = None,
    ) -> AGIOutput:
        """Run the end-to-end AGI workflow for the supplied payloads."""

        artifacts = self._execute_pipeline(
            market_data=market_data,
            research=research,
            risk_context=risk_context,
            treasury=treasury,
            inventory=inventory,
        )

        diagnostics = self._build_diagnostics(artifacts)
        output = self._build_output(artifacts, diagnostics, improvement=None)

        improvement_payload = self._record_self_improvement(
            output,
            performance=performance,
            feedback_notes=feedback_notes,
            introspection_inputs=introspection_inputs,
        )
        if improvement_payload is not None:
            output = replace(output, improvement=improvement_payload)

        return output

    # ------------------------------------------------------------------
    # internal helpers

    @dataclass(slots=True)
    class _EvaluationArtifacts:
        context: PreparedMarketContext
        composite: Dict[str, Any]
        consensus: Dict[str, float]
        signal: AISignal
        research: Dict[str, Any]
        risk_ctx: RiskContext
        risk_adjusted: Dict[str, Any]
        sizing: Optional[PositionSizing]
        market_making: Dict[str, float]

    def _execute_pipeline(
        self,
        *,
        market_data: Mapping[str, Any],
        research: Optional[Mapping[str, Any]],
        risk_context: RiskContext | Mapping[str, Any] | None,
        treasury: Optional[Mapping[str, Any]],
        inventory: float,
    ) -> "DynamicAGIModel._EvaluationArtifacts":
        market_payload = dict(market_data)
        context = self.fusion.prepare_context(market_payload)
        composite = self.fusion.composite_diagnostics(context)
        consensus = self.fusion.consensus_matrix(context)

        signal = self.fusion.generate_signal(market_payload, context=context)
        research_payload = self.analysis.analyse(dict(research or {}))

        risk_ctx = _normalise_risk_context(risk_context)
        risk_adjusted = self.risk_manager.enforce(signal.to_dict(), risk_ctx)
        confidence = _coerce_float(risk_adjusted.get("confidence"), signal.confidence)
        sizing = self.risk_manager.sizing(
            risk_ctx,
            confidence=confidence,
            volatility=context.volatility,
        )

        treasury_payload = dict(treasury or {})
        market_making = self.fusion.mm_parameters(
            market_payload,
            treasury_payload,
            inventory,
        )

        return DynamicAGIModel._EvaluationArtifacts(
            context=context,
            composite=composite,
            consensus=consensus,
            signal=signal,
            research=research_payload,
            risk_ctx=risk_ctx,
            risk_adjusted=risk_adjusted,
            sizing=sizing,
            market_making=market_making,
        )

    def _build_diagnostics(
        self, artifacts: "DynamicAGIModel._EvaluationArtifacts"
    ) -> AGIDiagnostics:
        return AGIDiagnostics(
            context=_context_snapshot(artifacts.context),
            composite=artifacts.composite,
            consensus=artifacts.consensus,
        )

    def _build_output(
        self,
        artifacts: "DynamicAGIModel._EvaluationArtifacts",
        diagnostics: AGIDiagnostics,
        improvement: Optional[Dict[str, Any]],
    ) -> AGIOutput:
        return AGIOutput(
            signal=artifacts.signal,
            research=artifacts.research,
            risk_adjusted=artifacts.risk_adjusted,
            sizing=artifacts.sizing,
            market_making=artifacts.market_making,
            diagnostics=diagnostics,
            improvement=improvement,
            version=self.version,
            version_info=self.version_metadata,
        )

    def _record_self_improvement(
        self,
        output: AGIOutput,
        *,
        performance: Optional[Mapping[str, Any]],
        feedback_notes: Optional[Iterable[str]],
        introspection_inputs: Optional[Mapping[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        if self.self_improvement is None:
            return None

        self.self_improvement.record_session(
            output=output,
            performance=performance,
            feedback_notes=feedback_notes,
            introspection_inputs=introspection_inputs,
        )
        try:
            plan = self.self_improvement.generate_plan()
        except RuntimeError:
            return None
        return plan.to_dict()
