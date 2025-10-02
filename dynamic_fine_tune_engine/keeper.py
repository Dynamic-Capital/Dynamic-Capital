"""Persistence helpers for the dynamic fine-tune model."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from .builder import FineTuneRecordBuilder
from .model import DynamicFineTuneModel


@dataclass(slots=True)
class FineTuneKeeper:
    """Save and restore model state from JSON files."""

    indent: int = 2

    def save(self, model: DynamicFineTuneModel, path: str | Path) -> Path:
        destination = Path(path)
        payload = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "records": model.snapshot(),
            "stats": model.stats(),
        }
        destination.write_text(
            json.dumps(payload, indent=self.indent, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        return destination

    def load_records(self, path: str | Path) -> Sequence[dict[str, object]]:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        records = payload.get("records", [])
        return list(records)

    def restore(self, model: DynamicFineTuneModel, path: str | Path, *, clear: bool = True) -> int:
        if clear:
            model.clear()
        builder = FineTuneRecordBuilder()
        records = [builder.from_payload(raw) for raw in self.load_records(path)]
        return model.ingest(records)

