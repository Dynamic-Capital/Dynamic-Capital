"""Simple backtesting harness for Dynamic AI models."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean
from typing import Iterable, List, Mapping


def load_json(path: Path) -> Mapping[str, object]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def evaluate_predictions(targets: List[float], predictions: List[float]) -> Mapping[str, float]:
    diffs = [abs(t - p) for t, p in zip(targets, predictions)]
    mae = mean(diffs) if diffs else 0.0
    return {
        "mae": round(mae, 4),
        "samples": len(diffs),
        "avg_diff": round(mean(diffs) if diffs else 0.0, 4),
    }


def run_backtest(model_dir: Path) -> Mapping[str, object]:
    lorentzian = load_json(model_dir / "lorentzian_v1.json")
    fusion = load_json(model_dir / "fusion_v1.json")

    targets = [sample["lorentzian"] for sample in lorentzian.get("calibration_samples", [])]
    predictions = [sample["lorentzian"] / max(1.0, lorentzian["sensitivity"]) for sample in lorentzian.get("calibration_samples", [])]
    lorentzian_metrics = evaluate_predictions(targets, predictions)

    fusion_weights = fusion.get("weights", {})
    weight_values = list(fusion_weights.values())
    uniform = 1 / len(weight_values) if weight_values else 0.0
    dispersion = mean(abs(weight - uniform) for weight in weight_values) if weight_values else 0.0

    return {
        "lorentzian": lorentzian_metrics,
        "fusion": {
            "weights": fusion_weights,
            "dispersion": round(dispersion, 4),
        },
    }


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__ or "Backtesting harness")
    parser.add_argument("--models", type=Path, default=Path("models"), help="Directory containing trained models")
    parser.add_argument("--output", type=Path, help="Optional path to write metrics as JSON")
    return parser


def main(argv: Iterable[str] | None = None) -> None:
    parser = build_argument_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    metrics = run_backtest(args.models)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open("w", encoding="utf-8") as handle:
            json.dump(metrics, handle, indent=2)
        print(f"Backtest results written to {args.output}")
    else:
        print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
