"""Dynamic AGI orchestrator combining analysis, execution, and risk layers."""

from __future__ import annotations

import logging
from copy import deepcopy
from dataclasses import asdict, dataclass, field, replace, fields
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Mapping, Optional

from dynamic.intelligence.ai_apps import (
    AISignal,
    DynamicAnalysis,
    DynamicFusionAlgo,
    KimiK2Adapter,
    KimiK2Config,
    KimiK2PromptTemplate,
    OllamaAdapter,
    OllamaConfig,
    PositionSizing,
    RiskContext,
    RiskManager,
)
from dynamic.intelligence.ai_apps.core import PreparedMarketContext, ReasoningAdapter
from dynamic.intelligence.agi.self_improvement import DynamicSelfImprovement
from dynamic.intelligence.agi.telemetry import AGIImprovementRepository
from dynamic_metadata import ModelVersion
from dynamic_version import (
    DynamicVersionEngine,
    ReleasePlan,
    SemanticVersion,
    VersionPolicy,
)


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
    metadata={"component": "dynamic.intelligence.agi", "policy": "agi"}
)
MODEL_VERSION_INFO = MODEL_VERSION_PLAN.to_model_version(
    "Dynamic AGI", source="dynamic.intelligence.agi.model"
)
MODEL_VERSION = MODEL_VERSION_INFO.tag
_DEFAULT_LLAMA_MODEL = "llama3.3"

logger = logging.getLogger(__name__)

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


def _coerce_kimi_k2_config(
    config: KimiK2Config | Mapping[str, Any] | None,
) -> KimiK2Config:
    if config is None:
        return KimiK2Config()
    if isinstance(config, KimiK2Config):
        return config

    payload = dict(config)
    extra_body = payload.pop("extra_body", None)
    extra_headers = payload.pop("extra_headers", None)

    allowed_fields = {field.name for field in fields(KimiK2Config)}
    filtered: Dict[str, Any] = {}
    for key, value in payload.items():
        if key in {"extra_body", "extra_headers"}:
            continue
        if key in allowed_fields:
            filtered[key] = value

    coerced = KimiK2Config(**filtered)
    if extra_body:
        coerced.extra_body.update(dict(extra_body))
    if extra_headers:
        coerced.extra_headers = {str(k): str(v) for k, v in dict(extra_headers).items()}
    return coerced


def _build_kimi_k2_adapter(
    *,
    config: KimiK2Config | Mapping[str, Any] | None,
    headers: Mapping[str, Any] | None,
    api_key: str | None,
    timeout: float | None,
    prompt_template: KimiK2PromptTemplate | None,
) -> KimiK2Adapter:
    coerced = _coerce_kimi_k2_config(config)

    if api_key is not None:
        coerced.api_key = api_key

    header_map = _coerce_headers(headers)
    if header_map:
        existing_headers = dict(coerced.extra_headers) if coerced.extra_headers else {}
        existing_headers.update(header_map)
        coerced.extra_headers = existing_headers

    adapter = KimiK2Adapter(config=coerced)

    if prompt_template is not None:
        adapter.prompt_template = prompt_template
    if timeout is not None:
        adapter.timeout = timeout

    return adapter


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
        improvement_repository: Optional[AGIImprovementRepository] = None,
        llm_adapter: ReasoningAdapter | None = None,
        llama_model: str | None = _DEFAULT_LLAMA_MODEL,
        ollama_host: str | None = None,
        ollama_options: Mapping[str, Any] | None = None,
        ollama_headers: Mapping[str, Any] | None = None,
        ollama_keep_alive: float | None = None,
        ollama_timeout: float | None = None,
        reasoning_cache_size: int | None = None,
        use_kimi_k2: bool = False,
        kimi_k2_config: KimiK2Config | Mapping[str, Any] | None = None,
        kimi_k2_headers: Mapping[str, Any] | None = None,
        kimi_k2_api_key: str | None = None,
        kimi_k2_timeout: float | None = None,
        kimi_k2_prompt_template: KimiK2PromptTemplate | None = None,
    ) -> None:
        if fusion is None:
            adapter = llm_adapter
            kimi_requested = any(
                option is not None
                for option in (
                    kimi_k2_config,
                    kimi_k2_headers,
                    kimi_k2_api_key,
                    kimi_k2_timeout,
                    kimi_k2_prompt_template,
                )
            )
            if adapter is None:
                if use_kimi_k2 or kimi_requested:
                    adapter = _build_kimi_k2_adapter(
                        config=kimi_k2_config,
                        headers=kimi_k2_headers,
                        api_key=kimi_k2_api_key,
                        timeout=kimi_k2_timeout,
                        prompt_template=kimi_k2_prompt_template,
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
        self.improvement_repository = improvement_repository
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

        snapshot = self.self_improvement.record_session(
            output=output,
            performance=performance,
            feedback_notes=feedback_notes,
            introspection_inputs=introspection_inputs,
        )
        try:
            plan = self.self_improvement.generate_plan()
        except RuntimeError:
            return None
        if self.improvement_repository is not None:
            try:
                self.improvement_repository.persist(
                    snapshot=snapshot,
                    plan=plan,
                    model_version=output.version,
                    version_info=output.version_info,
                )
            except Exception:  # pragma: no cover - telemetry persistence should not break evaluation
                logger.exception("Failed to persist self-improvement telemetry")
        return plan.to_dict()
