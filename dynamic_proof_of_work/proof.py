"""Adaptive proof-of-work utilities."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha256
import json
from typing import Deque, Mapping, Sequence

__all__ = [
    "DynamicProofOfWork",
    "MiningResult",
    "WorkSample",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_utc(value: datetime | None) -> datetime:
    if value is None:
        return _utcnow()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_hash(value: str) -> str:
    cleaned = value.strip().lower()
    if len(cleaned) != 64:
        raise ValueError("hash must be 64 hexadecimal characters")
    try:
        int(cleaned, 16)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise ValueError("hash must be hexadecimal") from exc
    return cleaned


def _coerce_difficulty(value: int) -> int:
    try:
        difficulty = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("difficulty must be an integer") from exc
    if difficulty < 1:
        raise ValueError("difficulty must be at least 1")
    return difficulty


def _coerce_positive_int(value: int, *, name: str) -> int:
    try:
        integer = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be an integer") from exc
    if integer < 1:
        raise ValueError(f"{name} must be at least 1")
    return integer


def _coerce_positive_float(value: float, *, name: str) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be numeric") from exc
    if number <= 0:
        raise ValueError(f"{name} must be greater than 0")
    return number


def _coerce_nonce(value: int) -> int:
    try:
        nonce = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError("nonce must be an integer") from exc
    if nonce < 0:
        raise ValueError("nonce must be non-negative")
    return nonce


def _coerce_duration(value: float) -> float:
    duration = _coerce_positive_float(value, name="duration")
    return duration


def _normalise_payload(payload: Mapping[str, object] | Sequence[object] | bytes | str) -> bytes:
    if isinstance(payload, bytes):
        return payload
    if isinstance(payload, str):
        return payload.encode("utf-8")
    if isinstance(payload, Mapping) or isinstance(payload, Sequence):
        try:
            encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
        except TypeError as exc:  # pragma: no cover - defensive guard
            raise TypeError("payload must be JSON serialisable") from exc
        return encoded
    raise TypeError("payload must be bytes, str, mapping, or sequence")


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class WorkSample:
    """Historical record of a mined block."""

    difficulty: int
    duration: float
    timestamp: datetime | None = None

    def __post_init__(self) -> None:
        self.difficulty = _coerce_difficulty(self.difficulty)
        self.duration = _coerce_duration(self.duration)
        self.timestamp = _ensure_utc(self.timestamp)


@dataclass(slots=True)
class MiningResult:
    """Result of a mining attempt."""

    nonce: int
    hash: str
    difficulty: int
    started_at: datetime
    completed_at: datetime

    def __post_init__(self) -> None:
        self.nonce = _coerce_nonce(self.nonce)
        self.hash = _normalise_hash(self.hash)
        self.difficulty = _coerce_difficulty(self.difficulty)
        self.started_at = _ensure_utc(self.started_at)
        self.completed_at = _ensure_utc(self.completed_at)
        if self.completed_at < self.started_at:
            raise ValueError("completed_at must not be earlier than started_at")

    @property
    def duration(self) -> float:
        return (self.completed_at - self.started_at).total_seconds()

    def to_sample(self) -> WorkSample:
        return WorkSample(difficulty=self.difficulty, duration=self.duration, timestamp=self.completed_at)


# ---------------------------------------------------------------------------
# proof-of-work engine


@dataclass
class DynamicProofOfWork:
    """Provides adaptive proof-of-work mining with difficulty retargeting."""

    difficulty: int = 3
    target_seconds: float = 10.0
    sample_window: int = 20
    max_adjustment_ratio: float = 4.0
    auto_adjust: bool = True
    _samples: Deque[WorkSample] = field(default_factory=deque, init=False, repr=False)

    def __post_init__(self) -> None:
        self.difficulty = _coerce_difficulty(self.difficulty)
        self.target_seconds = _coerce_positive_float(self.target_seconds, name="target_seconds")
        self.sample_window = _coerce_positive_int(self.sample_window, name="sample_window")
        self.max_adjustment_ratio = _coerce_positive_float(
            self.max_adjustment_ratio, name="max_adjustment_ratio"
        )
        if self.max_adjustment_ratio < 1:
            raise ValueError("max_adjustment_ratio must be at least 1")

    # ------------------------------------------------------------------
    # mining utilities

    @staticmethod
    def compute_hash(payload: Mapping[str, object] | Sequence[object] | bytes | str, *, nonce: int, difficulty: int) -> str:
        base = _normalise_payload(payload)
        nonce_value = _coerce_nonce(nonce)
        difficulty_value = _coerce_difficulty(difficulty)
        prefix = base + f":{difficulty_value}:".encode("ascii")
        candidate = sha256(prefix + str(nonce_value).encode("ascii")).hexdigest()
        return candidate

    @staticmethod
    def verify(
        payload: Mapping[str, object] | Sequence[object] | bytes | str,
        *,
        nonce: int,
        difficulty: int,
        hash_value: str | None = None,
    ) -> bool:
        candidate = DynamicProofOfWork.compute_hash(payload, nonce=nonce, difficulty=difficulty)
        target_prefix = "0" * _coerce_difficulty(difficulty)
        if hash_value is None:
            return candidate.startswith(target_prefix)
        try:
            expected = _normalise_hash(hash_value)
        except ValueError:
            return False
        return candidate == expected and candidate.startswith(target_prefix)

    def mine(
        self,
        payload: Mapping[str, object] | Sequence[object] | bytes | str,
        *,
        difficulty: int | None = None,
        start_nonce: int = 0,
    ) -> MiningResult:
        effective_difficulty = _coerce_difficulty(difficulty or self.difficulty)
        base = _normalise_payload(payload)
        prefix = base + f":{effective_difficulty}:".encode("ascii")
        target_prefix = "0" * effective_difficulty

        nonce = _coerce_nonce(start_nonce)
        started_at = _ensure_utc(None)
        while True:
            candidate = sha256(prefix + str(nonce).encode("ascii")).hexdigest()
            if candidate.startswith(target_prefix):
                completed_at = _ensure_utc(None)
                result = MiningResult(
                    nonce=nonce,
                    hash=candidate,
                    difficulty=effective_difficulty,
                    started_at=started_at,
                    completed_at=completed_at,
                )
                should_update = bool(self.auto_adjust and difficulty is None)
                self.observe(
                    duration=result.duration,
                    difficulty=result.difficulty,
                    timestamp=result.completed_at,
                    update_difficulty=should_update,
                )
                return result
            nonce += 1

    # ------------------------------------------------------------------
    # observation and tuning

    @property
    def samples(self) -> tuple[WorkSample, ...]:
        return tuple(self._samples)

    @property
    def average_duration(self) -> float | None:
        if not self._samples:
            return None
        return sum(sample.duration for sample in self._samples) / len(self._samples)

    def observe(
        self,
        *,
        duration: float,
        difficulty: int,
        timestamp: datetime | None = None,
        update_difficulty: bool | None = None,
    ) -> WorkSample:
        sample = WorkSample(difficulty=difficulty, duration=duration, timestamp=timestamp)
        self._record_sample(sample)
        should_update = self.auto_adjust if update_difficulty is None else update_difficulty
        if should_update:
            self.difficulty = self.calculate_next_difficulty(base_difficulty=sample.difficulty)
        return sample

    def calculate_next_difficulty(self, *, base_difficulty: int | None = None) -> int:
        base = _coerce_difficulty(base_difficulty or self.difficulty)
        if not self._samples:
            return base
        average = self.average_duration
        if average is None or average <= 0:  # pragma: no cover - defensive guard
            return base
        ratio = self.target_seconds / average
        max_ratio = max(1.0 / self.max_adjustment_ratio, min(self.max_adjustment_ratio, ratio))
        adjusted = round(base * max_ratio)
        return max(1, adjusted)

    def _record_sample(self, sample: WorkSample) -> None:
        self._samples.append(sample)
        while len(self._samples) > self.sample_window:
            self._samples.popleft()
