"""Dynamic Proof of Space/Storage (PoSpace/PoST) primitives."""

from __future__ import annotations

import math
import secrets
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import blake2b, sha256
from types import MappingProxyType
from typing import Deque, Mapping, Sequence

__all__ = [
    "Challenge",
    "DynamicProofOfSpace",
    "FarmerScore",
    "ProofResponse",
    "SpacePlot",
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


def _normalise_identifier(value: str, *, name: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError(f"{name} must not be empty")
    return text


def _coerce_positive_int(value: int, *, name: str) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be an integer") from exc
    if numeric <= 0:
        raise ValueError(f"{name} must be positive")
    return numeric


def _coerce_non_negative_int(value: int, *, name: str) -> int:
    try:
        numeric = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guard
        raise TypeError(f"{name} must be an integer") from exc
    if numeric < 0:
        raise ValueError(f"{name} must be non-negative")
    return numeric


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return MappingProxyType(dict(metadata))


def _normalise_hex(value: str, *, name: str, length: int | None = None) -> str:
    text = str(value).strip().lower()
    if not text:
        raise ValueError(f"{name} must not be empty")
    try:
        int(text, 16)
    except ValueError as exc:
        raise ValueError(f"{name} must be a hexadecimal string") from exc
    if length is not None and len(text) != length:
        raise ValueError(f"{name} must be {length} hex characters long")
    return text


def _coerce_plot(plot: SpacePlot | Mapping[str, object]) -> SpacePlot:
    if isinstance(plot, SpacePlot):
        return plot
    if not isinstance(plot, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("plot must be a SpacePlot or mapping")
    return SpacePlot(**plot)


def _coerce_proof(proof: ProofResponse | Mapping[str, object]) -> ProofResponse:
    if isinstance(proof, ProofResponse):
        return proof
    if not isinstance(proof, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("proof must be a ProofResponse or mapping")
    return ProofResponse(**proof)


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class SpacePlot:
    """Registered storage plot that can answer PoSpace challenges."""

    plot_id: str
    farmer_id: str
    size_bytes: int
    k_parameter: int
    commitment: str
    created_at: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.plot_id = _normalise_identifier(self.plot_id, name="plot_id")
        self.farmer_id = _normalise_identifier(self.farmer_id, name="farmer_id")
        self.size_bytes = _coerce_positive_int(self.size_bytes, name="size_bytes")
        self.k_parameter = _coerce_positive_int(self.k_parameter, name="k_parameter")
        self.commitment = _normalise_hex(self.commitment, name="commitment", length=64)
        self.created_at = _ensure_utc(self.created_at)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def size_gib(self) -> float:
        return self.size_bytes / float(1024**3)

    def _quality_seed(self, seed: str, *, nonce: int) -> bytes:
        return f"{self.commitment}:{seed}:{nonce}".encode("utf-8")

    def derive_quality(self, seed: str, *, nonce: int = 0) -> float:
        payload = self._quality_seed(seed, nonce=nonce)
        digest = blake2b(payload, digest_size=32).digest()
        integer = int.from_bytes(digest, "big")
        max_value = (1 << (32 * 8)) - 1
        base_quality = 1.0 - (integer / max_value)
        exponent = 1.0 / max(self.k_parameter, 1)
        scaled = math.pow(max(base_quality, 0.0), exponent)
        return _clamp(scaled, lower=0.0, upper=0.999999999)

    def expected_proof(self, seed: str, *, nonce: int = 0) -> str:
        payload = self._quality_seed(seed, nonce=nonce)
        return sha256(payload).hexdigest()

    def create_proof(
        self,
        challenge: "Challenge",
        *,
        nonce: int = 0,
        metadata: Mapping[str, object] | None = None,
    ) -> "ProofResponse":
        quality = self.derive_quality(challenge.seed, nonce=nonce)
        proof = self.expected_proof(challenge.seed, nonce=nonce)
        return ProofResponse(
            challenge_id=challenge.challenge_id,
            plot_id=self.plot_id,
            farmer_id=self.farmer_id,
            quality=quality,
            nonce=nonce,
            proof=proof,
            submitted_at=_utcnow(),
            metadata=metadata,
        )


@dataclass(slots=True)
class Challenge:
    """Challenge issued to the network for proving storage commitments."""

    challenge_id: str
    seed: str
    difficulty: float
    target_quality: float
    response_deadline: datetime
    issued_at: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.challenge_id = _normalise_identifier(self.challenge_id, name="challenge_id")
        self.seed = _normalise_hex(self.seed, name="seed", length=64)
        self.difficulty = _clamp(self.difficulty, lower=0.0, upper=1.0)
        self.target_quality = _clamp(self.target_quality, lower=0.0, upper=1.0)
        self.response_deadline = _ensure_utc(self.response_deadline)
        self.issued_at = _ensure_utc(self.issued_at)
        if self.response_deadline <= self.issued_at:
            raise ValueError("response_deadline must be after issued_at")
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def expired(self) -> bool:
        return _utcnow() >= self.response_deadline


@dataclass(slots=True)
class ProofResponse:
    """Proof submitted by a farmer in response to a challenge."""

    challenge_id: str
    plot_id: str
    farmer_id: str
    quality: float
    nonce: int
    proof: str
    submitted_at: datetime = field(default_factory=_utcnow)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.challenge_id = _normalise_identifier(self.challenge_id, name="challenge_id")
        self.plot_id = _normalise_identifier(self.plot_id, name="plot_id")
        self.farmer_id = _normalise_identifier(self.farmer_id, name="farmer_id")
        self.quality = _clamp(self.quality, lower=0.0, upper=0.999999999)
        self.nonce = _coerce_non_negative_int(self.nonce, name="nonce")
        self.proof = _normalise_hex(self.proof, name="proof", length=64)
        self.submitted_at = _ensure_utc(self.submitted_at)
        self.metadata = _normalise_metadata(self.metadata)


@dataclass(slots=True)
class FarmerScore:
    """Keeps track of farmer reliability across proofs."""

    farmer_id: str
    successes: int = 0
    failures: int = 0
    cumulative_quality: float = 0.0
    recent_quality: Deque[float] = field(default_factory=lambda: deque(maxlen=50))
    last_seen: datetime | None = None

    def record_success(self, quality: float, timestamp: datetime) -> None:
        self.successes += 1
        self.cumulative_quality += quality
        self.recent_quality.append(quality)
        self.last_seen = timestamp

    def record_failure(self, timestamp: datetime) -> None:
        self.failures += 1
        self.recent_quality.append(0.0)
        self.last_seen = timestamp

    @property
    def reliability(self) -> float:
        total = self.successes + self.failures
        if total == 0:
            return 0.0
        return self.successes / total

    @property
    def average_quality(self) -> float:
        if not self.recent_quality:
            return 0.0
        return sum(self.recent_quality) / len(self.recent_quality)

    @property
    def weighted_score(self) -> float:
        return (self.reliability * 0.6) + (self.average_quality * 0.4)

    def snapshot(self) -> Mapping[str, object]:
        return MappingProxyType(
            {
                "farmer_id": self.farmer_id,
                "successes": self.successes,
                "failures": self.failures,
                "reliability": self.reliability,
                "average_quality": self.average_quality,
                "weighted_score": self.weighted_score,
                "recent_quality": tuple(self.recent_quality),
                "last_seen": self.last_seen,
            }
        )


# ---------------------------------------------------------------------------
# Engine


class DynamicProofOfSpace:
    """Coordinator for issuing challenges and verifying PoSpace proofs."""

    def __init__(self) -> None:
        self._plots: dict[str, SpacePlot] = {}
        self._challenges: dict[str, Challenge] = {}
        self._challenge_results: dict[str, ProofResponse] = {}
        self._farmer_scores: dict[str, FarmerScore] = {}
        self._history: Deque[Mapping[str, object]] = deque(maxlen=500)
        self._issued_counter = 0

    @property
    def plots(self) -> Mapping[str, SpacePlot]:
        return MappingProxyType(self._plots)

    @property
    def challenges(self) -> Mapping[str, Challenge]:
        return MappingProxyType(self._challenges)

    @property
    def challenge_results(self) -> Mapping[str, ProofResponse]:
        return MappingProxyType(self._challenge_results)

    @property
    def history(self) -> Sequence[Mapping[str, object]]:
        return tuple(self._history)

    @property
    def total_capacity(self) -> int:
        return sum(plot.size_bytes for plot in self._plots.values())

    def register_plot(self, plot: SpacePlot | Mapping[str, object]) -> SpacePlot:
        candidate = _coerce_plot(plot)
        self._plots[candidate.plot_id] = candidate
        return candidate

    def deregister_plot(self, plot_id: str) -> None:
        self._plots.pop(_normalise_identifier(plot_id, name="plot_id"), None)

    def _next_challenge_id(self) -> str:
        self._issued_counter += 1
        return f"chl-{self._issued_counter:06d}"

    def _compute_target_quality(self, difficulty: float) -> float:
        capacity = self.total_capacity
        if capacity <= 0:
            return _clamp(0.75 - difficulty * 0.25)
        gib = capacity / float(1024**3)
        capacity_score = 1.0 / (1.0 + math.exp(-(gib - 50.0) / 10.0))
        baseline = 0.85 - (capacity_score * 0.5)
        penalty = difficulty * 0.25
        return _clamp(baseline - penalty, lower=0.05, upper=0.95)

    def issue_challenge(
        self,
        *,
        difficulty: float = 0.6,
        response_window: timedelta = timedelta(minutes=10),
        seed: str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> Challenge:
        if not self._plots:
            raise ValueError("cannot issue challenge without registered plots")
        if response_window <= timedelta(0):
            raise ValueError("response_window must be positive")
        issued_at = _utcnow()
        challenge_seed = seed or secrets.token_hex(32)
        target_quality = self._compute_target_quality(difficulty)
        challenge = Challenge(
            challenge_id=self._next_challenge_id(),
            seed=challenge_seed,
            difficulty=difficulty,
            target_quality=target_quality,
            response_deadline=issued_at + response_window,
            issued_at=issued_at,
            metadata=metadata,
        )
        self._challenges[challenge.challenge_id] = challenge
        return challenge

    def verify_proof(self, proof: ProofResponse | Mapping[str, object]) -> bool:
        submission = _coerce_proof(proof)
        challenge = self._challenges.get(submission.challenge_id)
        if challenge is None:
            raise KeyError(f"unknown challenge: {submission.challenge_id}")
        plot = self._plots.get(submission.plot_id)
        if plot is None:
            raise KeyError(f"unknown plot: {submission.plot_id}")
        if plot.farmer_id != submission.farmer_id:
            raise ValueError("proof farmer does not match registered plot owner")
        if submission.submitted_at > challenge.response_deadline:
            self._record_failure(submission.farmer_id, submission.submitted_at, challenge, reason="deadline")
            return False

        expected_quality = plot.derive_quality(challenge.seed, nonce=submission.nonce)
        expected_proof = plot.expected_proof(challenge.seed, nonce=submission.nonce)
        quality_close = math.isclose(expected_quality, submission.quality, rel_tol=1e-9, abs_tol=1e-9)
        if not quality_close or expected_proof != submission.proof:
            self._record_failure(submission.farmer_id, submission.submitted_at, challenge, reason="mismatch")
            return False
        if expected_quality < challenge.target_quality:
            self._record_failure(submission.farmer_id, submission.submitted_at, challenge, reason="quality")
            return False

        self._record_success(submission, challenge, expected_quality)
        return True

    def _record_success(self, submission: ProofResponse, challenge: Challenge, quality: float) -> None:
        score = self._farmer_scores.setdefault(
            submission.farmer_id, FarmerScore(farmer_id=submission.farmer_id)
        )
        score.record_success(quality, submission.submitted_at)
        previous = self._challenge_results.get(challenge.challenge_id)
        if previous is None or quality > previous.quality:
            self._challenge_results[challenge.challenge_id] = submission
        self._history.append(
            MappingProxyType(
                {
                    "challenge_id": challenge.challenge_id,
                    "plot_id": submission.plot_id,
                    "farmer_id": submission.farmer_id,
                    "quality": quality,
                    "success": True,
                    "reason": None,
                    "submitted_at": submission.submitted_at,
                }
            )
        )

    def _record_failure(
        self,
        farmer_id: str,
        timestamp: datetime,
        challenge: Challenge,
        *,
        reason: str,
    ) -> None:
        score = self._farmer_scores.setdefault(farmer_id, FarmerScore(farmer_id=farmer_id))
        score.record_failure(timestamp)
        self._history.append(
            MappingProxyType(
                {
                    "challenge_id": challenge.challenge_id,
                    "plot_id": None,
                    "farmer_id": farmer_id,
                    "quality": 0.0,
                    "success": False,
                    "reason": reason,
                    "submitted_at": timestamp,
                }
            )
        )

    def farmer_snapshot(self, farmer_id: str) -> Mapping[str, object]:
        normalised = _normalise_identifier(farmer_id, name="farmer_id")
        score = self._farmer_scores.get(normalised)
        if score is None:
            return MappingProxyType(
                {
                    "farmer_id": normalised,
                    "successes": 0,
                    "failures": 0,
                    "reliability": 0.0,
                    "average_quality": 0.0,
                    "weighted_score": 0.0,
                    "recent_quality": (),
                    "last_seen": None,
                }
            )
        return score.snapshot()

    def farmers_ranked(self) -> Sequence[Mapping[str, object]]:
        ranked = sorted(
            (score.snapshot() for score in self._farmer_scores.values()),
            key=lambda snapshot: snapshot["weighted_score"],
            reverse=True,
        )
        return tuple(ranked)

    def purge_expired_challenges(self, *, at: datetime | None = None) -> Sequence[str]:
        now = _ensure_utc(at)
        expired: list[str] = []
        for challenge_id, challenge in list(self._challenges.items()):
            if challenge.response_deadline < now and challenge_id not in self._challenge_results:
                expired.append(challenge_id)
                self._history.append(
                    MappingProxyType(
                        {
                            "challenge_id": challenge.challenge_id,
                            "plot_id": None,
                            "farmer_id": None,
                            "quality": 0.0,
                            "success": False,
                            "reason": "expired",
                            "submitted_at": now,
                        }
                    )
                )
                del self._challenges[challenge_id]
        return tuple(expired)

    def active_challenges(self, *, include_results: bool = False) -> Sequence[Challenge]:
        if include_results:
            return tuple(self._challenges.values())
        return tuple(
            challenge
            for challenge in self._challenges.values()
            if challenge.challenge_id not in self._challenge_results
            and not challenge.expired
        )
