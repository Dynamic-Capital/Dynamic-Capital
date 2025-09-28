"""Collaborative coordination utilities for Dynamic AGI reasoning cores."""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass, field
import json
from typing import Any, Iterable, Mapping, MutableMapping, Sequence

from dynamic_ai.core import ReasoningAdapter
from dynamic_ai.dolphin_adapter import LLMIntegrationError


def _normalise_action(value: str) -> str:
    return str(value or "").strip().upper()


def _normalise_topics(values: Iterable[Any] | None) -> frozenset[str]:
    if not values:
        return frozenset()
    return frozenset(str(topic).strip().lower() for topic in values if str(topic).strip())


@dataclass(slots=True)
class AGICoreProfile:
    """Metadata describing a specialised Dynamic AGI reasoning core."""

    name: str
    adapter: ReasoningAdapter
    specialties: frozenset[str] = field(default_factory=frozenset)
    focus_topics: frozenset[str] = field(default_factory=frozenset)
    weight: float = 1.0
    metadata: MutableMapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        object.__setattr__(self, "name", str(self.name))
        object.__setattr__(self, "specialties", frozenset(_normalise_action(tag) for tag in self.specialties))
        object.__setattr__(self, "focus_topics", frozenset(str(tag).strip().lower() for tag in self.focus_topics if str(tag).strip()))
        object.__setattr__(self, "weight", float(self.weight))

    def affinity(self, *, action: str, topics: frozenset[str]) -> float:
        """Return a weighting describing how suited the core is for ``action``."""

        score = float(self.weight)
        if self.specialties:
            if action in self.specialties:
                score += 1.5
            elif any(action.startswith(prefix) for prefix in self.specialties):
                score += 0.4
        if self.focus_topics and topics:
            score += 0.3 * len(self.focus_topics & topics)
        return score


class CollaborativeReasoningCluster(ReasoningAdapter):
    """Adapter that coordinates multiple reasoning cores with shared resources."""

    def __init__(
        self,
        cores: Sequence[AGICoreProfile],
        *,
        cache_size: int = 32,
        load_decay: float = 0.6,
        failure_penalty: float = 1.0,
    ) -> None:
        if not cores:
            raise ValueError("CollaborativeReasoningCluster requires at least one AGI core")

        seen_names: set[str] = set()
        ordered_cores: list[AGICoreProfile] = []
        for profile in cores:
            if profile.name in seen_names:
                raise ValueError(f"Duplicate AGI core name detected: {profile.name}")
            seen_names.add(profile.name)
            ordered_cores.append(profile)

        self._cores: tuple[AGICoreProfile, ...] = tuple(ordered_cores)
        self._cache_size = max(0, int(cache_size))
        self._load_decay = float(load_decay)
        self._failure_penalty = max(0.0, float(failure_penalty))
        self._usage: dict[str, float] = {profile.name: 0.0 for profile in self._cores}
        self._failure_counts: dict[str, int] = {profile.name: 0 for profile in self._cores}
        self._shared_resources: dict[str, Any] = {
            "recent_reasoning": OrderedDict(),
            "core_usage": self._usage,
        }
        self._cache: "OrderedDict[str, str]" = OrderedDict()

    @property
    def cores(self) -> tuple[AGICoreProfile, ...]:
        return self._cores

    def enhance_reasoning(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None = None,
    ) -> str:
        cache_key = self._cache_key(
            action=action,
            confidence=confidence,
            base_reasoning=base_reasoning,
            market_context=market_context,
            prior_dialogue=prior_dialogue,
        )
        if cache_key is not None and cache_key in self._cache:
            self._decay_usage()
            cached = self._cache[cache_key]
            self._cache.move_to_end(cache_key)
            return cached

        enriched_context = dict(market_context)
        enriched_context.setdefault("_cluster_shared_resources", self._shared_resources_snapshot())

        ranked_profiles = self._rank_profiles(action=action, market_context=market_context)
        errors: list[str] = []
        for profile in ranked_profiles:
            try:
                result = profile.adapter.enhance_reasoning(
                    action=action,
                    confidence=confidence,
                    base_reasoning=base_reasoning,
                    market_context=enriched_context,
                    prior_dialogue=prior_dialogue,
                )
            except LLMIntegrationError as exc:
                self._record_failure(profile.name)
                errors.append(f"{profile.name}: {exc}")
                continue
            except Exception as exc:  # pragma: no cover - defensive guard
                self._record_failure(profile.name)
                errors.append(f"{profile.name}: {exc}")
                continue

            self._record_success(profile.name, action=action, reasoning=result)
            if cache_key is not None:
                self._cache[cache_key] = result
                if len(self._cache) > self._cache_size:
                    self._cache.popitem(last=False)
            return result.strip()

        error_message = "; ".join(errors) if errors else "no cores available"
        raise LLMIntegrationError(f"CollaborativeReasoningCluster failed across cores: {error_message}")

    # ------------------------------------------------------------------
    # internal helpers

    def _rank_profiles(self, *, action: str, market_context: Mapping[str, Any]) -> list[AGICoreProfile]:
        normalised_action = _normalise_action(action)
        topics = _normalise_topics(market_context.get("news_topics"))
        ranked = []
        for profile in self._cores:
            affinity = profile.affinity(action=normalised_action, topics=topics)
            load_penalty = self._usage[profile.name]
            failure_penalty = self._failure_penalty * float(self._failure_counts[profile.name])
            score = affinity - load_penalty - failure_penalty
            ranked.append((score, profile))
        ranked.sort(key=lambda item: item[0], reverse=True)
        return [profile for _, profile in ranked]

    def _decay_usage(self) -> None:
        for name in self._usage:
            self._usage[name] *= self._load_decay

    def _record_failure(self, name: str) -> None:
        self._failure_counts[name] += 1
        self._usage[name] += 0.5

    def _record_success(self, name: str, *, action: str, reasoning: str) -> None:
        self._decay_usage()
        self._usage[name] += 1.0
        self._failure_counts[name] = max(0, self._failure_counts[name] - 1)

        recent: "OrderedDict[tuple[str, str], str]" = self._shared_resources["recent_reasoning"]
        key = (name, _normalise_action(action))
        recent[key] = reasoning
        recent.move_to_end(key)
        while len(recent) > 16:
            recent.popitem(last=False)

    def _cache_key(
        self,
        *,
        action: str,
        confidence: float,
        base_reasoning: str,
        market_context: Mapping[str, Any],
        prior_dialogue: Sequence[tuple[str, str]] | None,
    ) -> str | None:
        if self._cache_size <= 0:
            return None

        payload = {
            "action": _normalise_action(action),
            "confidence": round(float(confidence), 4),
            "base_reasoning": base_reasoning,
            "market_context": market_context,
            "prior_dialogue": list(prior_dialogue or ()),
        }
        try:
            return json.dumps(payload, sort_keys=True, default=self._serialise_value)
        except TypeError:
            return None

    @staticmethod
    def _serialise_value(value: Any) -> str:
        return str(value)

    def _shared_resources_snapshot(self) -> Mapping[str, Any]:
        recent: "OrderedDict[tuple[str, str], str]" = self._shared_resources["recent_reasoning"]
        serialised_recent = [
            {"core": core, "action": action, "reasoning": text}
            for (core, action), text in list(recent.items())[-8:]
        ]
        return {
            "recent_reasoning": serialised_recent,
            "core_usage": dict(self._usage),
        }


__all__ = ["AGICoreProfile", "CollaborativeReasoningCluster"]

