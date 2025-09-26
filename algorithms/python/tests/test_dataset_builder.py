from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.dataset_builder import DatasetWriter
from algorithms.python.trade_logic import LabeledFeature

try:
    import pyarrow.parquet as _pq  # type: ignore
except ModuleNotFoundError:  # pragma: no cover - optional dependency
    _pq = None


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


def test_dataset_writer_generates_json_and_jsonl(tmp_path: Path) -> None:
    samples = _make_samples(17)

    json_dir = tmp_path / "json"
    json_writer = DatasetWriter(json_dir, file_format="json", shuffle_chunk_size=5)
    json_partitions = json_writer.write(samples)

    train_json = json.loads((json_dir / "train.json").read_text())
    validation_json = json.loads((json_dir / "validation.json").read_text())
    test_json = json.loads((json_dir / "test.json").read_text())
    metadata = json.loads((json_dir / "metadata.json").read_text())

    assert len(train_json) == json_partitions["train"].count
    assert len(validation_json) == json_partitions["validation"].count
    assert len(test_json) == json_partitions["test"].count
    assert json_partitions["train"].path.name == "train.json"
    assert metadata["format"] == "json"
    assert metadata["counts"]["train"] == json_partitions["train"].count

    jsonl_dir = tmp_path / "jsonl"
    jsonl_writer = DatasetWriter(jsonl_dir, file_format="jsonl", shuffle_chunk_size=4)
    jsonl_partitions = jsonl_writer.write(samples)

    train_lines = [json.loads(line) for line in (jsonl_dir / "train.jsonl").read_text().splitlines()]
    validation_lines = [
        json.loads(line) for line in (jsonl_dir / "validation.jsonl").read_text().splitlines()
    ]
    test_lines = [json.loads(line) for line in (jsonl_dir / "test.jsonl").read_text().splitlines()]
    metadata_jsonl = json.loads((jsonl_dir / "metadata.json").read_text())

    assert len(train_lines) == jsonl_partitions["train"].count
    assert len(validation_lines) == jsonl_partitions["validation"].count
    assert len(test_lines) == jsonl_partitions["test"].count
    assert metadata_jsonl["format"] == "jsonl"
    assert metadata_jsonl["counts"]["test"] == jsonl_partitions["test"].count


@pytest.mark.skipif(_pq is None, reason="pyarrow is required for parquet output")
def test_dataset_writer_streams_parquet(tmp_path: Path) -> None:
    samples = _make_samples(32)
    parquet_dir = tmp_path / "parquet"
    writer = DatasetWriter(parquet_dir, file_format="parquet", shuffle_chunk_size=6)
    partitions = writer.write(samples)

    train_meta = partitions["train"]
    assert train_meta.path.exists()

    table = _pq.read_table(train_meta.path)  # type: ignore[arg-type]
    assert table.num_rows == train_meta.count

    metadata = json.loads((parquet_dir / "metadata.json").read_text())
    assert metadata["counts"]["train"] == train_meta.count
