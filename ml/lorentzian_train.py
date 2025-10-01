"""Lorentzian distance based training utilities.

This module trains a simple regime detection model that classifies
BUY/SELL/NEUTRAL states based on the Lorentzian distance of rolling
windows of closing prices.  The resulting parameters are persisted as a
pickle file so that deployment targets (for example Supabase Edge
Functions) can re-use the learned thresholds.

The implementation intentionally avoids hard dependencies on third-party
packages so the script can run in minimal environments (such as fresh CI
containers) without requiring ``pip`` installations ahead of time.  When
``pandas`` is available it will be used for CSV loading, otherwise a
lightweight ``csv``-module fallback is employed.
"""
from __future__ import annotations

import argparse
import csv
import math
import pickle
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, List, Mapping, Sequence

try:  # Optional dependency used when available for CSV parsing ergonomics
    import pandas as pd  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - defensive guard for CI containers
    pd = None  # type: ignore


def lorentzian_distance(x: Sequence[float], y: Sequence[float]) -> float:
    """Return the Lorentzian distance between two equally-sized vectors."""

    x_len = len(x)
    if x_len != len(y):
        raise ValueError("Input sequences must have the same length for Lorentzian distance")

    return sum(math.log1p(abs(x[i] - y[i])) for i in range(x_len))


def _coerce_int(value: Any, default: int = 0) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return default


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


@dataclass
class LorentzianModel:
    window: int
    alpha: float
    z_thresh: float
    mean: float
    std: float
    trained_at: str
    sensitivity: float

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: Mapping[str, Any]) -> "LorentzianModel":
        """Hydrate a :class:`LorentzianModel` from a mapping."""

        return cls(
            window=_coerce_int(payload.get("window"), 0),
            alpha=_coerce_float(payload.get("alpha"), 0.0),
            z_thresh=_coerce_float(payload.get("z_thresh"), 0.0),
            mean=_coerce_float(payload.get("mean"), 0.0),
            std=_coerce_float(payload.get("std"), 0.0),
            trained_at=str(payload.get("trained_at", "")),
            sensitivity=_coerce_float(payload.get("sensitivity"), 0.0),
        )


def _ensure_numeric_close(values: Iterable[object]) -> List[float]:
    closes: List[float] = []
    for idx, value in enumerate(values, start=1):
        try:
            closes.append(float(value))
        except (TypeError, ValueError) as exc:  # pragma: no cover - provides better error context
            raise ValueError(f"Close value at position {idx} is not numeric: {value!r}") from exc

    if not closes:
        raise ValueError("No close prices supplied")

    return closes


def _ema(values: Iterable[float], alpha: float) -> List[float]:
    """Compute the exponential moving average for the supplied values."""
    ema_values: List[float] = []
    ema_prev: float | None = None
    for value in values:
        ema_prev = value if ema_prev is None else alpha * value + (1 - alpha) * ema_prev
        ema_values.append(ema_prev)
    return ema_values


def train_lorentzian(
    data: Sequence[float] | Iterable[float] | "pd.DataFrame",
    *,
    window: int = 50,
    alpha: float = 0.5,
    z_thresh: float = 2.0,
) -> LorentzianModel:
    """Train a Lorentzian-based trading signal model.

    Parameters
    ----------
    data:
        Historical market data.  Accepts either a pandas ``DataFrame`` with
        a ``close`` column or any iterable sequence of numeric close prices.
    window:
        Rolling lookback window for computing Lorentzian distances.
    alpha:
        Smoothing factor for the exponential moving averages of the
        distance distribution.
    z_thresh:
        Threshold applied to the z-score of the Lorentzian distance to
        map into BUY/SELL/NEUTRAL signals.
    """

    if pd is not None and isinstance(data, pd.DataFrame):
        if "close" not in data.columns:
            raise KeyError("Input data must contain a `close` column")
        closes = _ensure_numeric_close(data["close"])
    else:
        closes = _ensure_numeric_close(data)

    if len(closes) <= window:
        raise ValueError("Not enough rows to compute Lorentzian distances for the given window")

    distances: List[float] = []

    for idx in range(window, len(closes)):
        reference = closes[idx - window : idx]
        current = closes[idx - window + 1 : idx + 1]
        distance = lorentzian_distance(current, reference)
        distances.append(distance)

    # Exponential moving averages allow smoother online updates versus
    # simple arithmetic averages.  They also encode the alpha hyperparameter
    # in the persisted model for inference environments to reproduce.
    ema_distances = _ema(distances, alpha)
    ema_squared = _ema((d ** 2 for d in distances), alpha)

    mean = ema_distances[-1]
    variance = max(ema_squared[-1] - mean**2, 0.0)
    std = math.sqrt(variance)

    sensitivity = mean + abs(z_thresh) * std
    if not math.isfinite(sensitivity) or sensitivity <= 0:
        baseline = abs(mean) + abs(z_thresh) * std
        sensitivity = max(baseline, 1e-6)

    trained_at = datetime.now(timezone.utc).isoformat()

    return LorentzianModel(
        window=window,
        alpha=alpha,
        z_thresh=z_thresh,
        mean=float(mean),
        std=float(std),
        trained_at=trained_at,
        sensitivity=float(sensitivity),
    )


def _load_closes_from_csv(path: Path) -> List[float]:
    """Return close prices from ``path`` using pandas when available."""

    if pd is not None:
        frame = pd.read_csv(path)

        # Ensure rows are sorted by timestamp if present.
        if "timestamp" in frame.columns:
            frame = frame.sort_values("timestamp")

        return _ensure_numeric_close(frame["close"])

    closes: List[float] = []
    with path.open("r", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames or "close" not in reader.fieldnames:
            raise KeyError("CSV must contain a `close` column")

        for idx, row in enumerate(reader, start=1):
            try:
                closes.append(float(row["close"]))
            except (TypeError, ValueError) as exc:  # pragma: no cover - provides context
                raise ValueError(f"Row {idx} has a non-numeric close value: {row['close']!r}") from exc

    if len(closes) == 0:
        raise ValueError("CSV file is empty")

    return closes


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the Lorentzian Distance Algo")
    parser.add_argument("--input", type=Path, default=Path("data/historical.csv"), help="Path to OHLCV CSV file")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("dynamic/models/lorentzian_v1.pkl"),
        help="Destination for the serialized model",
    )
    parser.add_argument("--window", type=int, default=50, help="Rolling window size")
    parser.add_argument("--alpha", type=float, default=0.5, help="Exponential smoothing factor")
    parser.add_argument("--z", type=float, default=2.0, help="Z-score threshold for signal changes")

    args = parser.parse_args()

    closes = _load_closes_from_csv(args.input)

    model = train_lorentzian(closes, window=args.window, alpha=args.alpha, z_thresh=args.z)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("wb") as f:
        pickle.dump(model.to_dict(), f)

    print(f"[TRAINED] Lorentzian model saved → {args.output}")
    print(model.to_dict())


if __name__ == "__main__":
    main()
