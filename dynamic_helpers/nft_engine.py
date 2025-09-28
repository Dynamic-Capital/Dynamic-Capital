"""Formatting helper for dynamic NFT digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight
from dynamic_agents.nft_engine import NFTAgentInsight
from dynamic_helpers._base import InsightHelper

__all__ = ["DynamicNFTHelper"]


class DynamicNFTHelper(InsightHelper):
    """Render NFT insights with owner context and highlights."""

    def __init__(self) -> None:
        super().__init__(tagline="NFT = Narrative Fidelity Tokens")

    def compose_digest(self, insight: NFTAgentInsight | AgentInsight) -> str:
        if isinstance(insight, NFTAgentInsight):
            payload = insight.raw
            highlights = list(payload.highlights)
            if insight.owner_distribution:
                highlights.append("Owner distribution:")
                sorted_distribution = sorted(
                    insight.owner_distribution.items(),
                    key=lambda item: (-item[1], item[0]),
                )
                for owner, count in sorted_distribution[:5]:
                    highlights.append(f"  • {owner}: {count}")
            enriched = AgentInsight(
                domain=payload.domain,
                generated_at=payload.generated_at,
                title=payload.title,
                metrics=payload.metrics,
                highlights=tuple(highlights),
                details=payload.details,
            )
            return super().compose_digest(enriched)
        return super().compose_digest(insight)
