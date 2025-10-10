"""Minimal stub of the :mod:`haiku` library used in tests."""

from __future__ import annotations

from typing import Any, Callable


def transform(function: Callable[..., Any]) -> Callable[..., Any]:
    return function


Params = dict

IS_STUB = True


class Module:
    def __init__(self, *args, **kwargs):  # noqa: D401 - mimic Haiku signature
        pass


class Linear(Module):
    def __init__(self, *args, **kwargs):  # noqa: D401 - match Haiku signature
        super().__init__(*args, **kwargs)

    def __call__(self, x):
        return x


def transparent(function: Callable[..., Any]) -> Callable[..., Any]:
    return function


__all__ = ["transform", "Params", "Module", "transparent", "Linear", "IS_STUB"]
