"""Dynamic AI data cleaning pipeline used to curate training corpora."""

from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping as MappingABC, Sequence as SequenceABC
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
import math
from numbers import Real
from typing import Mapping, Sequence


@dataclass(slots=True)
class DataIssue:
    """Issue encountered while processing a record."""

    record_index: int | None
    field: str | None
    category: str
    message: str

    def to_dict(self) -> dict[str, object]:
        return {
            "record_index": self.record_index,
            "field": self.field,
            "category": self.category,
            "message": self.message,
        }


@dataclass(slots=True)
class NumericFieldStats:
    """Descriptive statistics for a numeric field."""

    count: int
    mean: float
    stddev: float
    minimum: float
    maximum: float

    def to_dict(self) -> dict[str, float]:
        return {
            "count": self.count,
            "mean": self.mean,
            "stddev": self.stddev,
            "min": self.minimum,
            "max": self.maximum,
        }


@dataclass(slots=True)
class DataQualityMetrics:
    """Aggregate quality metrics for a cleaned dataset."""

    total_records: int
    retained_records: int
    dropped_records: int
    issue_counts: dict[str, int]
    numeric_field_stats: dict[str, NumericFieldStats]

    def to_dict(self) -> dict[str, object]:
        return {
            "total_records": self.total_records,
            "retained_records": self.retained_records,
            "dropped_records": self.dropped_records,
            "issue_counts": dict(self.issue_counts),
            "numeric_field_stats": {
                field: stats.to_dict() for field, stats in self.numeric_field_stats.items()
            },
        }


@dataclass(slots=True)
class CleanedDataset:
    """Container for cleaned records, associated issues, and metrics."""

    records: list[dict[str, object]]
    issues: list[DataIssue]
    metrics: DataQualityMetrics

    def to_dict(self) -> dict[str, object]:
        return {
            "records": [dict(record) for record in self.records],
            "issues": [issue.to_dict() for issue in self.issues],
            "metrics": self.metrics.to_dict(),
        }


@dataclass(slots=True)
class DataCleaningConfig:
    """Configuration flags for the data cleaning pipeline."""

    required_fields: Sequence[str] = ("id", "timestamp", "content")
    duplicate_keys: Sequence[str] = ("id",)
    text_fields: Sequence[str] = ("content",)
    timestamp_fields: Sequence[str] = ("timestamp",)
    numeric_fields: Sequence[str] = ()
    numeric_bounds: Mapping[str, tuple[float | None, float | None]] = field(default_factory=dict)
    category_aliases: Mapping[str, Mapping[str, str]] = field(default_factory=dict)
    outlier_zscore_threshold: float | None = 4.0
    normalise_whitespace: bool = True


@dataclass(slots=True)
class _ProcessedRecord:
    record: dict[str, object]
    original_index: int
    numeric_values: dict[str, float]


class DataCleaningAlgorithm:
    """Cleans heterogeneous Dynamic AI records for downstream modelling."""

    def clean(
        self,
        records: Sequence[Mapping[str, object]],
        config: DataCleaningConfig | None = None,
    ) -> CleanedDataset:
        cfg = config or DataCleaningConfig()
        total = len(records)
        issues: list[DataIssue] = []
        issue_counts: defaultdict[str, int] = defaultdict(int)
        processed: list[_ProcessedRecord] = []
        seen_keys: set[tuple[object, ...]] = set()

        category_maps = {
            field: {alias.casefold(): canonical for alias, canonical in mapping.items()}
            for field, mapping in cfg.category_aliases.items()
        }

        for index, raw in enumerate(records):
            if not isinstance(raw, MappingABC):
                issue_counts["invalid_record"] += 1
                issues.append(
                    DataIssue(
                        record_index=index,
                        field=None,
                        category="invalid_record",
                        message="record must be a mapping",
                    )
                )
                continue

            data: dict[str, object] = dict(raw)
            for field in cfg.text_fields:
                if field not in data:
                    continue
                value = data[field]
                if value is None:
                    continue
                if not isinstance(value, str):
                    value = str(value)
                cleaned = _normalise_text(value, collapse_whitespace=cfg.normalise_whitespace)
                data[field] = cleaned if cleaned else None

            missing_required = False
            for field in cfg.required_fields:
                if field not in data or _is_missing(data[field]):
                    issue_counts["missing_required"] += 1
                    issues.append(
                        DataIssue(
                            record_index=index,
                            field=field,
                            category="missing_required",
                            message=f"required field '{field}' is missing",
                        )
                    )
                    missing_required = True
            if missing_required:
                continue

            category_error = False
            for field, mapping in category_maps.items():
                if field not in data or data[field] is None:
                    continue
                value = data[field]
                if not isinstance(value, str):
                    value = str(value)
                canonical = mapping.get(value.strip().casefold())
                if canonical is None:
                    issue_counts["invalid_category"] += 1
                    issues.append(
                        DataIssue(
                            record_index=index,
                            field=field,
                            category="invalid_category",
                            message=f"unrecognised category value: {value!r}",
                        )
                    )
                    category_error = True
                    break
                data[field] = canonical
            if category_error:
                continue

            timestamp_error = False
            for field in cfg.timestamp_fields:
                if field not in data or data[field] is None:
                    continue
                try:
                    data[field] = _parse_timestamp(data[field])
                except (TypeError, ValueError) as exc:
                    issue_counts["invalid_timestamp"] += 1
                    issues.append(
                        DataIssue(
                            record_index=index,
                            field=field,
                            category="invalid_timestamp",
                            message=str(exc),
                        )
                    )
                    timestamp_error = True
                    break
            if timestamp_error:
                continue

            numeric_values: dict[str, float] = {}
            numeric_error = False
            for field in cfg.numeric_fields:
                if field not in data or data[field] is None:
                    continue
                try:
                    numeric = _coerce_numeric(data[field])
                except (TypeError, ValueError) as exc:
                    issue_counts["invalid_numeric"] += 1
                    issues.append(
                        DataIssue(
                            record_index=index,
                            field=field,
                            category="invalid_numeric",
                            message=str(exc),
                        )
                    )
                    numeric_error = True
                    break
                bounds = cfg.numeric_bounds.get(field)
                if bounds:
                    lower, upper = bounds
                    if (lower is not None and numeric < lower) or (upper is not None and numeric > upper):
                        issue_counts["invalid_numeric"] += 1
                        issues.append(
                            DataIssue(
                                record_index=index,
                                field=field,
                                category="invalid_numeric",
                                message=f"value {numeric} outside bounds {bounds}",
                            )
                        )
                        numeric_error = True
                        break
                data[field] = numeric
                numeric_values[field] = numeric
            if numeric_error:
                continue

            if cfg.duplicate_keys:
                key = tuple(_normalise_key(data.get(field)) for field in cfg.duplicate_keys)
                if key in seen_keys:
                    issue_counts["duplicates"] += 1
                    issues.append(
                        DataIssue(
                            record_index=index,
                            field=None,
                            category="duplicate",
                            message="duplicate record detected",
                        )
                    )
                    continue
                seen_keys.add(key)

            processed.append(
                _ProcessedRecord(record=data, original_index=index, numeric_values=numeric_values)
            )

        processed = self._remove_outliers(processed, cfg, issues, issue_counts)

        cleaned_records = [item.record for item in processed]
        metrics = DataQualityMetrics(
            total_records=total,
            retained_records=len(cleaned_records),
            dropped_records=total - len(cleaned_records),
            issue_counts=dict(issue_counts),
            numeric_field_stats=_summarise_numeric_fields(processed, cfg.numeric_fields),
        )
        return CleanedDataset(records=cleaned_records, issues=issues, metrics=metrics)

    @staticmethod
    def _remove_outliers(
        processed: Sequence[_ProcessedRecord],
        cfg: DataCleaningConfig,
        issues: list[DataIssue],
        issue_counts: dict[str, int],
    ) -> list[_ProcessedRecord]:
        threshold = cfg.outlier_zscore_threshold
        if threshold is None or threshold <= 0:
            return list(processed)

        outlier_fields: dict[int, list[str]] = {}
        for field in cfg.numeric_fields:
            field_entries = [
                (idx, item.numeric_values[field])
                for idx, item in enumerate(processed)
                if field in item.numeric_values
            ]
            if len(field_entries) < 2:
                continue
            _, values = zip(*field_entries)
            mean, stddev = _mean_std(values)
            if stddev == 0:
                continue
            for idx, value in field_entries:
                zscore = abs(value - mean) / stddev
                if zscore > threshold:
                    outlier_fields.setdefault(idx, []).append(field)

        if not outlier_fields:
            return list(processed)

        filtered: list[_ProcessedRecord] = []
        for idx, item in enumerate(processed):
            fields = outlier_fields.get(idx)
            if not fields:
                filtered.append(item)
                continue
            issue_counts["outliers"] += 1
            joined = ", ".join(sorted(fields))
            issues.append(
                DataIssue(
                    record_index=item.original_index,
                    field=None,
                    category="outlier",
                    message=f"z-score above {threshold} for fields: {joined}",
                )
            )
        return filtered


def _normalise_text(value: str, *, collapse_whitespace: bool) -> str:
    cleaned = value.replace("\u200b", "").strip()
    if collapse_whitespace:
        cleaned = " ".join(cleaned.split())
    return cleaned


def _is_missing(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    if isinstance(value, MappingABC):
        return not value
    if isinstance(value, SequenceABC) and not isinstance(value, (str, bytes, bytearray)):
        return len(value) == 0
    return False


def _normalise_key(value: object) -> object:
    if isinstance(value, str):
        return _normalise_text(value, collapse_whitespace=True).casefold()
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    return value


def _coerce_numeric(value: object) -> float:
    if isinstance(value, Real) and not isinstance(value, bool):
        numeric = float(value)
    elif isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        if not cleaned:
            raise ValueError("numeric value cannot be empty")
        numeric = float(cleaned)
    else:
        raise TypeError("value must be numeric")
    if not math.isfinite(numeric):
        raise ValueError("numeric value must be finite")
    return numeric


def _parse_timestamp(value: object) -> datetime:
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, date):
        dt = datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    elif isinstance(value, Real) and not isinstance(value, bool):
        dt = datetime.fromtimestamp(float(value), tz=timezone.utc)
    elif isinstance(value, str):
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("timestamp cannot be empty")
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(cleaned)
        except ValueError:
            try:
                dt = datetime.fromtimestamp(float(cleaned), tz=timezone.utc)
            except ValueError as exc:
                raise ValueError(f"unrecognised timestamp format: {value!r}") from exc
    else:
        raise TypeError("timestamp must be datetime, date, string, or numeric")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def _mean_std(values: Sequence[float]) -> tuple[float, float]:
    total = len(values)
    if total == 0:
        return 0.0, 0.0
    mean = sum(values) / total
    if total == 1:
        return mean, 0.0
    variance = sum((value - mean) ** 2 for value in values) / (total - 1)
    return mean, math.sqrt(variance)


def _summarise_numeric_fields(
    processed: Sequence[_ProcessedRecord],
    numeric_fields: Sequence[str],
) -> dict[str, NumericFieldStats]:
    summary: dict[str, NumericFieldStats] = {}
    for field in numeric_fields:
        values = [item.numeric_values[field] for item in processed if field in item.numeric_values]
        if not values:
            continue
        mean, stddev = _mean_std(values)
        summary[field] = NumericFieldStats(
            count=len(values),
            mean=mean,
            stddev=stddev,
            minimum=min(values),
            maximum=max(values),
        )
    return summary
