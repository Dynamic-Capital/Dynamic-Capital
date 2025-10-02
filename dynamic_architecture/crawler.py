"""Graph crawler that walks architecture documents via registered flows."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Iterable, Mapping

from .model import ArchitectureDocument, ArchitectureNode

__all__ = ["ArchitectureTraversalStep", "DynamicArchitectureCrawler"]


@dataclass(slots=True)
class ArchitectureTraversalStep:
    """A single traversal step returned by :class:`DynamicArchitectureCrawler`."""

    node: ArchitectureNode
    depth: int
    parents: tuple[str, ...]


class DynamicArchitectureCrawler:
    """Traverse architecture documents using breadth-first expansion."""

    def __init__(self, document: ArchitectureDocument) -> None:
        self._document = document
        self._nodes: Mapping[str, ArchitectureNode] = {
            node.name: node
            for layer in document.layers
            for node in layer.nodes
        }
        self._forward: dict[str, set[str]] = {name: set() for name in self._nodes}
        self._reverse: dict[str, set[str]] = {name: set() for name in self._nodes}
        for flow in document.flows:
            self._forward.setdefault(flow.source, set()).add(flow.target)
            self._reverse.setdefault(flow.target, set()).add(flow.source)
            if flow.target not in self._nodes:
                continue
            self._forward.setdefault(flow.target, set())
            self._reverse.setdefault(flow.source, set())

    def crawl(
        self,
        seeds: Iterable[str] | None = None,
        *,
        max_depth: int | None = None,
    ) -> tuple[ArchitectureTraversalStep, ...]:
        if not self._nodes:
            return ()

        start_nodes = [name for name in (seeds or ()) if name in self._nodes]
        if not start_nodes:
            start_nodes = [
                name for name, parents in self._reverse.items() if not parents
            ]
        if not start_nodes:
            start_nodes = [next(iter(self._nodes))]

        queue: deque[tuple[str, int]] = deque((name, 0) for name in start_nodes)
        visited: set[str] = set()
        steps: list[ArchitectureTraversalStep] = []

        while queue:
            name, depth = queue.popleft()
            if name in visited:
                continue
            visited.add(name)
            node = self._nodes.get(name)
            if node is None:
                continue
            parents = tuple(sorted(self._reverse.get(name, ())))
            steps.append(ArchitectureTraversalStep(node=node, depth=depth, parents=parents))

            if max_depth is not None and depth >= max_depth:
                continue

            for child in sorted(self._forward.get(name, ())):
                if child not in visited:
                    queue.append((child, depth + 1))

        return tuple(steps)

