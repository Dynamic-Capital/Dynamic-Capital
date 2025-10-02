"""Helper utilities that provide analytics on top of the model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Mapping

from .model import DynamicFineTuneModel


@dataclass(slots=True)
class FineTuneHelper:
    """Read-only helpers exposing quick insights."""

    model: DynamicFineTuneModel

    def top_tags(self, limit: int = 5) -> List[tuple[str, int]]:
        histogram = self.model.stats().get("tag_histogram", {})
        ordered = sorted(histogram.items(), key=lambda item: (-item[1], item[0]))
        return ordered[: max(limit, 0)]

    def source_quality(self) -> Mapping[str, Mapping[str, float]]:
        return self.model.stats().get("sources", {})

    def recent_prompts(self, limit: int = 3) -> List[str]:
        return [record.prompt for record in self.model.engine.recent(limit=limit)]

