"""Dataset packaging utilities for Dynamic Capital research workflows.

Streaming-friendly writers ensure large corpora can be exported without
materialising every record in memory. Records are shuffled in deterministic
chunks and flushed incrementally to the target format.
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Tuple

from .trade_logic import LabeledFeature


@dataclass(slots=True)
class DatasetSplitMetadata:
    """Summary describing a materialised dataset split."""

    path: Path
    count: int


class DatasetWriter:
    """Writes labelled samples into reproducible train/val/test splits."""

    def __init__(
        self,
        output_dir: Path | str,
        *,
        seed: int = 13,
        file_format: str = "parquet",
        shuffle_chunk_size: int = 2048,
    ) -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.seed = seed
        self.file_format = file_format.lower()
        self.shuffle_chunk_size = shuffle_chunk_size

    def write(
        self,
        samples: Sequence[LabeledFeature],
        *,
        splits: Tuple[float, float, float] = (0.7, 0.15, 0.15),
        metadata: Optional[Dict[str, object]] = None,
    ) -> Dict[str, DatasetSplitMetadata]:
        if not samples:
            raise ValueError("no labelled samples provided")
        if not math.isclose(sum(splits), 1.0, rel_tol=1e-3):
            raise ValueError("dataset splits must sum to 1.0")
        random_gen = random.Random(self.seed)
        total = len(samples)
        train_end = int(total * splits[0])
        val_end = train_end + int(total * splits[1])

        record_iter = (self._to_record(sample) for sample in samples)
        shuffled_records = self._chunked_shuffle(record_iter, random_gen)

        writers = {
            "train": self._open_split_writer("train"),
            "validation": self._open_split_writer("validation"),
            "test": self._open_split_writer("test"),
        }
        counts = {"train": 0, "validation": 0, "test": 0}

        try:
            for idx, record in enumerate(shuffled_records):
                if idx < train_end:
                    split = "train"
                elif idx < val_end:
                    split = "validation"
                else:
                    split = "test"
                writers[split].write(record)
                counts[split] += 1
        finally:
            for writer in writers.values():
                writer.close()

        partitions = {
            name: DatasetSplitMetadata(path=self._split_path(name), count=count)
            for name, count in counts.items()
        }
        meta = metadata or {}
        meta_payload = {
            "seed": self.seed,
            "format": self.file_format,
            "counts": counts,
            "metadata": meta,
        }
        (self.output_dir / "metadata.json").write_text(json.dumps(meta_payload, indent=2))
        return partitions

    def _chunked_shuffle(
        self,
        records: Iterable[dict],
        random_gen: random.Random,
    ) -> Iterator[dict]:
        chunk: list[dict] = []
        for record in records:
            chunk.append(record)
            if len(chunk) >= self.shuffle_chunk_size:
                random_gen.shuffle(chunk)
                yield from chunk
                chunk.clear()
        if chunk:
            random_gen.shuffle(chunk)
            yield from chunk

    def _open_split_writer(self, split: str) -> "_SplitWriter":
        path = self._split_path(split)
        if self.file_format == "json":
            return _JsonArrayWriter(path)
        if self.file_format == "jsonl":
            return _JsonLinesWriter(path)
        if self.file_format == "parquet":
            return _ParquetWriter(path)
        raise ValueError(f"Unsupported dataset format: {self.file_format}")

    def _split_path(self, split: str) -> Path:
        suffix = {
            "json": ".json",
            "jsonl": ".jsonl",
            "parquet": ".parquet",
        }.get(self.file_format)
        if suffix is None:
            raise ValueError(f"Unsupported dataset format: {self.file_format}")
        return self.output_dir / f"{split}{suffix}"

    @staticmethod
    def _to_record(sample: LabeledFeature) -> dict:
        payload = asdict(sample)
        payload["timestamp"] = sample.timestamp.isoformat()
        payload["features"] = list(sample.features)

        metadata = sample.metadata
        if metadata:
            # ``pyarrow`` requires struct columns to define their child schema.
            # By round-tripping through JSON we normalise any nested mapping
            # into plain Python containers while preserving values. When the
            # metadata is empty we explicitly store ``None`` so the column is
            # treated as nullable instead of an empty struct, which Parquet
            # cannot materialise.
            payload["metadata"] = json.loads(json.dumps(metadata))
        else:
            payload["metadata"] = None

        return payload

    def _chunked_shuffle_records_for_tests(
        self,
        records: Iterable[dict],
        random_gen: random.Random,
    ) -> list[dict]:  # pragma: no cover - helper for tests
        return list(self._chunked_shuffle(records, random_gen))


class _SplitWriter:
    def write(self, record: dict) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    def close(self) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class _JsonArrayWriter(_SplitWriter):
    def __init__(self, path: Path) -> None:
        self.handle = path.open("w", encoding="utf-8")
        self.started = False

    def write(self, record: dict) -> None:
        if not self.started:
            self.handle.write("[\n")
            self.started = True
        else:
            self.handle.write(",\n")
        json.dump(record, self.handle)

    def close(self) -> None:
        if not self.started:
            self.handle.write("[]\n")
        else:
            self.handle.write("\n]\n")
        self.handle.close()


class _JsonLinesWriter(_SplitWriter):
    def __init__(self, path: Path) -> None:
        self.handle = path.open("w", encoding="utf-8")

    def write(self, record: dict) -> None:
        self.handle.write(json.dumps(record) + "\n")

    def close(self) -> None:
        self.handle.close()


class _ParquetWriter(_SplitWriter):
    def __init__(self, path: Path, chunk_size: int = 512) -> None:
        try:
            import pyarrow as pa  # type: ignore
            import pyarrow.parquet as pq  # type: ignore
        except ModuleNotFoundError as exc:  # pragma: no cover - optional dep
            raise RuntimeError(
                "pyarrow is required for parquet output; install pyarrow to enable streaming parquet writes"
            ) from exc

        self.path = path
        self.chunk_size = chunk_size
        self._buffer: list[dict] = []
        self._pa = pa
        self._pq = pq
        self._writer: Optional[pq.ParquetWriter] = None

    def write(self, record: dict) -> None:
        self._buffer.append(record)
        if len(self._buffer) >= self.chunk_size:
            self._flush()

    def close(self) -> None:
        self._flush()
        if self._writer is not None:
            self._writer.close()
        else:
            empty_table = self._pa.table({})
            with self._pq.ParquetWriter(self.path, empty_table.schema) as writer:
                writer.write_table(empty_table)

    def _flush(self) -> None:
        if not self._buffer:
            return
        table = self._pa.Table.from_pylist(self._buffer)
        if self._writer is None:
            self._writer = self._pq.ParquetWriter(self.path, table.schema)
        self._writer.write_table(table)
        self._buffer.clear()


__all__ = ["DatasetWriter", "DatasetSplitMetadata"]
