"""Dynamic checkpoint planning utilities for operational governance.

This module mirrors the ergonomics of the existing dynamic algorithm helpers by
providing light-weight data classes that model recurring operational
checkpoints.  The :class:`DynamicCheckpoint` class normalises configuration
payloads originating from Supabase tables or YAML manifests, while
``DynamicCheckpointRegistry`` orchestrates the scheduling logic that surfaces
which reviews are due.

The helpers are intentionally opinionated:

* Identifiers, categories, owners, and tags are normalised to avoid downstream
  string juggling in notebooks and API layers.
* Cadence windows are evaluated with optional grace periods so leadership can
  review upcoming checkpoints before they become overdue.
* Registries expose filtering by owner and tags, enabling desks to focus on the
  subset of checkpoints relevant to their remit.

The implementation follows the same patterns as ``dynamic_nodes`` and
``dynamic_scripts`` to keep the ergonomics consistent across automation pods.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, Mapping, MutableMapping, Optional, Sequence

__all__ = [
    "DynamicCheckpoint",
    "DynamicCheckpointRegistry",
    "CheckpointConfigError",
]


class CheckpointConfigError(ValueError):
    """Raised when an invalid checkpoint descriptor is supplied."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_identifier(value: str, *, allow_empty: bool = False) -> str:
    normalised = str(value).strip()
    if not normalised and not allow_empty:
        raise CheckpointConfigError("identifier values cannot be empty")
    return normalised


def _normalise_category(value: str) -> str:
    category = str(value).strip().lower()
    if not category:
        raise CheckpointConfigError("category is required")
    return category


def _normalise_owner(value: str | None) -> str | None:
    if value is None:
        return None
    owner = str(value).strip()
    return owner or None


def _normalise_description(value: str) -> str:
    description = str(value).strip()
    if not description:
        raise CheckpointConfigError("description is required")
    return description


def _normalise_tags(values: Iterable[str]) -> tuple[str, ...]:
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        item = str(raw).strip()
        if not item:
            continue
        key = item.lower()
        if key in seen:
            continue
        seen.add(key)
        normalised.append(item)
    return tuple(normalised)


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise CheckpointConfigError("metadata must be a mapping")
    return dict(metadata)


def _coerce_positive_int(value: object, *, allow_none: bool = False) -> int | None:
    if value is None and allow_none:
        return None
    try:
        coerced = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise CheckpointConfigError("value must be a positive integer") from exc
    if coerced <= 0:
        raise CheckpointConfigError("value must be a positive integer")
    return coerced


def _coerce_non_negative_int(value: object) -> int:
    try:
        coerced = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise CheckpointConfigError("value must be a non-negative integer") from exc
    if coerced < 0:
        raise CheckpointConfigError("value must be a non-negative integer")
    return coerced


def _coerce_criticality(value: object | None) -> float | None:
    if value is None:
        return None
    try:
        criticality = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise CheckpointConfigError("criticality must be numeric") from exc
    if not 0.0 <= criticality <= 1.0:
        raise CheckpointConfigError("criticality must be between 0 and 1")
    return criticality


def _normalise_timestamp(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    raise CheckpointConfigError("timestamp must be datetime, ISO-8601 string, or None")


def _normalise_status(value: str | None) -> str:
    status = str(value or "pending").strip().lower()
    return status or "pending"


def _normalise_notes(value: str | None) -> str | None:
    if value is None:
        return None
    notes = str(value).strip()
    return notes or None


@dataclass(slots=True)
class DynamicCheckpoint:
    """Normalised representation of a recurring operational checkpoint."""

    checkpoint_id: str
    category: str
    description: str
    cadence_days: int | None = None
    owner: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)
    criticality: float | None = None
    grace_days: int = 0
    enabled: bool = True

    last_completed_at: datetime | None = None
    last_status: str = "pending"
    last_notes: str | None = None

    def __post_init__(self) -> None:
        self.checkpoint_id = _normalise_identifier(self.checkpoint_id)
        self.category = _normalise_category(self.category)
        self.description = _normalise_description(self.description)
        self.owner = _normalise_owner(self.owner)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _normalise_metadata(self.metadata)
        self.criticality = _coerce_criticality(self.criticality)
        self.grace_days = _coerce_non_negative_int(self.grace_days)
        self.cadence_days = _coerce_positive_int(self.cadence_days, allow_none=True)
        self.last_completed_at = _normalise_timestamp(self.last_completed_at)
        self.last_status = _normalise_status(self.last_status)
        self.last_notes = _normalise_notes(self.last_notes)

    # ------------------------------------------------------------------ runtime
    def next_due_at(self) -> datetime | None:
        if self.cadence_days is None:
            return None
        if self.last_completed_at is None:
            return datetime(1970, 1, 1, tzinfo=timezone.utc)
        return self.last_completed_at + timedelta(days=self.cadence_days)

    def is_due(
        self,
        *,
        now: Optional[datetime] = None,
        include_within_grace: bool = False,
    ) -> bool:
        if not self.enabled:
            return False

        current_time = now or _now()
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)
        else:
            current_time = current_time.astimezone(timezone.utc)

        if self.cadence_days is None:
            return self.last_status != "completed"

        if self.last_completed_at is None:
            return True

        next_due = self.last_completed_at + timedelta(days=self.cadence_days)
        if current_time >= next_due:
            return True

        if include_within_grace and self.grace_days > 0:
            grace_window_start = next_due - timedelta(days=self.grace_days)
            return current_time >= grace_window_start

        return False

    def mark_result(
        self,
        *,
        status: str = "completed",
        completed_at: Optional[datetime | str] = None,
        notes: Optional[str] = None,
    ) -> None:
        status_value = _normalise_status(status)
        timestamp = _normalise_timestamp(completed_at) if completed_at is not None else _now()
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)

        if status_value == "completed":
            self.last_completed_at = timestamp
        elif status_value == "reset":
            self.last_completed_at = None

        self.last_status = status_value
        self.last_notes = _normalise_notes(notes)

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "checkpoint_id": self.checkpoint_id,
            "category": self.category,
            "description": self.description,
            "owner": self.owner,
            "tags": list(self.tags),
            "metadata": dict(self.metadata),
            "criticality": self.criticality,
            "grace_days": self.grace_days,
            "enabled": self.enabled,
            "last_status": self.last_status,
            "last_notes": self.last_notes,
        }
        if self.cadence_days is not None:
            payload["cadence_days"] = self.cadence_days
        if self.last_completed_at is not None:
            payload["last_completed_at"] = self.last_completed_at.isoformat()
        return payload


class DynamicCheckpointRegistry:
    """Manage a collection of :class:`DynamicCheckpoint` instances."""

    def __init__(self, checkpoints: Optional[Iterable[DynamicCheckpoint | Mapping[str, object]]] = None) -> None:
        self._checkpoints: dict[str, DynamicCheckpoint] = {}
        if checkpoints is not None:
            for checkpoint in checkpoints:
                self.register(checkpoint)

    # ----------------------------------------------------------------- mutation
    def register(self, checkpoint: DynamicCheckpoint | Mapping[str, object]) -> DynamicCheckpoint:
        if isinstance(checkpoint, DynamicCheckpoint):
            dynamic_checkpoint = checkpoint
        elif isinstance(checkpoint, Mapping):
            dynamic_checkpoint = DynamicCheckpoint(**checkpoint)  # type: ignore[arg-type]
        else:  # pragma: no cover - defensive guardrail
            raise CheckpointConfigError("checkpoint must be a mapping or DynamicCheckpoint instance")

        self._checkpoints[dynamic_checkpoint.checkpoint_id] = dynamic_checkpoint
        return dynamic_checkpoint

    def get(self, checkpoint_id: str) -> DynamicCheckpoint:
        identifier = _normalise_identifier(checkpoint_id)
        try:
            return self._checkpoints[identifier]
        except KeyError as exc:  # pragma: no cover - defensive guardrail
            raise CheckpointConfigError(f"checkpoint '{identifier}' is not registered") from exc

    def record_result(
        self,
        checkpoint_id: str,
        *,
        status: str = "completed",
        completed_at: Optional[datetime | str] = None,
        notes: Optional[str] = None,
    ) -> DynamicCheckpoint:
        checkpoint = self.get(checkpoint_id)
        checkpoint.mark_result(status=status, completed_at=completed_at, notes=notes)
        return checkpoint

    # ---------------------------------------------------------------- resolution
    def resolve_due_checkpoints(
        self,
        *,
        now: Optional[datetime] = None,
        include_within_grace: bool = False,
        owners: Optional[Sequence[str]] = None,
        tags: Optional[Sequence[str]] = None,
    ) -> list[DynamicCheckpoint]:
        current_time = now or _now()
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)
        else:
            current_time = current_time.astimezone(timezone.utc)

        owner_filter = {str(owner).strip().lower() for owner in owners or [] if str(owner).strip()}
        tag_filter = {str(tag).strip().lower() for tag in tags or [] if str(tag).strip()}

        def _matches_owner(checkpoint: DynamicCheckpoint) -> bool:
            if not owner_filter:
                return True
            if checkpoint.owner is None:
                return False
            return checkpoint.owner.strip().lower() in owner_filter

        def _matches_tags(checkpoint: DynamicCheckpoint) -> bool:
            if not tag_filter:
                return True
            checkpoint_tags = {tag.lower() for tag in checkpoint.tags}
            return tag_filter.issubset(checkpoint_tags)

        due = [
            checkpoint
            for checkpoint in self._checkpoints.values()
            if checkpoint.is_due(now=current_time, include_within_grace=include_within_grace)
            and _matches_owner(checkpoint)
            and _matches_tags(checkpoint)
        ]

        def _overdue_seconds(checkpoint: DynamicCheckpoint) -> float:
            if checkpoint.cadence_days is None:
                return float("inf")
            next_due = checkpoint.last_completed_at + timedelta(days=checkpoint.cadence_days) if checkpoint.last_completed_at else None
            if next_due is None:
                return float("inf")
            return max((current_time - next_due).total_seconds(), 0.0)

        return sorted(
            due,
            key=lambda checkpoint: (
                0 if checkpoint.cadence_days is None else 1,
                -(checkpoint.criticality or 0.0),
                -_overdue_seconds(checkpoint),
                checkpoint.checkpoint_id,
            ),
        )

