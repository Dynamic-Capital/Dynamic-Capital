"""Compose consolidated Dynamic Market snapshots blending flow and outlook data."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Sequence

from .dynamic_market_outlook import MarketOutlookReport

__all__ = [
    "FlowSnapshot",
    "SnapshotGauge",
    "DynamicMarketSnapshot",
    "DynamicMarketSnapshotBuilder",
]


def _clamp(value: float, lower: float, upper: float) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _coerce_float(value: Any, *, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _coerce_int(value: Any, *, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


@dataclass(slots=True)
class FlowSnapshot:
    """Normalised market flow view for a traded symbol."""

    symbol: str
    flow_score: float
    bias: str
    pressure: float
    net_volume: float
    gross_volume: float
    trade_count: int
    realised_pnl: float
    last_trade_at: datetime | None = None

    def __post_init__(self) -> None:
        self.symbol = self.symbol.upper()
        self.bias = self.bias.lower() or "balanced"
        self.flow_score = float(self.flow_score)
        self.pressure = _clamp(float(self.pressure), -1.0, 1.0)
        self.net_volume = float(self.net_volume)
        self.gross_volume = abs(float(self.gross_volume))
        self.trade_count = max(int(self.trade_count), 0)
        self.realised_pnl = float(self.realised_pnl)
        if self.last_trade_at and self.last_trade_at.tzinfo is None:
            self.last_trade_at = self.last_trade_at.replace(tzinfo=timezone.utc)

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "symbol": self.symbol,
            "flowScore": round(self.flow_score, 2),
            "bias": self.bias,
            "pressure": round(self.pressure, 4),
            "netVolume": round(self.net_volume, 4),
            "grossVolume": round(self.gross_volume, 4),
            "tradeCount": self.trade_count,
            "realisedPnl": round(self.realised_pnl, 4),
        }
        if self.last_trade_at is not None:
            payload["lastTradeAt"] = self.last_trade_at.isoformat()
        return payload


@dataclass(slots=True)
class SnapshotGauge:
    """Named gauge describing liquidity, volatility, or participation state."""

    score: float
    status: str
    metrics: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        metrics: dict[str, Any] = {}
        for key, value in self.metrics.items():
            if isinstance(value, float):
                metrics[key] = round(value, 2)
            else:
                metrics[key] = value
        return {
            "score": round(self.score, 2),
            "status": self.status,
            "metrics": metrics,
        }


@dataclass(slots=True)
class DynamicMarketSnapshot:
    """Structured summary of the Dynamic Market regime."""

    score: float
    tone: str
    liquidity: SnapshotGauge
    volatility: SnapshotGauge
    participation: SnapshotGauge
    leaders: list[FlowSnapshot]
    laggards: list[FlowSnapshot]
    alerts: list[str]
    summary: str
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        payload = {
            "score": round(self.score, 2),
            "tone": self.tone,
            "liquidity": self.liquidity.to_dict(),
            "volatility": self.volatility.to_dict(),
            "participation": self.participation.to_dict(),
            "leaders": [leader.to_dict() for leader in self.leaders],
            "laggards": [laggard.to_dict() for laggard in self.laggards],
            "alerts": list(self.alerts),
            "summary": self.summary,
            "metadata": self._serialise_metadata(),
        }
        return payload

    def _serialise_metadata(self) -> dict[str, Any]:
        metadata = dict(self.metadata)
        timestamp = metadata.get("timestamp")
        if isinstance(timestamp, datetime):
            metadata["timestamp"] = timestamp.isoformat()
        return metadata


class DynamicMarketSnapshotBuilder:
    """Compose Dynamic Market snapshots from heterogeneous telemetry."""

    def __init__(self, *, leader_limit: int = 3, laggard_limit: int = 3) -> None:
        self.leader_limit = max(1, int(leader_limit))
        self.laggard_limit = max(1, int(laggard_limit))

    def compose(
        self,
        *,
        outlook: MarketOutlookReport | None = None,
        flows: Iterable[Any] | Mapping[str, Any] | None = None,
        liquidity: Mapping[str, Any] | None = None,
        volatility_index: float | None = None,
        timestamp: datetime | None = None,
        notes: Sequence[str] | None = None,
        metadata: Mapping[str, Any] | None = None,
    ) -> DynamicMarketSnapshot:
        normalised_flows = self._normalise_flows(flows)
        resolved_score = self._resolve_score(outlook, normalised_flows)
        tone = self._resolve_tone(resolved_score, outlook)

        liquidity_gauge = self._build_liquidity_gauge(liquidity, normalised_flows)
        volatility_gauge = self._build_volatility_gauge(normalised_flows, volatility_index)
        participation_gauge = self._build_participation_gauge(normalised_flows)

        leaders, laggards = self._rank_flows(normalised_flows)
        alerts = self._collect_alerts(tone, liquidity_gauge, volatility_gauge, participation_gauge)
        summary = self._build_summary(
            resolved_score,
            tone,
            liquidity_gauge,
            volatility_gauge,
            participation_gauge,
            leaders,
            laggards,
            notes,
        )

        snapshot_timestamp = timestamp or datetime.now(timezone.utc)
        snapshot_metadata = self._build_metadata(
            snapshot_timestamp,
            outlook,
            normalised_flows,
            notes,
            metadata,
        )

        return DynamicMarketSnapshot(
            score=resolved_score,
            tone=tone,
            liquidity=liquidity_gauge,
            volatility=volatility_gauge,
            participation=participation_gauge,
            leaders=leaders,
            laggards=laggards,
            alerts=alerts,
            summary=summary,
            metadata=snapshot_metadata,
        )

    # ------------------------------------------------------------------ helpers
    def _normalise_flows(self, flows: Iterable[Any] | Mapping[str, Any] | None) -> list[FlowSnapshot]:
        if flows is None:
            return []
        if isinstance(flows, Mapping):
            iterable = flows.values()
        else:
            iterable = flows

        normalised: list[FlowSnapshot] = []
        for entry in iterable:
            normalised_entry = self._coerce_flow(entry)
            if normalised_entry is not None:
                normalised.append(normalised_entry)
        return normalised

    def _coerce_flow(self, entry: Any) -> FlowSnapshot | None:
        if isinstance(entry, FlowSnapshot):
            return entry

        payload: Mapping[str, Any] | None = None
        if isinstance(entry, Mapping):
            payload = entry
        elif hasattr(entry, "__dict__"):
            payload = {
                key: value
                for key, value in vars(entry).items()
                if not key.startswith("_")
            }

        if not payload:
            return None

        symbol = str(payload.get("symbol", "")).strip() or "UNKNOWN"
        pressure = _coerce_float(payload.get("pressure"), default=0.0)
        flow_score = payload.get("flow_score")
        if flow_score is None:
            flow_score = pressure * 100.0
        flow_score = _coerce_float(flow_score, default=0.0)
        bias_value = payload.get("bias")
        if isinstance(bias_value, str) and bias_value.strip():
            bias = bias_value.strip().lower()
        else:
            bias = "buy" if flow_score > 0 else "sell" if flow_score < 0 else "balanced"

        net_volume = _coerce_float(payload.get("net_volume"), default=0.0)
        gross_volume = payload.get("gross_volume")
        if gross_volume is None:
            gross_volume = abs(net_volume)
        gross_volume = _coerce_float(gross_volume, default=abs(net_volume))
        trade_count = _coerce_int(payload.get("trade_count"), default=0)
        realised_pnl = _coerce_float(payload.get("realised_pnl"), default=0.0)
        last_trade_at = _coerce_datetime(
            payload.get("last_trade_at")
            or payload.get("last_trade")
            or payload.get("timestamp")
        )

        return FlowSnapshot(
            symbol=symbol,
            flow_score=flow_score,
            bias=bias,
            pressure=pressure if pressure or flow_score == 0 else flow_score / 100.0,
            net_volume=net_volume,
            gross_volume=gross_volume,
            trade_count=trade_count,
            realised_pnl=realised_pnl,
            last_trade_at=last_trade_at,
        )

    def _resolve_score(self, outlook: MarketOutlookReport | None, flows: Sequence[FlowSnapshot]) -> float:
        if outlook is not None:
            return round(float(outlook.score), 2)
        if not flows:
            return 50.0
        average_flow = sum(flow.flow_score for flow in flows) / len(flows)
        score = 50.0 + average_flow / 2.0
        return round(_clamp(score, 0.0, 100.0), 2)

    def _resolve_tone(self, score: float, outlook: MarketOutlookReport | None) -> str:
        if outlook is not None:
            tier = str(outlook.tier).strip().lower()
            mapping = {"risk_on": "risk_on", "neutral": "balanced", "hedge": "defensive"}
            if tier in mapping:
                return mapping[tier]
        if score >= 60.0:
            return "risk_on"
        if score <= 40.0:
            return "defensive"
        return "balanced"

    def _build_liquidity_gauge(
        self,
        liquidity: Mapping[str, Any] | None,
        flows: Sequence[FlowSnapshot],
    ) -> SnapshotGauge:
        if liquidity is None and not flows:
            return SnapshotGauge(
                score=50.0,
                status="unknown",
                metrics={"uptime": None, "spread_bps": None, "depth_usd": None, "incidents": 0},
            )

        if liquidity is not None:
            uptime = _clamp(_coerce_float(liquidity.get("uptime"), default=95.0), 0.0, 100.0)
            spread = max(_coerce_float(liquidity.get("spread_bps"), default=15.0), 0.0)
            depth = max(_coerce_float(liquidity.get("depth_usd"), default=0.0), 0.0)
            incidents = max(_coerce_int(liquidity.get("incidents"), default=0), 0)
            spread_penalty = min(spread * 2.0, 80.0)
            depth_boost = min(depth / 250_000.0 * 5.0, 15.0)
            incident_penalty = min(incidents * 5.0, 15.0)
            score = _clamp(uptime - spread_penalty + depth_boost - incident_penalty, 0.0, 100.0)
            status = self._classify(score, (70.0, 40.0), ("robust", "steady", "stressed"))
            metrics = {
                "uptime": uptime,
                "spread_bps": spread,
                "depth_usd": depth,
                "incidents": incidents,
            }
            return SnapshotGauge(score=score, status=status, metrics=metrics)

        trade_count = sum(flow.trade_count for flow in flows)
        gross_volume = sum(flow.gross_volume for flow in flows)
        score = _clamp(trade_count * 2.5 + gross_volume * 1.5, 0.0, 100.0)
        status = self._classify(score, (70.0, 40.0), ("robust", "steady", "stressed"))
        metrics = {
            "uptime": None,
            "spread_bps": None,
            "depth_usd": round(gross_volume, 4),
            "incidents": 0,
        }
        return SnapshotGauge(score=score, status=status, metrics=metrics)

    def _build_volatility_gauge(
        self,
        flows: Sequence[FlowSnapshot],
        volatility_index: float | None,
    ) -> SnapshotGauge:
        if volatility_index is None:
            if not flows:
                return SnapshotGauge(score=50.0, status="unknown", metrics={"index": None})
            volatility_index = sum(abs(flow.flow_score) for flow in flows) / len(flows)
        volatility_index = max(_coerce_float(volatility_index, default=35.0), 0.0)
        clamped_index = min(volatility_index, 200.0)
        score = _clamp(100.0 - clamped_index, 0.0, 100.0)
        status = self._classify(score, (70.0, 40.0), ("calm", "normal", "elevated"))
        metrics = {"index": volatility_index}
        return SnapshotGauge(score=score, status=status, metrics=metrics)

    def _build_participation_gauge(self, flows: Sequence[FlowSnapshot]) -> SnapshotGauge:
        if not flows:
            return SnapshotGauge(
                score=50.0,
                status="unknown",
                metrics={"trade_count": 0, "gross_volume": 0.0},
            )
        trade_count = sum(flow.trade_count for flow in flows)
        gross_volume = sum(flow.gross_volume for flow in flows)
        trade_score = min(trade_count * 4.0, 70.0)
        volume_score = min(gross_volume * 2.0, 30.0)
        score = _clamp(trade_score + volume_score, 0.0, 100.0)
        status = self._classify(score, (70.0, 40.0), ("active", "steady", "thin"))
        metrics = {"trade_count": trade_count, "gross_volume": round(gross_volume, 4)}
        return SnapshotGauge(score=score, status=status, metrics=metrics)

    def _classify(
        self,
        score: float,
        thresholds: tuple[float, float],
        labels: tuple[str, str, str],
    ) -> str:
        upper, lower = thresholds
        high, mid, low = labels
        if score >= upper:
            return high
        if score >= lower:
            return mid
        return low

    def _rank_flows(self, flows: Sequence[FlowSnapshot]) -> tuple[list[FlowSnapshot], list[FlowSnapshot]]:
        if not flows:
            return ([], [])

        positive = [flow for flow in flows if flow.flow_score > 0]
        negative = [flow for flow in flows if flow.flow_score < 0]

        positive.sort(key=lambda flow: (flow.flow_score, flow.net_volume), reverse=True)
        negative.sort(key=lambda flow: (flow.flow_score, -abs(flow.net_volume)))

        leaders = positive[: self.leader_limit]
        laggards = negative[: self.laggard_limit]

        if len(leaders) < self.leader_limit:
            remaining = [flow for flow in flows if flow not in leaders]
            remaining.sort(key=lambda flow: (flow.flow_score, flow.net_volume), reverse=True)
            for flow in remaining:
                if len(leaders) >= self.leader_limit:
                    break
                leaders.append(flow)

        if len(laggards) < self.laggard_limit:
            remaining = [flow for flow in flows if flow not in laggards]
            remaining.sort(key=lambda flow: (flow.flow_score, -abs(flow.net_volume)))
            for flow in remaining:
                if len(laggards) >= self.laggard_limit:
                    break
                laggards.append(flow)

        return (leaders, laggards)

    def _collect_alerts(
        self,
        tone: str,
        liquidity: SnapshotGauge,
        volatility: SnapshotGauge,
        participation: SnapshotGauge,
    ) -> list[str]:
        alerts: list[str] = []
        if tone == "defensive":
            alerts.append("Composite bias defensive – consider hedges and tighter risk limits.")
        if liquidity.status == "stressed":
            alerts.append("Liquidity conditions degraded; review quoting posture and incentives.")
        if volatility.status == "elevated":
            alerts.append("Volatility elevated; widen spreads and confirm hedge coverage.")
        if participation.status == "thin":
            alerts.append("Market participation thin; monitor primary flow sources closely.")
        return alerts

    def _build_summary(
        self,
        score: float,
        tone: str,
        liquidity: SnapshotGauge,
        volatility: SnapshotGauge,
        participation: SnapshotGauge,
        leaders: Sequence[FlowSnapshot],
        laggards: Sequence[FlowSnapshot],
        notes: Sequence[str] | None,
    ) -> str:
        tone_label = {
            "risk_on": "Risk on",
            "balanced": "Balanced",
            "defensive": "Defensive",
        }.get(tone, tone.title())
        summary_parts = [
            f"{tone_label} regime with composite score {score:.1f}.",
            f"Liquidity {liquidity.status}",
            f"volatility {volatility.status}",
            f"participation {participation.status}.",
        ]
        if leaders:
            top = leaders[0]
            summary_parts.append(
                f"Top flow: {top.symbol} {top.bias} bias ({abs(top.flow_score):.1f})."
            )
        if laggards:
            worst = laggards[0]
            summary_parts.append(
                f"Weakest: {worst.symbol} {worst.bias} bias ({abs(worst.flow_score):.1f})."
            )
        if notes:
            summary_parts.append(" ".join(str(note) for note in notes))
        return " ".join(summary_parts)

    def _build_metadata(
        self,
        timestamp: datetime,
        outlook: MarketOutlookReport | None,
        flows: Sequence[FlowSnapshot],
        notes: Sequence[str] | None,
        extra: Mapping[str, Any] | None,
    ) -> dict[str, Any]:
        metadata: dict[str, Any] = {
            "timestamp": timestamp,
            "flow_count": len(flows),
            "flow_symbols": sorted({flow.symbol for flow in flows}),
            "notes": list(notes or ()),
        }
        if outlook is not None:
            metadata["outlook"] = outlook.to_dict()
        if extra:
            for key, value in extra.items():
                if key not in metadata:
                    metadata[key] = value
                else:
                    metadata[f"extra_{key}"] = value
        return metadata
