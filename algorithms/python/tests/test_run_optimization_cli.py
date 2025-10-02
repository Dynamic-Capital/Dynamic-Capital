from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Sequence

import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.run_optimization_cli import main, run


def _write_sample_csv(path: Path, *, rows: int = 40) -> None:
    start = datetime(2024, 1, 1, tzinfo=timezone.utc)
    with path.open("w", newline="") as handle:
        handle.write("timestamp,open,high,low,close\n")
        price = 100.0
        for index in range(rows):
            high = price + 0.5
            low = price - 0.4
            close = price + (0.25 if index % 2 == 0 else -0.2)
            timestamp = start + timedelta(minutes=5 * index)
            handle.write(
                f"{timestamp.isoformat()},{price:.4f},{high:.4f},{low:.4f},{close:.4f}\n"
            )
            price = close


def _invoke(argv: Sequence[str]) -> dict[str, object]:
    return run(argv)


def test_run_creates_summary(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    csv_path = tmp_path / "bars.csv"
    output_path = tmp_path / "summary.json"
    _write_sample_csv(csv_path)

    summary = _invoke(
        [
            "--input",
            str(csv_path),
            "--symbol",
            "XAUUSD",
            "--pip-size",
            "0.1",
            "--pip-value",
            "1.0",
            "--neighbors",
            "1",
            "2",
            "--label-lookahead",
            "2",
            "--output",
            str(output_path),
        ]
    )

    captured = capsys.readouterr()
    assert "Optimization summary" in captured.out
    assert summary["insights"]["snapshot_count"] > 0
    assert summary["best_config"]["neighbors"] in {1, 2}
    assert summary["backtest"]["performance"]["total_trades"] >= 0
    assert output_path.exists()


def test_main_returns_zero(tmp_path: Path) -> None:
    csv_path = tmp_path / "bars.csv"
    _write_sample_csv(csv_path)
    exit_code = main([
        "--input",
        str(csv_path),
    ])
    assert exit_code == 0

