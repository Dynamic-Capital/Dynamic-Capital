"""Training utilities aligning Dynamic AI lobes with learned parameters."""

from __future__ import annotations

import math
import pickle
from pathlib import Path
from typing import Any, Mapping

from .fusion import LorentzianDistanceLobe
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

