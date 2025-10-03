"""Live trading coordination across AI, AGI, and AGS services."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, replace
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, MutableMapping, Sequence, Tuple

from dynamic.intelligence.ai_apps import AISignal, DynamicFusionAlgo
from dynamic.intelligence.agi import AGIOutput, DynamicAGIModel
from dynamic.governance.ags import PlaybookContext, PlaybookEntry, PlaybookSynchronizer
from dynamic_sync import DynamicSync, SyncSample, SyncStatus

from .algo import DynamicTradingAlgo, TradeExecutionResult
from .logic import DynamicRisk, Position, RiskTelemetry

__all__ = [
    "DEFAULT_LIVE_SYNC_CONTEXT",
    "MarketUpdate",
    "LiveTradingDecision",
    "DynamicTradingLiveSync",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_timestamp(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_symbol(symbol: str) -> str:
    cleaned = symbol.strip().upper()
    if not cleaned:
        raise ValueError("symbol must not be empty")
    return cleaned


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _coerce_mapping(payload: Mapping[str, Any] | None) -> MutableMapping[str, Any]:
    return dict(payload or {})


def _coerce_position(position: Position | Mapping[str, Any]) -> Position:
    if isinstance(position, Position):
        return position
    if isinstance(position, Mapping):
        return Position(**position)  # type: ignore[arg-type]
    raise TypeError("positions must be Position instances or mappings")


def _coerce_sync_sample(sample: SyncSample | Mapping[str, Any]) -> SyncSample:
    if isinstance(sample, SyncSample):
        return sample
    if isinstance(sample, Mapping):
        return SyncSample(**sample)  # type: ignore[arg-type]
    raise TypeError("sync samples must be SyncSample instances or mappings")


def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _fingerprint_positions(positions: Iterable[Position]) -> Tuple[Tuple[Any, ...], ...]:
    return tuple(
        (
            position.symbol,
            position.quantity,
            position.entry_price,
            position.last_price,
            position.updated_at.isoformat(),
        )
        for position in sorted(positions, key=lambda current: current.symbol)
    )


def _fingerprint_sync_samples(samples: Iterable[SyncSample]) -> Tuple[Tuple[Any, ...], ...]:
    return tuple(
        (
            sample.source,
            sample.latency,
            sample.offset,
            sample.captured_at.isoformat(),
        )
        for sample in sorted(samples, key=lambda current: (current.source, current.captured_at))
    )


def _coerce_playbook_entry(entry: PlaybookEntry | Mapping[str, Any]) -> PlaybookEntry:
    if isinstance(entry, PlaybookEntry):
        return entry
    if isinstance(entry, Mapping):
        return PlaybookEntry(**entry)  # type: ignore[arg-type]
    raise TypeError("governance entries must be PlaybookEntry instances or mappings")


DEFAULT_LIVE_SYNC_CONTEXT = PlaybookContext(
    mission="Dynamic AGS live trading oversight",
    cadence="continuous",
    risk_tolerance=0.55,
    automation_expectation=0.7,
    readiness_pressure=0.5,
    oversight_level=0.65,
    escalation_channels=("risk-ops", "executive-bridge"),
    scenario_focus=("market-resilience", "liquidity"),
    highlight_limit=5,
)


@dataclass(slots=True)
class MarketUpdate:
    """Payload describing a live market snapshot."""

    symbol: str
    price: float
    positions: Sequence[Position | Mapping[str, Any]] = field(default_factory=tuple)
    portfolio_return: float | None = None
    market_data: Mapping[str, Any] = field(default_factory=dict)
    research: Mapping[str, Any] | None = None
    risk_context: Mapping[str, Any] | None = None
    treasury: Mapping[str, Any] | None = None
    inventory: float = 0.0
    sync_samples: Sequence[SyncSample | Mapping[str, Any]] = field(default_factory=tuple)
    governance_entries: Sequence[PlaybookEntry | Mapping[str, Any]] = field(default_factory=tuple)
    governance_context: PlaybookContext | Mapping[str, Any] | None = None
    lot: float | None = None
    timestamp: datetime | None = None

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.price = float(self.price)
        if self.price <= 0:
            raise ValueError("price must be positive")
        if self.portfolio_return is not None:
            self.portfolio_return = float(self.portfolio_return)
        self.market_data = _coerce_mapping(self.market_data)
        self.research = _coerce_mapping(self.research) if self.research else None
        self.risk_context = _coerce_mapping(self.risk_context)
        self.treasury = _coerce_mapping(self.treasury) if self.treasury else None
        self.inventory = float(self.inventory)
        self.positions = tuple(_coerce_position(position) for position in self.positions)
        self.sync_samples = tuple(_coerce_sync_sample(sample) for sample in self.sync_samples)
        self.governance_entries = tuple(
            _coerce_playbook_entry(entry) for entry in self.governance_entries
        )
        if self.lot is not None:
            self.lot = max(float(self.lot), 0.0)
        self.timestamp = _ensure_timestamp(self.timestamp)


@dataclass(slots=True)
class LiveTradingDecision:
    """Result of processing a :class:`MarketUpdate`."""

    symbol: str
    action: str
    confidence: float
    lot: float
    telemetry: RiskTelemetry
    fusion_signal: AISignal
    agi_output: AGIOutput
    risk_adjusted: Mapping[str, Any]
    trade: TradeExecutionResult | None = None
    sync_status: Sequence[SyncStatus] = field(default_factory=tuple)
    governance_payload: Mapping[str, Any] | None = None
    captured_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.symbol = _normalise_symbol(self.symbol)
        self.action = self.action.strip().upper()
        self.confidence = _clamp(float(self.confidence), 0.0, 1.0)
        self.lot = max(float(self.lot), 0.0)
        self.captured_at = _ensure_timestamp(self.captured_at)
        self.sync_status = tuple(self.sync_status)

    def to_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "symbol": self.symbol,
            "action": self.action,
            "confidence": self.confidence,
            "lot": self.lot,
            "captured_at": self.captured_at.isoformat(),
            "telemetry": self.telemetry.as_dict(),
            "fusion_signal": self.fusion_signal.to_dict(),
            "agi_output": self.agi_output.to_dict(),
            "risk_adjusted": dict(self.risk_adjusted),
            "sync_status": [status.as_dict() for status in self.sync_status],
        }
        if self.trade is not None:
            payload["trade"] = self.trade.to_dict()
        if self.governance_payload is not None:
            payload["governance"] = dict(self.governance_payload)
        return payload


class DynamicTradingLiveSync:
    """Coordinate trading logic with AI, AGI, and AGS systems in real time."""

    def __init__(
        self,
        *,
        risk: DynamicRisk,
        trading_algo: DynamicTradingAlgo,
        fusion: DynamicFusionAlgo | None = None,
        agi: DynamicAGIModel | None = None,
        sync_engine: DynamicSync | None = None,
        playbook_sync: PlaybookSynchronizer | None = None,
        default_playbook_context: PlaybookContext | Mapping[str, Any] | None = None,
    ) -> None:
        if agi is None and fusion is None:
            raise ValueError("fusion or agi component must be supplied")
        if agi is None:
            agi = DynamicAGIModel(fusion=fusion)
        self.agi = agi
        self.fusion = fusion or agi.fusion
        if self.fusion is None:
            raise ValueError("fusion component unavailable")
        self.risk = risk
        self.trading_algo = trading_algo
        self.sync = sync_engine or DynamicSync()
        self.playbook = playbook_sync or PlaybookSynchronizer()
        self._default_context = self._coerce_playbook_context(default_playbook_context)
        self._position_fingerprint: Tuple[Tuple[Any, ...], ...] = ()
        self._sync_fingerprint: Tuple[Tuple[Any, ...], ...] = ()
        self._last_return_signature: tuple[float, str] | None = None

    def process_update(self, update: MarketUpdate) -> LiveTradingDecision:
        """Ingest a live market update and orchestrate downstream components."""

        self._ingest_positions(update)
        self._ingest_returns(update)
        self._ingest_sync(update)
        governance_payload = self._ingest_governance(update)

        telemetry = self._ensure_price_mark(update)
        market_payload = dict(update.market_data)
        fusion_signal = self.fusion.generate_signal(market_payload)

        risk_context = self._derive_risk_context(update, telemetry)
        agi_output = self.agi.evaluate(
            market_data=market_payload,
            research=update.research,
            risk_context=risk_context,
            treasury=update.treasury,
            inventory=update.inventory,
        )

        risk_adjusted = dict(agi_output.risk_adjusted)
        final_action = str(risk_adjusted.get("action", fusion_signal.action)).upper()
        final_confidence = _safe_float(
            risk_adjusted.get("confidence", agi_output.signal.confidence),
            default=agi_output.signal.confidence,
        )

        lot = self._resolve_lot(update, agi_output)
        trade_result = self._maybe_execute_trade(final_action, lot, update.symbol, risk_adjusted)
        if trade_result is not None:
            lot = trade_result.lot or lot

        decision = LiveTradingDecision(
            symbol=update.symbol,
            action=final_action,
            confidence=final_confidence,
            lot=lot,
            telemetry=telemetry,
            fusion_signal=fusion_signal,
            agi_output=agi_output,
            risk_adjusted=risk_adjusted,
            trade=trade_result,
            sync_status=self.sync.status(),
            governance_payload=governance_payload,
            captured_at=update.timestamp,
        )
        return decision

    # ------------------------------------------------------------------ helpers
    def _ingest_positions(self, update: MarketUpdate) -> None:
        if not update.positions:
            return
        fingerprint = _fingerprint_positions(update.positions)
        if fingerprint == self._position_fingerprint:
            return
        self._position_fingerprint = fingerprint
        self.risk.ingest_positions(update.positions)

    def _ingest_returns(self, update: MarketUpdate) -> None:
        if update.portfolio_return is None:
            return
        signature = (float(update.portfolio_return), update.timestamp.isoformat())
        if self._last_return_signature == signature:
            return
        self._last_return_signature = signature
        self.risk.register_return(update.portfolio_return)

    def _ingest_sync(self, update: MarketUpdate) -> None:
        if not update.sync_samples:
            return
        fingerprint = _fingerprint_sync_samples(update.sync_samples)
        if fingerprint == self._sync_fingerprint:
            return
        self._sync_fingerprint = fingerprint
        self.sync.ingest(update.sync_samples)

    def _ingest_governance(self, update: MarketUpdate) -> Mapping[str, Any] | None:
        if update.governance_entries:
            self.playbook.implement_many(update.governance_entries)
        context = self._resolve_context(update.governance_context)
        if context is None:
            return None
        payload = self.playbook.sync_payload(context)
        return dict(payload)

    def _ensure_price_mark(self, update: MarketUpdate) -> RiskTelemetry:
        try:
            self.risk.mark_price(update.symbol, update.price, timestamp=update.timestamp)
        except KeyError:
            placeholder = Position(
                symbol=update.symbol,
                quantity=0.0,
                entry_price=update.price,
                last_price=update.price,
                updated_at=update.timestamp,
            )
            self.risk.upsert_position(placeholder)
        return self.risk.snapshot()

    def _derive_risk_context(
        self, update: MarketUpdate, telemetry: RiskTelemetry
    ) -> MutableMapping[str, Any]:
        context = _coerce_mapping(update.risk_context)
        gross = telemetry.gross_exposure
        utilisation = _safe_ratio(gross, self.risk.limits.max_gross_exposure)
        context.setdefault("treasury_utilisation", _clamp(utilisation, 0.0, 1.0))
        context.setdefault("treasury_health", _clamp(1.0 - utilisation, 0.0, 1.0))
        if "volatility" not in context:
            context["volatility"] = telemetry.value_at_risk
        if "daily_drawdown" not in context:
            drawdown = update.market_data.get("drawdown") if update.market_data else None
            if drawdown is None and update.portfolio_return is not None:
                drawdown = min(0.0, update.portfolio_return)
            context["daily_drawdown"] = _safe_float(drawdown, 0.0)
        return context

    def _resolve_lot(self, update: MarketUpdate, agi_output: AGIOutput) -> float:
        if update.lot is not None:
            return max(float(update.lot), 0.0)
        sizing = agi_output.sizing
        if sizing is None:
            return 0.0
        price = update.price
        if price <= 0:
            return 0.0
        estimated_lot = sizing.notional / price
        return max(round(estimated_lot, 4), 0.0)

    def _maybe_execute_trade(
        self,
        action: str,
        lot: float,
        symbol: str,
        signal: Mapping[str, Any],
    ) -> TradeExecutionResult | None:
        if action not in {"BUY", "SELL"}:
            return None
        if lot <= 0:
            return None
        return self.trading_algo.execute_trade(signal, lot=lot, symbol=symbol)

    def _resolve_context(
        self, override: PlaybookContext | Mapping[str, Any] | None
    ) -> PlaybookContext | None:
        if override is None:
            return replace(self._default_context) if self._default_context is not None else None
        if isinstance(override, PlaybookContext):
            return override
        payload = asdict(self._default_context) if self._default_context else {}
        payload.update(dict(override))
        return PlaybookContext(**payload)

    def _coerce_playbook_context(
        self, context: PlaybookContext | Mapping[str, Any] | None
    ) -> PlaybookContext | None:
        if context is None:
            return replace(DEFAULT_LIVE_SYNC_CONTEXT)
        if isinstance(context, PlaybookContext):
            return context
        payload = asdict(DEFAULT_LIVE_SYNC_CONTEXT)
        payload.update(dict(context))
        return PlaybookContext(**payload)
