"""Helper utilities for financial dynamic ocean workflows."""

from __future__ import annotations

from typing import Mapping

from dynamic_ocean.finance import PelagicFinancialProfile, PelagicMarketSignal
from dynamic_agents.ocean import OceanLayerAgentSummary

__all__ = [
    "DynamicOceanLayerHelper",
    "DynamicEpipelagicHelper",
    "DynamicMesopelagicHelper",
    "DynamicBathypelagicHelper",
    "DynamicAbyssopelagicHelper",
    "DynamicHadalpelagicHelper",
]


class DynamicOceanLayerHelper:
    """Formatting and payload helpers shared across pelagic bots."""

    def __init__(self, profile: PelagicFinancialProfile) -> None:
        self._profile = profile

    @property
    def profile(self) -> PelagicFinancialProfile:
        return self._profile

    def build_signal_payload(self, signal: PelagicMarketSignal) -> Mapping[str, float]:
        return {
            "liquidity": signal.liquidity_score,
            "momentum": signal.momentum_score,
            "volatility": signal.volatility_score,
            "systemic_risk": signal.systemic_risk_score,
            "sentiment": signal.sentiment_score,
        }

    def compose_digest(
        self,
        signal: PelagicMarketSignal,
        *,
        summary: OceanLayerAgentSummary | None = None,
    ) -> str:
        payload = self.build_signal_payload(signal)
        header = f"🌊 {self._profile.layer_name} market update"
        focus = ", ".join(self._profile.market_focus)
        asset_classes = ", ".join(self._profile.asset_classes)
        lines = [
            header,
            f"Focus: {focus}",
            (
                "Scores → Liquidity {liquidity:.2f} | Momentum {momentum:.2f} | "
                "Volatility {volatility:.2f}"
            ).format(**payload),
            (
                "Risk Sentiment → Systemic {systemic_risk:.2f} | Sentiment {sentiment:.2f}"
            ).format(**payload),
            f"Asset stack: {asset_classes}",
        ]
        if signal.alerts:
            lines.append("Alerts:")
            lines.extend(f"  • {alert}" for alert in signal.alerts)
        lines.append("Recommendations:")
        lines.extend(f"  → {item}" for item in signal.recommendations)
        if summary is not None:
            lines.append(
                (
                    "Averages {window} obs → Liquidity {avg_liq:.2f} | Momentum {avg_mom:.2f} | "
                    "Volatility {avg_vol:.2f} | Systemic {avg_sys:.2f} | Sentiment {avg_sent:.2f}"
                ).format(
                    window=summary.window,
                    avg_liq=summary.average_liquidity,
                    avg_mom=summary.average_momentum,
                    avg_vol=summary.average_volatility,
                    avg_sys=summary.average_systemic_risk,
                    avg_sent=summary.average_sentiment,
                )
            )
        return "\n".join(lines)


class DynamicEpipelagicHelper(DynamicOceanLayerHelper):
    pass


class DynamicMesopelagicHelper(DynamicOceanLayerHelper):
    pass


class DynamicBathypelagicHelper(DynamicOceanLayerHelper):
    pass


class DynamicAbyssopelagicHelper(DynamicOceanLayerHelper):
    pass


class DynamicHadalpelagicHelper(DynamicOceanLayerHelper):
    pass
