"""Dataset packaging utilities for Dynamic Capital research workflows."""

from __future__ import annotations

import json
import math
import random
from dataclasses import asdict
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple

from .trade_logic import LabeledFeature

try:  # pragma: no cover - optional dependency for parquet output
    import pandas as _pd  # type: ignore
except Exception:  # pragma: no cover
    _pd = None


class DatasetWriter:
    """Writes labelled samples into reproducible train/val/test splits."""

    def __init__(
        self,
        output_dir: Path | str,
        *,
        seed: int = 13,
        file_format: str = "parquet",
    ) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.seed = seed
        self.file_format = file_format.lower()

    def write(
        self,
        samples: Sequence[LabeledFeature],
        *,
        splits: Tuple[float, float, float] = (0.7, 0.15, 0.15),
        metadata: Optional[Dict[str, object]] = None,
    ) -> Dict[str, List[dict]]:
        if not samples:
            raise ValueError("no labelled samples provided")
        if not math.isclose(sum(splits), 1.0, rel_tol=1e-3):
            raise ValueError("dataset splits must sum to 1.0")
        random_gen = random.Random(self.seed)
        records = [self._to_record(sample) for sample in samples]
        random_gen.shuffle(records)
        total = len(records)
        train_end = int(total * splits[0])
        val_end = train_end + int(total * splits[1])
        partitions = {
            "train": records[:train_end],
            "validation": records[train_end:val_end],
            "test": records[val_end:],
        }
        for split_name, split_records in partitions.items():
            self._write_split(split_name, split_records)
        meta = metadata or {}
        meta_payload = {
            "seed": self.seed,
            "format": self.file_format,
            "counts": {key: len(value) for key, value in partitions.items()},
            "metadata": meta,
        }
        (self.output_dir / "metadata.json").write_text(json.dumps(meta_payload, indent=2))
        return partitions

    def _write_split(self, split: str, records: List[dict]) -> None:
        if self.file_format == "parquet" and _pd is not None:
            path = self.output_dir / f"{split}.parquet"
            frame = _pd.DataFrame.from_records(records)
            frame.to_parquet(path, index=False)
            return
        if self.file_format == "json":
            path = self.output_dir / f"{split}.json"
            with path.open("w") as handle:
                json.dump(records, handle, indent=2)
            return
        if self.file_format == "jsonl":
            path = self.output_dir / f"{split}.jsonl"
            with path.open("w") as handle:
                for record in records:
                    handle.write(json.dumps(record) + "\n")
            return
        raise ValueError(f"Unsupported dataset format: {self.file_format}")

    @staticmethod
    def _to_record(sample: LabeledFeature) -> dict:
        payload = asdict(sample)
        payload["timestamp"] = sample.timestamp.isoformat()
        payload["features"] = list(sample.features)
        return payload


__all__ = ["DatasetWriter"]
