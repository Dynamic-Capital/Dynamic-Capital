"""Dynamic Market index construction utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping, MutableMapping, Sequence

from dynamic_index import DynamicIndex, IndexConstituent, IndexSignal, IndexSnapshot

from .dynamic_market_outlook import MarketOutlookReport

__all__ = [
    "MarketConstituentConfig",
    "MarketFlowSignal",
    "DynamicMarketIndexResult",
    "DynamicMarketIndexBuilder",
]


def _clamp(value: float, *, lower: float, upper: float) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_constituent_payload(
    payload: Mapping[str, object]
) -> MutableMapping[str, object]:
    normalised: MutableMapping[str, object] = dict(payload)
    tags = normalised.get("tags")
    if tags is not None:
        normalised["tags"] = _normalise_tags(tags if isinstance(tags, Sequence) else None)
    return normalised


def _normalise_weight_vector(weights: Sequence[float]) -> tuple[float, ...]:
    if not weights:
        return ()
    cleaned = [max(float(weight), 0.0) for weight in weights]
    total = sum(cleaned)
    if total <= 0:
        fallback = 1.0 / float(len(cleaned))
        return tuple(fallback for _ in cleaned)
    return tuple(weight / total for weight in cleaned)


@dataclass(slots=True)
class MarketConstituentConfig:
    """Baseline configuration for a Dynamic Market index constituent."""

    symbol: str
    weight: float = 1.0
    exposure: float = 0.0
    volatility: float = 0.25
    momentum: float = 0.0
    conviction: float = 0.5
    liquidity: float = 0.5
    category: str | None = None
    tags: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None

    def to_index_constituent(self) -> IndexConstituent:
        payload: MutableMapping[str, object] = _normalise_constituent_payload(
            {
                "symbol": self.symbol,
                "weight": self.weight,
                "exposure": self.exposure,
                "volatility": self.volatility,
                "momentum": self.momentum,
                "conviction": self.conviction,
                "liquidity": self.liquidity,
                "category": self.category,
                "tags": self.tags,
                "metadata": self.metadata,
            }
        )
        return IndexConstituent(**payload)  # type: ignore[arg-type]


@dataclass(slots=True)
class MarketFlowSignal:
    """Normalised flow signal mapped onto the Dynamic Market index."""

    symbol: str
    pressure: float = 0.0
    return_pct: float = 0.0
    confidence: float = 0.6
    volatility: float | None = None
    liquidity: float | None = None
    weight: float | None = None
    category: str | None = None
    tags: Sequence[str] | None = None

    def __post_init__(self) -> None:
        self.symbol = self.symbol.strip().upper()
        self.pressure = _clamp(float(self.pressure), lower=-1.0, upper=1.0)
        self.return_pct = _clamp(float(self.return_pct), lower=-1.0, upper=1.0)
        self.confidence = _clamp(float(self.confidence), lower=0.0, upper=1.0)
        if self.volatility is not None:
            self.volatility = max(float(self.volatility), 0.0)
        if self.liquidity is not None:
            self.liquidity = _clamp(float(self.liquidity), lower=0.0, upper=1.0)
        if self.weight is not None:
            self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        if self.category is not None:
            self.category = self.category.strip().upper() or None

    def to_index_signal(self) -> IndexSignal:
        return IndexSignal(
            symbol=self.symbol,
            return_pct=self.return_pct,
            flow_bias=self.pressure,
            confidence=self.confidence,
            volatility=self.volatility,
            liquidity=self.liquidity,
        )


@dataclass(slots=True)
class DynamicMarketIndexResult:
    """Structured response for a Dynamic Market index computation."""

    snapshot: IndexSnapshot
    regime: str
    conviction: float
    breadth_score: float
    momentum_score: float
    highlights: tuple[str, ...]
    metadata: Mapping[str, object]

    def to_dict(self) -> dict[str, object]:
        payload = {
            "snapshot": self.snapshot.as_dict(),
            "regime": self.regime,
            "conviction": round(self.conviction, 3),
            "breadthScore": round(self.breadth_score, 3),
            "momentumScore": round(self.momentum_score, 3),
            "highlights": list(self.highlights),
            "metadata": dict(self.metadata),
        }
        return payload


class DynamicMarketIndexBuilder:
    """Compose a Dynamic Market index snapshot from flows and outlook inputs."""

    def __init__(
        self,
        *,
        base_constituents: Iterable[MarketConstituentConfig | Mapping[str, object]] | None = None,
        history: int = 120,
        default_weight: float = 1.0,
    ) -> None:
        self.history = max(int(history), 1)
        self.default_weight = max(float(default_weight), 0.1)
        self._base_constituents: tuple[MarketConstituentConfig, ...] = self._normalise_constituents(
            base_constituents or ()
        )

    def build(
        self,
        *,
        flows: Iterable[MarketFlowSignal | Mapping[str, object]] | None = None,
        outlook: MarketOutlookReport | None = None,
        additional_constituents: Iterable[MarketConstituentConfig | Mapping[str, object]] | None = None,
    ) -> DynamicMarketIndexResult:
        index = DynamicIndex(history=self.history)
        if self._base_constituents:
            index.extend(config.to_index_constituent() for config in self._base_constituents)
        if additional_constituents:
            index.extend(
                config.to_index_constituent()
                for config in self._normalise_constituents(additional_constituents)
            )

        normalised_flows = self._normalise_flows(flows)
        if normalised_flows:
            self._integrate_flows(index, normalised_flows)

        if outlook is not None:
            self._apply_outlook(index, outlook)

        snapshot = index.snapshot()
        regime = self._resolve_regime(snapshot, outlook)
        conviction = self._resolve_conviction(index, outlook)
        metadata = self._build_metadata(index, snapshot, outlook, normalised_flows)
        highlights = self._collect_highlights(snapshot, outlook)

        return DynamicMarketIndexResult(
            snapshot=snapshot,
            regime=regime,
            conviction=conviction,
            breadth_score=snapshot.breadth,
            momentum_score=snapshot.momentum,
            highlights=highlights,
            metadata=metadata,
        )

    # ------------------------------------------------------------------ helpers
    def _normalise_constituents(
        self,
        configs: Iterable[MarketConstituentConfig | Mapping[str, object]],
    ) -> tuple[MarketConstituentConfig, ...]:
        normalised: list[MarketConstituentConfig] = []
        for config in configs:
            if isinstance(config, MarketConstituentConfig):
                normalised.append(config)
            elif isinstance(config, Mapping):
                normalised.append(MarketConstituentConfig(**dict(config)))
            else:  # pragma: no cover - defensive branch
                raise TypeError("constituent config must be mapping or MarketConstituentConfig")
        return tuple(normalised)

    def _normalise_flows(
        self,
        flows: Iterable[MarketFlowSignal | Mapping[str, object]] | None,
    ) -> tuple[MarketFlowSignal, ...]:
        if not flows:
            return ()
        normalised: list[MarketFlowSignal] = []
        for flow in flows:
            if isinstance(flow, MarketFlowSignal):
                normalised.append(flow)
            elif isinstance(flow, Mapping):
                normalised.append(MarketFlowSignal(**dict(flow)))
            else:  # pragma: no cover - defensive branch
                raise TypeError("flow signal must be mapping or MarketFlowSignal")
        return tuple(normalised)

    def _integrate_flows(
        self, index: DynamicIndex, flows: Sequence[MarketFlowSignal]
    ) -> None:
        for flow in flows:
            constituent = self._ensure_constituent(index, flow)
            if flow.liquidity is not None:
                constituent.liquidity = flow.liquidity
            if flow.volatility is not None:
                constituent.volatility = flow.volatility
            if flow.tags:
                merged_tags = tuple(dict.fromkeys(constituent.tags + flow.tags))
                constituent.tags = merged_tags
            index.record(flow.to_index_signal())

    def _ensure_constituent(
        self, index: DynamicIndex, flow: MarketFlowSignal
    ) -> IndexConstituent:
        existing = next((c for c in index.constituents() if c.symbol == flow.symbol), None)
        if existing is not None:
            if flow.weight is not None:
                existing.weight = max(flow.weight, 0.0)
            if flow.category:
                existing.category = flow.category
            return existing

        weight = flow.weight if flow.weight is not None else self.default_weight
        constituent = IndexConstituent(
            symbol=flow.symbol,
            weight=weight,
            exposure=flow.pressure,
            momentum=flow.return_pct,
            conviction=flow.confidence,
            liquidity=flow.liquidity if flow.liquidity is not None else 0.5,
            volatility=flow.volatility if flow.volatility is not None else 0.25,
            category=flow.category,
            tags=flow.tags,
            metadata={"source": "flow"},
        )
        index.upsert_constituent(constituent)
        return constituent

    def _apply_outlook(self, index: DynamicIndex, outlook: MarketOutlookReport) -> None:
        tier_bias = {
            "risk_on": 0.25,
            "neutral": 0.0,
            "hedge": -0.35,
        }
        bias = tier_bias.get(outlook.tier, 0.0)
        conviction = max(outlook.conviction, 0.25)
        momentum_boost = _clamp((outlook.score - 50.0) / 100.0, lower=-1.0, upper=1.0)
        for constituent in index.constituents():
            signal = IndexSignal(
                symbol=constituent.symbol,
                flow_bias=bias,
                confidence=conviction,
                return_pct=momentum_boost,
            )
            index.record(signal)

    def _resolve_regime(
        self, snapshot: IndexSnapshot, outlook: MarketOutlookReport | None
    ) -> str:
        if outlook is not None:
            if outlook.tier == "hedge" or snapshot.stress > 1.5:
                return "defensive"
            if outlook.tier == "risk_on" and snapshot.net_exposure >= 0.05:
                return "risk_on"
            if outlook.tier == "neutral" and snapshot.net_exposure <= -0.05:
                return "risk_off"

        if snapshot.net_exposure <= -0.15:
            return "risk_off"
        if snapshot.net_exposure >= 0.15 and snapshot.momentum >= 0.0:
            return "risk_on"
        if snapshot.stress >= 1.2:
            return "defensive"
        return "balanced"

    def _resolve_conviction(
        self, index: DynamicIndex, outlook: MarketOutlookReport | None
    ) -> float:
        constituents = index.constituents()
        if not constituents:
            return outlook.conviction if outlook is not None else 0.0
        weights = _normalise_weight_vector([constituent.weight for constituent in constituents])
        blended = sum(
            weight * constituent.conviction
            for weight, constituent in zip(weights, constituents)
        )
        if outlook is not None:
            blended = max(blended, outlook.conviction)
        return round(_clamp(blended, lower=0.0, upper=1.0), 3)

    def _build_metadata(
        self,
        index: DynamicIndex,
        snapshot: IndexSnapshot,
        outlook: MarketOutlookReport | None,
        flows: Sequence[MarketFlowSignal],
    ) -> Mapping[str, object]:
        constituents = index.constituents()
        coverage = len(constituents)
        tags: set[str] = set()
        for constituent in constituents:
            tags.update(constituent.tags)
        metadata: dict[str, object] = {
            "timestamp": snapshot.timestamp,
            "constituent_count": coverage,
            "symbols": [constituent.symbol for constituent in constituents],
            "themes": sorted(tags),
            "flow_count": len(flows),
        }
        if outlook is not None:
            metadata.update(
                {
                    "outlook_score": outlook.score,
                    "outlook_tier": outlook.tier,
                    "outlook_conviction": outlook.conviction,
                }
            )
        return metadata

    def _collect_highlights(
        self, snapshot: IndexSnapshot, outlook: MarketOutlookReport | None
    ) -> tuple[str, ...]:
        highlights = list(snapshot.notes)
        if outlook is not None:
            highlights.append(outlook.summary)
            highlights.extend(outlook.drivers[:2])
        deduped: list[str] = []
        seen: set[str] = set()
        for highlight in highlights:
            if highlight not in seen:
                seen.add(highlight)
                deduped.append(highlight)
        return tuple(deduped)

