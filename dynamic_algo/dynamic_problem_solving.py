"""Goal-directed problem solving engine for Dynamic Capital workflows.

This module provides a pragmatic, feedback-driven approach to resolving
strategic or operational obstacles.  The algorithm keeps the active goal in
focus, surfaces the obstacles that threaten it most, and recommends the most
impactful hypotheses to test next.  Outcomes are fed back into the model so the
system continuously learns where to double down or pivot.

The process is intentionally lightweight and human-friendly so teams can use it
as a decision-support loop while maintaining full control over execution.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "Goal",
    "Obstacle",
    "Insight",
    "ActionHypothesis",
    "ProblemOutcome",
    "ActionPlan",
    "DynamicProblemSolvingAlgo",
    "ProblemSolvingError",
    "GoalNotDefinedError",
]


class ProblemSolvingError(RuntimeError):
    """Base exception for problem solving orchestration errors."""


class GoalNotDefinedError(ProblemSolvingError):
    """Raised when an operation requires an active goal but none is set."""


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp must be datetime, ISO-8601 string, or None")


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(min(value, maximum), minimum)


def _normalise_tags(values: Iterable[str]) -> tuple[str, ...]:
    unique: list[str] = []
    seen: set[str] = set()
    for raw in values:
        tag = raw.strip().lower()
        if not tag or tag in seen:
            continue
        seen.add(tag)
        unique.append(tag)
    return tuple(unique)


@dataclass(slots=True)
class Goal:
    """Represents the desired state the team is working toward."""

    goal_id: str
    description: str
    success_metrics: tuple[str, ...] = field(default_factory=tuple)
    priority: int = 3
    deadline: datetime | None = None
    owner: str | None = None
    tags: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.goal_id = str(self.goal_id).strip().lower() or "goal"
        self.description = self.description.strip()
        self.priority = max(1, min(int(self.priority), 5))
        self.deadline = _coerce_timestamp(self.deadline) if self.deadline else None
        self.tags = _normalise_tags(self.tags)
        self.success_metrics = tuple(metric.strip() for metric in self.success_metrics if metric.strip())

    def focus_multiplier(self, *, now: datetime | None = None) -> float:
        """Return how urgent the goal is relative to its deadline and priority."""

        urgency = 1.0 + (self.priority - 3) * 0.2
        if self.deadline is None:
            return urgency

        current_time = now or datetime.now(timezone.utc)
        remaining = self.deadline - current_time
        if remaining <= timedelta():
            return urgency + 0.8
        if remaining <= timedelta(days=1):
            return urgency + 0.6
        if remaining <= timedelta(days=7):
            return urgency + 0.3
        return urgency


@dataclass(slots=True)
class Obstacle:
    """Represents a barrier or constraint preventing goal attainment."""

    obstacle_id: str
    description: str
    severity: float
    likelihood: float
    categories: tuple[str, ...] = field(default_factory=tuple)
    owner: str | None = None
    first_seen_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    assumptions: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.obstacle_id = str(self.obstacle_id).strip().lower() or "obstacle"
        self.description = self.description.strip()
        self.severity = _clamp(float(self.severity), 0.0, 1.0)
        self.likelihood = _clamp(float(self.likelihood), 0.0, 1.0)
        self.categories = _normalise_tags(self.categories)
        self.assumptions = tuple(a.strip() for a in self.assumptions if a.strip())
        self.first_seen_at = _coerce_timestamp(self.first_seen_at)
        self.last_updated_at = _coerce_timestamp(self.last_updated_at)

    @property
    def pressure(self) -> float:
        """Severity × likelihood with a recency boost."""

        recency_hours = max((datetime.now(timezone.utc) - self.last_updated_at).total_seconds() / 3600.0, 0.0)
        recency_factor = 1.0 if recency_hours <= 4 else max(0.6, 1.4 - recency_hours / 24.0)
        return round(self.severity * self.likelihood * recency_factor, 4)


@dataclass(slots=True)
class Insight:
    """Observations or learnings that can inform the next move."""

    summary: str
    confidence: float = 0.5
    opportunity: float = 0.5
    tags: tuple[str, ...] = field(default_factory=tuple)
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.summary = self.summary.strip()
        self.confidence = _clamp(float(self.confidence), 0.0, 1.0)
        self.opportunity = _clamp(float(self.opportunity), 0.0, 1.0)
        self.tags = _normalise_tags(self.tags)
        self.captured_at = _coerce_timestamp(self.captured_at)
        if not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping")
        self.metadata = dict(self.metadata)

    @property
    def weight(self) -> float:
        return round((self.confidence * 0.6) + (self.opportunity * 0.4), 4)


@dataclass(slots=True)
class ActionHypothesis:
    """Candidate intervention to reduce an obstacle or unlock the goal."""

    hypothesis_id: str
    description: str
    target_obstacles: tuple[str, ...]
    expected_benefit: float
    effort: float
    confidence: float = 0.5
    status: str = "proposed"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_tested_at: datetime | None = None
    evidence: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.hypothesis_id = str(self.hypothesis_id).strip().lower() or "hypothesis"
        self.description = self.description.strip()
        self.target_obstacles = tuple(sorted({tid.strip().lower() for tid in self.target_obstacles if tid.strip()}))
        self.expected_benefit = _clamp(float(self.expected_benefit), 0.0, 1.0)
        self.effort = max(float(self.effort), 0.01)
        self.confidence = _clamp(float(self.confidence), 0.0, 1.0)
        self.status = self.status.strip().lower() or "proposed"
        self.created_at = _coerce_timestamp(self.created_at)
        self.last_tested_at = _coerce_timestamp(self.last_tested_at) if self.last_tested_at else None
        self.evidence = tuple(item.strip() for item in self.evidence if item.strip())

    @property
    def leverage(self) -> float:
        """Return the expected impact relative to the required effort."""

        return round(self.expected_benefit / self.effort, 4)


@dataclass(slots=True)
class ProblemOutcome:
    """Recorded result of experimenting with a hypothesis."""

    hypothesis_id: str
    progress_delta: float
    impact_realised: float
    notes: str | None = None
    captured_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.hypothesis_id = str(self.hypothesis_id).strip().lower()
        self.progress_delta = _clamp(float(self.progress_delta), -1.0, 1.0)
        self.impact_realised = _clamp(float(self.impact_realised), 0.0, 1.0)
        self.notes = self.notes.strip() if isinstance(self.notes, str) else None
        self.captured_at = _coerce_timestamp(self.captured_at)
        if not isinstance(self.metadata, Mapping):
            raise TypeError("metadata must be a mapping")
        self.metadata = dict(self.metadata)


@dataclass(slots=True)
class ActionPlan:
    """Actionable plan output by the dynamic problem solving loop."""

    goal: Goal
    focus_obstacles: tuple[Obstacle, ...]
    insights: tuple[Insight, ...]
    hypotheses: tuple[ActionHypothesis, ...]
    recommended_steps: tuple[ActionHypothesis, ...]
    rationale: str


class DynamicProblemSolvingAlgo:
    """Coordinates a continuous loop to move from obstacle to solution."""

    def __init__(
        self,
        *,
        max_focus_obstacles: int = 3,
        max_recommended_steps: int = 5,
        exploration_bias: float = 0.35,
        learning_rate: float = 0.25,
        confidence_decay: float = 0.05,
    ) -> None:
        self.max_focus_obstacles = max(1, int(max_focus_obstacles))
        self.max_recommended_steps = max(1, int(max_recommended_steps))
        self.exploration_bias = _clamp(float(exploration_bias), 0.0, 1.0)
        self.learning_rate = _clamp(float(learning_rate), 0.0, 1.0)
        self.confidence_decay = _clamp(float(confidence_decay), 0.0, 1.0)
        self._goal: Goal | None = None
        self._obstacles: MutableMapping[str, Obstacle] = {}
        self._insights: list[Insight] = []
        self._hypotheses: MutableMapping[str, ActionHypothesis] = {}
        self._outcomes: list[ProblemOutcome] = []

    # ----------------------------------------------------------------- goal ops
    def set_goal(self, goal: Goal) -> None:
        self._goal = goal

    def update_goal(self, **changes: object) -> None:
        if self._goal is None:
            raise GoalNotDefinedError("Cannot update goal before one is set")

        payload = {field: getattr(self._goal, field) for field in self._goal.__slots__}  # type: ignore[attr-defined]
        payload.update(changes)
        self._goal = Goal(**payload)  # type: ignore[arg-type]

    # --------------------------------------------------------------- obstacle ops
    def register_obstacle(self, obstacle: Obstacle) -> None:
        self._obstacles[obstacle.obstacle_id] = obstacle

    def update_obstacle(self, obstacle_id: str, **changes: object) -> None:
        key = obstacle_id.strip().lower()
        if key not in self._obstacles:
            raise KeyError(f"Unknown obstacle '{obstacle_id}'")

        obstacle = self._obstacles[key]
        payload = {field: getattr(obstacle, field) for field in obstacle.__slots__}  # type: ignore[attr-defined]
        payload.update(changes)
        payload["last_updated_at"] = datetime.now(timezone.utc)
        self._obstacles[key] = Obstacle(**payload)  # type: ignore[arg-type]

    # ---------------------------------------------------------------- insight ops
    def add_insight(self, insight: Insight) -> None:
        self._insights.append(insight)
        self._insights = sorted(self._insights, key=lambda item: item.captured_at)[-50:]

    # ------------------------------------------------------------- hypothesis ops
    def propose_hypothesis(self, hypothesis: ActionHypothesis) -> None:
        self._hypotheses[hypothesis.hypothesis_id] = hypothesis

    def update_hypothesis(self, hypothesis_id: str, **changes: object) -> None:
        key = hypothesis_id.strip().lower()
        if key not in self._hypotheses:
            raise KeyError(f"Unknown hypothesis '{hypothesis_id}'")

        hypothesis = self._hypotheses[key]
        payload = {field: getattr(hypothesis, field) for field in hypothesis.__slots__}  # type: ignore[attr-defined]
        payload.update(changes)
        self._hypotheses[key] = ActionHypothesis(**payload)  # type: ignore[arg-type]

    # ----------------------------------------------------------------- outcomes
    def record_outcome(self, outcome: ProblemOutcome) -> None:
        key = outcome.hypothesis_id
        if key not in self._hypotheses:
            raise KeyError(f"Unknown hypothesis '{outcome.hypothesis_id}'")

        hypothesis = self._hypotheses[key]
        confidence_shift = outcome.progress_delta * self.learning_rate
        hypothesis.confidence = _clamp(hypothesis.confidence + confidence_shift)
        hypothesis.expected_benefit = _clamp(
            hypothesis.expected_benefit * (1 - self.learning_rate) + outcome.impact_realised * self.learning_rate
        )
        hypothesis.last_tested_at = outcome.captured_at

        status = hypothesis.status
        if outcome.progress_delta >= 0.6:
            status = "validated"
        elif outcome.progress_delta <= -0.4:
            status = "retired"
        elif outcome.progress_delta > 0.0:
            status = "active"
        hypothesis.status = status

        if outcome.notes:
            hypothesis.evidence = tuple({*hypothesis.evidence, outcome.notes})

        # Apply mild decay to other hypotheses to encourage exploration.
        for other in self._hypotheses.values():
            if other.hypothesis_id == key:
                continue
            other.confidence = _clamp(other.confidence * (1 - self.confidence_decay))

        self._outcomes.append(outcome)
        self._outcomes = self._outcomes[-200:]

    # ----------------------------------------------------------- planning engine
    def build_plan(self, *, now: datetime | None = None) -> ActionPlan:
        if self._goal is None:
            raise GoalNotDefinedError("Cannot build a plan without an active goal")

        current_time = now or datetime.now(timezone.utc)
        focus_multiplier = self._goal.focus_multiplier(now=current_time)

        focus_candidates = sorted(
            self._obstacles.values(),
            key=lambda obstacle: obstacle.pressure * focus_multiplier,
            reverse=True,
        )
        focus_obstacles = tuple(focus_candidates[: self.max_focus_obstacles])
        focus_ids = {obstacle.obstacle_id for obstacle in focus_obstacles}

        insights = tuple(sorted(self._insights[-10:], key=lambda item: item.weight, reverse=True))

        hypotheses = tuple(
            sorted(
                self._hypotheses.values(),
                key=lambda hypothesis: self._score_hypothesis(hypothesis, focus_ids, current_time, focus_multiplier),
                reverse=True,
            )
        )

        recommended_steps = tuple(
            hypothesis
            for hypothesis in hypotheses
            if hypothesis.status in {"proposed", "active"}
        )
        recommended_steps = recommended_steps[: self.max_recommended_steps]

        rationale = self._build_rationale(focus_obstacles, recommended_steps, insights)

        return ActionPlan(
            goal=self._goal,
            focus_obstacles=focus_obstacles,
            insights=insights,
            hypotheses=hypotheses,
            recommended_steps=recommended_steps,
            rationale=rationale,
        )

    # ------------------------------------------------------------- score helpers
    def _score_hypothesis(
        self,
        hypothesis: ActionHypothesis,
        focus_ids: set[str],
        current_time: datetime,
        focus_multiplier: float,
    ) -> float:
        focus_alignment = 1.0
        if hypothesis.target_obstacles:
            overlap = len(focus_ids.intersection(hypothesis.target_obstacles))
            focus_alignment += overlap / max(len(hypothesis.target_obstacles), 1)
        else:
            focus_alignment += self.exploration_bias

        recency_bonus = 1.0
        if hypothesis.last_tested_at is not None:
            delta = (current_time - hypothesis.last_tested_at).total_seconds() / 3600.0
            recency_bonus = 1.0 if delta <= 6 else min(1.4, 1.0 + delta / 48.0)
        else:
            recency_bonus = 1.1

        status_modifier = {
            "proposed": 1.0,
            "active": 1.1,
            "validated": 0.9,
            "retired": 0.4,
        }.get(hypothesis.status, 1.0)

        leverage = hypothesis.leverage
        confidence = hypothesis.confidence

        score = leverage * (0.5 + confidence * 0.5) * focus_alignment * recency_bonus * status_modifier * focus_multiplier
        return round(score, 6)

    def _build_rationale(
        self,
        focus_obstacles: Sequence[Obstacle],
        recommended_steps: Sequence[ActionHypothesis],
        insights: Sequence[Insight],
    ) -> str:
        if not focus_obstacles:
            return "No critical obstacles registered. Consider capturing blockers before proceeding."

        parts: list[str] = []
        obstacle_lines = ", ".join(
            f"{obstacle.obstacle_id} (pressure={obstacle.pressure:.2f})" for obstacle in focus_obstacles
        )
        parts.append(f"Focus set on obstacles: {obstacle_lines}.")

        if recommended_steps:
            step_lines = "; ".join(
                f"{step.hypothesis_id}→{step.description[:60]} (leverage={step.leverage:.2f}, confidence={step.confidence:.2f})"
                for step in recommended_steps
            )
            parts.append(f"Recommended experiments: {step_lines}.")
        else:
            parts.append("No eligible hypotheses. Brainstorm new options targeting the highlighted obstacles.")

        if insights:
            top_insight = max(insights, key=lambda item: item.weight)
            parts.append(f"Most relevant insight: '{top_insight.summary}' (weight={top_insight.weight:.2f}).")

        return " ".join(parts)
