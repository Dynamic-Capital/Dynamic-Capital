"""Stub for :mod:`jax.experimental.shard_map`."""

from __future__ import annotations

from typing import Any, Callable


def shard_map(function: Callable[..., Any], *args, **kwargs) -> Callable[..., Any]:  # noqa: D401 - mimic signature
    return function


__all__ = ["shard_map"]
