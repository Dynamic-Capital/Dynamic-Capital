"""Stub for :mod:`jax.experimental.maps` used in tests."""

from __future__ import annotations


class _PhysicalMesh:
    empty = True


class _Env:
    physical_mesh = _PhysicalMesh()


class _ThreadResources:
    env = _Env()


thread_resources = _ThreadResources()

__all__ = ["thread_resources"]
