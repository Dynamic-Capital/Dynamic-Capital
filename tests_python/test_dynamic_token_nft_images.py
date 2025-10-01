"""Tests for dynamic NFT image generation integrations."""

from __future__ import annotations

from pathlib import Path
import sys
from typing import Any, Mapping

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic.platform.token import (
    DynamicNFTMinter,
    GeneratedNFTImage,
    NanoBananaClient,
)


class StubImageGenerator:
    def __init__(self, *, image: GeneratedNFTImage | None = None, should_fail: bool = False) -> None:
        self.image = image or GeneratedNFTImage(
            url="https://example.com/nft.png",
            prompt="default",
            mime_type="image/png",
            seed=7,
            metadata={"style": "futuristic"},
        )
        self.should_fail = should_fail
        self.calls: list[tuple[str, Mapping[str, Any] | None]] = []

    def generate(self, prompt: str, *, context: Mapping[str, Any] | None = None) -> GeneratedNFTImage:
        self.calls.append((prompt, context))
        if self.should_fail:
            raise RuntimeError("generation failed")
        return self.image


class StubResponse:
    def __init__(self, payload: Mapping[str, Any], *, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.headers: Mapping[str, Any] = {}

    def raise_for_status(self) -> None:
        if self.status_code >= 400:
            raise RuntimeError("error response")

    def json(self) -> Mapping[str, Any]:
        return self._payload


class StubSession:
    def __init__(self, response: StubResponse) -> None:
        self._response = response
        self.calls: list[dict[str, Any]] = []

    def post(self, url: str, *, json: Mapping[str, Any], headers: Mapping[str, str], timeout: float) -> StubResponse:
        self.calls.append({"url": url, "json": json, "headers": headers, "timeout": timeout})
        return self._response


def test_mint_includes_generated_image_metadata() -> None:
    generator = StubImageGenerator()
    minter = DynamicNFTMinter("dct", image_generator=generator)

    nft = minter.mint(
        "0xabc",
        analysis={"action": "buy"},
        tags=("alpha",),
        image_prompt="Dynamic capital skyline",
    )

    assert nft.metadata["image"] == "https://example.com/nft.png"
    properties = nft.metadata.get("properties")
    assert isinstance(properties, dict)
    image_properties = properties.get("image")
    assert image_properties["url"] == "https://example.com/nft.png"
    assert image_properties["prompt"] == "default"
    assert image_properties["provider"] == "Nano Banana AI"
    assert image_properties["seed"] == 7
    assert image_properties["extra"]["style"] == "futuristic"

    call_prompt, call_context = generator.calls[0]
    assert call_prompt == "Dynamic capital skyline"
    assert call_context["symbol"] == "DCT"
    assert call_context["analysis"]["action"] == "buy"
    assert call_context["tags"] == ["alpha"]


def test_refresh_metadata_replaces_existing_image() -> None:
    generator = StubImageGenerator(
        image=GeneratedNFTImage(
            url="https://example.com/updated.png",
            prompt="updated",
            metadata={},
        )
    )
    minter = DynamicNFTMinter("dct", image_generator=generator)
    nft = minter.mint("0xabc", image_prompt="initial")

    refreshed = minter.refresh_metadata(
        nft.token_id,
        image_prompt="renewed",
        image_context={"cycle": "morning"},
    )

    assert refreshed["image"] == "https://example.com/updated.png"
    properties = refreshed.get("properties")
    assert properties["image"]["prompt"] == "updated"
    assert generator.calls[-1][0] == "renewed"
    assert generator.calls[-1][1]["cycle"] == "morning"


def test_image_generation_failure_is_non_fatal() -> None:
    generator = StubImageGenerator(should_fail=True)
    minter = DynamicNFTMinter("dct", image_generator=generator)

    nft = minter.mint("0xabc", image_prompt="unstable")
    assert "image" not in nft.metadata
    assert "properties" not in nft.metadata


def test_nanobanana_client_normalises_nested_payload() -> None:
    payload = {
        "id": "req-123",
        "data": [
            {
                "image_url": "https://cdn.nanobanana.local/art.png",
                "mime_type": "image/png",
                "seed": "42",
                "style": "digital",
            }
        ],
    }
    session = StubSession(StubResponse(payload))
    client = NanoBananaClient(
        api_key="secret",
        base_url="https://nanobananaai.org/api/generate",
        session=session,
    )

    result = client.generate_image(
        "Dynamic capital token artwork",
        aspect_ratio="16:9",
        context={"symbol": "DCT"},
    )

    assert result.url == "https://cdn.nanobanana.local/art.png"
    assert result.mime_type == "image/png"
    assert result.seed == 42
    assert result.metadata["style"] == "digital"
    assert result.metadata["id"] == "req-123"

    call = session.calls[0]
    assert call["headers"]["Authorization"] == "Bearer secret"
    assert call["json"]["aspect_ratio"] == "16:9"
    assert call["json"]["context"]["symbol"] == "DCT"


@pytest.mark.parametrize("prompt", [None, "   "])
def test_invalid_prompt_is_rejected(prompt: str | None) -> None:
    client = NanoBananaClient(session=StubSession(StubResponse({"image_url": "https://example"})))
    with pytest.raises(ValueError):
        client.generate_image(prompt)  # type: ignore[arg-type]
