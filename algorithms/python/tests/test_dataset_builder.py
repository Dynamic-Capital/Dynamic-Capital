from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.dataset_builder import DatasetWriter
from algorithms.python.trade_logic import LabeledFeature


def _make_samples(count: int) -> list[LabeledFeature]:
    start = datetime(2024, 1, 1)
    samples: list[LabeledFeature] = []
    for idx in range(count):
        samples.append(
            LabeledFeature(
                features=(float(idx), float(idx + 1)),
                label=idx % 3 - 1,
                close=100.0 + idx,
                timestamp=start + timedelta(minutes=idx),
            )
        )
    return samples


def test_dataset_writer_generates_json_and_jsonl(tmp_path: Path):
    samples = _make_samples(7)

    json_dir = tmp_path / "json"
    json_writer = DatasetWriter(json_dir, file_format="json")
    json_partitions = json_writer.write(samples)

    train_json = json.loads((json_dir / "train.json").read_text())
    validation_json = json.loads((json_dir / "validation.json").read_text())
    test_json = json.loads((json_dir / "test.json").read_text())
    metadata = json.loads((json_dir / "metadata.json").read_text())

    assert train_json == json_partitions["train"]
    assert validation_json == json_partitions["validation"]
    assert test_json == json_partitions["test"]
    assert metadata["format"] == "json"

    jsonl_dir = tmp_path / "jsonl"
    jsonl_writer = DatasetWriter(jsonl_dir, file_format="jsonl")
    jsonl_partitions = jsonl_writer.write(samples)

    train_jsonl_path = jsonl_dir / "train.jsonl"
    validation_jsonl_path = jsonl_dir / "validation.jsonl"
    test_jsonl_path = jsonl_dir / "test.jsonl"
    metadata_jsonl = json.loads((jsonl_dir / "metadata.json").read_text())

    train_jsonl = [json.loads(line) for line in train_jsonl_path.read_text().splitlines()]
    validation_jsonl = [
        json.loads(line) for line in validation_jsonl_path.read_text().splitlines()
    ]
    test_jsonl = [json.loads(line) for line in test_jsonl_path.read_text().splitlines()]

    assert train_jsonl == jsonl_partitions["train"]
    assert validation_jsonl == jsonl_partitions["validation"]
    assert test_jsonl == jsonl_partitions["test"]
    assert metadata_jsonl["format"] == "jsonl"
