"""Composable GPT model builder utilities for Dynamic Capital.

This module provides a small configuration layer that describes GPT style
architectures together with optional PyTorch modules that can be instantiated
directly from the configuration dataclasses.  When PyTorch is not available the
configuration objects can still be constructed and inspected, while attempts to
materialise the neural network raise a clear error message.
"""

from __future__ import annotations

import importlib.util
import math
from dataclasses import dataclass, field
from typing import Any, Mapping, MutableMapping, Sequence, TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover - typing only
    from torch import Tensor, nn

_TORCH_AVAILABLE = importlib.util.find_spec("torch") is not None

if _TORCH_AVAILABLE:  # pragma: no cover - import side effect
    import torch
    from torch import Tensor, nn
else:  # pragma: no cover - import side effect
    torch = None  # type: ignore[assignment]
    Tensor = Any  # type: ignore[assignment]
    nn = Any  # type: ignore[assignment]

__all__ = [
    "GPTEmbeddingConfig",
    "GPTBlockConfig",
    "GPTModel",
    "GPTStageConfig",
    "GPTModelBuilder",
    "DynamicGPTModel",
    "instantiate_torch_model",
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
    layer_norm_epsilon: float = 1e-5

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
        _ensure_non_negative(self.layer_norm_epsilon, label="layer_norm_epsilon")

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
# PyTorch modules
# ---------------------------------------------------------------------------


if _TORCH_AVAILABLE:

    def _sinusoidal_embeddings(max_positions: int, model_dim: int) -> "Tensor":
        if model_dim <= 0:
            raise ValueError("model_dim must be positive for sinusoidal embeddings")

        half_dim = model_dim // 2
        if half_dim == 0:
            return torch.zeros(max_positions, model_dim, dtype=torch.float32)

        denominator = max(half_dim - 1, 1)
        frequencies = torch.exp(
            torch.arange(half_dim, dtype=torch.float32) * -(math.log(10_000.0) / denominator)
        )
        positions = torch.arange(max_positions, dtype=torch.float32).unsqueeze(1)
        angles = positions * frequencies.unsqueeze(0)
        embeddings = torch.zeros(max_positions, model_dim, dtype=torch.float32)
        embeddings[:, 0::2] = torch.sin(angles)
        embeddings[:, 1::2] = torch.cos(angles)
        if model_dim % 2 == 1:
            embeddings[:, -1] = 0.0
        return embeddings


    def _causal_mask(size: int, *, device: "torch.device | None") -> "Tensor":
        mask = torch.ones(size, size, device=device, dtype=torch.bool)
        return torch.triu(mask, diagonal=1)


    def _resolve_activation(name: str) -> "nn.Module":
        key = name.lower().strip()
        if key in {"gelu", "geglu"}:
            return nn.GELU()
        if key in {"relu"}:
            return nn.ReLU()
        if key in {"silu", "swish"}:
            return nn.SiLU()
        if key in {"tanh"}:
            return nn.Tanh()
        raise ValueError(f"Unsupported activation function: {name}")


    class CausalSelfAttention(nn.Module):
        """Multi-head self-attention with a causal mask."""

        def __init__(self, config: GPTBlockConfig) -> None:
            super().__init__()
            self.num_heads = config.num_heads
            self.head_dim = config.head_dim
            self.model_dim = config.model_dim
            self.qkv = nn.Linear(self.model_dim, 3 * self.model_dim, bias=config.use_bias)
            self.proj = nn.Linear(self.model_dim, self.model_dim, bias=config.use_bias)
            self.attention_dropout = nn.Dropout(config.attention_dropout)
            self.projection_dropout = nn.Dropout(config.dropout)

        def forward(self, hidden_states: "Tensor", *, mask: "Tensor") -> "Tensor":
            batch, sequence, _ = hidden_states.shape
            qkv = self.qkv(hidden_states)
            query, key, value = qkv.chunk(3, dim=-1)

            query = query.view(batch, sequence, self.num_heads, self.head_dim).transpose(1, 2)
            key = key.view(batch, sequence, self.num_heads, self.head_dim).transpose(1, 2)
            value = value.view(batch, sequence, self.num_heads, self.head_dim).transpose(1, 2)

            attention_scores = torch.matmul(query, key.transpose(-2, -1)) / math.sqrt(self.head_dim)
            attention_scores = attention_scores.masked_fill(mask, float("-inf"))
            attention_probs = torch.softmax(attention_scores, dim=-1)
            attention_probs = self.attention_dropout(attention_probs)

            attention_output = torch.matmul(attention_probs, value)
            attention_output = (
                attention_output.transpose(1, 2).contiguous().view(batch, sequence, self.model_dim)
            )
            attention_output = self.projection_dropout(self.proj(attention_output))
            return attention_output


    class GPTFeedForward(nn.Module):
        """Feedforward module used inside GPT blocks."""

        def __init__(self, config: GPTBlockConfig) -> None:
            super().__init__()
            self.linear_in = nn.Linear(config.model_dim, config.feedforward_dim, bias=config.use_bias)
            self.activation = _resolve_activation(config.activation)
            self.dropout = nn.Dropout(config.dropout)
            self.linear_out = nn.Linear(config.feedforward_dim, config.model_dim, bias=config.use_bias)

        def forward(self, hidden_states: "Tensor") -> "Tensor":
            hidden_states = self.linear_in(hidden_states)
            hidden_states = self.activation(hidden_states)
            hidden_states = self.dropout(hidden_states)
            hidden_states = self.linear_out(hidden_states)
            hidden_states = self.dropout(hidden_states)
            return hidden_states


    class GPTBlock(nn.Module):
        """Transformer decoder block."""

        def __init__(self, config: GPTBlockConfig) -> None:
            super().__init__()
            self.layer_norm_1 = nn.LayerNorm(config.model_dim, eps=config.layer_norm_epsilon)
            self.attention = CausalSelfAttention(config)
            self.layer_norm_2 = nn.LayerNorm(config.model_dim, eps=config.layer_norm_epsilon)
            self.feed_forward = GPTFeedForward(config)
            self.residual_dropout = nn.Dropout(config.residual_dropout)

        def forward(self, hidden_states: "Tensor", *, mask: "Tensor") -> "Tensor":
            residual = hidden_states
            hidden_states = self.layer_norm_1(hidden_states)
            attention_output = self.attention(hidden_states, mask=mask)
            hidden_states = residual + self.residual_dropout(attention_output)

            residual = hidden_states
            hidden_states = self.layer_norm_2(hidden_states)
            feedforward_output = self.feed_forward(hidden_states)
            hidden_states = residual + self.residual_dropout(feedforward_output)
            return hidden_states


    class DynamicGPTModel(nn.Module):
        """Minimal PyTorch GPT implementation backed by :class:`GPTModel`."""

        def __init__(self, config: GPTModel) -> None:
            super().__init__()
            self.config = config
            embedding = config.embedding

            self.token_embeddings = nn.Embedding(embedding.vocab_size, embedding.model_dim)
            if embedding.learnable_positional_embeddings:
                self.position_embeddings = nn.Embedding(
                    embedding.max_position_embeddings, embedding.model_dim
                )
                self.register_buffer("_static_position_embeddings", None, persistent=False)
            else:
                self.position_embeddings = None
                sinusoidal = _sinusoidal_embeddings(
                    embedding.max_position_embeddings, embedding.model_dim
                )
                self.register_buffer("_static_position_embeddings", sinusoidal, persistent=False)

            self.embedding_dropout = nn.Dropout(embedding.dropout)
            self.blocks = nn.ModuleList([GPTBlock(block) for block in config.blocks])
            self.final_layer_norm = (
                nn.LayerNorm(embedding.model_dim, eps=embedding.layer_norm_epsilon)
                if config.final_layer_norm
                else None
            )
            self.lm_head = nn.Linear(embedding.model_dim, embedding.vocab_size, bias=config.use_bias)
            if config.share_embeddings:
                self.lm_head.weight = self.token_embeddings.weight

            self.max_position_embeddings = embedding.max_position_embeddings
            self.learnable_positional_embeddings = embedding.learnable_positional_embeddings

        def forward(self, input_ids: "Tensor") -> "Tensor":
            if input_ids.dim() != 2:
                raise ValueError(
                    "input_ids must be a 2D tensor of shape (batch, sequence_length)"
                )

            batch, sequence = input_ids.shape
            if sequence > self.max_position_embeddings:
                raise ValueError(
                    "sequence length exceeds configured maximum position embeddings"
                )

            device = input_ids.device
            positions = torch.arange(sequence, device=device).unsqueeze(0).expand(batch, sequence)

            token_embeddings = self.token_embeddings(input_ids)
            if self.learnable_positional_embeddings:
                position_embeddings = self.position_embeddings(positions)
            else:
                assert self._static_position_embeddings is not None  # for type checkers
                position_embeddings = self._static_position_embeddings[:sequence, :].to(device)
                position_embeddings = position_embeddings.type_as(token_embeddings)
                position_embeddings = position_embeddings.unsqueeze(0).expand(batch, sequence, -1)

            hidden_states = token_embeddings + position_embeddings
            hidden_states = self.embedding_dropout(hidden_states)

            if self.blocks:
                mask = _causal_mask(sequence, device=device)
                for block in self.blocks:
                    hidden_states = block(hidden_states, mask=mask)

            if self.final_layer_norm is not None:
                hidden_states = self.final_layer_norm(hidden_states)

            logits = self.lm_head(hidden_states)
            return logits

        @torch.no_grad()
        def generate(
            self,
            input_ids: "Tensor",
            *,
            max_new_tokens: int,
            temperature: float = 1.0,
            top_k: int | None = None,
        ) -> "Tensor":
            """Autoregressively generate new tokens."""

            if temperature <= 0:
                raise ValueError("temperature must be positive")

            output = input_ids
            for _ in range(max_new_tokens):
                logits = self.forward(output[:, -self.max_position_embeddings :])
                logits = logits[:, -1, :] / temperature
                if top_k is not None and top_k > 0:
                    top_values, _ = torch.topk(logits, top_k)
                    threshold = top_values[:, -1].unsqueeze(-1)
                    logits = torch.where(
                        logits < threshold, torch.full_like(logits, float("-inf")), logits
                    )
                probabilities = torch.softmax(logits, dim=-1)
                next_token = torch.multinomial(probabilities, num_samples=1)
                output = torch.cat([output, next_token], dim=1)
            return output


else:  # pragma: no cover - simple guard for environments without torch

    class DynamicGPTModel:  # type: ignore[misc]
        """Placeholder implementation used when PyTorch is unavailable."""

        def __init__(self, config: GPTModel) -> None:  # noqa: D401 - short message
            raise ImportError(
                "PyTorch is required to instantiate DynamicGPTModel. Please install "
                "the 'torch' package to enable neural model materialisation."
            )


# ---------------------------------------------------------------------------
# builders
# ---------------------------------------------------------------------------


def instantiate_torch_model(
    config: GPTModel,
    *,
    device: "torch.device | str | None" = None,
    dtype: "torch.dtype | None" = None,
) -> DynamicGPTModel:
    """Instantiate a :class:`DynamicGPTModel` from a high level configuration."""

    if not _TORCH_AVAILABLE:
        raise ImportError(
            "PyTorch is required to instantiate DynamicGPTModel. Install the 'torch'"
            " package to enable this functionality."
        )

    model = DynamicGPTModel(config)
    if device is not None or dtype is not None:
        model = model.to(device=device, dtype=dtype)
    return model


@dataclass(slots=True)
class GPTModelBuilder:
    """Utility class for generating GPT model configurations."""

    base_name: str = "dynamic-gpt"
    share_embeddings: bool = True
    final_layer_norm: bool = True
    use_bias: bool = True
    default_activation: str = "gelu"
    layer_norm_epsilon: float = 1e-5

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
                layer_norm_epsilon=self.layer_norm_epsilon,
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
                        layer_norm_epsilon=self.layer_norm_epsilon,
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
