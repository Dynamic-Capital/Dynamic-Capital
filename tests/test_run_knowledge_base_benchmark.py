from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def test_cli_emits_summary(tmp_path: Path) -> None:
    config = {
        "domains": {
            "DAI": {
                "coverage": {"present": 19, "required": 20},
                "accuracy": {"ratio": 0.92},
                "governance": {"hours_since_last_probe": 20, "failed_probes": 0},
            },
            "DAGI": {
                "coverage": {"ratio": 0.9},
                "accuracy": {"passing": 80, "sampled": 90},
                "governance": {"hours_since_last_probe": 30, "failed_probes": 1},
            },
        }
    }
    config_path = tmp_path / "benchmark.json"
    config_path.write_text(json.dumps(config), encoding="utf-8")

    result = subprocess.run(
        [
            sys.executable,
            "scripts/run_knowledge_base_benchmark.py",
            "--config",
            str(config_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    assert "Knowledge Base Benchmark Results" in result.stdout
    assert "DAI" in result.stdout
    assert "Remediation Guidance" in result.stdout
    assert "Comprehensive Grade" in result.stdout
    assert "Weighted Metrics" in result.stdout
