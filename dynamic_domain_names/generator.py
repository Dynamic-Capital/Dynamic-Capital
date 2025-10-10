"""Domain generation engine for Dynamic Capital naming initiatives."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from itertools import permutations
from statistics import fmean
import re
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

from ._tld_registry import is_known_tld

__all__ = [
    "DomainSeed",
    "DomainPolicy",
    "DomainName",
    "DomainSuggestionDigest",
    "DynamicDomainGenerator",
]


_SLUG_RE = re.compile(r"[^a-z0-9-]+")


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_keyword(value: str) -> str:
    cleaned = _SLUG_RE.sub("", value.strip().lower())
    cleaned = re.sub(r"-{2,}", "-", cleaned)
    cleaned = cleaned.strip("-")
    if not cleaned:
        raise ValueError("keyword must contain at least one alphanumeric character")
    return cleaned


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = _normalise_keyword(tag)
        if cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _normalise_tlds(tlds: Sequence[str]) -> tuple[str, ...]:
    if not tlds:
        raise ValueError("at least one TLD must be provided")
    ordered: list[str] = []
    seen: set[str] = set()
    for tld in tlds:
        cleaned = tld.strip().lower()
        if not cleaned:
            continue
        if not cleaned.startswith("."):
            cleaned = f".{cleaned}"
        if not is_known_tld(cleaned):
            raise ValueError(f"domain has a non recognized TLD: {cleaned}")
        if cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    if not ordered:
        raise ValueError("at least one valid TLD must be provided")
    return tuple(ordered)


def _normalise_terms(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for value in values:
        try:
            cleaned = _normalise_keyword(value)
        except ValueError:
            continue
        if cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _dedupe(sequence: Iterable[str]) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()
    for item in sequence:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _has_repeated_run(label: str, *, limit: int = 3) -> bool:
    if limit <= 1:
        return False
    streak = 1
    previous: str | None = None
    for char in label:
        if char == previous:
            streak += 1
            if streak >= limit:
                return True
        else:
            streak = 1
            previous = char
    return False


def _score_candidate(
    label: str,
    tokens: tuple[str, ...],
    tld: str,
    policy: "DomainPolicy",
    weight_map: Mapping[str, float],
) -> float:
    length = len(label)
    length_span = max(policy.max_length - policy.min_length, 1)
    ideal_length = policy.min_length + length_span / 2.0
    length_score = 1.0 - min(abs(length - ideal_length) / (length_span or 1.0), 1.0)

    weights = [weight_map.get(token, 0.35) for token in tokens]
    keyword_score = fmean(weights) if weights else 0.0

    reserved_met = all(term in label for term in policy.reserved_terms)
    reserved_bonus = 0.15 if reserved_met else 0.0

    if len(policy.tlds) == 1:
        tld_score = 1.0
    else:
        rank = policy.tlds.index(tld)
        tld_score = 1.0 - rank / (len(policy.tlds) - 1)

    readability_penalty = 0.25 if _has_repeated_run(label) else 0.0
    readability_penalty += 0.15 if any(token.endswith(tokens[idx + 1][:1]) for idx, token in enumerate(tokens[:-1])) else 0.0

    score = (
        0.45 * keyword_score
        + 0.25 * length_score
        + 0.15 * tld_score
        + reserved_bonus
    )
    score -= readability_penalty
    return _clamp(score)


def _compose_label(tokens: Sequence[str]) -> str:
    return "".join(tokens)


@dataclass(slots=True)
class DomainSeed:
    """Atomic keyword input used to shape potential domain names."""

    keyword: str
    weight: float = 0.6
    freshness: float = 0.6
    intent: str = "core"
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.keyword = _normalise_keyword(self.keyword)
        self.weight = _clamp(float(self.weight))
        self.freshness = _clamp(float(self.freshness))
        self.intent = _normalise_keyword(self.intent)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def influence(self) -> float:
        return round(0.65 * self.weight + 0.35 * self.freshness, 4)


@dataclass(slots=True)
class DomainPolicy:
    """Guardrails and heuristics applied to generated domain names."""

    tlds: Sequence[str] = (".com", ".io", ".ai")
    min_length: int = 5
    max_length: int = 16
    allow_hyphen: bool = False
    reserved_terms: Sequence[str] = field(default_factory=tuple)
    forbidden_terms: Sequence[str] = field(default_factory=tuple)
    prefixes: Sequence[str] = ("get", "go", "try", "join")
    suffixes: Sequence[str] = ("hq", "labs", "capital", "cloud")
    max_words: int = 3

    def __post_init__(self) -> None:
        self.tlds = _normalise_tlds(self.tlds)
        if self.min_length <= 0:
            raise ValueError("min_length must be positive")
        if self.max_length < self.min_length:
            raise ValueError("max_length must be greater than or equal to min_length")
        self.allow_hyphen = bool(self.allow_hyphen)
        self.reserved_terms = _normalise_terms(self.reserved_terms)
        self.forbidden_terms = _normalise_terms(self.forbidden_terms)
        self.prefixes = _normalise_terms(self.prefixes)
        self.suffixes = _normalise_terms(self.suffixes)
        if self.max_words <= 0:
            raise ValueError("max_words must be positive")

    def prefers(self, term: str) -> bool:
        slug = _normalise_keyword(term)
        return slug in self.reserved_terms


@dataclass(slots=True)
class DomainName:
    """Proposed domain name candidate."""

    label: str
    tld: str
    score: float
    tokens: tuple[str, ...] = field(default_factory=tuple)
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.label = _normalise_keyword(self.label)
        if not self.label:
            raise ValueError("label must not be empty")
        if self.tld and not self.tld.startswith("."):
            self.tld = f".{self.tld.strip().lower()}"
        self.score = _clamp(float(self.score))
        self.tokens = tuple(self.tokens)
        self.notes = tuple(self.notes)

    @property
    def full_domain(self) -> str:
        return f"{self.label}{self.tld}"

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "label": self.label,
            "tld": self.tld,
            "score": self.score,
            "tokens": list(self.tokens),
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class DomainSuggestionDigest:
    """Digest capturing the generated domain names and quality metrics."""

    suggestions: Sequence[DomainName]
    metrics: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.suggestions = tuple(self.suggestions)
        self.metrics = dict(self.metrics)

    def top_domains(self, count: int | None = None) -> tuple[str, ...]:
        ordered = tuple(sorted(self.suggestions, key=lambda item: item.score, reverse=True))
        if count is None:
            count = len(ordered)
        if count < 0:
            raise ValueError("count must be non-negative")
        return tuple(candidate.full_domain for candidate in ordered[:count])


class DynamicDomainGenerator:
    """Generate brand-ready domain names from weighted keyword seeds."""

    def __init__(self, *, history_limit: int | None = 128) -> None:
        if history_limit is not None and history_limit <= 0:
            raise ValueError("history_limit must be positive when provided")
        self._seeds: Deque[DomainSeed] = deque(maxlen=history_limit)

    def prime(self, seeds: Iterable[DomainSeed]) -> None:
        for seed in seeds:
            self.register(seed)

    def register(self, seed: DomainSeed) -> None:
        self._seeds.append(seed)

    def generate(self, policy: DomainPolicy, *, sample_size: int = 12) -> DomainSuggestionDigest:
        if sample_size <= 0:
            raise ValueError("sample_size must be positive")

        seeds = list(self._seeds)
        history_size = float(len(seeds))

        weight_map: dict[str, float] = {}
        for seed in seeds:
            weight_map[seed.keyword] = max(weight_map.get(seed.keyword, 0.0), seed.influence)

        base_tokens = _dedupe([seed.keyword for seed in seeds] + list(policy.reserved_terms))
        if not base_tokens:
            base_tokens = list(policy.reserved_terms) or ["dynamic"]

        base_tokens = base_tokens[: max(policy.max_words * 2, len(policy.reserved_terms))]
        prefix_options = [""] + list(policy.prefixes[:2])
        suffix_options = [""] + list(policy.suffixes[:2])

        candidates: list[DomainName] = []
        seen: set[tuple[str, str]] = set()
        max_candidates = sample_size * max(len(policy.tlds), 1) * 4

        for length in range(1, min(policy.max_words, len(base_tokens)) + 1):
            for sequence in permutations(base_tokens, length):
                for prefix in prefix_options:
                    for suffix in suffix_options:
                        tokens = tuple(
                            token
                            for token in ((prefix,) if prefix else ()) + sequence + ((suffix,) if suffix else ())
                        )
                        if not tokens:
                            continue
                        if policy.reserved_terms and not all(term in tokens for term in policy.reserved_terms):
                            continue

                        label_options = [_compose_label(tokens)]
                        if policy.allow_hyphen and len(tokens) > 1:
                            hyphen_label = "-".join(tokens)
                            label_options.append(hyphen_label)

                        for label in label_options:
                            if not policy.min_length <= len(label) <= policy.max_length:
                                continue

                            if any(term in label.replace("-", "") for term in policy.forbidden_terms):
                                continue

                            if not policy.allow_hyphen and "-" in label:
                                continue

                            for tld in policy.tlds:
                                key = (label, tld)
                                if key in seen:
                                    continue
                                score = _score_candidate(label.replace("-", ""), tokens, tld, policy, weight_map)
                                if score <= 0.0:
                                    continue
                                notes: list[str] = []
                                if prefix:
                                    notes.append(f"prefix:{prefix}")
                                if suffix:
                                    notes.append(f"suffix:{suffix}")
                                if any(term in label for term in policy.reserved_terms):
                                    notes.append("reserved")
                                if any(token not in weight_map for token in tokens):
                                    notes.append("augmented")
                                candidate = DomainName(label=label, tld=tld, score=score, tokens=tokens, notes=tuple(notes))
                                candidates.append(candidate)
                                seen.add(key)

                        if len(candidates) >= max_candidates:
                            break
                    if len(candidates) >= max_candidates:
                        break
                if len(candidates) >= max_candidates:
                    break
            if len(candidates) >= max_candidates:
                break

        candidates.sort(key=lambda item: item.score, reverse=True)
        shortlisted = tuple(candidates[:sample_size])

        reserved_hits = 0
        for candidate in shortlisted:
            if all(term in candidate.label for term in policy.reserved_terms):
                reserved_hits += 1

        metrics: dict[str, float] = {
            "history_size": history_size,
            "candidate_count": float(len(candidates)),
            "mean_score": fmean([candidate.score for candidate in shortlisted]) if shortlisted else 0.0,
            "reserved_coverage": (reserved_hits / len(shortlisted)) if shortlisted else 0.0,
        }

        return DomainSuggestionDigest(suggestions=shortlisted, metrics=metrics)
