"""Composable GPT model builder utilities for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "GPTEmbeddingConfig",
    "GPTBlockConfig",
    "GPTModel",
    "GPTStageConfig",
    "GPTModelBuilder",
    "build_gpt_model",
    "build_gpt_model_from_stages",
]


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def _normalise_name(value: str | None, *, fallback: str = "dynamic-gpt") -> str:
    text = (value or "").strip()
    text = " ".join(text.split())
    return text or fallback


def _ensure_positive(value: int, *, label: str) -> int:
    if value <= 0:
        raise ValueError(f"{label} must be positive")
    return value


def _ensure_non_negative(value: float, *, label: str) -> float:
    if value < 0.0:
        raise ValueError(f"{label} must be non-negative")
    return value


def _validate_ratio(value: float, *, label: str) -> float:
    if value <= 0.0:
        raise ValueError(f"{label} must be greater than zero")
    return float(value)


def _validate_dropout(value: float, *, label: str) -> float:
    numeric = float(value)
    if not 0.0 <= numeric <= 1.0:
        raise ValueError(f"{label} must be within the range [0, 1]")
    return numeric


def _as_metadata(mapping: Mapping[str, object] | None) -> MutableMapping[str, str]:
    if not mapping:
        return {}
    return {str(key): str(value) for key, value in mapping.items()}


# ---------------------------------------------------------------------------
# core dataclasses
# ---------------------------------------------------------------------------


@dataclass(slots=True, frozen=True)
class GPTEmbeddingConfig:
    """Defines the token embedding stack for a GPT model."""

    vocab_size: int
    model_dim: int
    max_position_embeddings: int
    dropout: float = 0.0
    layer_norm_epsilon: float = 1e-5
    learnable_positional_embeddings: bool = True

    def __post_init__(self) -> None:  # pragma: no cover - deterministic checks
        _ensure_positive(self.vocab_size, label="vocab_size")
        _ensure_positive(self.model_dim, label="model_dim")
        _ensure_positive(self.max_position_embeddings, label="max_position_embeddings")
        _validate_dropout(self.dropout, label="dropout")
        _ensure_non_negative(self.layer_norm_epsilon, label="layer_norm_epsilon")


@dataclass(slots=True, frozen=True)
class GPTBlockConfig:
    """Specification of a single decoder block in a GPT stack."""

    index: int
    model_dim: int
    num_heads: int
    feedforward_dim: int
    dropout: float = 0.0
    attention_dropout: float = 0.0
    residual_dropout: float = 0.0
    activation: str = "gelu"
    use_bias: bool = True

    def __post_init__(self) -> None:  # pragma: no cover - deterministic checks
        if self.index < 0:
            raise ValueError("index must be non-negative")
        _ensure_positive(self.model_dim, label="model_dim")
        _ensure_positive(self.num_heads, label="num_heads")
        if self.model_dim % self.num_heads != 0:
            raise ValueError("model_dim must be divisible by num_heads")
        _ensure_positive(self.feedforward_dim, label="feedforward_dim")
        _validate_dropout(self.dropout, label="dropout")
        _validate_dropout(self.attention_dropout, label="attention_dropout")
        _validate_dropout(self.residual_dropout, label="residual_dropout")

    @property
    def head_dim(self) -> int:
        """Dimension per attention head."""

        return self.model_dim // self.num_heads

    @property
    def feedforward_ratio(self) -> float:
        """Expansion ratio used in the feedforward network."""

        return self.feedforward_dim / float(self.model_dim)


@dataclass(slots=True)
class GPTModel:
    """A composable GPT model description."""

    name: str
    embedding: GPTEmbeddingConfig
    blocks: tuple[GPTBlockConfig, ...] = field(default_factory=tuple)
    share_embeddings: bool = True
    final_layer_norm: bool = True
    use_bias: bool = True
    metadata: MutableMapping[str, str] = field(default_factory=dict)

    def __post_init__(self) -> None:  # pragma: no cover - deterministic checks
        self.name = _normalise_name(self.name)
        self.metadata = _as_metadata(self.metadata)

    @property
    def depth(self) -> int:
        """Number of decoder blocks."""

        return len(self.blocks)

    @property
    def model_dim(self) -> int:
        """Model hidden size."""

        if not self.blocks:
            return self.embedding.model_dim
        return self.blocks[0].model_dim

    def parameter_breakdown(self) -> dict[str, int]:
        """Return an approximate parameter breakdown for the model."""

        embedding_params = self.embedding.vocab_size * self.embedding.model_dim
        positional_params = 0
        if self.embedding.learnable_positional_embeddings:
            positional_params = (
                self.embedding.max_position_embeddings * self.embedding.model_dim
            )

        output_head_params = 0
        if not self.share_embeddings:
            output_head_params = self.embedding.vocab_size * self.embedding.model_dim

        final_norm_params = 0
        if self.final_layer_norm:
            final_norm_params = 2 * self.embedding.model_dim

        block_params = 0
        for block in self.blocks:
            attn = 4 * (block.model_dim * block.model_dim)
            ff = 2 * (block.model_dim * block.feedforward_dim)
            norms = 2 * block.model_dim
            biases = 0
            if block.use_bias:
                biases = 4 * block.model_dim + 2 * block.feedforward_dim
            block_params += attn + ff + norms + biases

        return {
            "token_embeddings": embedding_params,
            "positional_embeddings": positional_params,
            "decoder_blocks": block_params,
            "output_projection": output_head_params,
            "final_layer_norm": final_norm_params,
        }

    @property
    def parameter_estimate(self) -> int:
        """Total approximate parameter count."""

        return sum(self.parameter_breakdown().values())

    def summary(self) -> str:
        """Produce a human-readable summary of the model."""

        lines = [
            f"Model: {self.name}",
            f"Depth: {self.depth}",
            f"Model dimension: {self.model_dim}",
            f"Vocabulary size: {self.embedding.vocab_size}",
            f"Context length: {self.embedding.max_position_embeddings}",
            f"Share embeddings: {self.share_embeddings}",
            f"Final layer norm: {self.final_layer_norm}",
            f"Approx. parameters: {self.parameter_estimate:,}",
        ]
        if self.metadata:
            lines.append("Metadata:")
            for key in sorted(self.metadata):
                lines.append(f"  - {key}: {self.metadata[key]}")
        return "\n".join(lines)


@dataclass(slots=True, frozen=True)
class GPTStageConfig:
    """Defines a stage in a multi-stage GPT architecture."""

    depth: int
    model_dim: int
    num_heads: int
    feedforward_ratio: float = 4.0
    dropout: float = 0.0
    attention_dropout: float = 0.0
    residual_dropout: float = 0.0
    activation: str = "gelu"

    def __post_init__(self) -> None:  # pragma: no cover - deterministic checks
        _ensure_positive(self.depth, label="depth")
        _ensure_positive(self.model_dim, label="model_dim")
        _ensure_positive(self.num_heads, label="num_heads")
        if self.model_dim % self.num_heads != 0:
            raise ValueError("model_dim must be divisible by num_heads")
        _validate_ratio(self.feedforward_ratio, label="feedforward_ratio")
        _validate_dropout(self.dropout, label="dropout")
        _validate_dropout(self.attention_dropout, label="attention_dropout")
        _validate_dropout(self.residual_dropout, label="residual_dropout")

    @property
    def feedforward_dim(self) -> int:
        """Compute the feedforward hidden size for the stage."""

        ratio = int(round(self.feedforward_ratio * self.model_dim))
        return max(self.model_dim, ratio)


# ---------------------------------------------------------------------------
# builders
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class GPTModelBuilder:
    """Utility class for generating GPT model configurations."""

    base_name: str = "dynamic-gpt"
    share_embeddings: bool = True
    final_layer_norm: bool = True
    use_bias: bool = True
    default_activation: str = "gelu"

    def build(
        self,
        *,
        depth: int,
        model_dim: int,
        num_heads: int,
        feedforward_ratio: float = 4.0,
        vocab_size: int = 51_200,
        max_position_embeddings: int = 4_096,
        dropout: float = 0.0,
        attention_dropout: float = 0.0,
        residual_dropout: float = 0.0,
        activation: str | None = None,
        learnable_positional_embeddings: bool = True,
        metadata: Mapping[str, object] | None = None,
    ) -> GPTModel:
        """Build a homogeneous GPT model description."""

        _ensure_positive(depth, label="depth")
        _ensure_positive(model_dim, label="model_dim")
        _ensure_positive(num_heads, label="num_heads")
        if model_dim % num_heads != 0:
            raise ValueError("model_dim must be divisible by num_heads")
        _validate_ratio(feedforward_ratio, label="feedforward_ratio")
        _validate_dropout(dropout, label="dropout")
        _validate_dropout(attention_dropout, label="attention_dropout")
        _validate_dropout(residual_dropout, label="residual_dropout")

        feedforward_dim = int(round(feedforward_ratio * model_dim))
        feedforward_dim = max(feedforward_dim, model_dim)

        embedding = GPTEmbeddingConfig(
            vocab_size=vocab_size,
            model_dim=model_dim,
            max_position_embeddings=max_position_embeddings,
            dropout=dropout,
            learnable_positional_embeddings=learnable_positional_embeddings,
        )

        blocks = [
            GPTBlockConfig(
                index=index,
                model_dim=model_dim,
                num_heads=num_heads,
                feedforward_dim=feedforward_dim,
                dropout=dropout,
                attention_dropout=attention_dropout,
                residual_dropout=residual_dropout,
                activation=activation or self.default_activation,
                use_bias=self.use_bias,
            )
            for index in range(depth)
        ]

        model_name = f"{self.base_name}-d{depth}-h{model_dim}"

        return GPTModel(
            name=model_name,
            embedding=embedding,
            blocks=tuple(blocks),
            share_embeddings=self.share_embeddings,
            final_layer_norm=self.final_layer_norm,
            use_bias=self.use_bias,
            metadata=_as_metadata(metadata),
        )

    def build_from_stages(
        self,
        *,
        name: str | None,
        stages: Sequence[GPTStageConfig],
        vocab_size: int,
        max_position_embeddings: int,
        dropout: float = 0.0,
        learnable_positional_embeddings: bool = True,
        metadata: Mapping[str, object] | None = None,
    ) -> GPTModel:
        """Build a GPT model from heterogenous stage definitions."""

        if not stages:
            raise ValueError("stages must not be empty")

        base_dim = stages[0].model_dim
        for stage in stages:
            if stage.model_dim != base_dim:
                raise ValueError(
                    "stage.model_dim must match the first stage to maintain a"
                    " consistent embedding width"
                )

        embedding = GPTEmbeddingConfig(
            vocab_size=vocab_size,
            model_dim=base_dim,
            max_position_embeddings=max_position_embeddings,
            dropout=dropout,
            learnable_positional_embeddings=learnable_positional_embeddings,
        )

        blocks: list[GPTBlockConfig] = []
        block_index = 0
        for stage in stages:
            feedforward_dim = stage.feedforward_dim
            for _ in range(stage.depth):
                blocks.append(
                    GPTBlockConfig(
                        index=block_index,
                        model_dim=stage.model_dim,
                        num_heads=stage.num_heads,
                        feedforward_dim=feedforward_dim,
                        dropout=stage.dropout,
                        attention_dropout=stage.attention_dropout,
                        residual_dropout=stage.residual_dropout,
                        activation=stage.activation or self.default_activation,
                        use_bias=self.use_bias,
                    )
                )
                block_index += 1

        model_name = _normalise_name(name, fallback=self.base_name)

        return GPTModel(
            name=model_name,
            embedding=embedding,
            blocks=tuple(blocks),
            share_embeddings=self.share_embeddings,
            final_layer_norm=self.final_layer_norm,
            use_bias=self.use_bias,
            metadata=_as_metadata(metadata),
        )


# ---------------------------------------------------------------------------
# functional helpers
# ---------------------------------------------------------------------------


def build_gpt_model(
    *,
    depth: int,
    model_dim: int,
    num_heads: int,
    feedforward_ratio: float = 4.0,
    vocab_size: int = 51_200,
    max_position_embeddings: int = 4_096,
    dropout: float = 0.0,
    attention_dropout: float = 0.0,
    residual_dropout: float = 0.0,
    activation: str | None = None,
    share_embeddings: bool = True,
    final_layer_norm: bool = True,
    use_bias: bool = True,
    learnable_positional_embeddings: bool = True,
    metadata: Mapping[str, object] | None = None,
) -> GPTModel:
    """Convenience function for building a homogeneous GPT model."""

    builder = GPTModelBuilder(
        share_embeddings=share_embeddings,
        final_layer_norm=final_layer_norm,
        use_bias=use_bias,
    )
    return builder.build(
        depth=depth,
        model_dim=model_dim,
        num_heads=num_heads,
        feedforward_ratio=feedforward_ratio,
        vocab_size=vocab_size,
        max_position_embeddings=max_position_embeddings,
        dropout=dropout,
        attention_dropout=attention_dropout,
        residual_dropout=residual_dropout,
        activation=activation,
        learnable_positional_embeddings=learnable_positional_embeddings,
        metadata=metadata,
    )


def build_gpt_model_from_stages(
    *,
    name: str | None,
    stages: Sequence[GPTStageConfig],
    vocab_size: int,
    max_position_embeddings: int,
    dropout: float = 0.0,
    share_embeddings: bool = True,
    final_layer_norm: bool = True,
    use_bias: bool = True,
    learnable_positional_embeddings: bool = True,
    metadata: Mapping[str, object] | None = None,
) -> GPTModel:
    """Construct a GPT model from a sequence of stage configurations."""

    builder = GPTModelBuilder(
        base_name=_normalise_name(name) if name else "dynamic-gpt",
        share_embeddings=share_embeddings,
        final_layer_norm=final_layer_norm,
        use_bias=use_bias,
    )
    return builder.build_from_stages(
        name=name,
        stages=stages,
        vocab_size=vocab_size,
        max_position_embeddings=max_position_embeddings,
        dropout=dropout,
        learnable_positional_embeddings=learnable_positional_embeddings,
        metadata=metadata,
    )
