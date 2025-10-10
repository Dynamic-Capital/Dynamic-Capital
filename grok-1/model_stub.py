"""Minimal stand-ins for the Grok model when Haiku is unavailable."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, Callable, List, NamedTuple, Optional

import jax.numpy as jnp

logger = logging.getLogger(__name__)
rank_logger = logging.getLogger("rank")


class QuantizedWeight8bit(NamedTuple):
    weight: Any
    scales: Any


class Memory(NamedTuple):
    layers: List[Any]


class KVMemory(NamedTuple):
    k: Optional[jnp.ndarray]
    v: Optional[jnp.ndarray]
    step: Optional[jnp.ndarray]


class LanguageModelOutput(NamedTuple):
    logits: Any
    model_state: Any


@dataclass
class TrainingState:
    params: dict


@dataclass
class TransformerConfig:
    model_dim: int = 1
    vocab_size: int = 1


class LanguageModelConfig:
    """Very small stub mimicking the public API used in tests."""

    fprop_dtype: Any = jnp.float32
    sequence_len: int = 16
    vocab_size: int = 32
    eos_token: int = 0

    def initialize(self) -> None:
        logger.debug("LanguageModelConfig.initialize called in stub")

    def make(self, *, mesh: Any) -> Callable[[Any], Callable[[Any], LanguageModelOutput]]:
        def _forward(tokens):
            batch = getattr(tokens, "shape", (1,))[0]
            logits = jnp.zeros((batch, self.vocab_size))
            return LanguageModelOutput(logits=logits, model_state=None)

        return _forward


def apply_rules(rules):  # noqa: D401 - compatibility helper
    def _apply_rules(*args, **kwargs):  # noqa: ANN001
        rank_logger.debug("apply_rules called in stub with %s %s", args, kwargs)
        return None

    return _apply_rules


__all__ = [
    "QuantizedWeight8bit",
    "LanguageModelConfig",
    "LanguageModelOutput",
    "TransformerConfig",
    "TrainingState",
    "Memory",
    "KVMemory",
    "apply_rules",
]
