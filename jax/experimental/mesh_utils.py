"""Stub helpers for :mod:`jax.experimental.mesh_utils`."""

from __future__ import annotations

from typing import Iterable, Sequence


def create_hybrid_device_mesh(
    local_mesh: Sequence[int],
    between_hosts: Sequence[int],
    *,
    devices: Iterable[object],
    process_is_granule: bool = False,  # noqa: ARG001 - compatibility only
):
    return list(devices)


__all__ = ["create_hybrid_device_mesh"]
