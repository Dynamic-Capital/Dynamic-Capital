"""Stub sharding helpers used by the tests."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Tuple


@dataclass
class Mesh:
    devices: Iterable[object]
    axis_names: Tuple[str, ...]


class PartitionSpec:
    def __init__(self, *axes: str) -> None:
        self.axes = axes


__all__ = ["Mesh", "PartitionSpec"]
