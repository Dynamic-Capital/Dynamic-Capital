"""Dynamic RLHF model with lightweight reward optimization."""

from __future__ import annotations

from collections import Counter, defaultdict, deque
from dataclasses import dataclass, field
from math import exp, log
from random import Random
from typing import Deque, Dict, Iterable, List, Mapping, MutableMapping, Sequence, Tuple

from dynamic_fine_tune_engine.builder import FineTuneRecordBuilder
from dynamic_fine_tune_engine.engine import FineTuneRecord

PUNCTUATION = {"!", "?", ".", ",", ";", ":"}


def _normalise_text(value: str, *, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _tokenize(text: str) -> List[str]:
    tokens: List[str] = []
    current: List[str] = []
    for char in text.lower():
        if char.isalnum() or char in {"'", "_"}:
            current.append(char)
            continue
        if current:
            tokens.append("".join(current))
            current.clear()
    if current:
        tokens.append("".join(current))
    return tokens


def _overlap_ratio(a: Sequence[str], b: Sequence[str]) -> float:
    if not a or not b:
        return 0.0
    aset = set(a)
    bset = set(b)
    intersection = len(aset & bset)
    union = len(aset | bset)
    if union == 0:
        return 0.0
    return intersection / union


def _featurise(prompt: str, completion: str) -> Dict[str, float]:
    prompt_tokens = _tokenize(prompt)
    completion_tokens = _tokenize(completion)
    features: Dict[str, float] = {}

    if completion_tokens:
        token_counts = Counter(completion_tokens)
        total = float(sum(token_counts.values())) or 1.0
        for token, count in token_counts.items():
            features[f"resp:tok::{token}"] = count / total
        # Include bigram coverage for richer discrimination.
        bigrams = zip(completion_tokens, completion_tokens[1:])
        bigram_counts = Counter(" ".join(pair) for pair in bigrams)
        bigram_total = float(sum(bigram_counts.values())) or 1.0
        for token, count in bigram_counts.items():
            features[f"resp:bigram::{token}"] = count / bigram_total

    length = len(completion)
    word_count = len(completion_tokens)
    features["resp:length"] = min(length / 512.0, 4.0)
    features["resp:word_count"] = min(word_count / 64.0, 4.0)
    uppercase = sum(1 for char in completion if char.isupper())
    features["resp:uppercase_ratio"] = uppercase / max(length, 1)
    punctuation = sum(1 for char in completion if char in PUNCTUATION)
    features["resp:punctuation_ratio"] = punctuation / max(length, 1)
    features["resp:terminal_punct"] = 1.0 if completion.rstrip().endswith(tuple(PUNCTUATION)) else 0.0

    if prompt_tokens:
        features["prompt:word_count"] = min(len(prompt_tokens) / 64.0, 4.0)
        overlap = _overlap_ratio(prompt_tokens, completion_tokens)
        features["prompt:resp_overlap"] = overlap
        if overlap:
            features["prompt:resp_overlap_sq"] = overlap ** 2

    avg_token_length = (sum(len(token) for token in completion_tokens) / max(word_count, 1)) if word_count else 0.0
    features["resp:avg_token_length"] = avg_token_length / 12.0
    features["resp:stopword_density"] = _stopword_density(completion_tokens)

    return features


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "if",
    "in",
    "into",
    "is",
    "it",
    "no",
    "not",
    "of",
    "on",
    "or",
    "such",
    "that",
    "the",
    "their",
    "then",
    "there",
    "these",
    "they",
    "this",
    "to",
    "was",
    "will",
    "with",
}


def _stopword_density(tokens: Sequence[str]) -> float:
    if not tokens:
        return 0.0
    stopwords = sum(1 for token in tokens if token in STOPWORDS)
    return stopwords / len(tokens)


@dataclass(slots=True)
class PreferenceExample:
    """Single pairwise preference used for RLHF reward learning."""

    prompt: str
    chosen: str
    rejected: str
    chosen_score: float = 1.0
    rejected_score: float = 0.0
    metadata: Mapping[str, object] | None = None
    tags: Tuple[str, ...] = ()
    _feature_difference: Dict[str, float] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.prompt = _normalise_text(self.prompt, field_name="prompt")
        self.chosen = _normalise_text(self.chosen, field_name="chosen")
        self.rejected = _normalise_text(self.rejected, field_name="rejected")
        self.chosen_score = _normalise_score(self.chosen_score)
        self.rejected_score = _normalise_score(self.rejected_score)
        self.tags = tuple(tag.strip().lower() for tag in self.tags if tag and tag.strip())
        self.metadata = dict(self.metadata) if self.metadata else None
        self._feature_difference = self._compute_feature_difference()

    def _compute_feature_difference(self) -> Dict[str, float]:
        chosen_features = _featurise(self.prompt, self.chosen)
        rejected_features = _featurise(self.prompt, self.rejected)
        diff: Dict[str, float] = {}
        keys = set(chosen_features) | set(rejected_features)
        for key in keys:
            diff[key] = chosen_features.get(key, 0.0) - rejected_features.get(key, 0.0)
        return diff

    @property
    def feature_difference(self) -> Mapping[str, float]:
        return self._feature_difference

    def to_dict(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "prompt": self.prompt,
            "chosen": self.chosen,
            "rejected": self.rejected,
            "chosen_score": self.chosen_score,
            "rejected_score": self.rejected_score,
            "tags": list(self.tags),
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class RewardTrainingStats:
    """Summary of reward model optimisation."""

    epochs: int
    batches: int
    mean_loss: float
    mean_accuracy: float
    weight_count: int
    max_weight_magnitude: float
    bias: float

    def to_dict(self) -> Dict[str, float]:
        return {
            "epochs": float(self.epochs),
            "batches": float(self.batches),
            "mean_loss": self.mean_loss,
            "mean_accuracy": self.mean_accuracy,
            "weight_count": float(self.weight_count),
            "max_weight_magnitude": self.max_weight_magnitude,
            "bias": self.bias,
        }


@dataclass(slots=True)
class RewardModel:
    """Lightweight logistic reward model for preference optimisation."""

    learning_rate: float = 0.05
    l2_penalty: float = 1e-4
    seed: int | None = None
    weights: MutableMapping[str, float] = field(default_factory=dict)
    bias: float = 0.0

    def score(self, prompt: str, completion: str) -> float:
        features = _featurise(prompt, completion)
        margin = self.bias
        for name, value in features.items():
            margin += self.weights.get(name, 0.0) * value
        return margin

    def probability(self, prompt: str, completion: str) -> float:
        margin = self.score(prompt, completion)
        return 1.0 / (1.0 + exp(-margin))

    def fit(
        self,
        examples: Sequence[PreferenceExample],
        *,
        epochs: int = 5,
        batch_size: int = 32,
        shuffle: bool = True,
    ) -> RewardTrainingStats:
        if batch_size <= 0:
            raise ValueError("batch_size must be positive")
        if epochs <= 0:
            raise ValueError("epochs must be positive")
        dataset = list(examples)
        if not dataset:
            return RewardTrainingStats(
                epochs=0,
                batches=0,
                mean_loss=0.0,
                mean_accuracy=0.0,
                weight_count=len(self.weights),
                max_weight_magnitude=max((abs(value) for value in self.weights.values()), default=0.0),
                bias=self.bias,
            )

        rng = Random(self.seed)
        total_loss = 0.0
        total_correct = 0
        total_seen = 0
        batches = 0

        for _ in range(epochs):
            if shuffle:
                rng.shuffle(dataset)
            for start in range(0, len(dataset), batch_size):
                batch = dataset[start : start + batch_size]
                if not batch:
                    continue
                grad_weights: Dict[str, float] = defaultdict(float)
                grad_bias = 0.0
                batch_loss = 0.0
                batch_correct = 0
                for example in batch:
                    margin = self.bias
                    for name, value in example.feature_difference.items():
                        margin += self.weights.get(name, 0.0) * value
                    probability = 1.0 / (1.0 + exp(-margin))
                    probability = min(max(probability, 1e-6), 1.0 - 1e-6)
                    batch_loss += -log(probability)
                    if probability >= 0.5:
                        batch_correct += 1
                    error = 1.0 - probability
                    for name, value in example.feature_difference.items():
                        grad_weights[name] += error * value
                    grad_bias += error
                scale = self.learning_rate / len(batch)
                for name, grad in grad_weights.items():
                    weight = self.weights.get(name, 0.0)
                    updated = weight + scale * (grad - (self.l2_penalty * weight))
                    if abs(updated) < 1e-8:
                        self.weights.pop(name, None)
                    else:
                        self.weights[name] = updated
                self.bias += scale * grad_bias
                total_loss += batch_loss
                total_correct += batch_correct
                total_seen += len(batch)
                batches += 1

        mean_loss = total_loss / max(total_seen, 1)
        mean_accuracy = total_correct / max(total_seen, 1)
        max_weight = max((abs(value) for value in self.weights.values()), default=0.0)
        return RewardTrainingStats(
            epochs=epochs,
            batches=batches,
            mean_loss=mean_loss,
            mean_accuracy=mean_accuracy,
            weight_count=len(self.weights),
            max_weight_magnitude=max_weight,
            bias=self.bias,
        )


@dataclass(slots=True)
class ScoredCompletion:
    """Completion scored by the reward model."""

    completion: str
    probability: float
    margin: float
    features: Mapping[str, float]

    def to_dict(self) -> Dict[str, object]:
        return {
            "completion": self.completion,
            "probability": self.probability,
            "margin": self.margin,
            "features": dict(self.features),
        }


@dataclass(slots=True)
class DynamicRLHFModel:
    """High-level orchestrator for dynamic RLHF optimisation."""

    capacity: int = 4096
    reward_model: RewardModel = field(default_factory=RewardModel)
    record_builder: FineTuneRecordBuilder = field(default_factory=FineTuneRecordBuilder)
    _preferences: Deque[PreferenceExample] = field(init=False, repr=False)

    def __post_init__(self) -> None:
        if self.capacity <= 0:
            raise ValueError("capacity must be positive")
        self._preferences = deque(maxlen=self.capacity)

    def preference_count(self) -> int:
        return len(self._preferences)

    def add_preferences(
        self, preferences: Iterable[PreferenceExample | Mapping[str, object]]
    ) -> int:
        accepted = 0
        for payload in preferences:
            example = self._coerce_preference(payload)
            self._preferences.append(example)
            accepted += 1
        return accepted

    def optimise_reward(
        self,
        *,
        epochs: int = 5,
        batch_size: int = 32,
        shuffle: bool = True,
    ) -> RewardTrainingStats:
        dataset = tuple(self._preferences)
        return self.reward_model.fit(dataset, epochs=epochs, batch_size=batch_size, shuffle=shuffle)

    def score_completions(
        self,
        prompt: str,
        completions: Sequence[str],
    ) -> Tuple[ScoredCompletion, ...]:
        prompt_text = _normalise_text(prompt, field_name="prompt")
        scored: List[ScoredCompletion] = []
        for completion in completions:
            completion_text = _normalise_text(completion, field_name="completion")
            features = _featurise(prompt_text, completion_text)
            margin = self.reward_model.bias
            for name, value in features.items():
                margin += self.reward_model.weights.get(name, 0.0) * value
            probability = 1.0 / (1.0 + exp(-margin))
            scored.append(
                ScoredCompletion(
                    completion=completion_text,
                    probability=probability,
                    margin=margin,
                    features=features,
                )
            )
        ordered = sorted(scored, key=lambda item: item.probability, reverse=True)
        return tuple(ordered)

    def build_fine_tune_records(
        self,
        prompt: str,
        completions: Sequence[str],
        *,
        source: str,
        top_k: int = 3,
        minimum_probability: float = 0.55,
    ) -> Tuple[FineTuneRecord, ...]:
        scored = self.score_completions(prompt, completions)
        selected: List[FineTuneRecord] = []
        for rank, item in enumerate(scored[: max(top_k, 0)], start=1):
            if item.probability < minimum_probability:
                continue
            quality = max(min(item.probability, 0.99), 0.01)
            priority = 0.5 + (quality - 0.5) * 0.6
            record = self.record_builder.build(
                prompt=prompt,
                completion=item.completion,
                source=source,
                quality=quality,
                priority=priority,
                metadata={
                    "rlhf_probability": item.probability,
                    "rlhf_margin": item.margin,
                    "rlhf_rank": rank,
                },
            )
            selected.append(record)
        return tuple(selected)

    def preference_snapshot(self, limit: int = 20) -> Tuple[Mapping[str, object], ...]:
        if limit <= 0:
            raise ValueError("limit must be positive")
        return tuple(example.to_dict() for example in list(self._preferences)[-limit:])

    def stats(self) -> Dict[str, object]:
        return {
            "count": len(self._preferences),
            "capacity": self.capacity,
            "tags": self._tag_histogram(),
        }

    def _tag_histogram(self) -> Dict[str, int]:
        histogram: Dict[str, int] = {}
        for example in self._preferences:
            for tag in example.tags:
                histogram[tag] = histogram.get(tag, 0) + 1
        return dict(sorted(histogram.items(), key=lambda item: (-item[1], item[0])))

    def _coerce_preference(
        self, payload: PreferenceExample | Mapping[str, object]
    ) -> PreferenceExample:
        if isinstance(payload, PreferenceExample):
            return payload
        if not isinstance(payload, Mapping):
            raise TypeError("preference payload must be a PreferenceExample or mapping")
        data: MutableMapping[str, object] = dict(payload)
        return PreferenceExample(
            prompt=str(data.get("prompt", "")),
            chosen=str(data.get("chosen", "")),
            rejected=str(data.get("rejected", "")),
            chosen_score=float(data.get("chosen_score", 1.0) or 0.0),
            rejected_score=float(data.get("rejected_score", 0.0) or 0.0),
            metadata=data.get("metadata"),
            tags=tuple(data.get("tags", ()) or ()),
        )
