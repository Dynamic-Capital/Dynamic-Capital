from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

import pytest

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from algorithms.python.data_cleaning_algorithm import (  # noqa: E402
    DataCleaningAlgorithm,
    DataCleaningConfig,
)


def test_data_cleaning_algorithm_filters_invalid_records() -> None:
    records = [
        {
            "id": " 123 ",
            "timestamp": "2024-01-01T00:00:00Z",
            "content": "  Hello   World  ",
            "category": "Signal",
            "confidence": "0.9",
        },
        {
            "id": "123",
            "timestamp": "2024-01-01T00:00:00+00:00",
            "content": "Hello World",
            "category": "signal",
            "confidence": 0.9,
        },
        {
            "id": "124",
            "timestamp": "2024-01-01T00:01:00Z",
            "content": "Alpha",
            "category": "Insight",
            "confidence": 0.2,
        },
        {
            "id": "125",
            "timestamp": "2024-01-01T00:02:00Z",
            "content": "   ",
            "category": "alert",
            "confidence": 0.5,
        },
        {
            "id": "126",
            "timestamp": 1704067380,
            "content": "Beta",
            "category": "ALERT",
            "confidence": "1.0",
        },
    ]
    config = DataCleaningConfig(
        required_fields=("id", "timestamp", "content"),
        duplicate_keys=("id", "timestamp"),
        text_fields=("content", "id"),
        timestamp_fields=("timestamp",),
        numeric_fields=("confidence",),
        numeric_bounds={"confidence": (0.0, 1.0)},
        category_aliases={"category": {"signal": "signal", "alert": "alert"}},
        outlier_zscore_threshold=None,
    )

    dataset = DataCleaningAlgorithm().clean(records, config)

    assert len(dataset.records) == 2
    first, second = dataset.records
    assert first["id"] == "123"
    assert first["content"] == "Hello World"
    assert first["category"] == "signal"
    assert isinstance(first["timestamp"], datetime)
    assert first["timestamp"].tzinfo is not None
    assert second["category"] == "alert"
    assert second["timestamp"] == datetime(2024, 1, 1, 0, 3, tzinfo=timezone.utc)

    metrics = dataset.metrics
    assert metrics.total_records == len(records)
    assert metrics.retained_records == 2
    assert metrics.dropped_records == 3
    assert metrics.issue_counts["duplicates"] == 1
    assert metrics.issue_counts["invalid_category"] == 1
    assert metrics.issue_counts["missing_required"] == 1

    stats = metrics.numeric_field_stats["confidence"]
    assert stats.count == 2
    assert pytest.approx(stats.mean, rel=1e-6) == 0.95
    assert pytest.approx(stats.maximum, rel=1e-6) == 1.0
    assert pytest.approx(stats.minimum, rel=1e-6) == 0.9

    payload = dataset.to_dict()
    assert payload["metrics"]["retained_records"] == 2
    assert payload["records"][0]["content"] == "Hello World"


def test_outlier_detection_removes_extreme_values() -> None:
    records = [
        {
            "id": "a",
            "timestamp": "2024-01-01T00:00:00Z",
            "content": "Alpha",
            "score": 0.50,
        },
        {
            "id": "b",
            "timestamp": "2024-01-01T00:02:00Z",
            "content": "Beta",
            "score": 0.52,
        },
        {
            "id": "c",
            "timestamp": "2024-01-01T00:04:00Z",
            "content": "Gamma",
            "score": 0.55,
        },
        {
            "id": "d",
            "timestamp": "2024-01-01T00:06:00Z",
            "content": "Delta",
            "score": 0.58,
        },
        {
            "id": "e",
            "timestamp": "2024-01-01T00:08:00Z",
            "content": "Epsilon",
            "score": 0.62,
        },
        {
            "id": "f",
            "timestamp": "2024-01-01T00:10:00Z",
            "content": "Zeta",
            "score": 8.0,
        },
    ]
    config = DataCleaningConfig(
        required_fields=("id", "timestamp", "content"),
        duplicate_keys=("id",),
        text_fields=("content",),
        timestamp_fields=("timestamp",),
        numeric_fields=("score",),
        outlier_zscore_threshold=2.0,
    )

    dataset = DataCleaningAlgorithm().clean(records, config)

    assert len(dataset.records) == 5
    assert all(record["id"] != "f" for record in dataset.records)
    assert dataset.metrics.issue_counts["outliers"] == 1

    stats = dataset.metrics.numeric_field_stats["score"]
    assert stats.count == 5
    expected_mean = sum(v["score"] for v in records[:-1]) / 5
    assert stats.mean == pytest.approx(expected_mean, rel=1e-6)
    assert stats.maximum == pytest.approx(max(v["score"] for v in records[:-1]), rel=1e-6)


def test_invalid_record_type_emits_issue() -> None:
    dataset = DataCleaningAlgorithm().clean(["not a mapping"], DataCleaningConfig())

    assert dataset.records == []
    assert dataset.metrics.retained_records == 0
    assert dataset.metrics.issue_counts["invalid_record"] == 1
    assert dataset.issues[0].category == "invalid_record"
