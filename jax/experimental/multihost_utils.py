"""Stub helpers for :mod:`jax.experimental.multihost_utils`."""

from __future__ import annotations

from typing import Any


def host_local_array_to_global_array(array: Any, mesh: Any, sharding: Any) -> Any:  # noqa: ARG001
    return array


__all__ = ["host_local_array_to_global_array"]
