"""High level wrapper for the dynamic fine-tune engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence

from .engine import DynamicFineTuneEngine, FineTuneRecord, FineTuneRecordBatch


@dataclass(slots=True)
class DynamicFineTuneModel:
    """Coordinates ingestion and harvesting on top of the engine."""

    engine: DynamicFineTuneEngine = field(default_factory=DynamicFineTuneEngine)

    def ingest(self, records: Iterable[FineTuneRecord | Mapping[str, object]]) -> int:
        return self.engine.ingest(records)

    def harvest(self, **kwargs) -> FineTuneRecordBatch:
        return self.engine.harvest(**kwargs)

    def stats(self) -> Mapping[str, object]:
        return self.engine.stats()

    def snapshot(self) -> Sequence[Mapping[str, object]]:
        return [record.to_dict() for record in self.engine]

    def clear(self) -> None:
        self.engine.clear()

