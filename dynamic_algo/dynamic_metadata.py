"""Metadata synthesis utilities for Dynamic Capital intelligence snapshots."""

from __future__ import annotations

from dataclasses import asdict, dataclass, is_dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, MutableMapping, Optional, Sequence

from .dynamic_pool import PoolSnapshot
from .market_flow import MarketFlowSnapshot

__all__ = ["MetadataAttribute", "DynamicMetadataAlgo"]


def _coerce_timestamp(value: Optional[datetime | str] = None) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*.

    ``value`` may be ``None`` (defaults to ``datetime.now(timezone.utc)``), a
    :class:`datetime`, or an ISO-8601 string.  Naive datetimes are assumed to be
    UTC which mirrors the behaviour used in the market flow utilities.
    """

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp value must be datetime, ISO string, or None")


def _coerce_float(value: Any, *, default: float | None = None) -> float | None:
    """Attempt to cast ``value`` to ``float`` while tolerating invalid input."""

    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _normalise_mapping(value: Any) -> Mapping[str, Any] | None:
    """Return a mapping-like representation of *value* when possible."""

    if value is None:
        return None
    if isinstance(value, Mapping):
        return value
    if isinstance(value, PoolSnapshot) or isinstance(value, MarketFlowSnapshot):
        return asdict(value)
    if is_dataclass(value):
        return asdict(value)
    if hasattr(value, "__dict__"):
        return {k: v for k, v in vars(value).items() if not k.startswith("_")}
    return None


@dataclass(slots=True)
class MetadataAttribute:
    """Structured attribute suitable for NFT-style metadata payloads."""

    trait_type: str
    value: Any
    display_type: Optional[str] = None

    def as_dict(self) -> MutableMapping[str, Any]:
        payload: MutableMapping[str, Any] = {
            "trait_type": self.trait_type,
            "value": self.value,
        }
        if self.display_type:
            payload["display_type"] = self.display_type
        return payload


class DynamicMetadataAlgo:
    """Compose rich metadata documents from heterogeneous telemetry."""

    RESERVED_KEYS = {
        "name",
        "symbol",
        "description",
        "timestamp",
        "attributes",
        "scores",
        "tags",
        "sources",
    }

    def __init__(self, *, max_attributes: int = 16) -> None:
        self.max_attributes = max(1, int(max_attributes))

    def build(
        self,
        *,
        symbol: str,
        analysis: Mapping[str, Any] | None = None,
        flow: MarketFlowSnapshot | Mapping[str, Any] | None = None,
        pool: PoolSnapshot | Mapping[str, Any] | None = None,
        risk: Mapping[str, Any] | None = None,
        tags: Sequence[str] | None = None,
        extra: Mapping[str, Any] | None = None,
        timestamp: datetime | str | None = None,
    ) -> MutableMapping[str, Any]:
        """Return a metadata payload describing the trading context."""

        iso_timestamp = _coerce_timestamp(timestamp).isoformat()
        symbol_upper = symbol.upper()

        analysis_data = _normalise_mapping(analysis)
        flow_data = _normalise_mapping(flow)
        pool_data = _normalise_mapping(pool)
        risk_data = _normalise_mapping(risk)

        attributes = self._collect_attributes(
            analysis_data, flow_data, pool_data, risk_data
        )
        if not attributes:
            attributes.append(MetadataAttribute("AI Action", "NEUTRAL"))

        payload: MutableMapping[str, Any] = {
            "name": f"{symbol_upper} dynamic intelligence snapshot",
            "symbol": symbol_upper,
            "description": self._build_description(
                symbol_upper, analysis_data, flow_data, pool_data
            ),
            "timestamp": iso_timestamp,
            "attributes": [attr.as_dict() for attr in attributes[: self.max_attributes]],
            "scores": self._collect_scores(analysis_data, flow_data, pool_data),
            "tags": self._collect_tags(tags, analysis_data, flow_data),
            "sources": {
                "analysis": analysis_data is not None,
                "market_flow": flow_data is not None,
                "pool": pool_data is not None,
                "risk": risk_data is not None,
            },
        }

        if risk_data:
            payload["risk_notes"] = self._collect_risk_notes(risk_data)

        if extra:
            for key, value in extra.items():
                if key not in self.RESERVED_KEYS:
                    payload[key] = value

        return payload

    # ------------------------------------------------------------------ helpers
    def _collect_attributes(
        self,
        analysis: Mapping[str, Any] | None,
        flow: Mapping[str, Any] | None,
        pool: Mapping[str, Any] | None,
        risk: Mapping[str, Any] | None,
    ) -> list[MetadataAttribute]:
        attributes: list[MetadataAttribute] = []

        if analysis:
            action = str(analysis.get("action", "")).upper() or "NEUTRAL"
            attributes.append(MetadataAttribute("AI Action", action))

            confidence = _coerce_float(analysis.get("confidence"))
            if confidence is not None:
                attributes.append(
                    MetadataAttribute(
                        "AI Confidence", round(max(0.0, min(1.0, confidence)), 4), "number"
                    )
                )

            primary = analysis.get("primary_driver")
            if isinstance(primary, str) and primary:
                attributes.append(MetadataAttribute("Primary Driver", primary))

            components = analysis.get("components")
            if isinstance(components, Iterable):
                for component in components:
                    if not isinstance(component, Mapping):
                        continue
                    name = str(component.get("name", "component"))
                    score = _coerce_float(component.get("score"))
                    if score is None:
                        continue
                    attributes.append(
                        MetadataAttribute(
                            f"{name.title()} Score",
                            round(max(-1.0, min(1.0, score)), 4),
                            "number",
                        )
                    )

        if flow:
            bias = str(flow.get("bias", "balanced"))
            attributes.append(MetadataAttribute("Flow Bias", bias))
            pressure = _coerce_float(flow.get("pressure"))
            if pressure is not None:
                attributes.append(
                    MetadataAttribute(
                        "Flow Pressure", round(max(-1.0, min(1.0, pressure)), 4), "number"
                    )
                )
            trade_count = flow.get("trade_count")
            if isinstance(trade_count, int):
                attributes.append(
                    MetadataAttribute("Trades Tracked", trade_count, "number")
                )

        if pool:
            investor_count = pool.get("investor_count")
            if isinstance(investor_count, int):
                attributes.append(
                    MetadataAttribute("Investor Count", investor_count, "number")
                )
            valuation = _coerce_float(pool.get("total_marked_valuation_usd"))
            if valuation is not None:
                attributes.append(
                    MetadataAttribute(
                        "Pool Valuation (USD)", round(max(0.0, valuation), 2), "number"
                    )
                )

        if risk:
            circuit_breaker = bool(risk.get("circuit_breaker", False))
            attributes.append(MetadataAttribute("Circuit Breaker", circuit_breaker))

        return attributes

    def _collect_scores(
        self,
        analysis: Mapping[str, Any] | None,
        flow: Mapping[str, Any] | None,
        pool: Mapping[str, Any] | None,
    ) -> MutableMapping[str, Any]:
        scores: MutableMapping[str, Any] = {}

        if analysis:
            score = _coerce_float(analysis.get("score"))
            if score is not None:
                scores["analysis"] = round(max(-1.0, min(1.0, score)), 4)

        if flow:
            pressure = _coerce_float(flow.get("pressure"))
            if pressure is not None:
                scores["flow_pressure"] = round(max(-1.0, min(1.0, pressure)), 4)
            net_volume = _coerce_float(flow.get("net_volume"))
            if net_volume is not None:
                scores["net_flow_volume"] = round(net_volume, 4)

        if pool:
            valuation = _coerce_float(pool.get("total_marked_valuation_usd"))
            if valuation is not None:
                scores["pool_marked_value_usd"] = round(max(0.0, valuation), 2)

        return scores

    def _collect_tags(
        self,
        tags: Sequence[str] | None,
        analysis: Mapping[str, Any] | None,
        flow: Mapping[str, Any] | None,
    ) -> list[str]:
        collected: set[str] = {"dynamic", "intelligence"}
        if tags:
            collected.update(str(tag).strip().lower() for tag in tags if str(tag).strip())
        if analysis and isinstance(analysis.get("primary_driver"), str):
            collected.add(str(analysis["primary_driver"]).strip().lower())
        if flow and isinstance(flow.get("bias"), str):
            collected.add(str(flow["bias"]).strip().lower())
        return sorted(filter(None, collected))

    def _collect_risk_notes(self, risk: Mapping[str, Any]) -> list[str]:
        notes: list[str] = []
        raw = risk.get("risk_notes") or risk.get("notes")
        if isinstance(raw, str):
            notes.append(raw)
        elif isinstance(raw, Iterable):
            for note in raw:
                if isinstance(note, str) and note:
                    notes.append(note)

        treasury_health = _coerce_float(risk.get("treasury_health"))
        if treasury_health is not None:
            notes.append(f"Treasury health at {treasury_health:.2f}.")

        return notes

    def _build_description(
        self,
        symbol: str,
        analysis: Mapping[str, Any] | None,
        flow: Mapping[str, Any] | None,
        pool: Mapping[str, Any] | None,
    ) -> str:
        parts = [f"Dynamic intelligence snapshot for {symbol}."]

        if analysis and isinstance(analysis.get("action"), str):
            parts.append(
                f"AI bias leans {str(analysis['action']).lower()} with confidence"
                f" {analysis.get('confidence', 0):.2f}."
            )

        if flow and isinstance(flow.get("bias"), str):
            parts.append(
                f"Market flow currently {str(flow['bias']).lower()}"
                f" at pressure {flow.get('pressure', 0)}."
            )

        if pool:
            valuation = _coerce_float(pool.get("total_marked_valuation_usd"))
            investors = pool.get("investor_count")
            if valuation is not None:
                parts.append(f"Pool marked valuation stands at ${valuation:,.2f} USD.")
            if isinstance(investors, int):
                parts.append(f"Investor base counts {investors} participants.")

        return " ".join(parts)

