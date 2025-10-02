"""Tools for composing dynamic transformer architectures."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "TransformerEmbeddingConfig",
    "TransformerBlockSpec",
    "TransformerArchitecture",
    "DynamicTransformerBuilder",
    "build_transformer_architecture",
]


# ---------------------------------------------------------------------------
# core dataclasses


def _normalise_name(value: str | None, *, fallback: str = "dynamic-transformer") -> str:
    text = (value or "").strip()
    text = " ".join(text.split())
    return text or fallback


def _round_to_multiple(value: float, multiple: int) -> int:
    if multiple <= 0:
        raise ValueError("multiple must be positive")
    rounded = int(round(value))
    if rounded <= 0:
        rounded = multiple
    remainder = rounded % multiple
    if remainder:
        rounded += multiple - remainder
    return max(multiple, rounded)


@dataclass(slots=True, frozen=True)
class TransformerEmbeddingConfig:
    """Describes the embedding stack for a transformer."""

    model_dim: int
    vocab_size: int
    max_position_embeddings: int
    dropout: float = 0.0
    layer_norm: bool = True

    def __post_init__(self) -> None:  # pragma: no cover - trivial guard
        if self.model_dim <= 0:
            raise ValueError("model_dim must be positive")
        if self.vocab_size <= 0:
            raise ValueError("vocab_size must be positive")
        if self.max_position_embeddings <= 0:
            raise ValueError("max_position_embeddings must be positive")
        if not 0.0 <= self.dropout < 1.0:
            raise ValueError("dropout must be in the range [0, 1)")


@dataclass(slots=True, frozen=True)
class TransformerBlockSpec:
    """Specification of a single transformer block."""

    index: int
    model_dim: int
    num_heads: int
    feedforward_dim: int
    head_dim: int
    dropout: float = 0.0
    attention_dropout: float = 0.0
    activation: str = "gelu"
    normalization: str = "pre"
    rotary_percentage: float = 0.0

    def __post_init__(self) -> None:  # pragma: no cover - deterministic guards
        if self.index < 0:
            raise ValueError("index must be non-negative")
        if self.model_dim <= 0:
            raise ValueError("model_dim must be positive")
        if self.num_heads <= 0:
            raise ValueError("num_heads must be positive")
        if self.model_dim % self.num_heads != 0:
            raise ValueError("model_dim must be divisible by num_heads")
        if self.head_dim <= 0:
            raise ValueError("head_dim must be positive")
        if not 0.0 <= self.dropout < 1.0:
            raise ValueError("dropout must be in the range [0, 1)")
        if not 0.0 <= self.attention_dropout < 1.0:
            raise ValueError("attention_dropout must be in the range [0, 1)")
        if not 0.0 <= self.rotary_percentage <= 1.0:
            raise ValueError("rotary_percentage must be in the range [0, 1]")

    @property
    def attention_dimension(self) -> int:
        """Total dimensionality of the attention projections."""

        return self.num_heads * self.head_dim

    @property
    def feedforward_ratio(self) -> float:
        """The multiplicative expansion applied in the feedforward stack."""

        return self.feedforward_dim / float(self.model_dim)


@dataclass(slots=True)
class TransformerArchitecture:
    """A composed transformer architecture."""

    name: str
    embedding: TransformerEmbeddingConfig
    blocks: tuple[TransformerBlockSpec, ...] = field(default_factory=tuple)
    use_bias: bool = True
    metadata: MutableMapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:  # pragma: no cover - deterministic guard
        self.name = _normalise_name(self.name)
        self.metadata = {str(k): str(v) for k, v in self.metadata.items()}

    @property
    def depth(self) -> int:
        """Number of transformer blocks."""

        return len(self.blocks)

    @property
    def model_dim(self) -> int:
        """Nominal model dimension (embedding width)."""

        if not self.blocks:
            return self.embedding.model_dim
        return self.blocks[0].model_dim

    @property
    def parameter_estimate(self) -> int:
        """Approximate parameter count for the architecture."""

        embed_params = self.embedding.vocab_size * self.embedding.model_dim
        embed_params += self.embedding.max_position_embeddings * self.embedding.model_dim
        if self.embedding.layer_norm:
            embed_params += self.embedding.model_dim

        block_params = 0
        for block in self.blocks:
            attn = 4 * (block.model_dim * block.model_dim)
            ff = 2 * (block.model_dim * block.feedforward_dim)
            norm = 2 * block.model_dim
            block_params += attn + ff + norm
            if self.use_bias:
                block_params += 2 * block.feedforward_dim + 4 * block.model_dim

        return embed_params + block_params

    def summary(self) -> str:
        """Human-readable summary of the architecture."""

        lines = [
            f"Architecture: {self.name}",
            f"Depth: {self.depth}",
            f"Model dimension: {self.model_dim}",
            f"Vocab size: {self.embedding.vocab_size}",
            f"Max positions: {self.embedding.max_position_embeddings}",
        ]
        if self.blocks:
            blocks = ", ".join(
                f"#{block.index}: h={block.num_heads}, ff={block.feedforward_dim}" for block in self.blocks
            )
            lines.append(f"Blocks: {blocks}")
        if self.metadata:
            lines.append("Metadata: " + ", ".join(f"{k}={v}" for k, v in sorted(self.metadata.items())))
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# builder


class DynamicTransformerBuilder:
    """Incrementally constructs a :class:`TransformerArchitecture`."""

    def __init__(
        self,
        name: str,
        *,
        model_dim: int,
        num_heads: int,
        vocab_size: int = 32_000,
        max_position_embeddings: int = 2_048,
        ff_multiplier: float = 4.0,
        embedding_dropout: float = 0.0,
        attention_dropout: float = 0.0,
        residual_dropout: float = 0.0,
        activation: str = "gelu",
        normalization: str = "pre",
        use_bias: bool = True,
    ) -> None:
        if model_dim <= 0:
            raise ValueError("model_dim must be positive")
        if num_heads <= 0:
            raise ValueError("num_heads must be positive")
        if ff_multiplier <= 0:
            raise ValueError("ff_multiplier must be positive")
        self._name = _normalise_name(name)
        self._base_model_dim = model_dim
        self._base_heads = num_heads
        self._vocab_size = vocab_size
        self._max_position_embeddings = max_position_embeddings
        self._ff_multiplier = ff_multiplier
        self._embedding_dropout = embedding_dropout
        self._attention_dropout = attention_dropout
        self._residual_dropout = residual_dropout
        self._activation = activation
        self._normalization = normalization
        self._use_bias = use_bias
        self._metadata: MutableMapping[str, str] = {}
        self._blocks: list[TransformerBlockSpec] = []

    # ------------------------------------------------------------------ metadata
    def update_metadata(self, entries: Mapping[str, object]) -> None:
        for key, value in entries.items():
            self._metadata[str(key)] = str(value)

    # ------------------------------------------------------------------- building
    def add_block(
        self,
        *,
        model_dim: int,
        num_heads: int,
        feedforward_dim: int,
        dropout: float | None = None,
        attention_dropout: float | None = None,
        activation: str | None = None,
        normalization: str | None = None,
        rotary_percentage: float | None = None,
    ) -> TransformerBlockSpec:
        head_dim = model_dim // num_heads
        block = TransformerBlockSpec(
            index=len(self._blocks),
            model_dim=model_dim,
            num_heads=num_heads,
            feedforward_dim=feedforward_dim,
            head_dim=head_dim,
            dropout=self._residual_dropout if dropout is None else dropout,
            attention_dropout=self._attention_dropout if attention_dropout is None else attention_dropout,
            activation=self._activation if activation is None else activation,
            normalization=self._normalization if normalization is None else normalization,
            rotary_percentage=0.0 if rotary_percentage is None else rotary_percentage,
        )
        self._blocks.append(block)
        return block

    def add_stage(
        self,
        *,
        depth: int,
        width_scale: float = 1.0,
        head_scale: float = 1.0,
        ff_scale: float = 1.0,
        dropout: float | None = None,
        attention_dropout: float | None = None,
        activation: str | None = None,
        normalization: str | None = None,
        rotary_percentage: float | None = None,
    ) -> tuple[TransformerBlockSpec, ...]:
        if depth <= 0:
            raise ValueError("depth must be positive")
        stage_heads = max(1, int(round(self._base_heads * head_scale)))
        stage_model_dim = _round_to_multiple(self._base_model_dim * width_scale, stage_heads)
        feedforward_dim = _round_to_multiple(
            stage_model_dim * self._ff_multiplier * ff_scale,
            8,
        )
        blocks: list[TransformerBlockSpec] = []
        for _ in range(depth):
            blocks.append(
                self.add_block(
                    model_dim=stage_model_dim,
                    num_heads=stage_heads,
                    feedforward_dim=feedforward_dim,
                    dropout=dropout,
                    attention_dropout=attention_dropout,
                    activation=activation,
                    normalization=normalization,
                    rotary_percentage=rotary_percentage,
                )
            )
        return tuple(blocks)

    def extend_with_schedule(
        self,
        schedule: Iterable[Mapping[str, object]],
    ) -> None:
        for stage in schedule:
            depth = int(stage.get("depth", 0))
            if depth <= 0:
                continue
            width_scale = float(stage.get("width_scale", 1.0))
            head_scale = float(stage.get("head_scale", 1.0))
            ff_scale = float(stage.get("ff_scale", 1.0))
            dropout = stage.get("dropout")
            attention_dropout = stage.get("attention_dropout")
            activation = stage.get("activation")
            normalization = stage.get("normalization")
            rotary_percentage = stage.get("rotary_percentage")
            self.add_stage(
                depth=depth,
                width_scale=width_scale,
                head_scale=head_scale,
                ff_scale=ff_scale,
                dropout=dropout if dropout is not None else None,
                attention_dropout=attention_dropout if attention_dropout is not None else None,
                activation=activation if activation is not None else None,
                normalization=normalization if normalization is not None else None,
                rotary_percentage=rotary_percentage if rotary_percentage is not None else None,
            )

    def build(self) -> TransformerArchitecture:
        embedding = TransformerEmbeddingConfig(
            model_dim=self._base_model_dim,
            vocab_size=self._vocab_size,
            max_position_embeddings=self._max_position_embeddings,
            dropout=self._embedding_dropout,
        )
        return TransformerArchitecture(
            name=self._name,
            embedding=embedding,
            blocks=tuple(self._blocks),
            use_bias=self._use_bias,
            metadata=dict(self._metadata),
        )


# ---------------------------------------------------------------------------
# helpers


def build_transformer_architecture(
    profile: Mapping[str, object] | DynamicTransformerBuilder,
) -> TransformerArchitecture:
    """Construct a :class:`TransformerArchitecture` from a declarative profile."""

    if isinstance(profile, DynamicTransformerBuilder):
        return profile.build()
    if not isinstance(profile, Mapping):
        raise TypeError("profile must be a mapping or DynamicTransformerBuilder instance")

    name = _normalise_name(str(profile.get("name") or "Dynamic Transformer"))
    model_dim = int(profile.get("model_dim", 768))
    num_heads = int(profile.get("num_heads", 12))
    vocab_size = int(profile.get("vocab_size", 32_000))
    max_position_embeddings = int(profile.get("max_position_embeddings", 2_048))
    ff_multiplier = float(profile.get("ff_multiplier", 4.0))
    embedding_dropout = float(profile.get("embedding_dropout", 0.0))
    attention_dropout = float(profile.get("attention_dropout", 0.0))
    residual_dropout = float(profile.get("residual_dropout", 0.0))
    activation = str(profile.get("activation", "gelu"))
    normalization = str(profile.get("normalization", "pre"))
    use_bias = bool(profile.get("use_bias", True))

    builder = DynamicTransformerBuilder(
        name,
        model_dim=model_dim,
        num_heads=num_heads,
        vocab_size=vocab_size,
        max_position_embeddings=max_position_embeddings,
        ff_multiplier=ff_multiplier,
        embedding_dropout=embedding_dropout,
        attention_dropout=attention_dropout,
        residual_dropout=residual_dropout,
        activation=activation,
        normalization=normalization,
        use_bias=use_bias,
    )

    schedule = profile.get("stages") or profile.get("schedule") or []
    if isinstance(schedule, Sequence):
        builder.extend_with_schedule(stage for stage in schedule if isinstance(stage, Mapping))

    metadata = profile.get("metadata")
    if isinstance(metadata, Mapping):
        builder.update_metadata(metadata)

    if not builder._blocks:  # type: ignore[attr-defined]
        depth = int(profile.get("depth", 12))
        builder.add_stage(depth=depth)

    return builder.build()
