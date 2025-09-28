"""Adaptive semantic versioning intelligence."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from dynamic_metadata import ModelVersion, VersionNumber

__all__ = [
    "ChangeEvent",
    "ReleasePlan",
    "SemanticVersion",
    "VersionPolicy",
    "DynamicVersionEngine",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_identifier(value: str, *, lower: bool = True) -> str:
    cleaned = value.strip()
    if lower:
        cleaned = cleaned.lower()
    if not cleaned:
        raise ValueError("identifier must not be empty")
    return cleaned


def _coerce_mapping(mapping: Mapping[str, object] | None) -> MutableMapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# core dataclasses


@dataclass(slots=True)
class SemanticVersion:
    """Semantic version representation with convenience helpers."""

    major: int = 0
    minor: int = 1
    patch: int = 0
    prerelease: str | None = None
    build: str | None = None

    def __post_init__(self) -> None:
        for value, label in ((self.major, "major"), (self.minor, "minor"), (self.patch, "patch")):
            if int(value) != value:
                raise TypeError(f"{label} component must be an integer")
            if value < 0:
                raise ValueError(f"{label} component must not be negative")
        self.major = int(self.major)
        self.minor = int(self.minor)
        self.patch = int(self.patch)
        if self.prerelease is not None:
            self.prerelease = _normalise_identifier(self.prerelease)
        if self.build is not None:
            self.build = _normalise_identifier(self.build, lower=False)

    def copy(self) -> "SemanticVersion":
        return SemanticVersion(
            major=self.major,
            minor=self.minor,
            patch=self.patch,
            prerelease=self.prerelease,
            build=self.build,
        )

    @classmethod
    def from_version_number(cls, number: VersionNumber) -> "SemanticVersion":
        return cls(major=number.major, minor=number.minor, patch=number.patch)

    def bump(self, kind: str) -> "SemanticVersion":
        normalised = kind.strip().lower()
        version = self.copy()
        version.prerelease = None
        version.build = None
        if normalised == "major":
            version.major += 1
            version.minor = 0
            version.patch = 0
        elif normalised == "minor":
            version.minor += 1
            version.patch = 0
        elif normalised == "patch":
            version.patch += 1
        elif normalised in {"prerelease", "pre"}:
            version.prerelease = version.prerelease or "rc.1"
        else:  # pragma: no cover - guard path
            raise ValueError(f"unsupported bump kind: {kind}")
        return version

    def with_prerelease(self, label: str) -> "SemanticVersion":
        version = self.copy()
        version.prerelease = _normalise_identifier(label)
        return version

    def as_tuple(self) -> tuple[int, int, int]:
        return self.major, self.minor, self.patch

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "major": self.major,
            "minor": self.minor,
            "patch": self.patch,
        }
        if self.prerelease is not None:
            payload["prerelease"] = self.prerelease
        if self.build is not None:
            payload["build"] = self.build
        payload["formatted"] = str(self)
        return payload

    def to_version_number(self, *, width: int | None = None) -> VersionNumber:
        if self.prerelease is not None or self.build is not None:
            raise ValueError("cannot convert prerelease/build metadata to VersionNumber")
        payload = {
            "major": self.major,
            "minor": self.minor,
            "patch": self.patch,
        }
        if width is not None:
            payload["width"] = width
        return VersionNumber(**payload)

    def to_model_version(
        self,
        name: str,
        *,
        source: str = "dynamic_version.engine",
        width: int | None = None,
        build_timestamp: datetime | None = None,
    ) -> ModelVersion:
        number = self.to_version_number(width=width)
        if build_timestamp is None:
            return ModelVersion(name=name, number=number, source=source)
        return ModelVersion(name=name, number=number, build_timestamp=build_timestamp, source=source)

    def __str__(self) -> str:  # pragma: no cover - formatting
        version = f"{self.major}.{self.minor}.{self.patch}"
        if self.prerelease:
            version = f"{version}-{self.prerelease}"
        if self.build:
            version = f"{version}+{self.build}"
        return version


@dataclass(slots=True)
class ChangeEvent:
    """Represents a contribution that influences the next release version."""

    identifier: str
    kind: str = "feature"
    description: str = ""
    impact: float = 0.5
    breaking: bool = False
    timestamp: datetime = field(default_factory=_utcnow)
    metadata: MutableMapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier, lower=False)
        self.kind = _normalise_identifier(self.kind)
        self.description = self.description.strip()
        self.impact = _clamp(float(self.impact))
        if not isinstance(self.breaking, bool):
            raise TypeError("breaking must be a boolean")
        self.timestamp = self._ensure_timezone(self.timestamp)
        self.metadata = _coerce_mapping(self.metadata)

    @staticmethod
    def _ensure_timezone(value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @property
    def bucket(self) -> str:
        if self.breaking:
            return "major"
        mapping = {
            "breaking": "major",
            "security": "major",
            "feature": "minor",
            "performance": "minor",
            "refactor": "minor",
            "fix": "patch",
            "bugfix": "patch",
            "chore": "patch",
            "docs": "patch",
        }
        return mapping.get(self.kind, "patch")

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "identifier": self.identifier,
            "kind": self.kind,
            "description": self.description,
            "impact": self.impact,
            "breaking": self.breaking,
            "timestamp": self.timestamp.isoformat(),
            "bucket": self.bucket,
        }
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class VersionPolicy:
    """Configuration describing how change signals influence version bumps."""

    thresholds: MutableMapping[str, float] = field(
        default_factory=lambda: {"major": 0.75, "minor": 0.5, "patch": 0.2}
    )
    weights: MutableMapping[str, float] = field(
        default_factory=lambda: {
            "major": 1.0,
            "minor": 0.6,
            "patch": 0.3,
        }
    )
    recency_decay: float = 0.85
    stability_window: int = 48
    allow_prerelease: bool = True
    prerelease_label: str = "rc"

    def __post_init__(self) -> None:
        if set(self.thresholds) != {"major", "minor", "patch"}:
            raise ValueError("thresholds must define major, minor, and patch")
        if set(self.weights) != {"major", "minor", "patch"}:
            raise ValueError("weights must define major, minor, and patch")
        self.recency_decay = _clamp(float(self.recency_decay))
        if self.recency_decay == 0.0:
            raise ValueError("recency_decay must be greater than 0")
        if self.stability_window <= 0:
            raise ValueError("stability_window must be positive")
        self.prerelease_label = _normalise_identifier(self.prerelease_label)

    def weight_for(self, bucket: str) -> float:
        try:
            return float(self.weights[bucket])
        except KeyError:  # pragma: no cover - defensive
            raise KeyError(f"unknown bucket '{bucket}'")

    def threshold_for(self, bucket: str) -> float:
        try:
            return float(self.thresholds[bucket])
        except KeyError:  # pragma: no cover - defensive
            raise KeyError(f"unknown bucket '{bucket}'")


@dataclass(slots=True)
class ReleasePlan:
    """Plan describing the recommended next version."""

    baseline: SemanticVersion
    target: SemanticVersion
    release_type: str
    summary: str
    changes: tuple[ChangeEvent, ...] = field(default_factory=tuple)
    metrics: MutableMapping[str, float] = field(default_factory=dict)
    metadata: MutableMapping[str, object] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "baseline": self.baseline.as_dict(),
            "target": self.target.as_dict(),
            "release_type": self.release_type,
            "summary": self.summary,
            "metrics": dict(self.metrics),
            "changes": [change.as_dict() for change in self.changes],
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload

    def to_model_version(
        self,
        name: str,
        *,
        source: str = "dynamic_version.engine",
        width: int | None = None,
        build_timestamp: datetime | None = None,
    ) -> ModelVersion:
        return self.target.to_model_version(
            name,
            source=source,
            width=width,
            build_timestamp=build_timestamp,
        )


# ---------------------------------------------------------------------------
# Engine


class DynamicVersionEngine:
    """Aggregates change signals to recommend adaptive semantic version bumps."""

    def __init__(
        self,
        *,
        baseline: SemanticVersion | str | Sequence[int] = SemanticVersion(),
        policy: VersionPolicy | None = None,
    ) -> None:
        self.baseline = self._coerce_version(baseline)
        self.policy = policy or VersionPolicy()
        self._changes: Deque[ChangeEvent] = deque(maxlen=self.policy.stability_window)

    @staticmethod
    def _coerce_version(
        value: SemanticVersion | ModelVersion | VersionNumber | str | Sequence[int]
    ) -> SemanticVersion:
        if isinstance(value, SemanticVersion):
            return value
        if isinstance(value, ModelVersion):
            return SemanticVersion.from_version_number(value.number)
        if isinstance(value, VersionNumber):
            return SemanticVersion.from_version_number(value)
        if isinstance(value, str):
            base, _, metadata = value.partition("+")
            prerelease: str | None = None
            build: str | None = None
            if metadata:
                build = _normalise_identifier(metadata, lower=False)
            if "-" in base:
                version_part, prerelease_part = base.split("-", 1)
                prerelease = _normalise_identifier(prerelease_part)
            else:
                version_part = base
            parts = version_part.split(".")
            if len(parts) != 3:
                raise ValueError("string version must contain major.minor.patch")
            major, minor, patch = (int(part) for part in parts)
            return SemanticVersion(major=major, minor=minor, patch=patch, prerelease=prerelease, build=build)
        if isinstance(value, Sequence):
            parts = list(value)
            if len(parts) != 3:
                raise ValueError("sequence version must contain three integers")
            major, minor, patch = (int(part) for part in parts)
            return SemanticVersion(major=major, minor=minor, patch=patch)
        raise TypeError("unsupported baseline type")

    @property
    def changes(self) -> tuple[ChangeEvent, ...]:
        return tuple(self._changes)

    def record(self, change: ChangeEvent) -> None:
        self._changes.append(change)

    def extend(self, changes: Iterable[ChangeEvent]) -> None:
        for change in changes:
            self.record(change)

    def reset(self) -> None:
        self._changes.clear()

    def _score(self) -> MutableMapping[str, float]:
        scores: MutableMapping[str, float] = {"major": 0.0, "minor": 0.0, "patch": 0.0}
        decay = 1.0
        for change in reversed(self._changes):
            bucket = change.bucket
            weight = self.policy.weight_for(bucket) * change.impact * decay
            scores[bucket] += weight
            decay *= self.policy.recency_decay
        return scores

    def _determine_release_type(self, scores: Mapping[str, float]) -> str:
        if not self._changes:
            return "none"
        for bucket in ("major", "minor", "patch"):
            if scores[bucket] >= self.policy.threshold_for(bucket):
                return bucket
        return "prerelease" if self.policy.allow_prerelease else "none"

    def _target_version(self, release_type: str) -> SemanticVersion:
        if release_type == "none":
            return self.baseline.copy()
        if release_type == "prerelease":
            return self.baseline.copy().with_prerelease(f"{self.policy.prerelease_label}.1")
        return self.baseline.bump(release_type)

    def plan(self, *, metadata: Mapping[str, object] | None = None) -> ReleasePlan:
        scores = self._score()
        release_type = self._determine_release_type(scores)
        target = self._target_version(release_type)
        summary = self._build_summary(release_type, target, scores)
        return ReleasePlan(
            baseline=self.baseline.copy(),
            target=target,
            release_type=release_type,
            summary=summary,
            changes=self.changes,
            metrics=dict(scores),
            metadata=_coerce_mapping(metadata),
        )

    def _build_summary(self, release_type: str, target: SemanticVersion, scores: Mapping[str, float]) -> str:
        if release_type == "none":
            return "No release recommended"
        if release_type == "prerelease":
            return f"Prepare prerelease {target} to gather feedback"
        emphasis = {
            "major": "breaking changes detected",
            "minor": "new capabilities available",
            "patch": "stability fixes accumulated",
        }
        reason = emphasis.get(release_type, "changes recorded")
        score = scores.get(release_type, 0.0)
        return f"Recommend {release_type} release to {target} ({reason}, score={score:.2f})"

    def plan_model_version(
        self,
        name: str,
        *,
        source: str = "dynamic_version.engine",
        width: int | None = None,
        build_timestamp: datetime | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> tuple[ReleasePlan, ModelVersion]:
        plan = self.plan(metadata=metadata)
        try:
            model_version = plan.to_model_version(
                name,
                source=source,
                width=width,
                build_timestamp=build_timestamp,
            )
        except ValueError as error:  # pragma: no cover - defensive guardrail
            raise ValueError(
                "release plan contains prerelease/build metadata that cannot be mapped to ModelVersion"
            ) from error
        return plan, model_version
