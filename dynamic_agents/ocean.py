"""Dynamic ocean agents specialised for financial data collection."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, Sequence

from dynamic_ocean.finance import (
    DEFAULT_FINANCIAL_PROFILES,
    PelagicFinancialProfile,
    PelagicMarketSignal,
    build_financial_ocean,
    derive_market_signal,
    resolve_financial_profile,
)
from dynamic_ocean.ocean import DynamicOcean

__all__ = [
    "OceanLayerAgentSummary",
    "DynamicOceanLayerAgent",
    "DynamicEpipelagicAgent",
    "DynamicMesopelagicAgent",
    "DynamicBathypelagicAgent",
    "DynamicAbyssopelagicAgent",
    "DynamicHadalpelagicAgent",
]


@dataclass(slots=True)
class OceanLayerAgentSummary:
    """Aggregate statistics derived from a window of market signals."""

    profile: PelagicFinancialProfile
    generated_at: datetime
    window: int
    average_liquidity: float
    average_momentum: float
    average_volatility: float
    average_systemic_risk: float
    average_sentiment: float
    recent_alerts: tuple[str, ...]
    active_recommendations: tuple[str, ...]


class DynamicOceanLayerAgent:
    """Coordinate :class:`DynamicOcean` observations for a pelagic profile."""

    def __init__(
        self,
        profile: PelagicFinancialProfile | str | None = None,
        *,
        engine: DynamicOcean | None = None,
        history_limit: int = 96,
    ) -> None:
        if isinstance(profile, str):
            resolved_profile = resolve_financial_profile(profile)
        else:
            resolved_profile = profile

        if resolved_profile is None:
            resolved_profile = next(iter(DEFAULT_FINANCIAL_PROFILES.values()))

        self._profile = resolved_profile
        self._engine = engine or build_financial_ocean()
        if history_limit <= 0:
            raise ValueError("history_limit must be positive")
        self._signals: Deque[PelagicMarketSignal] = deque(maxlen=history_limit)

    @property
    def profile(self) -> PelagicFinancialProfile:
        return self._profile

    @property
    def engine(self) -> DynamicOcean:
        return self._engine

    @property
    def signals(self) -> tuple[PelagicMarketSignal, ...]:
        return tuple(self._signals)

    def capture_signal(
        self,
        *,
        depth: float | None = None,
        location: Sequence[float] | None = None,
        timestamp: datetime | None = None,
    ) -> PelagicMarketSignal:
        target_depth = depth if depth is not None else self._profile.default_depth
        target_location = location if location is not None else self._profile.default_location
        snapshot = self._engine.observe(
            depth=target_depth,
            location=target_location,
            timestamp=timestamp,
            layer=self._profile.layer_name,
        )
        signal = derive_market_signal(snapshot, self._profile)
        self._signals.append(signal)
        return signal

    def capture_signals(
        self,
        observations: Iterable[Mapping[str, object] | None],
    ) -> list[PelagicMarketSignal]:
        results: list[PelagicMarketSignal] = []
        for overrides in observations:
            overrides = overrides or {}
            results.append(
                self.capture_signal(
                    depth=overrides.get("depth"),
                    location=overrides.get("location"),
                    timestamp=overrides.get("timestamp"),
                )
            )
        return results

    def summarise(self, *, window: int | None = None) -> OceanLayerAgentSummary:
        if window is not None and window <= 0:
            raise ValueError("window must be positive when provided")
        buffer = list(self._signals)
        if not buffer:
            raise RuntimeError("no signals captured yet")
        if window is not None:
            buffer = buffer[-window:]
        alerts: list[str] = []
        recommendations: list[str] = []
        for signal in buffer:
            alerts.extend(signal.alerts)
            recommendations.extend(signal.recommendations)
        unique_alerts = tuple(dict.fromkeys(alerts))
        unique_recommendations = tuple(dict.fromkeys(recommendations))
        return OceanLayerAgentSummary(
            profile=self._profile,
            generated_at=datetime.now(timezone.utc),
            window=len(buffer),
            average_liquidity=sum(s.liquidity_score for s in buffer) / len(buffer),
            average_momentum=sum(s.momentum_score for s in buffer) / len(buffer),
            average_volatility=sum(s.volatility_score for s in buffer) / len(buffer),
            average_systemic_risk=sum(s.systemic_risk_score for s in buffer) / len(buffer),
            average_sentiment=sum(s.sentiment_score for s in buffer) / len(buffer),
            recent_alerts=unique_alerts,
            active_recommendations=unique_recommendations,
        )


class DynamicEpipelagicAgent(DynamicOceanLayerAgent):
    def __init__(self, *, engine: DynamicOcean | None = None, history_limit: int = 96) -> None:
        super().__init__(
            resolve_financial_profile("Epipelagic"),
            engine=engine,
            history_limit=history_limit,
        )


class DynamicMesopelagicAgent(DynamicOceanLayerAgent):
    def __init__(self, *, engine: DynamicOcean | None = None, history_limit: int = 96) -> None:
        super().__init__(
            resolve_financial_profile("Mesopelagic"),
            engine=engine,
            history_limit=history_limit,
        )


class DynamicBathypelagicAgent(DynamicOceanLayerAgent):
    def __init__(self, *, engine: DynamicOcean | None = None, history_limit: int = 96) -> None:
        super().__init__(
            resolve_financial_profile("Bathypelagic"),
            engine=engine,
            history_limit=history_limit,
        )


class DynamicAbyssopelagicAgent(DynamicOceanLayerAgent):
    def __init__(self, *, engine: DynamicOcean | None = None, history_limit: int = 96) -> None:
        super().__init__(
            resolve_financial_profile("Abyssopelagic"),
            engine=engine,
            history_limit=history_limit,
        )


class DynamicHadalpelagicAgent(DynamicOceanLayerAgent):
    def __init__(self, *, engine: DynamicOcean | None = None, history_limit: int = 96) -> None:
        super().__init__(
            resolve_financial_profile("Hadalpelagic"),
            engine=engine,
            history_limit=history_limit,
        )
