"""State keeper for dynamic NFT insights."""

from __future__ import annotations

from dynamic_agents.nft_engine import DynamicNFTAgent, NFTAgentInsight
from dynamic_keepers._base import InsightKeeper

__all__ = ["DynamicNFTKeeper"]


class DynamicNFTKeeper(InsightKeeper):
    """Persist NFT insights for longitudinal analysis."""

    def __init__(self, *, limit: int = 180) -> None:
        super().__init__(limit=limit)

    def capture(self, agent: DynamicNFTAgent) -> NFTAgentInsight:
        """Capture a detailed insight and persist its summary."""

        insight = agent.detailed_insight()
        self.record(insight.raw)
        return insight

    def average_supply(self) -> float:
        """Average number of NFTs observed across the recorded history."""

        return self.average_metric("total_supply")

    def average_unique_owners(self) -> float:
        """Average owner diversity across the recorded history."""

        return self.average_metric("unique_owners")
