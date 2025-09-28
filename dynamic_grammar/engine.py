"""Dynamic grammar engine with adaptive linguistic rules."""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
import re
from time import perf_counter
from typing import Callable, Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "DynamicGrammarEngine",
    "GrammarAnalysis",
    "GrammarIssue",
    "GrammarRule",
    "GrammarSuggestion",
]

RuleCheck = Callable[[str, Mapping[str, object]], Iterable["GrammarIssue"]]


# ---------------------------------------------------------------------------
# helper utilities
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tz(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for value in values:
        cleaned = value.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


# ---------------------------------------------------------------------------
# data classes
# ---------------------------------------------------------------------------


@dataclass(slots=True)
class GrammarSuggestion:
    """Suggestion for improving a grammar issue."""

    replacement: str
    explanation: str
    confidence: float = 0.5
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.replacement = _normalise_text(self.replacement)
        self.explanation = _normalise_text(self.explanation)
        self.confidence = _clamp(float(self.confidence))
        self.metadata = _coerce_mapping(self.metadata)


@dataclass(slots=True)
class GrammarIssue:
    """Detected grammar issue within a text sample."""

    rule_id: str
    message: str
    start: int
    end: int
    severity: str = "medium"
    confidence: float = 0.5
    suggestions: tuple[GrammarSuggestion, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.rule_id = _normalise_lower(self.rule_id)
        self.message = _normalise_text(self.message)
        if self.start < 0 or self.end < self.start:
            raise ValueError("invalid span for grammar issue")
        self.severity = _normalise_lower(self.severity)
        self.confidence = _clamp(float(self.confidence))
        self.suggestions = tuple(self.suggestions)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def span(self) -> tuple[int, int]:
        return (self.start, self.end)


@dataclass(slots=True)
class GrammarRule:
    """Definition of a grammar rule within the engine."""

    rule_id: str
    description: str
    check: RuleCheck
    severity: str = "medium"
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None
    enabled: bool = True

    def __post_init__(self) -> None:
        self.rule_id = _normalise_lower(self.rule_id)
        self.description = _normalise_text(self.description)
        if not callable(self.check):  # pragma: no cover - defensive guard
            raise TypeError("check must be callable")
        self.severity = _normalise_lower(self.severity)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)
        self.enabled = bool(self.enabled)


@dataclass(slots=True)
class GrammarAnalysis:
    """Analysis result for a block of text."""

    text: str
    issues: tuple[GrammarIssue, ...]
    created_at: datetime
    duration_ms: float
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.text = _normalise_text(self.text)
        self.issues = tuple(self.issues)
        self.created_at = _ensure_tz(self.created_at)
        self.duration_ms = float(self.duration_ms)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def issue_count(self) -> int:
        return len(self.issues)

    @property
    def severity_breakdown(self) -> Mapping[str, int]:
        counter: Counter[str] = Counter(issue.severity for issue in self.issues)
        return dict(counter)

    @property
    def rule_coverage(self) -> Mapping[str, int]:
        counter: Counter[str] = Counter(issue.rule_id for issue in self.issues)
        return dict(counter)

    @property
    def quality_score(self) -> float:
        """Return a heuristic quality score between 0 and 1."""

        token_count = max(len(self.text.split()), 1)
        penalty = sum(issue.confidence for issue in self.issues) / token_count
        score = 1.0 - penalty
        return _clamp(round(score, 6))

    def summary(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "issue_count": self.issue_count,
            "severity_breakdown": self.severity_breakdown,
            "rule_coverage": self.rule_coverage,
            "quality_score": self.quality_score,
            "duration_ms": self.duration_ms,
            "created_at": self.created_at,
        }
        return payload


# ---------------------------------------------------------------------------
# dynamic grammar engine
# ---------------------------------------------------------------------------


class DynamicGrammarEngine:
    """Engine that executes adaptive grammar rules against text."""

    def __init__(
        self,
        *,
        rules: Sequence[GrammarRule] | None = None,
        history_size: int = 128,
    ) -> None:
        if history_size <= 0:
            raise ValueError("history_size must be positive")
        self._rules: dict[str, GrammarRule] = {}
        self._history: Deque[GrammarAnalysis] = deque(maxlen=history_size)
        if rules is not None:
            for rule in rules:
                self.register_rule(rule)
        else:
            for rule in self._default_rules():
                self.register_rule(rule)

    # ------------------------------------------------------------------
    # rule management
    # ------------------------------------------------------------------

    @staticmethod
    def _default_rules() -> Sequence[GrammarRule]:
        return (
            _build_repeated_word_rule(),
            _build_double_space_rule(),
            _build_trailing_whitespace_rule(),
            _build_sentence_case_rule(),
        )

    def register_rule(self, rule: GrammarRule) -> None:
        if rule.rule_id in self._rules:
            raise ValueError(f"rule '{rule.rule_id}' already registered")
        self._rules[rule.rule_id] = rule

    def register_rules(self, rules: Sequence[GrammarRule]) -> None:
        for rule in rules:
            self.register_rule(rule)

    def remove_rule(self, rule_id: str) -> None:
        self._rules.pop(_normalise_lower(rule_id), None)

    def enable_rule(self, rule_id: str) -> None:
        rule = self._rules.get(_normalise_lower(rule_id))
        if rule is not None:
            rule.enabled = True

    def disable_rule(self, rule_id: str) -> None:
        rule = self._rules.get(_normalise_lower(rule_id))
        if rule is not None:
            rule.enabled = False

    def get_rule(self, rule_id: str) -> GrammarRule | None:
        return self._rules.get(_normalise_lower(rule_id))

    @property
    def rules(self) -> tuple[GrammarRule, ...]:
        return tuple(self._rules.values())

    # ------------------------------------------------------------------
    # analysis
    # ------------------------------------------------------------------

    def analyse(
        self,
        text: str,
        *,
        context: Mapping[str, object] | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> GrammarAnalysis:
        payload = _normalise_text(text)
        context_payload = _coerce_mapping(context) or {}
        start = perf_counter()
        issues: list[GrammarIssue] = []
        for rule in self._rules.values():
            if not rule.enabled:
                continue
            for issue in rule.check(payload, context_payload):
                if issue.rule_id != rule.rule_id:
                    issue = GrammarIssue(
                        rule_id=rule.rule_id,
                        message=issue.message,
                        start=issue.start,
                        end=issue.end,
                        severity=issue.severity,
                        confidence=issue.confidence,
                        suggestions=issue.suggestions,
                        metadata=issue.metadata,
                    )
                issues.append(issue)
        duration_ms = (perf_counter() - start) * 1000
        analysis = GrammarAnalysis(
            text=payload,
            issues=tuple(issues),
            created_at=_utcnow(),
            duration_ms=duration_ms,
            metadata=metadata,
        )
        self._history.append(analysis)
        return analysis

    def suggest(
        self,
        text: str,
        *,
        limit: int | None = None,
        context: Mapping[str, object] | None = None,
    ) -> tuple[GrammarSuggestion, ...]:
        analysis = self.analyse(text, context=context)
        suggestions: list[GrammarSuggestion] = []
        for issue in analysis.issues:
            suggestions.extend(issue.suggestions)
        if limit is not None:
            return tuple(suggestions[: max(limit, 0)])
        return tuple(suggestions)

    # ------------------------------------------------------------------
    # history
    # ------------------------------------------------------------------

    @property
    def history(self) -> tuple[GrammarAnalysis, ...]:
        return tuple(self._history)

    def clear_history(self) -> None:
        self._history.clear()


# ---------------------------------------------------------------------------
# built-in rule factories
# ---------------------------------------------------------------------------


def _build_repeated_word_rule() -> GrammarRule:
    pattern = re.compile(r"\b(\w+)(\s+)(\1)\b", re.IGNORECASE)

    def check(text: str, _: Mapping[str, object]) -> Iterable[GrammarIssue]:
        for match in pattern.finditer(text):
            word = match.group(1)
            start, end = match.span()
            suggestion = GrammarSuggestion(
                replacement=word,
                explanation="Remove the repeated word.",
                confidence=0.8,
            )
            yield GrammarIssue(
                rule_id="repeated_word",
                message=f"Repeated word '{word}'.",
                start=start,
                end=end,
                severity="medium",
                confidence=0.7,
                suggestions=(suggestion,),
            )

    return GrammarRule(
        rule_id="repeated_word",
        description="Detect consecutive repeated words.",
        check=check,
        severity="medium",
        tags=("clarity", "consistency"),
    )


def _build_double_space_rule() -> GrammarRule:
    pattern = re.compile(r"(?<=\S)  +(?=\S)")

    def check(text: str, _: Mapping[str, object]) -> Iterable[GrammarIssue]:
        for match in pattern.finditer(text):
            start, end = match.span()
            yield GrammarIssue(
                rule_id="double_space",
                message="Multiple spaces detected.",
                start=start,
                end=end,
                severity="low",
                confidence=0.4,
                suggestions=(
                    GrammarSuggestion(
                        replacement=" ",
                        explanation="Replace with a single space.",
                        confidence=0.6,
                    ),
                ),
            )

    return GrammarRule(
        rule_id="double_space",
        description="Collapse multiple spaces between words.",
        check=check,
        severity="low",
        tags=("formatting", "spacing"),
    )


def _build_trailing_whitespace_rule() -> GrammarRule:
    pattern = re.compile(r"[ \t]+(?=\n|$)")

    def check(text: str, _: Mapping[str, object]) -> Iterable[GrammarIssue]:
        for match in pattern.finditer(text):
            start, end = match.span()
            yield GrammarIssue(
                rule_id="trailing_whitespace",
                message="Trailing whitespace detected.",
                start=start,
                end=end,
                severity="low",
                confidence=0.3,
                suggestions=(
                    GrammarSuggestion(
                        replacement="",
                        explanation="Remove trailing whitespace.",
                        confidence=0.5,
                    ),
                ),
            )

    return GrammarRule(
        rule_id="trailing_whitespace",
        description="Highlight trailing whitespace at line ends.",
        check=check,
        severity="low",
        tags=("formatting", "cleanup"),
    )


def _build_sentence_case_rule() -> GrammarRule:
    sentence_pattern = re.compile(r"(^|[.!?]\s+)([a-z])")

    def check(text: str, _: Mapping[str, object]) -> Iterable[GrammarIssue]:
        for match in sentence_pattern.finditer(text):
            prefix, letter = match.groups()
            if not prefix:
                continue
            start = match.start(2)
            end = match.end(2)
            capitalised = letter.upper()
            yield GrammarIssue(
                rule_id="sentence_case",
                message="Sentence should start with a capital letter.",
                start=start,
                end=end,
                severity="medium",
                confidence=0.6,
                suggestions=(
                    GrammarSuggestion(
                        replacement=capitalised,
                        explanation="Capitalise the first letter of the sentence.",
                        confidence=0.7,
                    ),
                ),
            )

    return GrammarRule(
        rule_id="sentence_case",
        description="Ensure sentences start with capital letters.",
        check=check,
        severity="medium",
        tags=("style", "readability"),
    )
