"""Bot wrapper around the dynamic NFT engine."""

from __future__ import annotations

from typing import cast

from dynamic_agents.nft_engine import DynamicNFTAgent
from dynamic.platform.token.nft import MintedDynamicNFT
from dynamic_bots._base import InsightBot
from dynamic_helpers.nft_engine import DynamicNFTHelper
from dynamic_keepers.nft_engine import DynamicNFTKeeper

__all__ = ["DynamicNFTBot"]


class DynamicNFTBot(InsightBot):
    """Expose NFT engine insights through a bot-friendly interface."""

    def __init__(
        self,
        *,
        agent: DynamicNFTAgent | None = None,
        helper: DynamicNFTHelper | None = None,
        keeper: DynamicNFTKeeper | None = None,
        symbol: str = "DCT",
    ) -> None:
        resolved_agent = agent or DynamicNFTAgent(symbol=symbol)
        super().__init__(
            agent=resolved_agent,
            helper=helper or DynamicNFTHelper(),
            keeper=keeper or DynamicNFTKeeper(),
        )

    @property
    def nft_agent(self) -> DynamicNFTAgent:
        """Return the strongly-typed NFT agent."""

        return cast(DynamicNFTAgent, self.agent)

    def mint(self, owner: str, **kwargs: object) -> MintedDynamicNFT:
        """Convenience proxy to :meth:`DynamicNFTAgent.mint`."""

        return self.nft_agent.mint(owner, **kwargs)

    def publish_overview(self) -> str:
        """Generate and publish the latest NFT collection overview."""

        return self.publish_update()
