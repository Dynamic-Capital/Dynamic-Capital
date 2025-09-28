"""Dynamic ASCII engine for generating collectible-friendly art."""

from __future__ import annotations

from dataclasses import dataclass, field
from hashlib import sha256
from io import BytesIO
from pathlib import Path
from typing import BinaryIO, Mapping, MutableMapping, Sequence

__all__ = [
    "AsciiPalette",
    "AsciiCanvas",
    "AsciiNFT",
    "AsciiConversionError",
    "DynamicAsciiEngine",
    "DEFAULT_ASCII_PALETTE",
]


class AsciiConversionError(RuntimeError):
    """Raised when an ASCII rendering operation cannot be completed."""


@dataclass(frozen=True, slots=True)
class AsciiPalette:
    """Mapping between intensity values and printable glyphs."""

    characters: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.characters:
            raise ValueError("characters must not be empty")
        normalised: list[str] = []
        for char in self.characters:
            if not isinstance(char, str):  # pragma: no cover - defensive guard
                raise TypeError("palette entries must be strings")
            cleaned = char.strip("\n\r")
            if not cleaned:
                raise ValueError("palette entries must contain printable characters")
            normalised.append(cleaned)
        object.__setattr__(self, "characters", tuple(normalised))

    def map_intensity(self, value: float) -> str:
        """Return the glyph that best represents *value* in the palette."""

        clamped = max(0.0, min(1.0, float(value)))
        if len(self.characters) == 1:
            return self.characters[0]
        index = int(clamped * (len(self.characters) - 1) + 0.5)
        return self.characters[min(index, len(self.characters) - 1)]

    def __len__(self) -> int:
        return len(self.characters)


DEFAULT_ASCII_PALETTE = AsciiPalette(tuple(" .:-=+*#%@"))


@dataclass(slots=True)
class AsciiCanvas:
    """Immutable ASCII canvas representing rendered art."""

    width: int
    height: int
    rows: tuple[str, ...]
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise ValueError("width and height must be positive")
        if len(self.rows) != self.height:
            raise ValueError("rows length must match height")
        for row in self.rows:
            if len(row) != self.width:
                raise ValueError("all rows must have width characters")
        if not isinstance(self.metadata, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("metadata must be a mapping")

    def as_text(self) -> str:
        return "\n".join(self.rows)


@dataclass(slots=True)
class AsciiNFT:
    """Representation of an ASCII-based NFT collectible."""

    title: str
    description: str
    ascii_art: AsciiCanvas
    fingerprint: str
    attributes: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.title:
            raise ValueError("title must not be empty")
        if not self.description:
            raise ValueError("description must not be empty")
        if not self.fingerprint:
            raise ValueError("fingerprint must not be empty")
        if not isinstance(self.attributes, Mapping):  # pragma: no cover - defensive guard
            raise TypeError("attributes must be a mapping")

    def as_metadata(self) -> Mapping[str, object]:
        """Return a serialisable metadata representation."""

        payload: MutableMapping[str, object] = {
            "name": self.title,
            "description": self.description,
            "image": self.ascii_art.as_text(),
            "hash": self.fingerprint,
        }
        if self.attributes:
            payload["attributes"] = dict(self.attributes)
        return payload


class DynamicAsciiEngine:
    """Engine for transforming imagery into ASCII art collectibles."""

    def __init__(
        self,
        palette: AsciiPalette | None = None,
        *,
        height_scale: float = 0.55,
    ) -> None:
        if height_scale <= 0:
            raise ValueError("height_scale must be positive")
        self.palette = palette or DEFAULT_ASCII_PALETTE
        self.height_scale = float(height_scale)

    def render_ascii(
        self,
        image: Sequence[Sequence[float]] | Sequence[Sequence[int]] | str | Path | BinaryIO | bytes,
        *,
        width: int | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> AsciiCanvas:
        """Render *image* into an :class:`AsciiCanvas`."""

        pixel_matrix = self._load_pixels(image)
        source_height = len(pixel_matrix)
        if source_height == 0:
            raise AsciiConversionError("image must contain at least one row")
        source_width = len(pixel_matrix[0])
        if source_width == 0:
            raise AsciiConversionError("image must contain at least one column")
        if width is None:
            target_width = source_width
        else:
            target_width = int(width)
        if target_width <= 0:
            raise ValueError("width must be positive")
        aspect_ratio = source_height / source_width
        target_height = max(1, int(round(target_width * aspect_ratio * self.height_scale)))
        resized = self._resize_pixels(pixel_matrix, target_width, target_height)
        rows = tuple(
            "".join(self.palette.map_intensity(value) for value in row)
            for row in resized
        )
        canvas_metadata: dict[str, object] = {
            "source_width": source_width,
            "source_height": source_height,
            "palette": "".join(self.palette.characters),
        }
        if metadata:
            canvas_metadata.update(dict(metadata))
        return AsciiCanvas(
            width=target_width,
            height=len(rows),
            rows=rows,
            metadata=canvas_metadata,
        )

    def create_nft(
        self,
        image: Sequence[Sequence[float]] | Sequence[Sequence[int]] | str | Path | BinaryIO | bytes,
        *,
        name: str,
        description: str,
        width: int | None = None,
        attributes: Mapping[str, object] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> AsciiNFT:
        """Create an :class:`AsciiNFT` from *image*."""

        canvas = self.render_ascii(image, width=width, metadata=metadata)
        ascii_payload = canvas.as_text().encode("utf-8")
        digest = sha256(ascii_payload).hexdigest()
        merged_attributes: dict[str, object] = {
            "width": canvas.width,
            "height": canvas.height,
            "palette_size": len(self.palette),
        }
        if attributes:
            merged_attributes.update(dict(attributes))
        return AsciiNFT(
            title=name,
            description=description,
            ascii_art=canvas,
            fingerprint=digest,
            attributes=merged_attributes,
        )

    # ------------------------------------------------------------------
    # internal helpers

    def _load_pixels(
        self,
        image: Sequence[Sequence[float]] | Sequence[Sequence[int]] | str | Path | BinaryIO | bytes,
    ) -> list[list[float]]:
        if isinstance(image, (str, Path)):
            return self._load_from_pillow(Path(image))
        if isinstance(image, bytes):
            return self._load_from_pillow(BytesIO(image))
        if hasattr(image, "read") and callable(image.read):  # BinaryIO protocol
            return self._load_from_pillow(image)  # type: ignore[arg-type]
        if self._looks_like_matrix(image):
            return self._normalise_matrix(image)  # type: ignore[arg-type]
        # Pillow Image instance support
        pil_image = getattr(image, "convert", None)
        if callable(pil_image):
            return self._load_from_pillow(image)
        raise AsciiConversionError("unsupported image type for ASCII conversion")

    def _looks_like_matrix(
        self, value: Sequence[Sequence[float]] | Sequence[Sequence[int]]
    ) -> bool:
        if not isinstance(value, Sequence):
            return False
        if not value:
            return False
        first = value[0]
        if not isinstance(first, Sequence):
            return False
        return True

    def _normalise_matrix(
        self, matrix: Sequence[Sequence[float]] | Sequence[Sequence[int]]
    ) -> list[list[float]]:
        width: int | None = None
        normalised: list[list[float]] = []
        for row in matrix:
            if not isinstance(row, Sequence):
                raise AsciiConversionError("rows must be sequences")
            if width is None:
                width = len(row)
                if width == 0:
                    raise AsciiConversionError("rows must contain values")
            elif len(row) != width:
                raise AsciiConversionError("rows must be of equal length")
            normalised_row: list[float] = []
            for value in row:
                normalised_row.append(self._clamp(float(value)))
            normalised.append(normalised_row)
        return normalised

    def _load_from_pillow(self, source: Path | BinaryIO | object) -> list[list[float]]:
        try:
            from PIL import Image
        except ImportError as exc:  # pragma: no cover - optional dependency
            raise AsciiConversionError(
                "Pillow is required to load image sources"
            ) from exc
        try:
            if isinstance(source, Path):
                with Image.open(source) as img:
                    return self._image_to_matrix(img)
            if hasattr(source, "seek"):
                pos = source.seek(0, 1)  # type: ignore[arg-type]
            else:
                pos = None
            image = Image.open(source)
            try:
                return self._image_to_matrix(image)
            finally:
                image.close()
                if pos is not None and hasattr(source, "seek"):
                    source.seek(pos)  # type: ignore[arg-type]
        except FileNotFoundError as exc:
            raise AsciiConversionError("image path could not be found") from exc
        except OSError as exc:
            raise AsciiConversionError("failed to decode image") from exc

    def _image_to_matrix(self, image: object) -> list[list[float]]:
        convert = getattr(image, "convert")
        gray = convert("L")
        width, height = gray.size
        pixels = list(gray.getdata())
        matrix: list[list[float]] = []
        for y in range(height):
            row = pixels[y * width : (y + 1) * width]
            matrix.append([self._clamp(float(value)) for value in row])
        return matrix

    def _resize_pixels(
        self, matrix: Sequence[Sequence[float]], width: int, height: int
    ) -> list[list[float]]:
        source_height = len(matrix)
        source_width = len(matrix[0])
        if source_height == height and source_width == width:
            return [list(row) for row in matrix]
        scale_x = source_width / width
        scale_y = source_height / height
        resized: list[list[float]] = []
        for y in range(height):
            source_y = min(int(y * scale_y), source_height - 1)
            row: list[float] = []
            for x in range(width):
                source_x = min(int(x * scale_x), source_width - 1)
                row.append(matrix[source_y][source_x])
            resized.append(row)
        return resized

    @staticmethod
    def _clamp(value: float) -> float:
        if value <= 0.0:
            return 0.0
        if value >= 255.0:
            return 1.0
        return value / 255.0
