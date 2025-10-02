"""Persistence helpers for reinforcement learning artefacts."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Generic

from .engine import ActionT, RLTrainingConfig, StateT
from .model import RLModel

__all__ = ["RLModelKeeper"]


class RLModelKeeper(Generic[StateT, ActionT]):
    """Serialise and restore :class:`RLModel` instances."""

    def save(self, model: RLModel[StateT, ActionT], path: str | Path) -> None:
        destination = Path(path)
        payload = {
            "config": asdict(model.config),
            "q_table": [
                {"state": state, "action": action, "value": value}
                for (state, action), value in model.q_table.items()
            ],
            "visit_counts": [
                {"state": state, "action": action, "count": count}
                for (state, action), count in model.visit_counts.items()
            ],
        }
        with destination.open("w", encoding="utf-8") as stream:
            json.dump(payload, stream, indent=2, sort_keys=True)

    def load(self, path: str | Path) -> RLModel[StateT, ActionT]:
        source = Path(path)
        with source.open("r", encoding="utf-8") as stream:
            payload = json.load(stream)
        config = RLTrainingConfig(**payload.get("config", {}))
        q_table = {
            (entry["state"], entry["action"]): float(entry["value"])
            for entry in payload.get("q_table", [])
        }
        visit_counts = {
            (entry["state"], entry["action"]): int(entry.get("count", 0))
            for entry in payload.get("visit_counts", [])
        }
        return RLModel(q_table=q_table, visit_counts=visit_counts, config=config)
