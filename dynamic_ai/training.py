"""Training utilities aligning Dynamic AI lobes with learned parameters."""

from __future__ import annotations

import math
import pickle
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping

from .fusion import LorentzianDistanceLobe
from .core import DynamicFusionAlgo
from ml.lorentzian_train import LorentzianModel


def _coerce_model(model: LorentzianModel | Mapping[str, Any]) -> LorentzianModel:
    if isinstance(model, LorentzianModel):
        return model
    if isinstance(model, Mapping):
        return LorentzianModel.from_dict(model)
    raise TypeError("Unsupported model payload; expected LorentzianModel or mapping")


def load_lorentzian_model(path: str | Path) -> LorentzianModel:
    """Load a serialized Lorentzian model from ``path``."""

    payload = pickle.loads(Path(path).read_bytes())
    if isinstance(payload, LorentzianModel):
        return payload
    if isinstance(payload, Mapping):
        return LorentzianModel.from_dict(payload)
    raise TypeError("Serialized Lorentzian model has unexpected structure")


def calibrate_lorentzian_lobe(
    model: LorentzianModel | Mapping[str, Any], *,
    minimum_sensitivity: float = 1e-6,
) -> LorentzianDistanceLobe:
    """Create a :class:`LorentzianDistanceLobe` configured from ``model``."""

    hydrated = _coerce_model(model)

    sensitivity = hydrated.sensitivity
    if not math.isfinite(sensitivity) or sensitivity <= 0:
        sensitivity = hydrated.mean + abs(hydrated.z_thresh) * hydrated.std
        sensitivity = max(abs(sensitivity), minimum_sensitivity)
    else:
        sensitivity = max(sensitivity, minimum_sensitivity)

    return LorentzianDistanceLobe(sensitivity=float(sensitivity))


def prepare_fusion_training_rows(
    algo: DynamicFusionAlgo, samples: Iterable[Mapping[str, Any]]
) -> List[Dict[str, Any]]:
    """Return flattened training rows for the :class:`DynamicFusionAlgo` pipeline."""

    rows: List[Dict[str, Any]] = []

    for sample in samples:
        example = algo.prepare_training_example(dict(sample))

        row: Dict[str, Any] = {**example["features"]}
        row.update(
            {
                "source_signal": example["source_signal"],
                "resolved_signal": example["resolved_signal"],
                "composite_score": example["composite_score"],
                "composite_trimmed_mean": example["composite_trimmed_mean"],
                "base_action": example["base_action"],
                "base_confidence": example["base_confidence"],
                "base_consensus": example["base_consensus"],
                "final_action": example["final_action"],
                "final_confidence": example["final_confidence"],
                "final_consensus": example["final_consensus"],
            }
        )

        consensus_by_action = example["consensus_by_action"]
        for action, consensus in consensus_by_action.items():
            row[f"consensus_{action.lower()}"] = consensus

        rows.append(row)

    return rows

