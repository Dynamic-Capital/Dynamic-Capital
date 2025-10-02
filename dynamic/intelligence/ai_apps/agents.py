"""Persona-based Dynamic AI agent abstractions."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from datetime import datetime, timezone
from threading import Lock
from typing import (
    Any,
    Callable,
    Dict,
    Iterable,
    Mapping,
    MutableMapping,
    Protocol,
    Sequence,
    TypeVar,
    cast,
)

from .analysis import DynamicAnalysis
from .core import AISignal, DynamicFusionAlgo
from .hedge import (
    AccountState,
    DynamicHedgePolicy,
    ExposurePosition,
    HedgeDecision,
    HedgePosition,
    MarketState,
    NewsEvent,
    VolatilitySnapshot,
)
from .risk import PositionSizing, RiskContext, RiskManager, RiskParameters
from dynamic_blood import BloodContext, BloodInsight, BloodSample, DynamicBlood
from dynamic_wave import (
    DynamicWaveField,
    WaveEvent,
    WaveListener,
    WaveMedium,
    WaveSnapshot,
    WaveSource,
)
from dynamic_space import (
    DynamicSpace,
    SpaceEvent,
    SpaceEventSeverity,
    SpaceSector,
    SpaceSnapshot,
)


@dataclass(slots=True)
class AgentResult:
    """Base result payload returned by persona agents."""

    agent: str
    rationale: str
    confidence: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent": self.agent,
            "rationale": self.rationale,
            "confidence": round(self.confidence, 4),
        }


class Agent(Protocol):
    """Contract implemented by all persona agents."""

    name: str

    def run(self, payload: Mapping[str, Any]) -> AgentResult:  # pragma: no cover - protocol
        """Execute the agent with the provided payload."""
        ...


@dataclass(slots=True)
class ResearchAgentResult(AgentResult):
    """Structured research insight emitted by the research persona."""

    analysis: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["analysis"] = self.analysis
        return payload


@dataclass(slots=True)
class ExecutionAgentResult(AgentResult):
    """Fused trading signal emitted by the execution persona."""

    signal: AISignal
    context: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["signal"] = self.signal.to_dict()
        if self.context:
            payload["context"] = dict(self.context)
        return payload


@dataclass(slots=True)
class RiskAgentResult(AgentResult):
    """Risk governance output including hedging directives."""

    adjusted_signal: Dict[str, Any]
    sizing: PositionSizing | None
    hedge_decisions: Sequence[HedgeDecision]
    escalations: Sequence[str] = ()

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["adjusted_signal"] = dict(self.adjusted_signal)
        if self.sizing is not None:
            payload["sizing"] = asdict(self.sizing)
        payload["hedge_decisions"] = [asdict(decision) for decision in self.hedge_decisions]
        if self.escalations:
            payload["escalations"] = list(self.escalations)
        return payload


@dataclass(slots=True)
class ChatTurn:
    """Single conversational turn emitted by the Dynamic Chat agent."""

    role: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = {"role": self.role, "content": self.content}
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class ChatAgentResult(AgentResult):
    """Conversational summary prepared for human-in-the-loop workflows."""

    messages: Sequence[ChatTurn]
    decision: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["messages"] = [message.to_dict() for message in self.messages]
        if self.decision:
            payload["decision"] = dict(self.decision)
        return payload


@dataclass(slots=True)
class SpaceAgentResult(AgentResult):
    """Operational insight produced by the Dynamic Space persona."""

    sector: str
    snapshot: SpaceSnapshot
    events: tuple[SpaceEvent, ...] = field(default_factory=tuple)
    recommendations: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["sector"] = self.sector
        payload["snapshot"] = _space_snapshot_to_dict(self.snapshot)
        if self.events:
            payload["events"] = [_space_event_to_dict(event) for event in self.events]
        if self.recommendations:
            payload["recommendations"] = list(self.recommendations)
        return payload


@dataclass(slots=True)
class WaveAgentResult(AgentResult):
    """Dynamic wave-field assessment emitted by the wave persona."""

    medium: str
    snapshot: WaveSnapshot
    events: tuple[WaveEvent, ...] = field(default_factory=tuple)
    recommendations: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["medium"] = self.medium
        payload["snapshot"] = _wave_snapshot_to_dict(self.snapshot)
        if self.events:
            payload["events"] = [_wave_event_to_dict(event) for event in self.events]
        if self.recommendations:
            payload["recommendations"] = list(self.recommendations)
        return payload


@dataclass(slots=True)
class TradingAgentResult(AgentResult):
    """Execution outcome emitted by the trading persona."""

    decision: Dict[str, Any]
    trade: Dict[str, Any]
    agents: Dict[str, Any]
    optimisation: Dict[str, Any]
    treasury_event: Dict[str, Any] | None = None

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["decision"] = dict(self.decision)
        payload["trade"] = dict(self.trade)
        payload["agents"] = dict(self.agents)
        payload["optimisation"] = dict(self.optimisation)
        if self.treasury_event:
            payload["treasury_event"] = dict(self.treasury_event)
        return payload


@dataclass(slots=True)
class BloodAgentResult(AgentResult):
    """Blood-state inference emitted by the Dynamic Blood persona."""

    insight: BloodInsight
    algorithm: str
    latest_sample: BloodSample | None = None
    context: BloodContext | None = None
    samples_recorded: int = 0
    window: int = 0

    def to_dict(self) -> Dict[str, Any]:
        payload = AgentResult.to_dict(self)
        payload["insight"] = self.insight.as_dict()
        payload["algorithm"] = self.algorithm
        payload["window"] = self.window
        payload["samples_recorded"] = self.samples_recorded
        if self.latest_sample is not None:
            payload["latest_sample"] = self.latest_sample.as_dict()
        if self.context is not None:
            payload["context"] = {
                "hydration_level": self.context.hydration_level,
                "stress_index": self.context.stress_index,
                "altitude_meters": self.context.altitude_meters,
                "recent_activity": self.context.recent_activity,
                "sleep_quality": self.context.sleep_quality,
                "temperature_exposure": self.context.temperature_exposure,
                "medications": list(self.context.medications),
                "conditions": list(self.context.conditions),
                "notes": self.context.notes,
            }
        return payload


def _coerce_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _optional_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _coerce_timestamp(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = datetime.fromisoformat(text)
        except ValueError as exc:
            raise ValueError("timestamp must be an ISO formatted datetime string") from exc
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        else:
            parsed = parsed.astimezone(timezone.utc)
        return parsed
    raise ValueError("timestamp must be a datetime or ISO formatted string")


def _coerce_risk_context(payload: Mapping[str, Any] | None) -> RiskContext:
    if isinstance(payload, RiskContext):
        return payload
    mapping = dict(payload or {})
    return RiskContext(
        daily_drawdown=_coerce_float(mapping.get("daily_drawdown"), 0.0),
        treasury_utilisation=_coerce_float(mapping.get("treasury_utilisation"), 0.0),
        treasury_health=_coerce_float(mapping.get("treasury_health"), 1.0),
        volatility=_coerce_float(mapping.get("volatility"), 0.0),
    )


def _coerce_risk_parameters(payload: Mapping[str, Any] | None) -> RiskParameters:
    if isinstance(payload, RiskParameters):
        return payload
    mapping = dict(payload or {})
    return RiskParameters(
        max_daily_drawdown=_coerce_float(mapping.get("max_daily_drawdown"), 0.08),
        treasury_utilisation_cap=_coerce_float(mapping.get("treasury_utilisation_cap"), 0.6),
        circuit_breaker_drawdown=_coerce_float(mapping.get("circuit_breaker_drawdown"), 0.12),
    )


def _coerce_str_tuple(value: Any) -> tuple[str, ...]:
    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        text = str(value).strip()
        return (text,) if text else ()
    if isinstance(value, Iterable):
        result: list[str] = []
        for item in value:
            if item is None:
                continue
            text = str(item).strip()
            if text and text not in result:
                result.append(text)
        return tuple(result)
    raise TypeError("iterable of strings expected")


def _coerce_numeric_mapping(value: Any) -> Mapping[str, float]:
    if value is None:
        return {}
    if isinstance(value, Mapping):
        result: Dict[str, float] = {}
        for key, raw in value.items():
            if key is None:
                continue
            label = str(key).strip()
            if not label:
                continue
            try:
                result[label] = float(raw)
            except (TypeError, ValueError):
                continue
        return result
    raise TypeError("mapping of numeric values expected")


def _coerce_blood_sample(payload: Mapping[str, Any] | BloodSample | None) -> BloodSample:
    if isinstance(payload, BloodSample):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("blood samples must be provided as mappings")
    mapping = dict(payload)
    timestamp = _coerce_timestamp(mapping.get("timestamp"))
    tags = _coerce_str_tuple(mapping.get("tags"))
    metadata = mapping.get("metadata")
    metadata_mapping = dict(metadata) if isinstance(metadata, Mapping) else None
    inflammatory = _coerce_numeric_mapping(mapping.get("inflammatory_markers"))
    micronutrients = _coerce_numeric_mapping(mapping.get("micronutrients"))
    sample = BloodSample(
        rbc_count=_coerce_float(mapping.get("rbc_count"), 0.0),
        wbc_count=_coerce_float(mapping.get("wbc_count"), 0.0),
        platelet_count=_coerce_float(mapping.get("platelet_count"), 0.0),
        hemoglobin=_coerce_float(mapping.get("hemoglobin"), 0.0),
        hematocrit=_coerce_float(mapping.get("hematocrit"), 0.0),
        plasma_volume=_coerce_float(mapping.get("plasma_volume"), 0.0),
        lactate=_coerce_float(mapping.get("lactate"), 1.2),
        ferritin=mapping.get("ferritin"),
        inflammatory_markers=inflammatory,
        micronutrients=micronutrients,
        timestamp=timestamp or datetime.now(timezone.utc),
        tags=tags,
        metadata=metadata_mapping,
    )
    return sample


def _coerce_blood_samples(values: Any) -> Sequence[BloodSample]:
    if values is None:
        return ()
    if isinstance(values, (BloodSample, Mapping)):
        return (_coerce_blood_sample(values),)
    if isinstance(values, Iterable) and not isinstance(values, (str, bytes)):
        samples: list[BloodSample] = []
        for item in values:
            samples.append(_coerce_blood_sample(item))
        return tuple(samples)
    raise TypeError("blood samples payload must be a mapping or iterable of mappings")


def _coerce_blood_context(payload: Mapping[str, Any] | BloodContext | None) -> BloodContext | None:
    if payload is None:
        return None
    if isinstance(payload, BloodContext):
        return payload
    if not isinstance(payload, Mapping):
        raise TypeError("blood context must be provided as a mapping")
    mapping = dict(payload)
    return BloodContext(
        hydration_level=_coerce_float(mapping.get("hydration_level"), 0.5),
        stress_index=_coerce_float(mapping.get("stress_index"), 0.5),
        altitude_meters=_coerce_float(mapping.get("altitude_meters"), 0.0),
        recent_activity=_coerce_float(mapping.get("recent_activity"), 0.0),
        sleep_quality=_coerce_float(mapping.get("sleep_quality"), 0.6),
        temperature_exposure=_coerce_float(mapping.get("temperature_exposure"), 0.5),
        medications=_coerce_str_tuple(mapping.get("medications")),
        conditions=_coerce_str_tuple(mapping.get("conditions")),
        notes=_extract_text(mapping.get("notes"), mapping.get("note")),
    )


def _coerce_exposures(values: Iterable[Any] | None) -> Sequence[ExposurePosition]:
    exposures: list[ExposurePosition] = []
    if not values:
        return exposures
    for item in values:
        if isinstance(item, ExposurePosition):
            exposures.append(item)
            continue
        if isinstance(item, Mapping):
            symbol = str(item.get("symbol", "")).upper() or "UNKNOWN"
            side = str(item.get("side", "LONG")).upper()
            side_literal = "SHORT" if side.startswith("SHORT") else "LONG"
            exposures.append(
                ExposurePosition(
                    symbol=symbol,
                    side=side_literal,  # type: ignore[arg-type]
                    quantity=_coerce_float(item.get("quantity"), 0.0),
                    beta=_coerce_float(item.get("beta"), 1.0),
                    price=_optional_float(item.get("price")),
                    pip_value=_optional_float(item.get("pip_value")),
                )
            )
    return exposures


def _coerce_hedges(values: Iterable[Any] | None) -> Sequence[HedgePosition]:
    hedges: list[HedgePosition] = []
    if not values:
        return hedges
    for item in values:
        if isinstance(item, HedgePosition):
            hedges.append(item)
            continue
        if isinstance(item, Mapping):
            hedges.append(
                HedgePosition(
                    id=str(item.get("id", "")),
                    symbol=str(item.get("symbol", "")).upper(),
                    hedge_symbol=str(item.get("hedge_symbol", "")).upper(),
                    side="SHORT_HEDGE" if str(item.get("side", "SHORT_HEDGE")).upper().startswith("SHORT") else "LONG_HEDGE",
                    qty=_coerce_float(item.get("qty"), 0.0),
                    reason=str(item.get("reason", "ATR_SPIKE")),
                )
            )
    return hedges


def _coerce_sectors(values: Iterable[Any] | Any | None) -> Sequence[SpaceSector]:
    if values is None:
        return ()
    if isinstance(values, (SpaceSector, Mapping)):
        values = (values,)
    if isinstance(values, (str, bytes)):
        raise TypeError("sector definitions must not be strings")
    sectors: list[SpaceSector] = []
    for item in values:  # type: ignore[assignment]
        if isinstance(item, SpaceSector):
            sectors.append(item)
        elif isinstance(item, Mapping):
            sectors.append(SpaceSector(**item))
        else:
            raise TypeError("sector definitions must be SpaceSector instances or mappings")
    return tuple(sectors)


def _coerce_events(values: Iterable[Any] | Any | None) -> Sequence[SpaceEvent]:
    if values is None:
        return ()
    if isinstance(values, (SpaceEvent, Mapping)):
        values = (values,)
    if isinstance(values, (str, bytes)):
        raise TypeError("event definitions must not be strings")
    events: list[SpaceEvent] = []
    for item in values:  # type: ignore[assignment]
        if isinstance(item, SpaceEvent):
            events.append(item)
        elif isinstance(item, Mapping):
            events.append(SpaceEvent(**item))
        else:
            raise TypeError("events must be SpaceEvent instances or mappings")
    return tuple(events)


def _space_event_to_dict(event: SpaceEvent) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "sector_name": event.sector_name,
        "description": event.description,
        "impact_score": event.impact_score,
        "severity": event.severity.value
        if isinstance(event.severity, SpaceEventSeverity)
        else str(event.severity),
        "timestamp": event.timestamp.isoformat(),
    }
    metadata = getattr(event, "metadata", None)
    if isinstance(metadata, Mapping) and metadata:
        payload["metadata"] = dict(metadata)
    return payload


def _space_snapshot_to_dict(snapshot: SpaceSnapshot) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "sector_name": snapshot.sector_name,
        "timestamp": snapshot.timestamp.isoformat(),
        "stability_score": snapshot.stability_score,
        "traffic_load": snapshot.traffic_load,
        "hazard_index": snapshot.hazard_index,
        "energy_output_gw": snapshot.energy_output_gw,
    }
    events = getattr(snapshot, "recent_events", ())
    if events:
        payload["recent_events"] = [_space_event_to_dict(event) for event in events]
    return payload


def _coerce_wave_mediums(values: Iterable[Any] | Any | None) -> Sequence[WaveMedium]:
    if values is None:
        return ()
    if isinstance(values, (WaveMedium, Mapping)):
        values = (values,)
    if isinstance(values, (str, bytes)):
        raise TypeError("medium definitions must not be strings")
    mediums: list[WaveMedium] = []
    for item in values:  # type: ignore[assignment]
        if isinstance(item, WaveMedium):
            mediums.append(item)
        elif isinstance(item, Mapping):
            mediums.append(WaveMedium(**item))
        else:
            raise TypeError("media must be WaveMedium instances or mappings")
    return tuple(mediums)


def _coerce_wave_sources(values: Iterable[Any] | Any | None) -> Sequence[WaveSource]:
    if values is None:
        return ()
    if isinstance(values, (WaveSource, Mapping)):
        values = (values,)
    if isinstance(values, (str, bytes)):
        raise TypeError("source definitions must not be strings")
    sources: list[WaveSource] = []
    for item in values:  # type: ignore[assignment]
        if isinstance(item, WaveSource):
            sources.append(item)
        elif isinstance(item, Mapping):
            sources.append(WaveSource(**item))
        else:
            raise TypeError("sources must be WaveSource instances or mappings")
    return tuple(sources)


def _coerce_wave_listeners(values: Iterable[Any] | Any | None) -> Sequence[WaveListener]:
    if values is None:
        return ()
    if isinstance(values, (WaveListener, Mapping)):
        values = (values,)
    if isinstance(values, (str, bytes)):
        raise TypeError("listener definitions must not be strings")
    listeners: list[WaveListener] = []
    for item in values:  # type: ignore[assignment]
        if isinstance(item, WaveListener):
            listeners.append(item)
        elif isinstance(item, Mapping):
            listeners.append(WaveListener(**item))
        else:
            raise TypeError("listeners must be WaveListener instances or mappings")
    return tuple(listeners)


def _wave_medium_to_dict(medium: WaveMedium) -> Dict[str, Any]:
    return {
        "name": medium.name,
        "propagation_speed": medium.propagation_speed,
        "attenuation": medium.attenuation,
        "dispersion": medium.dispersion,
        "refraction_index": medium.refraction_index,
        "impedance": medium.impedance,
        "tags": list(medium.tags),
    }


def _wave_event_to_dict(event: WaveEvent) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "timestamp": event.timestamp.isoformat(),
        "description": event.description,
        "intensity": event.intensity,
    }
    if event.listener:
        payload["listener"] = event.listener
    if event.source:
        payload["source"] = event.source
    if event.tags:
        payload["tags"] = list(event.tags)
    return payload


def _wave_snapshot_to_dict(snapshot: WaveSnapshot) -> Dict[str, Any]:
    return {
        "timestamp": snapshot.timestamp.isoformat(),
        "medium": _wave_medium_to_dict(snapshot.medium),
        "listener_intensity": dict(snapshot.listener_intensity),
        "dominant_frequency": snapshot.dominant_frequency,
        "aggregate_energy": snapshot.aggregate_energy,
        "coherence_index": snapshot.coherence_index,
        "alerts": list(snapshot.alerts),
    }


def _coerce_news(values: Iterable[Any] | None) -> Sequence[NewsEvent]:
    news: list[NewsEvent] = []
    if not values:
        return news
    for item in values:
        if isinstance(item, NewsEvent):
            news.append(item)
            continue
        if isinstance(item, Mapping):
            news.append(
                NewsEvent(
                    symbol=(None if item.get("symbol") is None else str(item.get("symbol"))),
                    minutes_until=_coerce_float(item.get("minutes_until"), 0.0),
                    severity=str(item.get("severity", "high")).lower(),
                )
            )
    return news


def _coerce_volatility_map(payload: Mapping[str, Any] | None) -> Dict[str, VolatilitySnapshot]:
    snapshots: Dict[str, VolatilitySnapshot] = {}
    if not isinstance(payload, Mapping):
        return snapshots
    for key, value in payload.items():
        if isinstance(value, VolatilitySnapshot):
            snapshots[value.symbol] = value
            continue
        if isinstance(value, Mapping):
            symbol = str(value.get("symbol") or key).upper()
            snapshots[symbol] = VolatilitySnapshot(
                symbol=symbol,
                atr=_coerce_float(value.get("atr"), 0.0),
                close=_coerce_float(value.get("close"), 0.0),
                median_ratio=max(1e-6, _coerce_float(value.get("median_ratio"), 0.0)),
                pip_value=_optional_float(value.get("pip_value")),
            )
    return snapshots


def _coerce_correlations(payload: Mapping[str, Any] | None) -> Dict[str, Dict[str, float]] | None:
    if not isinstance(payload, Mapping):
        return None
    correlations: Dict[str, Dict[str, float]] = {}
    for symbol, row in payload.items():
        if not isinstance(row, Mapping):
            continue
        correlations[str(symbol).upper()] = {
            str(candidate).upper(): _coerce_float(value, 0.0)
            for candidate, value in row.items()
        }
    return correlations or None


def _coerce_account_state(payload: Mapping[str, Any] | None) -> AccountState:
    if isinstance(payload, AccountState):
        return payload
    mapping = dict(payload or {})
    mode = str(mapping.get("mode", "hedging")).lower()
    return AccountState(
        mode="netting" if mode == "netting" else "hedging",
        exposures=tuple(_coerce_exposures(mapping.get("exposures"))),
        hedges=tuple(_coerce_hedges(mapping.get("hedges"))),
        drawdown_r=_coerce_float(mapping.get("drawdown_r"), 0.0),
        risk_capital=_coerce_float(mapping.get("risk_capital"), 0.0),
        max_basket_risk=_coerce_float(mapping.get("max_basket_risk"), 1.5),
    )


def _coerce_market_state(payload: Mapping[str, Any] | None) -> MarketState:
    if isinstance(payload, MarketState):
        return payload
    mapping = dict(payload or {})
    volatility = _coerce_volatility_map(mapping.get("volatility"))
    return MarketState(
        volatility=volatility,
        correlations=_coerce_correlations(mapping.get("correlations")),
        news=tuple(_coerce_news(mapping.get("news"))),
    )


class ResearchAgent:
    """Persona encapsulating the Dynamic Analysis module."""

    name = "research"

    def __init__(self, analysis: DynamicAnalysis | None = None) -> None:
        self.analysis = analysis or DynamicAnalysis()

    def run(self, payload: Mapping[str, Any]) -> ResearchAgentResult:
        analysis_payload = dict(payload or {})
        analysis = self.analysis.analyse(analysis_payload)
        rationale_parts: list[str] = []
        if analysis.get("primary_driver"):
            rationale_parts.append(str(analysis["primary_driver"]))
        if analysis.get("notes"):
            notes = [str(note) for note in analysis.get("notes", []) if str(note)]
            if notes:
                rationale_parts.extend(notes)
        rationale = " ".join(rationale_parts) or "Research analysis completed."
        confidence = float(analysis.get("confidence", 0.0) or 0.0)
        return ResearchAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            analysis=analysis,
        )


class ExecutionAgent:
    """Persona wrapping the Dynamic Fusion Algo for execution decisions."""

    name = "execution"

    def __init__(self, fusion: DynamicFusionAlgo | None = None) -> None:
        self.fusion = fusion or DynamicFusionAlgo()

    def run(self, payload: Mapping[str, Any]) -> ExecutionAgentResult:
        context = dict(payload or {})
        market = context.get("market")
        if isinstance(market, Mapping):
            market_payload = dict(market)
        else:
            market_payload = context
        signal = self.fusion.generate_signal(dict(market_payload))
        extras: Dict[str, Any] = {}
        analysis = context.get("analysis")
        if isinstance(analysis, Mapping):
            primary_driver = analysis.get("primary_driver")
            if primary_driver:
                extras["analysis_primary_driver"] = primary_driver
        return ExecutionAgentResult(
            agent=self.name,
            rationale=signal.reasoning,
            confidence=signal.confidence,
            signal=signal,
            context=extras,
        )


class RiskAgent:
    """Persona enforcing guardrails and hedge policy."""

    name = "risk"

    def __init__(
        self,
        manager: RiskManager | None = None,
        hedge_policy: DynamicHedgePolicy | None = None,
    ) -> None:
        self.manager = manager or RiskManager()
        self.hedge_policy = hedge_policy or DynamicHedgePolicy()

    def run(self, payload: Mapping[str, Any]) -> RiskAgentResult:
        context = dict(payload or {})
        signal_payload = context.get("signal")
        if isinstance(signal_payload, AISignal):
            signal_dict = signal_payload.to_dict()
        elif isinstance(signal_payload, Mapping):
            signal_dict = dict(signal_payload)
        else:
            signal_dict = {"action": "NEUTRAL", "confidence": 0.0}

        risk_context = _coerce_risk_context(context.get("risk_context"))
        parameters = _coerce_risk_parameters(context.get("risk_parameters"))
        account_state = _coerce_account_state(context.get("account_state"))
        market_state = _coerce_market_state(context.get("market_state"))

        manager = self.manager
        manager.params = parameters
        adjusted_signal = manager.enforce(signal_dict, risk_context)
        confidence = float(adjusted_signal.get("confidence", signal_dict.get("confidence", 0.0)) or 0.0)

        sizing: PositionSizing | None = None
        try:
            sizing = manager.sizing(
                risk_context,
                confidence=confidence,
                volatility=risk_context.volatility,
            )
        except Exception:
            sizing = None

        hedge_decisions: Sequence[HedgeDecision] = ()
        if market_state.volatility:
            try:
                hedge_decisions = self.hedge_policy.evaluate(market_state, account_state)
            except Exception:
                hedge_decisions = ()

        notes = adjusted_signal.get("risk_notes")
        rationale_parts: list[str] = []
        if isinstance(notes, Iterable) and not isinstance(notes, (str, bytes)):
            rationale_parts.extend(str(note) for note in notes if str(note))
        if adjusted_signal.get("circuit_breaker"):
            rationale_parts.append("Circuit breaker engaged.")
        rationale = " ".join(rationale_parts) or "Risk evaluation completed."

        escalations: list[str] = []
        if risk_context.daily_drawdown <= -abs(parameters.circuit_breaker_drawdown):
            escalations.append("daily_drawdown")
        if risk_context.treasury_utilisation >= parameters.treasury_utilisation_cap:
            escalations.append("treasury_utilisation")

        return RiskAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            adjusted_signal=adjusted_signal,
            sizing=sizing,
            hedge_decisions=tuple(hedge_decisions),
            escalations=tuple(escalations),
        )


_DEFAULT_START_AGENT_LOCK = Lock()
_DEFAULT_START_AGENT_CACHE: Dict[str, Agent] = {}
_DEFAULT_START_AGENT_FACTORIES: Dict[str, Callable[[], Agent]] = {}
_START_AGENT_KEYS = ("research", "execution", "risk")
_TAgent = TypeVar("_TAgent", bound=Agent)


def _get_factory(key: str, default: Callable[[], _TAgent]) -> Callable[[], _TAgent]:
    factory = _DEFAULT_START_AGENT_FACTORIES.get(key)
    if factory is None:
        _DEFAULT_START_AGENT_FACTORIES[key] = default
        return default
    return cast(Callable[[], _TAgent], factory)


def _get_or_create_start_agent(key: str, default: Callable[[], _TAgent]) -> _TAgent:
    with _DEFAULT_START_AGENT_LOCK:
        candidate = _DEFAULT_START_AGENT_CACHE.get(key)
        if candidate is None:
            factory = _get_factory(key, default)
            candidate = factory()
            _DEFAULT_START_AGENT_CACHE[key] = candidate
        return cast(_TAgent, candidate)


def get_default_research_agent() -> "ResearchAgent":
    """Return a cached research agent instance, instantiating lazily."""

    return _get_or_create_start_agent("research", ResearchAgent)


def get_default_execution_agent() -> "ExecutionAgent":
    """Return a cached execution agent instance, instantiating lazily."""

    return _get_or_create_start_agent("execution", ExecutionAgent)


def get_default_risk_agent() -> "RiskAgent":
    """Return a cached risk agent instance, instantiating lazily."""

    return _get_or_create_start_agent("risk", RiskAgent)


def get_dynamic_start_agents() -> Dict[str, Agent]:
    """Return the lazily initialised persona chain used for quick starts."""

    return {
        "research": get_default_research_agent(),
        "execution": get_default_execution_agent(),
        "risk": get_default_risk_agent(),
    }


def configure_dynamic_start_agents(
    *,
    research: "ResearchAgent" | Callable[[], "ResearchAgent"] | None = None,
    execution: "ExecutionAgent" | Callable[[], "ExecutionAgent"] | None = None,
    risk: "RiskAgent" | Callable[[], "RiskAgent"] | None = None,
) -> None:
    """Override cached persona instances or their factories.

    Passing a callable updates the factory used when instantiating future agents,
    while providing an instance replaces the cached object directly.
    """

    updates: MutableMapping[str, Callable[[], Agent] | Agent] = {}
    if research is not None:
        updates["research"] = research
    if execution is not None:
        updates["execution"] = execution
    if risk is not None:
        updates["risk"] = risk

    if not updates:
        return

    with _DEFAULT_START_AGENT_LOCK:
        for key, value in updates.items():
            if key not in _START_AGENT_KEYS:
                continue
            if callable(value):
                _DEFAULT_START_AGENT_FACTORIES[key] = cast(Callable[[], Agent], value)
                _DEFAULT_START_AGENT_CACHE.pop(key, None)
            else:
                _DEFAULT_START_AGENT_CACHE[key] = value


def reset_dynamic_start_agents(*names: str) -> None:
    """Clear cached persona instances, optionally selecting which ones."""

    requested = {name.lower() for name in names if name}
    if requested:
        keys = tuple(name for name in _START_AGENT_KEYS if name in requested)
    else:
        keys = _START_AGENT_KEYS

    with _DEFAULT_START_AGENT_LOCK:
        for key in keys:
            _DEFAULT_START_AGENT_CACHE.pop(key, None)
            if key == "research":
                _DEFAULT_START_AGENT_FACTORIES[key] = ResearchAgent
            elif key == "execution":
                _DEFAULT_START_AGENT_FACTORIES[key] = ExecutionAgent
            elif key == "risk":
                _DEFAULT_START_AGENT_FACTORIES[key] = RiskAgent


def prime_dynamic_start_agents() -> Dict[str, Agent]:
    """Materialise and return the cached persona chain."""

    agents = get_dynamic_start_agents()
    with _DEFAULT_START_AGENT_LOCK:
        for key, agent in agents.items():
            _DEFAULT_START_AGENT_CACHE[key] = agent
    return agents


def _normalise_payload(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, Mapping):
        return dict(value)
    if hasattr(value, "to_dict"):
        try:
            candidate = value.to_dict()
        except Exception:
            candidate = value
        else:
            if isinstance(candidate, Mapping):
                return dict(candidate)
            return {"value": candidate}
    if is_dataclass(value):
        return asdict(value)
    return {}


class TradingAgent:
    """Persona coordinating the Dynamic Trading Algo execution."""

    __slots__ = ("trader",)

    name = "trading"

    def __init__(self, trader: Any | None = None) -> None:
        self.trader = trader

    def run(self, payload: Mapping[str, Any]) -> TradingAgentResult:
        from algorithms.python.dynamic_ai_sync import run_dynamic_algo_alignment

        context = dict(payload or {})

        if self.trader is not None and not any(
            key in context for key in ("trader", "trade_algo", "executor")
        ):
            context["trader"] = self.trader

        alignment = run_dynamic_algo_alignment(context)

        if isinstance(alignment, TradingAgentResult):
            return alignment

        payload_map = {
            key: _normalise_payload(alignment.get(key))
            for key in ("decision", "trade", "agents", "optimisation", "treasury_event")
        }

        decision_payload = payload_map["decision"]
        trade_payload = payload_map["trade"] or {"status": "skipped"}
        agents_payload = payload_map["agents"]
        optimisation_payload = payload_map["optimisation"]
        treasury_event_payload = payload_map["treasury_event"]
        if not treasury_event_payload:
            treasury_event_payload = None

        rationale = _extract_text(
            decision_payload.get("rationale"),
            trade_payload.get("message"),
            alignment.get("message"),
            "Trading cycle completed.",
        )
        if not rationale:
            rationale = "Trading cycle completed."

        confidence = _optional_float(decision_payload.get("confidence")) or 0.0

        return TradingAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            decision=decision_payload,
            trade=trade_payload,
            agents=agents_payload,
            optimisation=optimisation_payload,
            treasury_event=treasury_event_payload,
        )


_SEVERITY_RANK = {
    SpaceEventSeverity.INFO: 0,
    SpaceEventSeverity.ADVISORY: 1,
    SpaceEventSeverity.ALERT: 2,
    SpaceEventSeverity.CRITICAL: 3,
}


class WaveAgent:
    """Persona orchestrating :class:`dynamic_wave.DynamicWaveField` operations."""

    name = "wave"

    def __init__(self, engine: DynamicWaveField | None = None) -> None:
        self.field = engine or DynamicWaveField()

    def run(self, payload: Mapping[str, Any]) -> WaveAgentResult:
        context = dict(payload or {})

        media_payload = context.get("media") or context.get("mediums")
        try:
            media = _coerce_wave_mediums(media_payload)
        except TypeError as exc:
            raise ValueError(str(exc)) from exc

        requested_default = None
        for key in ("medium", "default_medium", "medium_name"):
            candidate = context.get(key)
            if isinstance(candidate, str) and candidate.strip():
                requested_default = candidate.strip()
                break

        for medium in media:
            is_default = False
            if requested_default:
                is_default = medium.name == requested_default
            elif not self.field.media:
                is_default = True
            self.field.register_medium(medium, default=is_default)

        if requested_default:
            if requested_default not in self.field.media:
                raise ValueError(f"Unknown medium '{requested_default}' provided to WaveAgent.")
            self.field.select_medium(requested_default)

        sources_payload = context.get("sources") or context.get("source")
        try:
            sources = _coerce_wave_sources(sources_payload)
        except TypeError as exc:
            raise ValueError(str(exc)) from exc
        for source in sources:
            self.field.upsert_source(source)

        listeners_payload = context.get("listeners") or context.get("listener")
        try:
            listeners = _coerce_wave_listeners(listeners_payload)
        except TypeError as exc:
            raise ValueError(str(exc)) from exc
        for listener in listeners:
            self.field.attach_listener(listener)

        decay_value = context.get("decay_factor")
        if decay_value is None and "decay" in context:
            decay_value = context.get("decay")
        if decay_value is not None:
            try:
                decay_factor = float(decay_value)
            except (TypeError, ValueError) as exc:
                raise ValueError("decay_factor must be numeric") from exc
            self.field.decay_sources(decay_factor)

        if not self.field.media:
            raise ValueError("WaveAgent requires a propagation medium.")
        if not self.field.sources:
            raise ValueError("WaveAgent requires at least one source.")
        if not self.field.listeners:
            raise ValueError("WaveAgent requires at least one listener.")

        timestamp_value = context.get("timestamp") or context.get("time")
        try:
            timestamp = _coerce_timestamp(timestamp_value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc

        measure_medium = context.get("measure_medium")
        if isinstance(measure_medium, str):
            measure_medium = measure_medium.strip() or None
        else:
            measure_medium = None

        try:
            snapshot = self.field.measure(medium=measure_medium, timestamp=timestamp)
        except (RuntimeError, KeyError) as exc:
            raise ValueError(str(exc)) from exc

        event_limit_value = context.get("event_limit") or context.get("events_limit")
        try:
            event_limit = max(0, int(event_limit_value)) if event_limit_value is not None else 3
        except (TypeError, ValueError):
            event_limit = 3
        events = self.field.recent_activity(limit=event_limit) if event_limit else ()

        energy_threshold = _coerce_float(context.get("energy_threshold"), 50.0)
        energy_threshold = max(energy_threshold, 1e-9)
        energy_ratio = min(snapshot.aggregate_energy / energy_threshold, 1.0)
        coherence_target = _coerce_float(context.get("coherence_target"), 0.65)
        safe_intensity = _coerce_float(context.get("safe_intensity"), 1.5)

        if snapshot.listener_intensity:
            peak_listener = max(snapshot.listener_intensity.items(), key=lambda item: item[1])
        else:
            peak_listener = (None, 0.0)

        confidence = snapshot.coherence_index
        confidence *= 1.0 - 0.4 * energy_ratio
        if snapshot.alerts:
            confidence *= 0.7
        confidence = max(0.0, min(1.0, confidence))

        narrative_parts = [
            f"Medium {snapshot.medium.name} coherence {snapshot.coherence_index:.2f}",
            f"dominant frequency {snapshot.dominant_frequency:.2f} Hz",
            f"aggregate energy {snapshot.aggregate_energy:.2f}",
        ]
        if peak_listener[0]:
            narrative_parts.append(f"peak intensity {peak_listener[0]}={peak_listener[1]:.2f}")
        if snapshot.alerts:
            narrative_parts.append("alerts: " + "; ".join(snapshot.alerts))
        rationale = ", ".join(narrative_parts)

        recommendations: list[str] = []
        if snapshot.coherence_index < coherence_target:
            recommendations.append("Increase source synchronisation to raise coherence.")
        if energy_ratio > 0.7:
            recommendations.append("Aggregate energy elevated; apply damping measures.")
        if peak_listener[0] and peak_listener[1] > safe_intensity:
            recommendations.append("Highest listener intensity exceeds safe threshold; redistribute load.")
        if snapshot.alerts:
            recommendations.extend(snapshot.alerts)
        if not recommendations:
            recommendations.append("Wave field operating within expected parameters.")

        recommendations = list(dict.fromkeys(recommendations))

        return WaveAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=confidence,
            medium=snapshot.medium.name,
            snapshot=snapshot,
            events=tuple(events),
            recommendations=tuple(recommendations),
        )


class SpaceAgent:
    """Persona orchestrating :class:`dynamic_space.DynamicSpace` operations."""

    name = "space"

    def __init__(self, manager: DynamicSpace | None = None) -> None:
        self.space = manager or DynamicSpace()

    def run(self, payload: Mapping[str, Any]) -> SpaceAgentResult:
        context = dict(payload or {})

        sectors_payload = context.get("sectors")
        try:
            sectors = _coerce_sectors(sectors_payload)
        except TypeError as exc:
            raise ValueError(str(exc)) from exc
        for sector in sectors:
            self.space.register_sector(sector)

        events_payload = context.get("events") or context.get("event")
        try:
            events = _coerce_events(events_payload)
        except TypeError as exc:
            raise ValueError(str(exc)) from exc
        recorded_events: list[SpaceEvent] = []
        if events:
            if len(events) == 1:
                recorded_events.append(self.space.record_event(events[0]))
            else:
                recorded_events.extend(self.space.ingest_events(events))

        sector_name = None
        for key in ("sector", "sector_name", "target", "focus"):
            candidate = context.get(key)
            if isinstance(candidate, str) and candidate.strip():
                sector_name = candidate.strip()
                break
        if sector_name is None and recorded_events:
            sector_name = recorded_events[-1].sector_name
        if sector_name is None and self.space.sectors:
            sector_name = self.space.sectors[0].name
        if not sector_name:
            raise ValueError("SpaceAgent requires a sector definition or prior events to operate.")

        rebalance_requested = bool(context.get("rebalance") or context.get("rebalance_routes"))
        congestion_threshold = _coerce_float(context.get("congestion_threshold"), 0.65)
        damping_factor = _coerce_float(context.get("damping_factor"), 0.85)

        if rebalance_requested:
            sector_state = self.space.rebalance_routes(
                sector_name,
                congestion_threshold=congestion_threshold,
                damping_factor=damping_factor,
            )
        else:
            sector_state = self.space.get_sector(sector_name)

        horizon_value = context.get("horizon") or context.get("lookahead")
        try:
            horizon = max(1, int(horizon_value)) if horizon_value is not None else 5
        except (TypeError, ValueError):
            horizon = 5

        snapshot = self.space.snapshot(sector_state.name, horizon=horizon)
        recent_events = tuple(snapshot.recent_events)

        hazard_penalty = max(0.0, sector_state.hazard_index - 0.5) * 0.3
        confidence = snapshot.stability_score - hazard_penalty
        confidence = max(0.0, min(1.0, confidence))

        narrative = (
            f"Sector {snapshot.sector_name} stability {snapshot.stability_score:.2f}, "
            f"traffic load {snapshot.traffic_load:.2f}, hazard {snapshot.hazard_index:.2f}."
        )
        if recent_events:
            latest = recent_events[-1]
            severity_value = (
                latest.severity.value
                if isinstance(latest.severity, SpaceEventSeverity)
                else str(latest.severity)
            )
            narrative += f" Latest event: {latest.description} ({severity_value})."

        recommendations: list[str] = []
        if snapshot.stability_score < 0.45:
            recommendations.append("Stability degraded; allocate support assets.")
        if snapshot.traffic_load > congestion_threshold:
            recommendations.append("Traffic congestion elevated; consider route rebalancing.")
        if sector_state.hazard_index > 0.5:
            recommendations.append("Hazard index elevated; deploy mitigation protocols.")
        if recent_events:
            highest_event = max(
                recent_events,
                key=lambda event: _SEVERITY_RANK.get(
                    event.severity, _SEVERITY_RANK[SpaceEventSeverity.INFO]
                ),
            )
            highest_rank = _SEVERITY_RANK.get(
                highest_event.severity, _SEVERITY_RANK[SpaceEventSeverity.INFO]
            )
            if highest_rank >= _SEVERITY_RANK[SpaceEventSeverity.ALERT]:
                recommendations.append("Alert-level events detected; maintain heightened monitoring.")

        if not recommendations:
            recommendations.append("Sector operating within nominal parameters.")

        return SpaceAgentResult(
            agent=self.name,
            rationale=narrative,
            confidence=confidence,
            sector=snapshot.sector_name,
            snapshot=snapshot,
            events=recent_events,
            recommendations=tuple(dict.fromkeys(recommendations)),
        )


class BloodAgent:
    """Persona orchestrating Dynamic Blood state insights."""

    name = "blood"

    def __init__(self, engine: DynamicBlood | None = None) -> None:
        self.engine = engine or DynamicBlood()

    def run(self, payload: Mapping[str, Any]) -> BloodAgentResult:
        context = dict(payload or {})

        window_value = context.get("window")
        if window_value is not None:
            try:
                window = int(window_value)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
                raise ValueError("window must be an integer value") from exc
            if window <= 0:
                raise ValueError("window must be positive")
            if window != self.engine.rolling_window():
                self.engine = DynamicBlood(window=window)

        if context.get("clear") or context.get("reset"):
            self.engine.clear()

        replace_history = bool(context.get("replace_history") or context.get("reset_history"))

        samples_payload = context.get("samples")
        if samples_payload is None and "sample" in context:
            samples_payload = context.get("sample")

        if samples_payload is not None:
            samples = _coerce_blood_samples(samples_payload)
        else:
            samples = ()

        if replace_history and samples:
            self.engine.clear()

        algorithm_value = context.get("algorithm") or context.get("algo") or context.get("dct_algo")
        algorithm = str(algorithm_value or "dct_to_dct").strip().lower() or "dct_to_dct"

        if algorithm not in {"dct_to_dct", "assess_only"}:
            raise ValueError(f"Unsupported blood algorithm '{algorithm}'")

        if algorithm == "dct_to_dct":
            if not samples and not self.engine.history:
                raise ValueError("BloodAgent requires at least one sample to ingest")
            for sample in samples:
                self.engine.ingest(sample)
        else:  # assess_only
            if samples:
                for sample in samples:
                    self.engine.ingest(sample)

        if not self.engine.history:
            raise ValueError("BloodAgent cannot assess without historical samples")

        blood_context_payload = context.get("context") or context.get("blood_context")
        if blood_context_payload is None:
            context_fields = {
                key: context.get(key)
                for key in (
                    "hydration_level",
                    "stress_index",
                    "altitude_meters",
                    "recent_activity",
                    "sleep_quality",
                    "temperature_exposure",
                    "medications",
                    "conditions",
                    "notes",
                )
            }
            if any(value is not None for value in context_fields.values()):
                blood_context_payload = context_fields

        blood_context = _coerce_blood_context(blood_context_payload)

        insight = self.engine.assess(context=blood_context)
        latest_sample = self.engine.history[-1]
        samples_recorded = len(self.engine.history)
        confidence = max(0.0, min(1.0, insight.stability_index))

        return BloodAgentResult(
            agent=self.name,
            rationale=insight.narrative,
            confidence=confidence,
            insight=insight,
            algorithm=algorithm,
            latest_sample=latest_sample,
            context=blood_context,
            samples_recorded=samples_recorded,
            window=self.engine.rolling_window(),
        )


def _normalise_agent_payload(value: Any) -> Dict[str, Any]:
    if isinstance(value, AgentResult):
        return value.to_dict()
    if hasattr(value, "to_dict"):
        try:
            payload = value.to_dict()
        except Exception:
            payload = value
        else:
            if isinstance(payload, Mapping):
                return dict(payload)
            return {"value": payload}
    if isinstance(value, Mapping):
        return dict(value)
    return {}


def _as_dict(value: Any) -> Dict[str, Any]:
    if isinstance(value, Mapping):
        return dict(value)
    return {}


def _resolve_agent_payload(
    context: Mapping[str, Any],
    agents: Mapping[str, Any],
    *keys: str,
) -> Dict[str, Any]:
    """Return the first non-empty payload resolved from ``keys``."""

    for key in keys:
        if key in context:
            payload = _normalise_agent_payload(context.get(key))
            if payload:
                return payload
        if key in agents:
            payload = _normalise_agent_payload(agents.get(key))
            if payload:
                return payload
    return {}


def _first_float(*values: Any) -> float | None:
    for value in values:
        candidate = _optional_float(value)
        if candidate is not None:
            return candidate
    return None


def _normalise_action(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        rendered = value.strip()
        return rendered or None
    return None


def _resolve_action(*values: Any) -> str | None:
    for value in values:
        action = _normalise_action(value)
        if action:
            return action
    return None


def _dict_or_none(value: Any) -> Dict[str, Any] | None:
    if isinstance(value, Mapping):
        return dict(value)
    return None


def _normalise_hedge_decisions(value: Any) -> list[Any] | None:
    if value is None:
        return None
    if isinstance(value, Mapping):
        return [dict(value)]
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
        normalised: list[Any] = []
        for item in value:
            if item is None:
                continue
            normalised.append(dict(item) if isinstance(item, Mapping) else item)
        return normalised or None
    return [value]


def _normalise_escalations(value: Any) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, Mapping):
        candidates = value.values()
    elif isinstance(value, Iterable) and not isinstance(value, (str, bytes)):
        candidates = value
    else:
        text = str(value).strip()
        return [text] if text else None

    rendered = [
        text
        for text in (str(item).strip() for item in candidates)
        if text
    ]
    return rendered or None


def _update_if_missing(
    target: MutableMapping[str, Any],
    key: str,
    value: Any,
    *,
    transform: Callable[[Any], Any] | None = None,
) -> None:
    if key in target:
        return
    if transform is not None:
        value = transform(value)
    if value is None:
        return
    target[key] = value


def _extract_text(*candidates: Any) -> str | None:
    for value in candidates:
        if value is None:
            continue
        if isinstance(value, Mapping):
            text = value.get("content") or value.get("message") or value.get("text")
        else:
            text = value
        if text is None:
            continue
        rendered = str(text).strip()
        if rendered:
            return rendered
    return None


def _compose_persona_message(name: str, payload: Mapping[str, Any]) -> ChatTurn:
    confidence_value = _optional_float(payload.get("confidence"))
    metadata: Dict[str, Any] = {}
    ui_panel: Dict[str, Any] = {"title": name.title()}

    if confidence_value is not None:
        rounded_confidence = round(confidence_value, 4)
        metadata["confidence"] = rounded_confidence
        ui_panel["confidence"] = rounded_confidence

    summary_parts: list[str] = []
    highlights: list[str] = []

    rationale = _extract_text(payload.get("rationale"))
    if rationale:
        summary_parts.append(rationale)
        ui_panel.setdefault("summary", rationale)

    if name == "research":
        analysis = payload.get("analysis")
        if isinstance(analysis, Mapping):
            action = analysis.get("action")
            if action:
                text = f"Proposed action: {action}"
                summary_parts.append(text)
                highlights.append(text)
            primary = analysis.get("primary_driver")
            if primary:
                metadata["primary_driver"] = primary
                highlights.append(f"Primary driver: {primary}")
            notes = analysis.get("notes")
            if isinstance(notes, Iterable) and not isinstance(notes, (str, bytes)):
                joined = ", ".join(str(note) for note in notes if str(note))
                if joined:
                    metadata["notes"] = joined
                    highlights.append(f"Notes: {joined}")

    if name == "execution":
        signal = payload.get("signal")
        if isinstance(signal, Mapping):
            metadata["signal"] = dict(signal)
            action = signal.get("action")
            if action:
                text = f"Signal action: {action}"
                summary_parts.append(text)
                highlights.append(text)
            confidence_note = signal.get("confidence")
            if confidence_note is not None and "confidence" not in metadata:
                try:
                    rounded_confidence = round(float(confidence_note), 4)
                except (TypeError, ValueError):
                    pass
                else:
                    metadata["confidence"] = rounded_confidence
                    ui_panel["confidence"] = rounded_confidence
            rationale = _extract_text(signal.get("rationale"), signal.get("reasoning"))
            if rationale:
                highlights.append(rationale)

    if name == "risk":
        adjusted = payload.get("adjusted_signal")
        if isinstance(adjusted, Mapping):
            metadata["adjusted_signal"] = dict(adjusted)
            action = adjusted.get("action")
            if action:
                text = f"Risk-adjusted action: {action}"
                summary_parts.append(text)
                highlights.append(text)
            rationale = _extract_text(adjusted.get("rationale"))
            if rationale:
                highlights.append(rationale)
        hedges = payload.get("hedge_decisions")
        if isinstance(hedges, Iterable) and not isinstance(hedges, (str, bytes)):
            hedge_list = [dict(decision) if isinstance(decision, Mapping) else decision for decision in hedges]
            if hedge_list:
                metadata["hedge_decisions"] = hedge_list
                highlights.append("Hedging directives updated")
        escalations = payload.get("escalations")
        if escalations:
            metadata["escalations"] = list(escalations)
            highlights.append("Escalations raised")

    content = " ".join(part for part in summary_parts if part) or f"{name.title()} review completed."
    ui_panel.setdefault("summary", content)

    if highlights:
        ui_panel["highlights"] = list(dict.fromkeys(highlights))

    if ui_panel.get("confidence") is None:
        ui_panel.pop("confidence", None)

    metadata["ui"] = ui_panel

    return ChatTurn(role=name, content=content, metadata=metadata)


def _compose_agi_message(payload: Mapping[str, Any]) -> ChatTurn | None:
    if not isinstance(payload, Mapping):
        return None

    metadata: Dict[str, Any] = {}
    summary_parts: list[str] = []
    ui_panel: Dict[str, Any] = {"title": "Dynamic AGI", "highlights": []}

    signal = payload.get("signal")
    if isinstance(signal, Mapping):
        signal_payload = dict(signal)
        metadata["signal"] = signal_payload
        action = signal_payload.get("action")
        if action:
            text = f"AGI signal: {action}"
            summary_parts.append(text)
            ui_panel["highlights"].append(text)
        reasoning = _extract_text(signal_payload.get("reasoning"), signal_payload.get("narrative"))
        if reasoning:
            summary_parts.append(reasoning)
            ui_panel["summary"] = reasoning
        confidence_note = _optional_float(signal_payload.get("confidence"))
        if confidence_note is not None:
            metadata["signal_confidence"] = round(confidence_note, 4)
            ui_panel["confidence"] = round(confidence_note, 4)

    risk_adjusted = payload.get("risk_adjusted")
    if isinstance(risk_adjusted, Mapping):
        risk_payload = dict(risk_adjusted)
        metadata["risk_adjusted"] = risk_payload
        action = risk_payload.get("action")
        if action:
            text = f"Risk overlay: {action}"
            summary_parts.append(text)
            ui_panel["highlights"].append(text)
        confidence_note = _optional_float(risk_payload.get("confidence"))
        if confidence_note is not None:
            metadata["confidence"] = round(confidence_note, 4)
            ui_panel.setdefault("confidence", round(confidence_note, 4))
        rationale = _extract_text(risk_payload.get("rationale"))
        if rationale:
            summary_parts.append(rationale)
            ui_panel.setdefault("summary", rationale)
        if risk_payload.get("hedge_decisions"):
            metadata["hedge_decisions"] = risk_payload["hedge_decisions"]
        if risk_payload.get("escalations"):
            metadata["escalations"] = risk_payload["escalations"]

    sizing = payload.get("sizing")
    if isinstance(sizing, Mapping):
        metadata["sizing"] = dict(sizing)

    market_making = payload.get("market_making")
    if isinstance(market_making, Mapping):
        metadata["market_making"] = dict(market_making)

    diagnostics = payload.get("diagnostics")
    if isinstance(diagnostics, Mapping):
        metadata["diagnostics"] = {
            "context": dict(diagnostics.get("context") or {}),
            "composite": dict(diagnostics.get("composite") or {}),
            "consensus": dict(diagnostics.get("consensus") or {}),
        }

    improvement = payload.get("improvement")
    if isinstance(improvement, Mapping):
        metadata["improvement"] = dict(improvement)
        improvement_summary = _extract_text(
            improvement.get("summary"),
            improvement.get("focus"),
            improvement.get("headline"),
        )
        if improvement_summary:
            summary_parts.append(f"Improvement focus: {improvement_summary}")
            ui_panel["highlights"].append(f"Improvement: {improvement_summary}")
    elif improvement is not None:
        metadata["improvement"] = improvement

    if not metadata and not summary_parts:
        return None

    content = " ".join(part for part in summary_parts if part) or "Dynamic AGI evaluation completed."
    ui_panel.setdefault("summary", content)
    if not ui_panel.get("highlights"):
        ui_panel.pop("highlights", None)
    if ui_panel.get("confidence") is None:
        ui_panel.pop("confidence", None)
    metadata["ui"] = ui_panel
    return ChatTurn(role="agi", content=content, metadata=metadata)


class DynamicChatAgent:
    """Persona that shapes agent outputs into a human-friendly transcript."""

    name = "chat"

    def run(self, payload: Mapping[str, Any]) -> ChatAgentResult:
        context = dict(payload or {})

        agents_mapping = context.get("agents")
        if not isinstance(agents_mapping, Mapping):
            agents_mapping = {}

        research_payload = _resolve_agent_payload(context, agents_mapping, "research")
        execution_payload = _resolve_agent_payload(context, agents_mapping, "execution")
        risk_payload = _resolve_agent_payload(context, agents_mapping, "risk")

        decision_payload = _normalise_agent_payload(context.get("decision"))

        agi_payload = _resolve_agent_payload(
            context,
            agents_mapping,
            "agi",
            "agi_output",
            "agi_result",
        )

        agi_signal_payload: Dict[str, Any] = {}
        agi_risk_payload: Dict[str, Any] = {}

        if agi_payload:
            agi_research_payload = _as_dict(agi_payload.get("research"))
            if agi_research_payload:
                research_payload.setdefault("analysis", agi_research_payload.copy())
                research_confidence = _optional_float(agi_research_payload.get("confidence"))
                if research_confidence is not None and "confidence" not in research_payload:
                    research_payload["confidence"] = research_confidence
                research_rationale = _extract_text(
                    research_payload.get("rationale"),
                    agi_research_payload.get("summary"),
                    agi_research_payload.get("headline"),
                    agi_research_payload.get("insight"),
                    agi_payload.get("research_summary"),
                )
                if research_rationale:
                    research_payload["rationale"] = research_rationale

            agi_signal_payload = _as_dict(agi_payload.get("signal"))
            if agi_signal_payload:
                execution_payload.setdefault("signal", agi_signal_payload.copy())
                exec_confidence = _optional_float(agi_signal_payload.get("confidence"))
                if exec_confidence is not None and "confidence" not in execution_payload:
                    execution_payload["confidence"] = exec_confidence
                exec_rationale = _extract_text(
                    execution_payload.get("rationale"),
                    agi_signal_payload.get("reasoning"),
                    agi_signal_payload.get("narrative"),
                    agi_payload.get("signal_summary"),
                )
                if exec_rationale:
                    execution_payload["rationale"] = exec_rationale

            agi_risk_payload = _as_dict(agi_payload.get("risk_adjusted"))
            if agi_risk_payload:
                risk_payload.setdefault("adjusted_signal", agi_risk_payload.copy())
                risk_confidence = _optional_float(agi_risk_payload.get("confidence"))
                if risk_confidence is not None and "confidence" not in risk_payload:
                    risk_payload["confidence"] = risk_confidence
                risk_rationale = _extract_text(
                    risk_payload.get("rationale"),
                    agi_risk_payload.get("rationale"),
                    agi_payload.get("risk_summary"),
                )
                if risk_rationale:
                    risk_payload["rationale"] = risk_rationale
                hedges = agi_risk_payload.get("hedge_decisions")
                if hedges and "hedge_decisions" not in risk_payload:
                    risk_payload["hedge_decisions"] = hedges
                escalations = agi_risk_payload.get("escalations")
                if escalations and "escalations" not in risk_payload:
                    risk_payload["escalations"] = escalations

                if "action" not in decision_payload and agi_risk_payload.get("action"):
                    decision_payload["action"] = agi_risk_payload["action"]
                risk_confidence_value = _optional_float(agi_risk_payload.get("confidence"))
                if risk_confidence_value is not None and "confidence" not in decision_payload:
                    decision_payload["confidence"] = risk_confidence_value
                if hedges and "hedge_decisions" not in decision_payload:
                    decision_payload["hedge_decisions"] = hedges
                if agi_risk_payload.get("rationale") and "rationale" not in decision_payload:
                    decision_payload["rationale"] = agi_risk_payload["rationale"]

            if agi_signal_payload:
                if "action" not in decision_payload and agi_signal_payload.get("action"):
                    decision_payload["action"] = agi_signal_payload["action"]
                signal_confidence = _optional_float(agi_signal_payload.get("confidence"))
                if signal_confidence is not None and "confidence" not in decision_payload:
                    decision_payload["confidence"] = signal_confidence
                if "rationale" not in decision_payload:
                    decision_payload["rationale"] = _extract_text(
                        agi_signal_payload.get("reasoning"),
                        agi_signal_payload.get("narrative"),
                    )

            sizing_payload = _as_dict(agi_payload.get("sizing"))
            if sizing_payload and "sizing" not in decision_payload:
                decision_payload["sizing"] = sizing_payload

            if "rationale" not in decision_payload:
                decision_payload["rationale"] = research_payload.get("rationale") or execution_payload.get("rationale")

        user_prompt = _extract_text(
            context.get("user"),
            context.get("user_message"),
            context.get("prompt"),
            context.get("query"),
            context.get("question"),
        )

        messages: list[ChatTurn] = []
        ui_sections: list[Dict[str, Any]] = []
        if user_prompt:
            messages.append(ChatTurn(role="user", content=user_prompt))

        for name, persona_payload in (
            ("research", research_payload),
            ("execution", execution_payload),
            ("risk", risk_payload),
        ):
            if persona_payload:
                persona_message = _compose_persona_message(name, persona_payload)
                messages.append(persona_message)
                ui_panel = persona_message.metadata.get("ui")
                if isinstance(ui_panel, Mapping):
                    ui_sections.append(dict(ui_panel))

        agi_message = _compose_agi_message(agi_payload)
        if agi_message is not None:
            messages.append(agi_message)
            ui_panel = agi_message.metadata.get("ui") if agi_message.metadata else None
            if isinstance(ui_panel, Mapping):
                ui_sections.append(dict(ui_panel))

        risk_adjusted_payload = _as_dict(risk_payload.get("adjusted_signal"))
        execution_signal_payload = _as_dict(execution_payload.get("signal"))

        if risk_payload:
            if risk_adjusted_payload:
                _update_if_missing(
                    decision_payload,
                    "adjusted_signal",
                    risk_adjusted_payload.copy(),
                )

            _update_if_missing(
                decision_payload,
                "hedge_decisions",
                risk_payload.get("hedge_decisions"),
                transform=_normalise_hedge_decisions,
            )

            _update_if_missing(
                decision_payload,
                "escalations",
                risk_payload.get("escalations"),
                transform=_normalise_escalations,
            )

            _update_if_missing(
                decision_payload,
                "sizing",
                risk_payload.get("sizing"),
                transform=_dict_or_none,
            )

        action_text = _resolve_action(
            decision_payload.get("action"),
            risk_payload.get("action") if isinstance(risk_payload, Mapping) else None,
            risk_adjusted_payload.get("action"),
            execution_signal_payload.get("action"),
            agi_signal_payload.get("action"),
        )

        if action_text and not _normalise_action(decision_payload.get("action")):
            decision_payload["action"] = action_text

        confidence_value = _optional_float(decision_payload.get("confidence"))
        if confidence_value is None:
            confidence_value = _first_float(
                risk_payload.get("confidence") if isinstance(risk_payload, Mapping) else None,
                risk_adjusted_payload.get("confidence"),
                execution_payload.get("confidence") if isinstance(execution_payload, Mapping) else None,
                execution_signal_payload.get("confidence"),
                research_payload.get("confidence") if isinstance(research_payload, Mapping) else None,
                agi_signal_payload.get("confidence"),
            )
        if confidence_value is not None:
            decision_payload["confidence"] = confidence_value

        narrative_parts: list[str] = []
        if user_prompt:
            narrative_parts.append(f"User query: {user_prompt}")
        if research_payload:
            narrative_parts.append(
                f"Research: {research_payload.get('rationale') or 'analysis completed.'}"
            )
        if execution_payload:
            execution_action = None
            signal_payload = execution_payload.get("signal")
            if isinstance(signal_payload, Mapping):
                execution_action = signal_payload.get("action")
            narrative_parts.append(
                "Execution: "
                + (
                    execution_payload.get("rationale")
                    or (f"signal {execution_action}" if execution_action else "decision ready.")
                )
            )
        if risk_payload:
            narrative_parts.append(
                f"Risk: {risk_payload.get('rationale') or 'guardrails reviewed.'}"
            )
        if agi_message is not None:
            narrative_parts.append(f"Dynamic AGI: {agi_message.content}")
        if action_text:
            action_summary = f"Final decision: {action_text}"
            if confidence_value is not None:
                action_summary += f" (confidence {round(confidence_value, 4)})"
            narrative_parts.append(action_summary)

            decision_message = ChatTurn(
                role="assistant",
                content=action_summary,
                metadata={
                    "confidence": round(confidence_value, 4) if confidence_value is not None else None,
                },
            )
            if decision_message.metadata.get("confidence") is None:
                decision_message.metadata.pop("confidence", None)
            decision_panel: Dict[str, Any] = {
                "title": "Decision",
                "summary": action_summary,
                "highlights": [action_summary],
                "sections": list(ui_sections),
            }
            if confidence_value is not None:
                decision_panel["confidence"] = round(confidence_value, 4)
            if not decision_panel.get("highlights"):
                decision_panel.pop("highlights", None)
            if not ui_sections:
                decision_panel.pop("sections", None)
            decision_message.metadata["ui"] = decision_panel
            messages.append(decision_message)

        rationale = "\n".join(part for part in narrative_parts if part) or "Dynamic chat summary generated."

        final_confidence = confidence_value if confidence_value is not None else 0.0

        decision_ui = _as_dict(decision_payload.get("ui"))
        if action_text:
            decision_ui["headline"] = action_text
        decision_ui["summary"] = rationale
        if confidence_value is not None:
            decision_ui["confidence"] = round(confidence_value, 4)
        if ui_sections:
            decision_ui["sections"] = list(ui_sections)
        if user_prompt:
            decision_ui.setdefault("context", {})["user"] = user_prompt
        if decision_ui:
            decision_ui.setdefault("title", "Decision")
            decision_payload["ui"] = decision_ui

        return ChatAgentResult(
            agent=self.name,
            rationale=rationale,
            confidence=final_confidence,
            messages=tuple(messages),
            decision=decision_payload,
        )


__all__ = [
    "Agent",
    "AgentResult",
    "ChatAgentResult",
    "ChatTurn",
    "DynamicChatAgent",
    "ExecutionAgent",
    "ExecutionAgentResult",
    "configure_dynamic_start_agents",
    "ResearchAgent",
    "ResearchAgentResult",
    "RiskAgent",
    "RiskAgentResult",
    "get_default_execution_agent",
    "get_default_research_agent",
    "get_default_risk_agent",
    "get_dynamic_start_agents",
    "prime_dynamic_start_agents",
    "reset_dynamic_start_agents",
    "SpaceAgent",
    "SpaceAgentResult",
    "WaveAgent",
    "WaveAgentResult",
]
