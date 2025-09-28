"""Dynamic predictive text engine with hybrid personalization."""

from __future__ import annotations

from collections import Counter, OrderedDict, defaultdict
from dataclasses import dataclass, field
from math import exp, log
from typing import DefaultDict, Iterable, Mapping, Sequence

__all__ = [
    "PredictiveSequence",
    "PredictiveContext",
    "PredictionSuggestion",
    "Prediction",
    "DynamicPredictiveEngine",
]


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    if value < lower:
        return lower
    if value > upper:
        return upper
    return value


def _normalise_token(token: str) -> str:
    if not isinstance(token, str):  # pragma: no cover - defensive guard
        raise TypeError("token must be a string")
    cleaned = token.strip()
    if not cleaned:
        raise ValueError("token must not be empty")
    return cleaned


def _normalise_optional_tokens(tokens: Sequence[str] | None) -> tuple[str, ...]:
    if not tokens:
        return ()
    normalised: list[str] = []
    for token in tokens:
        if not isinstance(token, str):
            raise TypeError("token must be a string")
        cleaned = token.strip()
        if cleaned:
            normalised.append(cleaned)
    return tuple(normalised)


def _normalise_required_tokens(tokens: Sequence[str]) -> tuple[str, ...]:
    normalised = _normalise_optional_tokens(tokens)
    if not normalised:
        raise ValueError("tokens must not be empty")
    return normalised


def _coerce_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class PredictiveSequence:
    """Observed token sequence used to train the predictive engine."""

    tokens: Sequence[str]
    user_id: str | None = None
    weight: float = 1.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.tokens = _normalise_required_tokens(self.tokens)
        if isinstance(self.user_id, str):
            cleaned = self.user_id.strip()
            self.user_id = cleaned or None
        else:
            self.user_id = None
        self.weight = max(float(self.weight), 0.0)
        self.metadata = _coerce_metadata(self.metadata)

    def as_tuple(self) -> tuple[str, ...]:
        return tuple(self.tokens)


@dataclass(slots=True)
class PredictiveContext:
    """Context describing a prediction request."""

    tokens: Sequence[str]
    user_id: str | None = None
    domain: str = "default"
    personalization: float = 0.35
    temperature: float = 0.85
    diversity_bias: float = 0.25
    banned_tokens: Sequence[str] | None = None
    recent_accepts: Sequence[str] | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.tokens = _normalise_optional_tokens(self.tokens)
        if isinstance(self.user_id, str):
            cleaned = self.user_id.strip()
            self.user_id = cleaned or None
        else:
            self.user_id = None
        self.domain = _normalise_token(self.domain)
        self.personalization = _clamp(float(self.personalization))
        self.temperature = max(float(self.temperature), 0.05)
        self.diversity_bias = _clamp(float(self.diversity_bias))
        self.banned_tokens = _normalise_optional_tokens(self.banned_tokens)
        self.recent_accepts = _normalise_optional_tokens(self.recent_accepts)
        self.metadata = _coerce_metadata(self.metadata)

    @property
    def signature(self) -> tuple[str | None, tuple[str, ...], str]:
        return (
            self.user_id,
            tuple(self.tokens),
            self.domain,
        )


@dataclass(slots=True)
class PredictionSuggestion:
    """Represents a single predictive suggestion."""

    token: str
    probability: float
    score: float
    provenance: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.token = _normalise_token(self.token)
        self.probability = _clamp(float(self.probability))
        self.score = max(float(self.score), 0.0)
        self.provenance = tuple(sorted(set(_normalise_optional_tokens(self.provenance))))


@dataclass(slots=True)
class Prediction:
    """Result of a prediction request."""

    context: PredictiveContext
    suggestions: tuple[PredictionSuggestion, ...]
    metrics: Mapping[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.suggestions = tuple(self.suggestions)
        self.metrics = dict(self.metrics)


class DynamicPredictiveEngine:
    """Hybrid predictive text engine that blends global and personal priors."""

    def __init__(
        self,
        *,
        order: int = 4,
        alpha: float = 0.1,
        backoff_decay: float = 0.65,
        pending_limit: int = 512,
    ) -> None:
        if order < 2:
            raise ValueError("order must be at least 2")
        if alpha <= 0.0:
            raise ValueError("alpha must be positive")
        if not 0.0 < backoff_decay <= 1.0:
            raise ValueError("backoff_decay must be between 0 and 1")
        if pending_limit <= 0:
            raise ValueError("pending_limit must be positive")
        self._order = int(order)
        self._alpha = float(alpha)
        self._backoff_decay = float(backoff_decay)
        self._global_counts: DefaultDict[tuple[str, ...], Counter[str]] = defaultdict(Counter)
        self._user_counts: DefaultDict[str, DefaultDict[tuple[str, ...], Counter[str]]] = defaultdict(
            lambda: defaultdict(Counter)
        )
        self._unigram_counts: Counter[str] = Counter()
        self._user_unigram_counts: DefaultDict[str, Counter[str]] = defaultdict(Counter)
        self._vocabulary: set[str] = set()
        self._request_count = 0
        self._prediction_hits = 0
        self._feedback_accepts = 0
        self._feedback_rejects = 0
        self._pending_limit = pending_limit
        self._pending_predictions: "OrderedDict[tuple[str | None, tuple[str, ...], str], tuple[str, ...]]" = (
            OrderedDict()
        )

    @property
    def order(self) -> int:
        return self._order

    @property
    def request_count(self) -> int:
        return self._request_count

    @property
    def hit_rate(self) -> float:
        total = self._feedback_accepts + self._feedback_rejects
        if total == 0:
            return 0.0
        return self._feedback_accepts / total

    @property
    def top1_accuracy(self) -> float:
        if self._feedback_accepts == 0:
            return 0.0
        return self._prediction_hits / self._feedback_accepts

    def ingest(self, sequence: PredictiveSequence) -> None:
        tokens = sequence.as_tuple()
        weight = sequence.weight or 0.0
        if weight <= 0.0:
            return
        user_id = sequence.user_id
        self._vocabulary.update(tokens)
        for token in tokens:
            self._unigram_counts[token] += weight
            if user_id:
                self._user_unigram_counts[user_id][token] += weight
        for index, token in enumerate(tokens):
            for depth in range(1, self._order):
                if index - depth < 0:
                    break
                prefix = tuple(tokens[index - depth : index])
                self._global_counts[prefix][token] += weight
                if user_id:
                    self._user_counts[user_id][prefix][token] += weight

    def bulk_ingest(self, sequences: Iterable[PredictiveSequence]) -> None:
        for sequence in sequences:
            self.ingest(sequence)

    def predict(
        self,
        context: PredictiveContext,
        *,
        top_k: int = 5,
        min_probability: float = 0.0,
    ) -> Prediction:
        if top_k <= 0:
            raise ValueError("top_k must be positive")
        self._request_count += 1
        prefix_tokens = tuple(context.tokens[-(self._order - 1) :])
        candidate_scores: dict[str, float] = {}
        candidate_sources: dict[str, set[str]] = {}
        max_depth = len(prefix_tokens)
        backoff_weight = 1.0
        for depth in range(max_depth, 0, -1):
            prefix = prefix_tokens[-depth:]
            global_counts = self._global_counts.get(prefix)
            user_counts = None
            if context.user_id:
                user_counts = self._user_counts.get(context.user_id, {}).get(prefix)
            if not global_counts and not user_counts:
                backoff_weight *= self._backoff_decay
                continue
            tokens = set()
            if global_counts:
                tokens.update(global_counts.keys())
            if user_counts:
                tokens.update(user_counts.keys())
            for token in tokens:
                if token in context.banned_tokens:
                    continue
                global_prob = self._smoothed_probability(global_counts, token)
                user_prob = self._smoothed_probability(user_counts, token)
                blended = self._blend_probabilities(global_prob, user_prob, context.personalization)
                if blended <= 0.0:
                    continue
                candidate_scores[token] = candidate_scores.get(token, 0.0) + backoff_weight * blended
                provenance = candidate_sources.setdefault(token, set())
                if global_counts and global_counts.get(token, 0.0) > 0.0:
                    provenance.add("global")
                if user_counts and user_counts.get(token, 0.0) > 0.0:
                    provenance.add("personal")
            backoff_weight *= self._backoff_decay
        if not candidate_scores:
            fallback = self._fallback_candidates(context)
            candidate_scores.update(fallback)
            candidate_sources.update({token: {"unigram"} for token in fallback})
        adjusted_scores: dict[str, float] = {}
        for token, score in candidate_scores.items():
            if score <= 0.0:
                continue
            tempered = exp(log(max(score, 1e-12)) / context.temperature)
            tempered = self._apply_diversity_penalty(token, tempered, context)
            if tempered <= 0.0:
                continue
            adjusted_scores[token] = tempered
        total_mass = sum(adjusted_scores.values())
        suggestions: list[PredictionSuggestion] = []
        entropy = 0.0
        if total_mass > 0.0:
            normalised = {
                token: value / total_mass for token, value in adjusted_scores.items()
            }
            sorted_tokens = sorted(
                normalised.items(), key=lambda item: item[1], reverse=True
            )
            for token, probability in sorted_tokens[:top_k * 2]:
                if probability < min_probability:
                    continue
                provenance = tuple(sorted(candidate_sources.get(token, {"global"})))
                suggestions.append(
                    PredictionSuggestion(
                        token=token,
                        probability=probability,
                        score=adjusted_scores[token],
                        provenance=provenance,
                    )
                )
                entropy -= probability * log(max(probability, 1e-12))
                if len(suggestions) >= top_k:
                    break
        coverage = (
            float(len(suggestions)) / float(len(adjusted_scores) or 1)
            if adjusted_scores
            else 0.0
        )
        metrics = {
            "candidate_pool": float(len(adjusted_scores)),
            "entropy": entropy,
            "coverage": coverage,
            "personalization": context.personalization,
            "temperature": context.temperature,
            "hit_rate": self.hit_rate,
            "top1_accuracy": self.top1_accuracy,
        }
        prediction = Prediction(context=context, suggestions=tuple(suggestions), metrics=metrics)
        self._store_pending(context, prediction)
        return prediction

    def update_feedback(
        self,
        context: PredictiveContext,
        token: str,
        *,
        accepted: bool,
    ) -> None:
        token = _normalise_token(token)
        signature = context.signature
        predicted = self._pending_predictions.pop(signature, ())
        if accepted:
            self._feedback_accepts += 1
            if predicted and token == predicted[0]:
                self._prediction_hits += 1
            sequence = PredictiveSequence(
                tokens=tuple(context.tokens) + (token,),
                user_id=context.user_id,
                weight=1.0 + context.personalization * 0.5,
            )
            self.ingest(sequence)
        else:
            self._feedback_rejects += 1
            self._apply_penalty(tuple(context.tokens), token, context.user_id)

    # ------------------------------------------------------------------
    # internal helpers

    def _smoothed_probability(
        self, counts: Mapping[str, float] | None, token: str
    ) -> float:
        if not counts:
            return 0.0
        total = float(sum(counts.values()))
        if total <= 0.0:
            return 0.0
        vocab_size = max(len(self._vocabulary), 1)
        numerator = counts.get(token, 0.0) + self._alpha
        denominator = total + self._alpha * vocab_size
        return numerator / denominator

    @staticmethod
    def _blend_probabilities(
        global_prob: float, user_prob: float, personalization: float
    ) -> float:
        personalization = _clamp(personalization)
        if user_prob <= 0.0 and global_prob <= 0.0:
            return 0.0
        if user_prob <= 0.0:
            return global_prob
        if global_prob <= 0.0:
            return user_prob
        return (1.0 - personalization) * global_prob + personalization * user_prob

    def _fallback_candidates(self, context: PredictiveContext) -> Mapping[str, float]:
        if not self._unigram_counts:
            return {}
        total = float(sum(self._unigram_counts.values()))
        if total <= 0.0:
            return {}
        fallback: dict[str, float] = {}
        vocab_size = len(self._vocabulary) or 1
        for token, count in self._unigram_counts.most_common(32):
            if token in context.banned_tokens:
                continue
            fallback[token] = (count + self._alpha) / (total + self._alpha * vocab_size)
        return fallback

    def _apply_diversity_penalty(
        self, token: str, score: float, context: PredictiveContext
    ) -> float:
        if not context.recent_accepts or context.diversity_bias <= 0.0:
            return score
        adjusted = score
        for index, recent in enumerate(context.recent_accepts, start=1):
            if recent != token:
                continue
            penalty = context.diversity_bias / (index + 1.0)
            adjusted *= max(0.0, 1.0 - penalty)
        return adjusted

    def _store_pending(self, context: PredictiveContext, prediction: Prediction) -> None:
        signature = context.signature
        if not prediction.suggestions:
            return
        if signature in self._pending_predictions:
            self._pending_predictions.move_to_end(signature)
        self._pending_predictions[signature] = tuple(
            suggestion.token for suggestion in prediction.suggestions
        )
        while len(self._pending_predictions) > self._pending_limit:
            self._pending_predictions.popitem(last=False)

    def _apply_penalty(
        self, tokens: tuple[str, ...], token: str, user_id: str | None
    ) -> None:
        if self._unigram_counts.get(token, 0.0) > 0.0:
            self._unigram_counts[token] -= self._alpha
            if self._unigram_counts[token] <= 0.0:
                del self._unigram_counts[token]
        if user_id and self._user_unigram_counts.get(user_id, {}).get(token, 0.0) > 0.0:
            user_counter = self._user_unigram_counts[user_id]
            user_counter[token] -= self._alpha
            if user_counter[token] <= 0.0:
                del user_counter[token]
        max_depth = min(len(tokens), self._order - 1)
        for depth in range(1, max_depth + 1):
            prefix = tuple(tokens[-depth:])
            global_counter = self._global_counts.get(prefix)
            if global_counter and global_counter.get(token, 0.0) > 0.0:
                global_counter[token] -= self._alpha
                if global_counter[token] <= 0.0:
                    del global_counter[token]
                if not global_counter:
                    del self._global_counts[prefix]
            if not user_id:
                continue
            user_prefix_map = self._user_counts.get(user_id)
            if not user_prefix_map:
                continue
            user_counter = user_prefix_map.get(prefix)
            if user_counter and user_counter.get(token, 0.0) > 0.0:
                user_counter[token] -= self._alpha
                if user_counter[token] <= 0.0:
                    del user_counter[token]
                if not user_counter:
                    del user_prefix_map[prefix]
        if user_id and not self._user_counts[user_id]:
            del self._user_counts[user_id]
