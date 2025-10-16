"""Branch topology modelling for Dynamic Capital workflows."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "BranchDefinition",
    "BranchStatus",
    "DynamicBranchPlanner",
    "PromotionPlan",
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_branch_name(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("branch name must not be empty")
    return cleaned


def _normalise_service(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("service must not be empty")
    return cleaned


def _normalise_environment(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("environment must not be empty")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_dependencies(dependencies: Sequence[str] | None) -> tuple[str, ...]:
    if not dependencies:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for dependency in dependencies:
        cleaned = _normalise_branch_name(str(dependency))
        if cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class BranchDefinition:
    """Static description of a branch in the release topology."""

    name: str
    service: str
    environment: str
    description: str = ""
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    protected: bool = True

    def __post_init__(self) -> None:
        self.name = _normalise_branch_name(self.name)
        self.service = _normalise_service(self.service)
        self.environment = _normalise_environment(self.environment)
        self.description = self.description.strip()
        self.dependencies = _coerce_dependencies(self.dependencies)
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class BranchStatus:
    """Operational status for a branch at a point in time."""

    branch: str
    ahead: int = 0
    behind: int = 0
    checks_passed: bool = False
    review_approved: bool = False
    integration_pr_open: bool = False
    last_commit_at: datetime = field(default_factory=_utcnow)
    notes: str = ""
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.branch = _normalise_branch_name(self.branch)
        self.ahead = max(int(self.ahead), 0)
        self.behind = max(int(self.behind), 0)
        if self.last_commit_at.tzinfo is None:
            self.last_commit_at = self.last_commit_at.replace(tzinfo=timezone.utc)
        else:
            self.last_commit_at = self.last_commit_at.astimezone(timezone.utc)
        self.notes = self.notes.strip()
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def ready(self) -> bool:
        return (
            self.ahead > 0
            and self.behind == 0
            and self.checks_passed
            and self.review_approved
            and self.integration_pr_open
        )

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "branch": self.branch,
            "ahead": self.ahead,
            "behind": self.behind,
            "checks_passed": self.checks_passed,
            "review_approved": self.review_approved,
            "integration_pr_open": self.integration_pr_open,
            "last_commit_at": self.last_commit_at.isoformat(),
            "notes": self.notes,
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class PromotionPlan:
    """Actionable plan for promoting a branch."""

    branch: str
    ready: bool
    blocked_by: tuple[str, ...]
    summary: str
    definition: BranchDefinition
    status: BranchStatus | None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "branch": self.branch,
            "ready": self.ready,
            "blocked_by": list(self.blocked_by),
            "summary": self.summary,
            "definition": {
                "name": self.definition.name,
                "service": self.definition.service,
                "environment": self.definition.environment,
                "description": self.definition.description,
                "dependencies": list(self.definition.dependencies),
                "tags": list(self.definition.tags),
                "protected": self.definition.protected,
            },
            "status": self.status.as_dict() if self.status else None,
        }


class DynamicBranchPlanner:
    """Manage branch definitions and compute promotion plans."""

    def __init__(self, *, definitions: Iterable[BranchDefinition | Mapping[str, object]] | None = None) -> None:
        self._definitions: Dict[str, BranchDefinition] = {}
        self._statuses: Dict[str, BranchStatus] = {}
        if definitions:
            for definition in definitions:
                self.register(definition)

    def enable_full_auto_mode(self, *, default_ahead: int = 1, note: str | None = None) -> None:
        """Normalise branch statuses to reflect full automation readiness."""

        automation_note = (note or "Full auto mode normalised readiness.").strip()
        minimum_ahead = max(int(default_ahead), 1)
        timestamp = _utcnow()

        for definition in self._definitions.values():
            status = self._statuses.get(definition.name)
            metadata: Dict[str, object]
            if status is None:
                metadata = {"auto_mode": "full_auto"}
                resolved_note = automation_note
                resolved_last_commit = timestamp
                ahead_commits = minimum_ahead
            else:
                metadata = dict(status.metadata)
                metadata.setdefault("auto_mode", "full_auto")
                resolved_last_commit = status.last_commit_at
                ahead_commits = status.ahead if status.ahead > 0 else minimum_ahead
                existing_note = status.notes.strip()
                if existing_note and automation_note:
                    resolved_note = f"{existing_note} {automation_note}" if automation_note not in existing_note else existing_note
                else:
                    resolved_note = existing_note or automation_note

            self._statuses[definition.name] = BranchStatus(
                branch=definition.name,
                ahead=ahead_commits,
                behind=0,
                checks_passed=True,
                review_approved=True,
                integration_pr_open=True,
                last_commit_at=resolved_last_commit,
                notes=resolved_note,
                metadata=metadata,
            )

    def register(self, definition: BranchDefinition | Mapping[str, object]) -> BranchDefinition:
        """Register a branch definition."""

        if isinstance(definition, Mapping):
            definition = BranchDefinition(**definition)
        if not isinstance(definition, BranchDefinition):  # pragma: no cover - defensive
            raise TypeError("definition must be a BranchDefinition")
        self._definitions[definition.name] = definition
        return definition

    def update_status(self, status: BranchStatus | Mapping[str, object]) -> BranchStatus:
        """Record the latest status for a branch."""

        if isinstance(status, Mapping):
            status = BranchStatus(**status)
        if not isinstance(status, BranchStatus):  # pragma: no cover - defensive
            raise TypeError("status must be a BranchStatus")
        if status.branch not in self._definitions:
            raise KeyError(f"branch '{status.branch}' is not registered")
        self._statuses[status.branch] = status
        return status

    def status(self, branch: str) -> BranchStatus | None:
        return self._statuses.get(_normalise_branch_name(branch))

    def definition(self, branch: str) -> BranchDefinition:
        cleaned = _normalise_branch_name(branch)
        try:
            return self._definitions[cleaned]
        except KeyError as exc:  # pragma: no cover - defensive
            raise KeyError(f"branch '{cleaned}' is not registered") from exc

    def plan(self, branch: str) -> PromotionPlan:
        definition = self.definition(branch)
        status = self.status(definition.name)
        blocked_by: list[str] = []
        summary_parts: list[str] = []

        for dependency in definition.dependencies:
            dep_status = self._statuses.get(dependency)
            if dep_status is None or not dep_status.ready:
                blocked_by.append(dependency)

        ready = bool(status and status.ready and not blocked_by)

        if ready:
            summary_parts.append(
                f"Branch {definition.name} is ready to promote into {definition.environment}."
            )
        else:
            if status is None:
                summary_parts.append("Status unknown – gather telemetry for this branch.")
            else:
                if status.behind > 0:
                    summary_parts.append(f"Behind target by {status.behind} commits.")
                if not status.checks_passed:
                    summary_parts.append("Required checks are failing or incomplete.")
                if not status.review_approved:
                    summary_parts.append("Reviews pending approval.")
                if not status.integration_pr_open:
                    summary_parts.append("Open an integration PR before promotion.")
                if status.ahead == 0:
                    summary_parts.append("No new commits waiting for promotion.")
            if blocked_by:
                summary_parts.append(
                    "Blocked by dependencies: " + ", ".join(blocked_by)
                )

        summary = " ".join(summary_parts) if summary_parts else "Branch requires manual review."

        return PromotionPlan(
            branch=definition.name,
            ready=ready,
            blocked_by=tuple(blocked_by),
            summary=summary,
            definition=definition,
            status=status,
        )

    def overview(self) -> MutableMapping[str, PromotionPlan]:
        return {name: self.plan(name) for name in sorted(self._definitions)}

    def promote_ready_branches(self) -> list[PromotionPlan]:
        order = self._topological_order()
        plans: list[PromotionPlan] = []
        for branch in order:
            plan = self.plan(branch)
            if plan.ready:
                plans.append(plan)
        return plans

    def _topological_order(self) -> list[str]:
        graph: Dict[str, tuple[str, ...]] = {
            name: definition.dependencies for name, definition in self._definitions.items()
        }
        visited: dict[str, int] = defaultdict(int)
        order: list[str] = []

        def visit(node: str) -> None:
            state = visited[node]
            if state == 1:
                raise ValueError("dependency cycle detected")
            if state == 2:
                return
            visited[node] = 1
            for dependency in graph.get(node, ()):  # dependencies may be unregistered
                if dependency in graph:
                    visit(dependency)
            visited[node] = 2
            order.append(node)

        for node in graph:
            if visited[node] == 0:
                visit(node)
        return order
