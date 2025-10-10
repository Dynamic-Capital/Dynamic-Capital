"""Stub implementation of :mod:`jax.experimental.pjit`."""

from __future__ import annotations

from typing import Any, Callable


def pjit(function: Callable[..., Any], *args, **kwargs) -> Callable[..., Any]:  # noqa: D401 - mimic signature
    return function


__all__ = ["pjit"]
