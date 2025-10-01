"""Pipeline that turns imagery into ASCII-driven dynamic NFTs."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, MutableMapping, Protocol, Sequence

from dynamic_ascii.engine import (
    AsciiNFT,
    DynamicAsciiEngine,
)
from dynamic.platform.token.nft import DynamicNFTMinter, MintedDynamicNFT

__all__ = [
    "AsciiDynamicNFTContext",
    "AsciiDynamicNFTPipeline",
    "IntelligenceOracle",
    "MintPricingEngine",
    "MentorshipDashboard",
    "TelegramNotifier",
]


class IntelligenceOracle(Protocol):
    """Produce an intelligence context for an ASCII-derived NFT."""

    def evaluate(self, nft: AsciiNFT) -> Mapping[str, Any]:
        """Return structured intelligence metadata for *nft*."""


class MintPricingEngine(Protocol):
    """Quote pricing signals for NFT minting flows."""

    def quote(self, intelligence: Mapping[str, Any]) -> float:
        """Return the mint cost based on *intelligence* context."""


class TelegramNotifier(Protocol):
    """Surface pipeline events to Telegram audiences."""

    def send_ascii_nft(
        self,
        chat_id: str,
        *,
        ascii_art: str,
        metadata: Mapping[str, Any],
    ) -> None:
        """Notify *chat_id* about a freshly minted ASCII NFT."""


class MentorshipDashboard(Protocol):
    """Persist mentorship achievements linked to NFTs."""

    def record_nft(
        self,
        nft: MintedDynamicNFT,
        *,
        intelligence: Mapping[str, Any],
    ) -> None:
        """Store the minted *nft* details alongside intelligence context."""


@dataclass(slots=True)
class AsciiDynamicNFTContext:
    """Result payload produced by :class:`AsciiDynamicNFTPipeline`."""

    ascii_nft: AsciiNFT
    minted: MintedDynamicNFT
    intelligence: Mapping[str, Any]
    mint_price: float


class AsciiDynamicNFTPipeline:
    """Co-ordinate ASCII conversion, NFT minting, and ecosystem sync."""

    def __init__(
        self,
        *,
        ascii_engine: DynamicAsciiEngine | None = None,
        minter: DynamicNFTMinter | None = None,
        oracle: IntelligenceOracle | None = None,
        pricing_engine: MintPricingEngine | None = None,
        telegram_notifier: TelegramNotifier | None = None,
        mentorship_dashboard: MentorshipDashboard | None = None,
    ) -> None:
        self._ascii_engine = ascii_engine or DynamicAsciiEngine()
        self._minter = minter or DynamicNFTMinter("DCT")
        self._oracle = oracle
        self._pricing_engine = pricing_engine
        self._telegram_notifier = telegram_notifier
        self._mentorship_dashboard = mentorship_dashboard

    def execute(
        self,
        image: Sequence[Sequence[float]]
        | Sequence[Sequence[int]]
        | str
        | bytes
        | Any,
        *,
        owner: str,
        name: str,
        description: str,
        chat_id: str | None = None,
        width: int | None = None,
        tags: Sequence[str] | None = None,
        analysis: Mapping[str, Any] | None = None,
        extra_attributes: Mapping[str, Any] | None = None,
    ) -> AsciiDynamicNFTContext:
        """Run the full pipeline returning minted NFT context."""

        ascii_nft = self._ascii_engine.create_nft(
            image,
            name=name,
            description=description,
            width=width,
        )

        intelligence: Mapping[str, Any]
        if self._oracle is None:
            intelligence = {}
        else:
            intelligence = dict(self._oracle.evaluate(ascii_nft))

        mint_price = (
            float(self._pricing_engine.quote(intelligence))
            if self._pricing_engine is not None
            else 0.0
        )

        pipeline_metadata: MutableMapping[str, Any] = {
            "ascii_fingerprint": ascii_nft.fingerprint,
            "ascii_preview": ascii_nft.ascii_art.as_text(),
            "intelligence": intelligence,
            "mint_price": mint_price,
        }
        if extra_attributes:
            pipeline_metadata.update(dict(extra_attributes))

        minted = self._minter.mint(
            owner,
            analysis=analysis,
            tags=tags,
            extra=pipeline_metadata,
        )

        if self._mentorship_dashboard is not None:
            self._mentorship_dashboard.record_nft(
                minted, intelligence=intelligence
            )

        if self._telegram_notifier is not None and chat_id:
            self._telegram_notifier.send_ascii_nft(
                chat_id,
                ascii_art=ascii_nft.ascii_art.as_text(),
                metadata=minted.metadata,
            )

        return AsciiDynamicNFTContext(
            ascii_nft=ascii_nft,
            minted=minted,
            intelligence=intelligence,
            mint_price=mint_price,
        )

