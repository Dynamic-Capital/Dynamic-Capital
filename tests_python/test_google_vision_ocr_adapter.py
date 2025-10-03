from __future__ import annotations

import importlib
import sys
import types
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Sequence

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

import dynamic_natural_language_processing.google_vision_ocr as google_vision_ocr_module
from dynamic_natural_language_processing.google_vision_ocr import (
    BoundingBox,
    DocumentOCRResult,
    GoogleVisionOCR,
    parse_document_blocks,
)


@dataclass
class _StubSymbol:
    text: str


@dataclass
class _StubWord:
    symbols: Sequence[_StubSymbol]
    confidence: float = 0.0


@dataclass
class _StubParagraph:
    words: Sequence[_StubWord]
    confidence: float = 0.0


@dataclass
class _StubVertex:
    x: int
    y: int


@dataclass
class _StubBlock:
    paragraphs: Sequence[_StubParagraph]
    bounding_box: Any
    confidence: float = 0.0


@dataclass
class _StubPage:
    blocks: Sequence[_StubBlock]


@dataclass
class _StubAnnotation:
    pages: Sequence[_StubPage]
    text: str = ""


class _StubResponse:
    def __init__(self, annotation: _StubAnnotation, message: str = "") -> None:
        self.full_text_annotation = annotation
        self.error = type("_Error", (), {"message": message})()


class _StubImage:
    def __init__(self) -> None:
        self.saved_path: Path | None = None

    def save(self, path: Path) -> None:
        self.saved_path = path


class _StubImageModule:
    def __init__(self) -> None:
        self.open_calls: list[bytes] = []
        self.last_image: _StubImage | None = None

    def open(self, source: Any) -> _StubImage:
        if hasattr(source, "getvalue"):
            data = source.getvalue()
        elif hasattr(source, "read"):
            data = source.read()
        else:
            data = source
        self.open_calls.append(data)
        self.last_image = _StubImage()
        return self.last_image


class _StubDrawInstance:
    def __init__(self) -> None:
        self.polygons: list[tuple[tuple[int, int], ...]] = []

    def polygon(self, points: Sequence[tuple[int, int]], *, outline: str) -> None:
        self.polygons.append(tuple(points))


class _StubDrawModule:
    def __init__(self) -> None:
        self.instances: list[_StubDrawInstance] = []

    def Draw(self, image: Any) -> _StubDrawInstance:
        instance = _StubDrawInstance()
        self.instances.append(instance)
        return instance


class _StubClient:
    def __init__(self, response: _StubResponse) -> None:
        self._response = response
        self.requests: list[tuple[bytes, Sequence[str] | None]] = []

    def document_text_detection(self, *, image: dict[str, bytes], image_context: dict[str, Sequence[str]] | None = None):
        self.requests.append((image["content"], image_context["language_hints"] if image_context else None))
        return self._response


def test_parse_document_blocks_flattens_nested_structure() -> None:
    annotation = _StubAnnotation(
        pages=[
            _StubPage(
                blocks=[
                    _StubBlock(
                        paragraphs=[
                            _StubParagraph(
                                words=[
                                    _StubWord(symbols=[_StubSymbol("Alpha")], confidence=0.9),
                                    _StubWord(symbols=[_StubSymbol("Beta")], confidence=0.9),
                                ],
                            )
                        ],
                        bounding_box=type(
                            "_BoundingBox",
                            (),
                            {
                                "vertices": [
                                    _StubVertex(0, 0),
                                    _StubVertex(10, 0),
                                    _StubVertex(10, 10),
                                    _StubVertex(0, 10),
                                ]
                            },
                        )(),
                        confidence=0.85,
                    )
                ]
            )
        ]
    )

    blocks = list(parse_document_blocks(annotation))
    assert len(blocks) == 1
    assert blocks[0].text == "Alpha Beta"
    assert blocks[0].confidence == pytest.approx(0.85)
    assert isinstance(blocks[0].bounding_box, BoundingBox)


def test_process_image_writes_text_and_returns_result(tmp_path: Path) -> None:
    annotation = _StubAnnotation(
        pages=[
            _StubPage(
                blocks=[
                    _StubBlock(
                        paragraphs=[
                            _StubParagraph(
                                words=[
                                    _StubWord(symbols=[_StubSymbol("Hello")], confidence=0.9),
                                    _StubWord(symbols=[_StubSymbol("World")], confidence=0.9),
                                ],
                            )
                        ],
                        bounding_box=type("_BoundingBox", (), {"vertices": [_StubVertex(0, 0)] * 4})(),
                        confidence=0.95,
                    )
                ]
            )
        ],
        text="Hello World",
    )
    response = _StubResponse(annotation)
    client = _StubClient(response)
    ocr = GoogleVisionOCR(
        language_hints=("dv",),
        client=client,
        image_factory=lambda content: {"content": content},
        image_context_factory=lambda hints: {"language_hints": list(hints)},
    )

    image_path = tmp_path / "image.bin"
    image_path.write_bytes(b"fake image bytes")
    text_path = tmp_path / "output.txt"

    result = ocr.process_image(image_path, output_text_path=text_path)

    assert isinstance(result, DocumentOCRResult)
    assert [block.text for block in result.blocks] == ["Hello World"]
    assert text_path.read_text(encoding="utf-8") == "Hello World"
    assert client.requests == [(b"fake image bytes", ["dv"])]


def test_process_image_requires_google_sdk_when_client_missing(tmp_path: Path) -> None:
    image_path = tmp_path / "image.bin"
    image_path.write_bytes(b"data")
    ocr = GoogleVisionOCR(language_hints=("dv",))

    with pytest.raises(RuntimeError, match="google-cloud-vision is required"):
        ocr.process_image(image_path)


def test_process_image_renders_bounding_boxes_without_reopening_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    bounding_box = type(
        "_BoundingBox",
        (),
        {
            "vertices": [
                _StubVertex(0, 0),
                _StubVertex(10, 0),
                _StubVertex(10, 10),
                _StubVertex(0, 10),
            ]
        },
    )()
    annotation = _StubAnnotation(
        pages=[
            _StubPage(
                blocks=[
                    _StubBlock(
                        paragraphs=[
                            _StubParagraph(
                                words=[_StubWord(symbols=[_StubSymbol("Text")])]
                            )
                        ],
                        bounding_box=bounding_box,
                        confidence=0.75,
                    )
                ]
            )
        ]
    )
    response = _StubResponse(annotation)
    client = _StubClient(response)

    image_module = _StubImageModule()
    draw_module = _StubDrawModule()
    monkeypatch.setattr(google_vision_ocr_module, "_PIL_MODULES", (image_module, draw_module))

    ocr = GoogleVisionOCR(
        client=client,
        image_factory=lambda content: {"content": content},
    )

    image_bytes = b"binary image contents"
    image_path = tmp_path / "image.bin"
    image_path.write_bytes(image_bytes)
    output_path = tmp_path / "output.png"

    ocr.process_image(image_path, output_image_path=output_path)

    assert image_module.open_calls == [image_bytes]
    assert image_module.last_image is not None
    assert image_module.last_image.saved_path == output_path
    assert draw_module.instances
    assert draw_module.instances[0].polygons == [
        (
            (0, 0),
            (10, 0),
            (10, 10),
            (0, 10),
        )
    ]


def test_process_image_reuses_cached_image_context_for_back_to_back_calls(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    annotation = _StubAnnotation(
        pages=[
            _StubPage(
                blocks=[
                    _StubBlock(
                        paragraphs=[
                            _StubParagraph(
                                words=[
                                    _StubWord(symbols=[_StubSymbol("One")]),
                                ]
                            )
                        ],
                        bounding_box=type("_BoundingBox", (), {"vertices": [_StubVertex(0, 0)] * 4})(),
                    )
                ]
            )
        ],
        text="One",
    )
    response = _StubResponse(annotation)

    class _StubVisionClient:
        def __init__(self) -> None:
            self.calls: list[tuple[Any, Any]] = []

        def document_text_detection(self, *, image: Any, image_context: Any | None = None) -> _StubResponse:
            self.calls.append((image, image_context))
            return response

    client = _StubVisionClient()
    context_calls: list[Any] = []

    vision_module = types.ModuleType("google.cloud.vision")
    vision_module.ImageAnnotatorClient = lambda: client
    vision_module.Image = lambda content: {"content": content}

    def _stub_image_context(*, language_hints: list[str]) -> dict[str, list[str]]:
        context = {"language_hints": language_hints}
        context_calls.append(context)
        return context

    vision_module.ImageContext = _stub_image_context

    google_package = types.ModuleType("google")
    cloud_package = types.ModuleType("google.cloud")
    cloud_package.vision = vision_module
    google_package.cloud = cloud_package

    monkeypatch.setitem(sys.modules, "google", google_package)
    monkeypatch.setitem(sys.modules, "google.cloud", cloud_package)
    monkeypatch.setitem(sys.modules, "google.cloud.vision", vision_module)
    monkeypatch.setattr(google_vision_ocr_module, "_VISION_MODULE", None)

    ocr = GoogleVisionOCR(language_hints=("dv",))

    image_path = tmp_path / "image.bin"
    image_path.write_bytes(b"bytes")

    ocr.process_image(image_path)
    ocr.process_image(image_path)

    assert len(context_calls) == 1
    assert len(client.calls) == 2
    assert client.calls[0][1] is client.calls[1][1]


def test_render_bounding_boxes_reuses_cached_pillow_modules(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    annotation = _StubAnnotation(
        pages=[
            _StubPage(
                blocks=[
                    _StubBlock(
                        paragraphs=[_StubParagraph(words=[_StubWord(symbols=[_StubSymbol("Text")])])],
                        bounding_box=type("_BoundingBox", (), {"vertices": [_StubVertex(0, 0)] * 4})(),
                    )
                ]
            )
        ],
        text="Text",
    )
    response = _StubResponse(annotation)
    client = _StubClient(response)

    image_module = _StubImageModule()
    draw_module = _StubDrawModule()

    original_import_module = importlib.import_module
    load_counts: dict[str, int] = {"PIL.Image": 0, "PIL.ImageDraw": 0}

    def _stub_import_module(name: str, package: str | None = None) -> Any:
        if name in load_counts:
            load_counts[name] += 1
            return image_module if name == "PIL.Image" else draw_module
        return original_import_module(name, package)

    monkeypatch.setattr(importlib, "import_module", _stub_import_module)
    monkeypatch.setattr(google_vision_ocr_module, "_PIL_MODULES", None)

    ocr = GoogleVisionOCR(
        client=client,
        image_factory=lambda content: {"content": content},
    )

    image_path = tmp_path / "image.bin"
    image_path.write_bytes(b"image")
    output_path = tmp_path / "out.png"

    ocr.process_image(image_path, output_image_path=output_path)
    ocr.process_image(image_path, output_image_path=output_path)

    assert load_counts == {"PIL.Image": 1, "PIL.ImageDraw": 1}
    assert image_module.open_calls == [b"image", b"image"]
