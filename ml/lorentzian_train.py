"""Train a lightweight Lorentzian distance model for Dynamic AI."""

from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev
from typing import Iterable, List, Sequence


@dataclass
class MarketSnapshot:
    """Minimal representation of a market sample."""

    price: float
    reference_price: float
    dispersion: float

    @property
    def deviation(self) -> float:
        return self.price - self.reference_price


def parse_csv(path: Path) -> Sequence[MarketSnapshot]:
    """Parse a CSV file into market snapshots.

    Expected columns: price, reference_price, dispersion.
    """

    rows: List[MarketSnapshot] = []
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            try:
                rows.append(
                    MarketSnapshot(
                        price=float(row.get("price", 0.0) or 0.0),
                        reference_price=float(row.get("reference_price", row.get("price", 0.0)) or 0.0),
                        dispersion=float(row.get("dispersion", 0.0) or 0.0),
                    )
                )
            except ValueError:
                continue
    return rows


def build_synthetic_dataset(samples: int) -> Sequence[MarketSnapshot]:
    """Generate a synthetic dataset when no data is supplied."""

    snapshots: List[MarketSnapshot] = []
    base_price = 100.0
    for step in range(samples):
        drift = math.sin(step / 5) * 0.75
        dispersion = 0.25 + 0.1 * math.cos(step / 3)
        price = base_price + drift
        snapshots.append(
            MarketSnapshot(
                price=price,
                reference_price=base_price,
                dispersion=max(0.01, dispersion),
            )
        )
    return snapshots


def train_model(data: Sequence[MarketSnapshot]) -> dict:
    """Derive a set of heuristics for Lorentzian scoring."""

    if not data:
        raise ValueError("Training data is empty")

    deviations = [snap.deviation for snap in data]
    dispersions = [snap.dispersion for snap in data]

    avg_dispersion = mean(dispersions)
    dispersion_floor = max(0.01, avg_dispersion)
    avg_deviation = mean(abs(dev) for dev in deviations)
    deviation_std = pstdev(deviations) if len(deviations) > 1 else abs(deviations[0]) or 1.0

    sensitivity = max(0.1, avg_deviation + deviation_std)
    action_threshold = max(0.1, avg_deviation * 1.5)

    calibration: List[dict] = []
    for snap in data:
        lorentzian = math.log1p((snap.deviation**2) / (1 + snap.dispersion))
        calibration.append(
            {
                "price": snap.price,
                "reference_price": snap.reference_price,
                "dispersion": snap.dispersion,
                "lorentzian": lorentzian,
            }
        )

    return {
        "model": "lorentzian-distance",
        "version": datetime.now(timezone.utc).isoformat(),
        "sensitivity": round(sensitivity, 4),
        "action_threshold": round(action_threshold, 4),
        "dispersion_floor": round(dispersion_floor, 4),
        "calibration_samples": calibration[:50],
    }


def save_model(model: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        json.dump(model, handle, indent=2)


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__ or "Lorentzian model trainer")
    parser.add_argument("--data", type=Path, help="Optional CSV file with historical snapshots")
    parser.add_argument("--output", type=Path, default=Path("models/lorentzian_v1.json"), help="Where to store the trained model")
    parser.add_argument("--samples", type=int, default=256, help="Synthetic samples to use when no dataset is provided")
    return parser


def main(argv: Iterable[str] | None = None) -> None:
    parser = build_argument_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.data and args.data.exists():
        dataset = parse_csv(args.data)
    else:
        dataset = build_synthetic_dataset(args.samples)

    model = train_model(dataset)
    save_model(model, args.output)

    print(f"Saved Lorentzian model to {args.output}")
    print(json.dumps({"sensitivity": model["sensitivity"], "action_threshold": model["action_threshold"]}))


if __name__ == "__main__":
    main()
