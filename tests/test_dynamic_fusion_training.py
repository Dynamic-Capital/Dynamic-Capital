from __future__ import annotations

import math
import importlib.util
import sys
import types
from pathlib import Path
from typing import Any, Dict


class _RequestsStubResponse:
    def raise_for_status(self) -> None:  # pragma: no cover - defensive stub
        return None

    def json(self) -> Dict[str, Any]:  # pragma: no cover - defensive stub
        return {}


if "requests" not in sys.modules:
    requests_stub = types.ModuleType("requests")
    requests_stub.RequestException = Exception

    def _post(*_args: Any, **_kwargs: Any) -> _RequestsStubResponse:  # pragma: no cover
        return _RequestsStubResponse()

    requests_stub.post = _post
    sys.modules["requests"] = requests_stub

if "dynamic.intelligence.ai_apps" not in sys.modules:
    package_stub = types.ModuleType("dynamic.intelligence.ai_apps")
    package_stub.__path__ = [str(Path("dynamic.intelligence.ai_apps"))]
    sys.modules["dynamic.intelligence.ai_apps"] = package_stub


def _load_module(name: str, path: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:  # pragma: no cover - defensive check
        raise ImportError(f"Unable to load module spec for {name}")
    module = importlib.util.module_from_spec(spec)
    module.__package__ = "dynamic.intelligence.ai_apps"
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


core = _load_module(
    "dynamic.intelligence.ai_apps.core_runtime",
    str(Path("dynamic/intelligence/ai_apps/core.py")),
)
training = _load_module(
    "dynamic.intelligence.ai_apps.training_runtime",
    str(Path("dynamic/intelligence/ai_apps/training.py")),
)

DynamicFusionAlgo = core.DynamicFusionAlgo
prepare_fusion_training_rows = training.prepare_fusion_training_rows


def build_sample_payload(**overrides: Any) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "signal": "buy",
        "momentum": 0.72,
        "trend": "bullish",
        "sentiment": 0.4,
        "volatility": 0.8,
        "data_quality": 0.7,
        "risk_score": 0.2,
        "drawdown": -3.5,
        "confidence": 0.6,
        "news": ["earnings", "upgrade"],
        "composite_scores": [0.6, 0.55, 0.58],
    }
    payload.update(overrides)
    return payload


def test_prepare_training_example_structure() -> None:
    algo = DynamicFusionAlgo(boost_topics=("earnings",))
    example = algo.prepare_training_example(build_sample_payload())

    features = example["features"]
    assert math.isclose(features["momentum"], 0.72, rel_tol=1e-6)
    assert features["resolved_signal_bias"] == 1.0
    assert 0 <= features["volatility"] <= 1.0
    assert example["base_action"] in {"BUY", "SELL", "HOLD", "NEUTRAL"}
    assert set(example["consensus_by_action"].keys()) == {"BUY", "HOLD", "NEUTRAL", "SELL"}
    assert 0.0 <= example["final_confidence"] <= 1.0
    assert -1.0 <= (example["composite_score"] or 0.0) <= 1.0


def test_prepare_fusion_training_rows_flattening() -> None:
    algo = DynamicFusionAlgo()
    samples = [
        build_sample_payload(),
        build_sample_payload(signal="sell", momentum=-0.65, sentiment="bearish", confidence=0.55),
    ]

    rows = prepare_fusion_training_rows(algo, samples)

    assert len(rows) == 2
    for row in rows:
        assert row["final_action"] in {"BUY", "SELL", "HOLD", "NEUTRAL"}
        assert all(action_key in row for action_key in {
            "consensus_buy",
            "consensus_sell",
            "consensus_hold",
            "consensus_neutral",
        })
        assert isinstance(row["volatility"], float)
        assert isinstance(row["base_confidence"], float)
