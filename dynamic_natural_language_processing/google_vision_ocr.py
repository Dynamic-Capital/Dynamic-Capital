"""Utilities for working with Google Cloud Vision OCR results.

This module provides a small adapter around the `document_text_detection`
response structure returned by the Google Cloud Vision API. The official sample
implementation from `Sofwath/GoogleCloudVisionOCR` demonstrates a procedural
script that prints raw OCR output. The helpers below encapsulate that workflow
into a reusable class with type-safe dataclasses that are easy to unit test.

The utilities are deliberately written so they can be exercised without the
``google-cloud-vision`` or ``Pillow`` packages being installed. During testing
we inject lightweight stubs, while in production the adapters dynamically load
the optional dependencies when needed.
"""

from __future__ import annotations

import importlib
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Sequence


_VISION_MODULE: Any | None = None
_PIL_MODULES: tuple[Any, Any] | None = None


@dataclass(frozen=True)
class Vertex:
    """Represents a single vertex in image coordinates."""

    x: int
    y: int


@dataclass(frozen=True)
class BoundingBox:
    """A rectangular bounding box composed of four vertices."""

    vertices: tuple[Vertex, Vertex, Vertex, Vertex]

    def as_xy_tuples(self) -> tuple[tuple[int, int], tuple[int, int], tuple[int, int], tuple[int, int]]:
        """Return the polygon as ``(x, y)`` tuples suitable for drawing."""

        points = [(vertex.x, vertex.y) for vertex in self.vertices]
        return points[0], points[1], points[2], points[3]


@dataclass(frozen=True)
class DocumentBlock:
    """A block of OCR text along with its confidence and bounding box."""

    text: str
    confidence: float
    bounding_box: BoundingBox


@dataclass(frozen=True)
class DocumentOCRResult:
    """Aggregate OCR output for a processed image."""

    blocks: tuple[DocumentBlock, ...]
    full_text: str


def parse_document_blocks(annotation: Any) -> Iterator[DocumentBlock]:
    """Yield :class:`DocumentBlock` entries from a Vision annotation object.

    The Google Vision API nests OCR results as Pages → Blocks → Paragraphs →
    Words → Symbols. We flatten that structure into block-level summaries while
    preserving the block confidence score and bounding polygon.
    """

    pages: Iterable[Any] = getattr(annotation, "pages", []) or []
    for page in pages:
        blocks: Iterable[Any] = getattr(page, "blocks", []) or []
        for block in blocks:
            block_text_parts: list[str] = []
            paragraphs: Iterable[Any] = getattr(block, "paragraphs", []) or []
            for paragraph in paragraphs:
                words: Iterable[Any] = getattr(paragraph, "words", []) or []
                for word in words:
                    symbols: Iterable[Any] = getattr(word, "symbols", []) or []
                    symbol_text = "".join(str(getattr(symbol, "text", "")) for symbol in symbols)
                    if symbol_text:
                        block_text_parts.append(symbol_text)

            block_text = " ".join(block_text_parts).strip()
            confidence_raw = getattr(block, "confidence", 0.0)
            confidence = float(confidence_raw or 0.0)
            bounding_box = _normalize_bounding_box(getattr(block, "bounding_box", None))
            yield DocumentBlock(text=block_text, confidence=confidence, bounding_box=bounding_box)


def _normalize_bounding_box(bounding_box: Any) -> BoundingBox:
    """Convert a Vision bounding polygon into a :class:`BoundingBox`."""

    vertices: Iterable[Any] = getattr(bounding_box, "vertices", []) or []
    normalized_vertices: list[Vertex] = [
        Vertex(int(getattr(vertex, "x", 0) or 0), int(getattr(vertex, "y", 0) or 0))
        for vertex in vertices
    ]

    # Google Vision always returns four vertices, but we defensively pad or trim
    # to maintain the expected structure.
    while len(normalized_vertices) < 4:
        normalized_vertices.append(Vertex(0, 0))
    if len(normalized_vertices) > 4:
        normalized_vertices = normalized_vertices[:4]

    return BoundingBox(vertices=tuple(normalized_vertices))


class GoogleVisionOCR:
    """High-level helper for running Google Cloud Vision OCR.

    Parameters
    ----------
    language_hints:
        Optional sequence of BCP-47 language codes passed to the Vision API to
        improve OCR accuracy for specific scripts (for example, ``("dv",)`` for
        Thaana text).
    client:
        Pre-configured ``ImageAnnotatorClient`` instance. When omitted the
        client is constructed lazily the first time :meth:`process_image` is
        called.
    image_factory:
        Callable that receives raw bytes and returns the object passed to the
        ``document_text_detection`` call. This allows unit tests to inject
        lightweight stubs without the real Vision SDK.
    image_context_factory:
        Callable that receives the language hints and returns the ``image_context``
        argument for ``document_text_detection``. Defaults to creating a
        ``vision.ImageContext`` when the Vision SDK is available.
    """

    def __init__(
        self,
        language_hints: Sequence[str] | None = None,
        *,
        client: Any | None = None,
        image_factory: Callable[[bytes], Any] | None = None,
        image_context_factory: Callable[[Sequence[str]], Any] | None = None,
    ) -> None:
        self._language_hints = tuple(language_hints or ())
        self._client = client
        self._image_factory = image_factory
        self._image_context_factory = image_context_factory
        self._cached_image_context: Any | None = None

    def process_image(
        self,
        image_path: str | Path,
        *,
        output_text_path: str | Path | None = None,
        output_image_path: str | Path | None = None,
    ) -> DocumentOCRResult:
        """Run OCR on ``image_path`` and optionally persist artifacts."""

        client = self._ensure_client()
        path = Path(image_path)
        image_bytes = path.read_bytes()
        image = self._build_image(image_bytes)
        image_context = self._build_image_context()

        response = client.document_text_detection(image=image, image_context=image_context)
        _raise_for_error(response)

        annotation = getattr(response, "full_text_annotation", None)
        if annotation is None:
            blocks: tuple[DocumentBlock, ...] = ()
            full_text = ""
        else:
            blocks = tuple(parse_document_blocks(annotation))
            full_text = str(getattr(annotation, "text", "")).strip()
            if not full_text:
                full_text = "\n".join(block.text for block in blocks if block.text)

        if output_text_path:
            Path(output_text_path).write_text(full_text, encoding="utf-8")

        if output_image_path and blocks:
            self._render_bounding_boxes(image_bytes, blocks, Path(output_image_path))

        return DocumentOCRResult(blocks=blocks, full_text=full_text)

    def _ensure_client(self) -> Any:
        if self._client is not None:
            return self._client

        vision_module = _load_google_vision()
        self._client = vision_module.ImageAnnotatorClient()
        return self._client

    def _build_image(self, image_bytes: bytes) -> Any:
        if self._image_factory is not None:
            return self._image_factory(image_bytes)

        vision_module = _load_google_vision()
        return vision_module.Image(content=image_bytes)

    def _build_image_context(self) -> Any | None:
        if not self._language_hints:
            return None

        if self._image_context_factory is not None:
            return self._image_context_factory(self._language_hints)

        if self._cached_image_context is None:
            vision_module = _load_google_vision()
            self._cached_image_context = vision_module.ImageContext(
                language_hints=list(self._language_hints)
            )
        return self._cached_image_context

    def _render_bounding_boxes(
        self,
        image_bytes: bytes,
        blocks: Sequence[DocumentBlock],
        output_path: Path,
    ) -> None:
        image_module, draw_module = _load_pillow()
        image = image_module.open(BytesIO(image_bytes))
        draw = draw_module.Draw(image)

        for block in blocks:
            draw.polygon(list(block.bounding_box.as_xy_tuples()), outline="green")

        image.save(output_path)


def _raise_for_error(response: Any) -> None:
    error = getattr(response, "error", None)
    message = getattr(error, "message", "") if error else ""
    if message:
        raise RuntimeError(f"Google Vision OCR request failed: {message}")


def _load_google_vision() -> Any:
    global _VISION_MODULE
    if _VISION_MODULE is not None:
        return _VISION_MODULE

    try:
        module = importlib.import_module("google.cloud.vision")
    except ModuleNotFoundError as error:  # pragma: no cover - exercised in tests
        raise RuntimeError(
            "google-cloud-vision is required for OCR processing. Install the package "
            "with 'pip install google-cloud-vision'."
        ) from error

    _VISION_MODULE = module
    return module


def _load_pillow() -> tuple[Any, Any]:
    global _PIL_MODULES
    if _PIL_MODULES is not None:
        return _PIL_MODULES

    try:
        image = importlib.import_module("PIL.Image")
        draw = importlib.import_module("PIL.ImageDraw")
    except ModuleNotFoundError as error:  # pragma: no cover - optional dependency
        raise RuntimeError(
            "Pillow is required to render OCR bounding boxes. Install it with 'pip install Pillow'."
        ) from error
    _PIL_MODULES = (image, draw)
    return _PIL_MODULES


__all__ = [
    "BoundingBox",
    "DocumentBlock",
    "DocumentOCRResult",
    "GoogleVisionOCR",
    "Vertex",
    "parse_document_blocks",
]

