"""Utilities to persist and reload trained model artefacts."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict

from .trade_logic import TradeLogic


@dataclass(slots=True)
class ModelArtifacts:
    config: Dict[str, Any]
    model: Dict[str, Any]


def _encode(obj: Any) -> Any:
    if isinstance(obj, bytes):
        return {"__type__": "bytes", "data": base64.b64encode(obj).decode("ascii")}
    if isinstance(obj, dict):
        return {key: _encode(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_encode(value) for value in obj]
    return obj


def _decode(obj: Any) -> Any:
    if isinstance(obj, dict) and obj.get("__type__") == "bytes":
        return base64.b64decode(obj["data"])
    if isinstance(obj, dict):
        return {key: _decode(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [_decode(value) for value in obj]
    return obj


def save_artifacts(path: Path | str, logic: TradeLogic) -> ModelArtifacts:
    payload = logic.export_artifacts()
    artefacts = ModelArtifacts(config=payload["config"], model=payload["model"])
    encoded = {"config": _encode(artefacts.config), "model": _encode(artefacts.model)}
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(encoded, indent=2))
    return artefacts


def load_artifacts(path: Path | str, logic: TradeLogic) -> ModelArtifacts:
    data = json.loads(Path(path).read_text())
    artefacts = ModelArtifacts(config=_decode(data["config"]), model=_decode(data["model"]))
    logic.load_artifacts({"config": artefacts.config, "model": artefacts.model})
    return artefacts


__all__ = ["ModelArtifacts", "load_artifacts", "save_artifacts"]
