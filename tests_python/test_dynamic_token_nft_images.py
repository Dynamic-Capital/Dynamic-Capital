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
    NanoBananaClientError,
    NanoBananaImageGenerator,
    create_nanobanana_generator_from_env,
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


class ErrorSession:
    def __init__(self, *, exc: BaseException) -> None:
        self._exc = exc

    def post(self, *args: Any, **kwargs: Any) -> StubResponse:
        raise self._exc


class StubNanoBananaClient:
    def __init__(self, image: GeneratedNFTImage) -> None:
        self.image = image
        self.calls: list[dict[str, Any]] = []

    def generate_image(
        self,
        prompt: str,
        *,
        negative_prompt: str | None = None,
        aspect_ratio: str | None = None,
        seed: int | None = None,
        context: Mapping[str, Any] | None = None,
    ) -> GeneratedNFTImage:
        self.calls.append(
            {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "aspect_ratio": aspect_ratio,
                "seed": seed,
                "context": dict(context or {}),
            }
        )
        return self.image

    def close(self) -> None:
        pass


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


def test_nanobanana_image_generator_combines_context() -> None:
    image = GeneratedNFTImage(url="https://example.com/nft.png", prompt="prefixed")
    client = StubNanoBananaClient(image)
    generator = NanoBananaImageGenerator(
        client=client,
        prompt_prefix="Dynamic Capital",
        negative_prompt="blurry",
        aspect_ratio="4:3",
        seed=11,
        context_defaults={"style": "future"},
    )

    result = generator.generate("city skyline", context={"style": "override", "symbol": "DCT"})

    assert result is image
    call = client.calls[0]
    assert call["prompt"] == "Dynamic Capital city skyline"
    assert call["negative_prompt"] == "blurry"
    assert call["aspect_ratio"] == "4:3"
    assert call["seed"] == 11
    assert call["context"]["style"] == "override"
    assert call["context"]["symbol"] == "DCT"


def test_nanobanana_generator_from_env_requires_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NANOBANANA_API_KEY", raising=False)

    generator = create_nanobanana_generator_from_env(env={})

    assert generator is None


def test_nanobanana_generator_from_env_trims_values(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class CaptureGenerator:
        def __init__(self, **kwargs: Any) -> None:
            captured.update(kwargs)

    monkeypatch.setattr(
        "dynamic.platform.token.image.NanoBananaImageGenerator",
        CaptureGenerator,
    )

    context_defaults = {"style": "noir"}
    generator = create_nanobanana_generator_from_env(
        env={
            "NANOBANANA_API_KEY": "  key  ",
            "NANOBANANA_BASE_URL": " https://api.nanobanana.dev/  ",
            "NANOBANANA_PROMPT_PREFIX": "  Prefix  ",
            "NANOBANANA_NEGATIVE_PROMPT": "  blurry  ",
            "NANOBANANA_ASPECT_RATIO": " 21:9  ",
            "NANOBANANA_SEED": " 99 ",
        },
        context_defaults=context_defaults,
    )

    assert isinstance(generator, CaptureGenerator)
    assert captured["api_key"] == "key"
    assert captured["base_url"] == "https://api.nanobanana.dev"
    assert captured["prompt_prefix"] == "Prefix"
    assert captured["negative_prompt"] == "blurry"
    assert captured["aspect_ratio"] == "21:9"
    assert captured["seed"] == 99
    assert captured["context_defaults"] is context_defaults


def test_minter_auto_enables_environment_generator(monkeypatch: pytest.MonkeyPatch) -> None:
    stub_generator = StubImageGenerator()

    monkeypatch.setattr(
        "dynamic.platform.token.nft.create_nanobanana_generator_from_env",
        lambda: stub_generator,
    )

    minter = DynamicNFTMinter("dct")
    minter.mint("0xabc", image_prompt="skyline")

    assert stub_generator.calls


@pytest.mark.parametrize("prompt", [None, "   "])
def test_invalid_prompt_is_rejected(prompt: str | None) -> None:
    client = NanoBananaClient(session=StubSession(StubResponse({"image_url": "https://example"})))
    with pytest.raises(ValueError):
        client.generate_image(prompt)  # type: ignore[arg-type]


def test_nanobanana_client_rejects_non_mapping_context() -> None:
    client = NanoBananaClient(session=StubSession(StubResponse({"image_url": "https://example"})))

    with pytest.raises(TypeError):
        client.generate_image("prompt", context=[("key", "value")])  # type: ignore[arg-type]


def test_nanobanana_image_generator_requires_mapping_context() -> None:
    image = GeneratedNFTImage(url="https://example.com/nft.png", prompt="prefixed")
    generator = NanoBananaImageGenerator(client=StubNanoBananaClient(image))

    with pytest.raises(TypeError):
        generator.generate("prompt", context=[("key", "value")])  # type: ignore[arg-type]


def test_nanobanana_client_wraps_transport_errors() -> None:
    client = NanoBananaClient(session=ErrorSession(exc=RuntimeError("boom")))

    with pytest.raises(NanoBananaClientError):
        client.generate_image("prompt")


def test_nanobanana_client_wraps_error_responses() -> None:
    session = StubSession(StubResponse({"error": "nope"}, status_code=503))
    client = NanoBananaClient(session=session)

    with pytest.raises(NanoBananaClientError):
        client.generate_image("prompt")
