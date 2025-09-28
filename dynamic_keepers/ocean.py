"""State keepers for financial dynamic ocean insights."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Deque, Mapping

from dynamic_agents.ocean import DynamicOceanLayerAgent
from dynamic_ocean.finance import PelagicFinancialProfile, PelagicMarketSignal

__all__ = [
    "KeeperTrendSnapshot",
    "DynamicOceanLayerKeeper",
    "DynamicEpipelagicKeeper",
    "DynamicMesopelagicKeeper",
    "DynamicBathypelagicKeeper",
    "DynamicAbyssopelagicKeeper",
    "DynamicHadalpelagicKeeper",
]


@dataclass(slots=True)
class KeeperTrendSnapshot:
    """Rolling trend metrics produced by a keeper."""

    profile: PelagicFinancialProfile
    records: tuple[PelagicMarketSignal, ...]
    averages: Mapping[str, float]
    deltas: Mapping[str, float]


class DynamicOceanLayerKeeper:
    """Track derived signals for replay and trend analytics."""

    def __init__(self, profile: PelagicFinancialProfile, *, limit: int = 144) -> None:
        if limit <= 0:
            raise ValueError("limit must be positive")
        self._profile = profile
        self._history: Deque[PelagicMarketSignal] = deque(maxlen=limit)

    @property
    def profile(self) -> PelagicFinancialProfile:
        return self._profile

    @property
    def records(self) -> tuple[PelagicMarketSignal, ...]:
        return tuple(self._history)

    def record(self, signal: PelagicMarketSignal) -> None:
        self._history.append(signal)

    def capture(self, agent: DynamicOceanLayerAgent, /, **overrides: object) -> PelagicMarketSignal:
        signal = agent.capture_signal(
            depth=overrides.get("depth"),
            location=overrides.get("location"),
            timestamp=overrides.get("timestamp"),
        )
        self.record(signal)
        return signal

    def trend(self) -> KeeperTrendSnapshot:
        if not self._history:
            raise RuntimeError("no signals recorded")
        records = self.records
        averages = {
            "liquidity": sum(signal.liquidity_score for signal in records) / len(records),
            "momentum": sum(signal.momentum_score for signal in records) / len(records),
            "volatility": sum(signal.volatility_score for signal in records) / len(records),
            "systemic_risk": sum(signal.systemic_risk_score for signal in records) / len(records),
            "sentiment": sum(signal.sentiment_score for signal in records) / len(records),
        }
        deltas = {
            key: getattr(records[-1], f"{key}_score") - getattr(records[0], f"{key}_score")
            for key in ("liquidity", "momentum", "volatility", "systemic_risk", "sentiment")
        }
        return KeeperTrendSnapshot(
            profile=self._profile,
            records=records,
            averages=averages,
            deltas=deltas,
        )


class DynamicEpipelagicKeeper(DynamicOceanLayerKeeper):
    pass


class DynamicMesopelagicKeeper(DynamicOceanLayerKeeper):
    pass


class DynamicBathypelagicKeeper(DynamicOceanLayerKeeper):
    pass


class DynamicAbyssopelagicKeeper(DynamicOceanLayerKeeper):
    pass


class DynamicHadalpelagicKeeper(DynamicOceanLayerKeeper):
    pass
