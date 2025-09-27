"""Optimise lobe weights for the Dynamic Fusion engine."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean
from typing import Dict, Iterable, List, Mapping, Sequence


@dataclass
class LobeSample:
    """A single evaluation emitted by an upstream lobe."""

    lobe: str
    score: float
    confidence: float


@dataclass
class TrainingBatch:
    """Collection of samples representing a time bucket."""

    regime: str
    samples: Sequence[LobeSample]
    target: float


def parse_json(path: Path) -> Sequence[TrainingBatch]:
    """Parse JSON dataset used for calibration."""

    with path.open("r", encoding="utf-8") as handle:
        raw = json.load(handle)

    batches: List[TrainingBatch] = []
    for entry in raw:
        samples = [LobeSample(**sample) for sample in entry.get("samples", [])]
        batches.append(
            TrainingBatch(
                regime=entry.get("regime", "neutral"),
                samples=samples,
                target=float(entry.get("target", 0.0)),
            )
        )
    return batches


def build_synthetic_batches() -> Sequence[TrainingBatch]:
    synthetic: List[TrainingBatch] = []
    regimes = ["calm", "bull", "bear", "volatile"]
    lobes = ["lorentzian", "trend_momentum", "sentiment", "treasury"]
    for idx, regime in enumerate(regimes):
        samples = [
            LobeSample(lobe=lobes[i], score=(i - 1.5) / 2, confidence=0.6 + 0.1 * i)
            for i in range(len(lobes))
        ]
        synthetic.append(
            TrainingBatch(
                regime=regime,
                samples=samples,
                target=0.2 * (idx - 1),
            )
        )
    return synthetic


def solve_weights(batches: Sequence[TrainingBatch]) -> Dict[str, float]:
    """Derive a normalised weight per lobe based on calibration data."""

    lobe_scores: Dict[str, List[float]] = {}
    lobe_confidences: Dict[str, List[float]] = {}

    for batch in batches:
        for sample in batch.samples:
            lobe_scores.setdefault(sample.lobe, []).append(sample.score)
            lobe_confidences.setdefault(sample.lobe, []).append(sample.confidence)

    weights: Dict[str, float] = {}
    for lobe, scores in lobe_scores.items():
        avg_score = mean(scores) if scores else 0.0
        avg_conf = mean(lobe_confidences.get(lobe, [0.5]))
        weights[lobe] = max(0.1, abs(avg_score) * avg_conf)

    total = sum(weights.values()) or 1.0
    return {lobe: round(value / total, 4) for lobe, value in weights.items()}


def save_config(config: Mapping[str, object], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        json.dump(config, handle, indent=2)


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__ or "Fusion trainer")
    parser.add_argument("--data", type=Path, help="Optional JSON dataset for lobe calibration")
    parser.add_argument("--output", type=Path, default=Path("models/fusion_v1.json"), help="Where to write the fusion config")
    return parser


def main(argv: Iterable[str] | None = None) -> None:
    parser = build_argument_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.data and args.data.exists():
        batches = parse_json(args.data)
    else:
        batches = build_synthetic_batches()

    weights = solve_weights(batches)

    config = {
        "model": "fusion-engine",
        "version": datetime.now(timezone.utc).isoformat(),
        "weights": weights,
        "regimes": list({batch.regime for batch in batches}),
    }

    save_config(config, args.output)
    print(f"Saved fusion configuration to {args.output}")
    print(json.dumps({"weights": weights}))


if __name__ == "__main__":
    main()
