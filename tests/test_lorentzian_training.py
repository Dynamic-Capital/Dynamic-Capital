import math
import pickle

from dynamic.intelligence.ai_apps.training import calibrate_lorentzian_lobe, load_lorentzian_model
from ml.lorentzian_train import LorentzianModel, train_lorentzian


def _synthetic_closes(count: int = 160) -> list[float]:
    base = 100.0
    return [base + math.sin(idx / 5) * 2 + idx * 0.05 for idx in range(count)]


def test_train_lorentzian_emits_sensitivity(tmp_path) -> None:
    closes = _synthetic_closes()
    model = train_lorentzian(closes, window=30, alpha=0.4, z_thresh=1.8)

    assert isinstance(model, LorentzianModel)
    assert model.sensitivity > 0

    lobe = calibrate_lorentzian_lobe(model)
    assert math.isclose(lobe.sensitivity, model.sensitivity, rel_tol=1e-6)

    model_path = tmp_path / "lorentzian.pkl"
    with model_path.open("wb") as handle:
        pickle.dump(model.to_dict(), handle)

    loaded = load_lorentzian_model(model_path)
    assert isinstance(loaded, LorentzianModel)
    assert math.isclose(loaded.sensitivity, model.sensitivity, rel_tol=1e-6)


def test_calibration_falls_back_when_missing_sensitivity() -> None:
    closes = _synthetic_closes()
    model = train_lorentzian(closes, window=25, alpha=0.3, z_thresh=1.5)

    payload = model.to_dict()
    payload["sensitivity"] = 0.0

    lobe = calibrate_lorentzian_lobe(payload)

    expected = model.mean + abs(model.z_thresh) * model.std
    assert lobe.sensitivity >= expected or math.isclose(lobe.sensitivity, expected, rel_tol=1e-6)
