"""Tools for modelling and orchestrating Dynamic Capital execution chains."""

from __future__ import annotations

from dataclasses import dataclass, field, replace, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Iterable, Iterator, Mapping, Sequence

__all__ = [
    "ChainLink",
    "ChainStatus",
    "DynamicChain",
    "LinkSnapshot",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if lower > upper:  # pragma: no cover - defensive guard
        raise ValueError("lower bound must be <= upper bound")
    return max(lower, min(upper, value))


def _normalise_key(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("text must not be empty")
    return cleaned


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    seen: set[str] = set()
    ordered: list[str] = []
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(_normalise_key(cleaned))
    return tuple(normalised)


def _normalise_issues(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _coerce_link(link: ChainLink | Mapping[str, object]) -> ChainLink:
    if isinstance(link, ChainLink):
        return link
    if not isinstance(link, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("link must be a ChainLink or mapping")
    return ChainLink(**link)


# ---------------------------------------------------------------------------
# dataclasses


class ChainStatus(str, Enum):
    """Lifecycle states for a chain link."""

    PENDING = "pending"
    READY = "ready"
    ACTIVE = "active"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        return self in {ChainStatus.COMPLETED, ChainStatus.FAILED}


@dataclass(slots=True)
class ChainLink:
    """Definition for an individual step within a chain."""

    key: str
    title: str
    description: str = ""
    upstream: tuple[str, ...] = field(default_factory=tuple)
    weight: float = 1.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.title = _normalise_text(self.title)
        self.description = self.description.strip()
        self.upstream = _normalise_tuple(self.upstream)
        if self.key in self.upstream:
            raise ValueError("a link cannot depend on itself")
        self.weight = max(float(self.weight), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_metadata(self.metadata)


class _Sentinel:
    """Sentinel type used to differentiate between ``None`` and unset values."""


_SENTINEL = _Sentinel()


@dataclass(slots=True)
class LinkSnapshot:
    """Runtime snapshot for a chain link."""

    key: str
    status: ChainStatus = ChainStatus.PENDING
    progress: float = 0.0
    confidence: float = 0.5
    issues: tuple[str, ...] = field(default_factory=tuple)
    note: str | None = None
    updated_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.key = _normalise_key(self.key)
        self.progress = _clamp(float(self.progress))
        self.confidence = _clamp(float(self.confidence))
        self.issues = _normalise_issues(self.issues)
        self.note = _normalise_optional_text(self.note)
        if self.updated_at.tzinfo is None:
            self.updated_at = self.updated_at.replace(tzinfo=timezone.utc)
        else:
            self.updated_at = self.updated_at.astimezone(timezone.utc)

    def with_updates(
        self,
        *,
        status: ChainStatus | None = None,
        progress: float | None = None,
        confidence: float | None = None,
        issues: Sequence[str] | None = None,
        note: str | None | _Sentinel = _SENTINEL,
    ) -> "LinkSnapshot":
        """Return a new snapshot with the provided overrides applied."""

        new_snapshot = replace(self)
        if status is not None:
            new_snapshot.status = ChainStatus(status)
        if progress is not None:
            new_snapshot.progress = _clamp(float(progress))
        if confidence is not None:
            new_snapshot.confidence = _clamp(float(confidence))
        if issues is not None:
            new_snapshot.issues = _normalise_issues(issues)
        if not isinstance(note, _Sentinel):
            new_snapshot.note = _normalise_optional_text(note)
        new_snapshot.updated_at = _utcnow()
        return new_snapshot

    def as_dict(self) -> Dict[str, object]:
        """Return a serialisable representation of the snapshot."""

        data = asdict(self)
        data["status"] = self.status.value
        data["updated_at"] = self.updated_at.isoformat()
        return data


# ---------------------------------------------------------------------------
# core engine


class DynamicChain:
    """Orchestrates execution for a set of dependent chain links."""

    def __init__(self, links: Iterable[ChainLink | Mapping[str, object]] | None = None) -> None:
        self._links: Dict[str, ChainLink] = {}
        self._states: Dict[str, LinkSnapshot] = {}
        if links:
            for link in links:
                self.add_link(link)

    # -- container protocols -------------------------------------------------
    def __contains__(self, key: object) -> bool:
        if not isinstance(key, str):
            return False
        return _normalise_key(key) in self._links

    def __len__(self) -> int:
        return len(self._links)

    def __iter__(self) -> Iterator[ChainLink]:
        return iter(self._links.values())

    # -- mutation ------------------------------------------------------------
    def add_link(self, link: ChainLink | Mapping[str, object]) -> ChainLink:
        """Register a new link with the chain."""

        link_obj = _coerce_link(link)
        key = link_obj.key
        if key in self._links:
            raise KeyError(f"link '{key}' already exists")
        self._links[key] = link_obj
        self._states[key] = LinkSnapshot(key=key)
        return link_obj

    def remove_link(self, key: str) -> None:
        """Remove a link from the chain."""

        normalised = _normalise_key(key)
        if any(normalised in link.upstream for link in self._links.values()):
            raise ValueError(f"cannot remove '{key}'; other links depend on it")
        self._links.pop(normalised, None)
        self._states.pop(normalised, None)

    # -- inspection ---------------------------------------------------------
    def get_link(self, key: str) -> ChainLink:
        return self._links[_normalise_key(key)]

    def get_snapshot(self, key: str) -> LinkSnapshot:
        return self._states[_normalise_key(key)]

    def snapshots(self) -> tuple[LinkSnapshot, ...]:
        return tuple(self._states[key] for key in self._links)

    def links(self) -> tuple[ChainLink, ...]:
        return tuple(self._links.values())

    # -- orchestration ------------------------------------------------------
    def update_state(
        self,
        key: str,
        *,
        status: ChainStatus | None = None,
        progress: float | None = None,
        confidence: float | None = None,
        issues: Sequence[str] | None = None,
        note: str | None | _Sentinel = _SENTINEL,
    ) -> LinkSnapshot:
        """Update the runtime state for a link."""

        normalised = _normalise_key(key)
        if normalised not in self._states:
            raise KeyError(f"link '{key}' does not exist")
        snapshot = self._states[normalised]
        new_snapshot = snapshot.with_updates(
            status=status,
            progress=progress,
            confidence=confidence,
            issues=issues,
            note=note,
        )
        self._states[normalised] = new_snapshot
        return new_snapshot

    def mark_completed(
        self,
        key: str,
        *,
        confidence: float | None = None,
        note: str | None = None,
    ) -> LinkSnapshot:
        """Convenience wrapper to mark a link as completed."""

        return self.update_state(
            key,
            status=ChainStatus.COMPLETED,
            progress=1.0,
            confidence=confidence,
            note=note,
        )

    def iter_ready_links(self) -> Iterator[ChainLink]:
        """Yield links whose dependencies are complete."""

        for link in self._links.values():
            state = self._states[link.key]
            if state.status.is_terminal:
                continue
            ready = True
            for dependency in link.upstream:
                dependency_state = self._states.get(dependency)
                if dependency_state is None or dependency_state.status != ChainStatus.COMPLETED:
                    ready = False
                    break
            if ready:
                yield link

    def blocked_links(self) -> tuple[str, ...]:
        """Return keys for links currently blocked by incomplete dependencies."""

        blocked: list[str] = []
        for link in self._links.values():
            state = self._states[link.key]
            if state.status.is_terminal:
                continue
            unmet = []
            for dep in link.upstream:
                dependency_state = self._states.get(dep)
                if dependency_state is None or dependency_state.status != ChainStatus.COMPLETED:
                    unmet.append(dep)
            if unmet and state.status != ChainStatus.BLOCKED:
                blocked.append(link.key)
        return tuple(blocked)

    def refresh(self) -> None:
        """Recompute derived statuses based on dependency completion."""

        for link in self._links.values():
            state = self._states[link.key]
            if state.status in {ChainStatus.ACTIVE, ChainStatus.COMPLETED, ChainStatus.FAILED}:
                continue
            dependency_states = [self._states.get(dep) for dep in link.upstream]
            if not dependency_states:
                # No upstream dependencies - mark ready if still pending.
                if state.status == ChainStatus.PENDING:
                    self._states[link.key] = state.with_updates(status=ChainStatus.READY)
                continue

            if all(dep_state and dep_state.status == ChainStatus.COMPLETED for dep_state in dependency_states):
                if state.status != ChainStatus.READY:
                    self._states[link.key] = state.with_updates(status=ChainStatus.READY)
                continue

            if any(dep_state and dep_state.status == ChainStatus.FAILED for dep_state in dependency_states):
                if state.status != ChainStatus.BLOCKED:
                    self._states[link.key] = state.with_updates(status=ChainStatus.BLOCKED)
                continue

            if state.status == ChainStatus.BLOCKED:
                # Already blocked for other reasons; leave untouched.
                continue

            if state.status != ChainStatus.PENDING:
                self._states[link.key] = state.with_updates(status=ChainStatus.PENDING)

    def overall_progress(self) -> float:
        """Compute a weighted progress metric for the chain."""

        if not self._links:
            return 0.0
        total_weight = sum(link.weight or 1.0 for link in self._links.values())
        if total_weight == 0:
            return 0.0
        weighted = 0.0
        for link in self._links.values():
            weight = link.weight or 1.0
            state = self._states[link.key]
            weighted += weight * state.progress * state.confidence
        return weighted / total_weight

    # -- validation ---------------------------------------------------------
    def validate(self) -> None:
        """Validate the chain structure, raising if inconsistencies are found."""

        missing_dependencies = {
            dependency
            for link in self._links.values()
            for dependency in link.upstream
            if dependency not in self._links
        }
        if missing_dependencies:
            missing = ", ".join(sorted(missing_dependencies))
            raise ValueError(f"unknown dependencies: {missing}")

        self._validate_acyclic()

    def _validate_acyclic(self) -> None:
        visiting: set[str] = set()
        visited: set[str] = set()

        def dfs(node: str) -> None:
            if node in visited:
                return
            if node in visiting:
                raise ValueError(f"cycle detected involving '{node}'")
            visiting.add(node)
            for dependency in self._links[node].upstream:
                dfs(dependency)
            visiting.remove(node)
            visited.add(node)

        for key in self._links:
            dfs(key)
