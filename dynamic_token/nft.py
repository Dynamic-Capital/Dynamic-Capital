"""Dynamic NFT utilities for trading intelligence snapshots."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Mapping, MutableMapping, Protocol, Sequence

try:  # pragma: no cover - exercised indirectly when dependency is available
    from dynamic_algo.dynamic_metadata import (  # type: ignore
        DynamicMetadataAlgo as _DynamicMetadataAlgo,
    )
except Exception:  # pragma: no cover - fallback path for isolated test runs
    _DynamicMetadataAlgo = None

from .image import GeneratedNFTImage


class NFTImageGenerator(Protocol):
    """Protocol for image generators used by :class:`DynamicNFTMinter`."""

    def generate(
        self,
        prompt: str,
        *,
        context: Mapping[str, Any] | None = None,
    ) -> GeneratedNFTImage:
        ...


def _coerce_timestamp(value: datetime | str | None) -> datetime:
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


def _coerce_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


class _FallbackDynamicMetadataAlgo:
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
        flow: Mapping[str, Any] | None = None,
        pool: Mapping[str, Any] | None = None,
        risk: Mapping[str, Any] | None = None,
        tags: Sequence[str] | None = None,
        extra: Mapping[str, Any] | None = None,
        timestamp: datetime | str | None = None,
    ) -> MutableMapping[str, Any]:
        iso_timestamp = _coerce_timestamp(timestamp).isoformat()
        symbol_upper = symbol.upper()

        attributes: list[MutableMapping[str, Any]] = []
        if analysis:
            action = str(analysis.get("action", "")).upper() or "NEUTRAL"
            attributes.append({"trait_type": "AI Action", "value": action})

            confidence = _coerce_float(analysis.get("confidence"))
            if confidence is not None:
                attributes.append(
                    {
                        "trait_type": "AI Confidence",
                        "value": round(max(0.0, min(1.0, confidence)), 4),
                        "display_type": "number",
                    }
                )

        payload: MutableMapping[str, Any] = {
            "name": f"{symbol_upper} dynamic intelligence snapshot",
            "symbol": symbol_upper,
            "description": f"Dynamic intelligence snapshot for {symbol_upper}.",
            "timestamp": iso_timestamp,
            "attributes": attributes[: self.max_attributes],
            "scores": {},
            "tags": list(tags or []),
            "sources": {
                "analysis": analysis is not None,
                "market_flow": flow is not None,
                "pool": pool is not None,
                "risk": risk is not None,
            },
        }

        if extra:
            for key, value in extra.items():
                if key not in self.RESERVED_KEYS:
                    payload[key] = value

        return payload


DynamicMetadataAlgo = (
    _DynamicMetadataAlgo if _DynamicMetadataAlgo is not None else _FallbackDynamicMetadataAlgo
)

__all__ = ["MintedDynamicNFT", "DynamicNFTMinter", "NFTImageGenerator"]


@dataclass(slots=True)
class MintedDynamicNFT:
    """In-memory representation of a freshly minted dynamic NFT."""

    token_id: int
    owner: str
    metadata: MutableMapping[str, Any]
    minted_at: datetime

    def as_dict(self) -> MutableMapping[str, Any]:
        """Return a serialisable dictionary for off-chain persistence."""

        payload: MutableMapping[str, Any] = {
            "token_id": self.token_id,
            "owner": self.owner,
            "minted_at": self.minted_at.isoformat(),
            "metadata": self.metadata,
        }
        return payload


class DynamicNFTMinter:
    """Produce metadata-backed NFTs that evolve with market telemetry."""

    def __init__(
        self,
        symbol: str,
        *,
        metadata_algo: DynamicMetadataAlgo | None = None,
        image_generator: NFTImageGenerator | None = None,
    ) -> None:
        if not isinstance(symbol, str) or not symbol.strip():
            raise ValueError("symbol must be a non-empty string")

        self.symbol = symbol.upper()
        self._metadata_algo = metadata_algo or DynamicMetadataAlgo()
        self._image_generator = image_generator
        self._next_token_id = 1
        self._tokens: dict[int, MintedDynamicNFT] = {}

    def _build_image_context(
        self,
        *,
        analysis: Mapping[str, Any] | None,
        flow: Mapping[str, Any] | None,
        pool: Mapping[str, Any] | None,
        risk: Mapping[str, Any] | None,
        tags: Sequence[str] | None,
        extra: Mapping[str, Any] | None,
        timestamp: Any,
        overrides: Mapping[str, Any] | None,
    ) -> MutableMapping[str, Any]:
        context: MutableMapping[str, Any] = {"symbol": self.symbol}
        if timestamp is not None:
            context["timestamp"] = timestamp

        if analysis:
            context["analysis"] = dict(analysis)
        if flow:
            context["flow"] = dict(flow)
        if pool:
            context["pool"] = dict(pool)
        if risk:
            context["risk"] = dict(risk)
        if tags:
            context["tags"] = list(tags)
        if extra:
            context["extra"] = dict(extra)

        if overrides:
            for key, value in overrides.items():
                context[key] = value

        return context

    def _maybe_attach_image(
        self,
        metadata: MutableMapping[str, Any],
        *,
        prompt: str | None,
        context: Mapping[str, Any] | None,
    ) -> None:
        if self._image_generator is None or prompt is None:
            return
        prompt_value = prompt.strip() if isinstance(prompt, str) else ""
        if not prompt_value:
            return

        try:
            generated = self._image_generator.generate(prompt_value, context=context)
        except Exception:  # pragma: no cover - defensive safety net around integrations
            return

        metadata["image"] = generated.url
        properties = metadata.get("properties")
        if not isinstance(properties, MutableMapping):
            properties = {}
            metadata["properties"] = properties

        image_payload = generated.as_metadata()
        image_payload.setdefault("provider", "Nano Banana AI")
        properties["image"] = image_payload

    def mint(
        self,
        owner: str,
        *,
        analysis: Mapping[str, Any] | None = None,
        flow: Mapping[str, Any] | None = None,
        pool: Mapping[str, Any] | None = None,
        risk: Mapping[str, Any] | None = None,
        tags: Sequence[str] | None = None,
        extra: Mapping[str, Any] | None = None,
        timestamp: datetime | str | None = None,
        image_prompt: str | None = None,
        image_context: Mapping[str, Any] | None = None,
    ) -> MintedDynamicNFT:
        """Mint a new NFT with metadata snapshot of the current context."""

        if not isinstance(owner, str) or not owner.strip():
            raise ValueError("owner must be a non-empty string")

        token_id = self._next_token_id
        self._next_token_id += 1

        minted_at = datetime.now(timezone.utc)
        metadata = self._metadata_algo.build(
            symbol=self.symbol,
            analysis=analysis,
            flow=flow,
            pool=pool,
            risk=risk,
            tags=tags,
            extra=extra,
            timestamp=timestamp or minted_at,
        )

        media_context = None
        if self._image_generator is not None:
            media_context = self._build_image_context(
                analysis=analysis,
                flow=flow,
                pool=pool,
                risk=risk,
                tags=tags,
                extra=extra,
                timestamp=metadata.get("timestamp"),
                overrides=image_context,
            )
        self._maybe_attach_image(
            metadata,
            prompt=image_prompt,
            context=media_context,
        )

        nft = MintedDynamicNFT(
            token_id=token_id,
            owner=owner,
            metadata=metadata,
            minted_at=minted_at,
        )
        self._tokens[token_id] = nft
        return nft

    def refresh_metadata(
        self,
        token_id: int,
        *,
        analysis: Mapping[str, Any] | None = None,
        flow: Mapping[str, Any] | None = None,
        pool: Mapping[str, Any] | None = None,
        risk: Mapping[str, Any] | None = None,
        tags: Sequence[str] | None = None,
        extra: Mapping[str, Any] | None = None,
        timestamp: datetime | str | None = None,
        image_prompt: str | None = None,
        image_context: Mapping[str, Any] | None = None,
    ) -> MutableMapping[str, Any]:
        """Regenerate metadata for an existing NFT using fresh telemetry."""

        nft = self._tokens.get(int(token_id))
        if nft is None:
            raise KeyError(f"Unknown token_id {token_id}")

        metadata = self._metadata_algo.build(
            symbol=self.symbol,
            analysis=analysis,
            flow=flow,
            pool=pool,
            risk=risk,
            tags=tags,
            extra=extra,
            timestamp=timestamp,
        )
        media_context = None
        if self._image_generator is not None:
            media_context = self._build_image_context(
                analysis=analysis,
                flow=flow,
                pool=pool,
                risk=risk,
                tags=tags,
                extra=extra,
                timestamp=metadata.get("timestamp"),
                overrides=image_context,
            )
        self._maybe_attach_image(
            metadata,
            prompt=image_prompt,
            context=media_context,
        )
        nft.metadata = metadata
        return metadata

    def transfer(self, token_id: int, new_owner: str) -> MintedDynamicNFT:
        """Transfer ownership of a minted NFT."""

        if not isinstance(new_owner, str) or not new_owner.strip():
            raise ValueError("new_owner must be a non-empty string")

        nft = self._tokens.get(int(token_id))
        if nft is None:
            raise KeyError(f"Unknown token_id {token_id}")

        nft.owner = new_owner
        return nft

    def get(self, token_id: int) -> MintedDynamicNFT:
        """Return a minted NFT by ``token_id``."""

        nft = self._tokens.get(int(token_id))
        if nft is None:
            raise KeyError(f"Unknown token_id {token_id}")
        return nft

    def all_tokens(self) -> list[MintedDynamicNFT]:
        """Return all minted NFTs ordered by ``token_id``."""

        return [self._tokens[key] for key in sorted(self._tokens)]
