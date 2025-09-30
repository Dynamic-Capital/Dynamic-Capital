from __future__ import annotations

"""Lightweight modelling primitives for dynamic entity links."""

from dataclasses import dataclass, field
from math import exp
from typing import Iterable, Mapping, MutableMapping, Sequence
from types import MappingProxyType


__all__ = [
    "DynamicLinkModel",
    "LinkEntity",
    "LinkEvidence",
    "LinkRelation",
    "LinkRelationSuggestion",
    "LinkSnapshot",
]


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

def _normalise_identifier(value: str, *, field_name: str) -> str:
    text = (value or "").strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_label(value: str | None, *, fallback: str) -> str:
    if value is None:
        return fallback
    text = value.strip()
    return text or fallback


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _freeze_mapping(
    payload: Mapping[str, object] | None, *, field_name: str
) -> Mapping[str, object] | None:
    if payload is None:
        return None
    if not isinstance(payload, Mapping):
        raise TypeError(f"{field_name} must be a mapping if provided")
    return MappingProxyType(dict(payload))


# ---------------------------------------------------------------------------
# Datamodel objects
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class LinkEntity:
    """Representation of an entity participating in relations."""

    identifier: str
    label: str | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        identifier = _normalise_identifier(self.identifier, field_name="identifier")
        label = _normalise_label(self.label, fallback=identifier)
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "identifier", identifier)
        object.__setattr__(self, "label", label)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkEvidence:
    """Individual signal describing an interaction between two entities."""

    source: str
    target: str
    interaction: str
    intensity: float = 1.0
    fidelity: float = 0.8
    metadata: Mapping[str, object] | None = None
    bidirectional: bool = True

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("source and target must be different")
        interaction = _normalise_identifier(
            self.interaction, field_name="interaction"
        )
        intensity = max(float(self.intensity), 0.0)
        fidelity = _clamp(self.fidelity)
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "interaction", interaction)
        object.__setattr__(self, "intensity", intensity)
        object.__setattr__(self, "fidelity", fidelity)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkRelation:
    """Aggregated state describing a relation between two entities."""

    source: str
    target: str
    weight: float
    confidence: float
    support_count: int
    average_fidelity: float
    interactions: Mapping[str, int]
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("relations must link different entities")
        weight = max(float(self.weight), 0.0)
        confidence = _clamp(self.confidence)
        support_count = max(int(self.support_count), 0)
        average_fidelity = _clamp(self.average_fidelity)
        interactions = MappingProxyType(dict(self.interactions))
        metadata = _freeze_mapping(self.metadata, field_name="metadata")
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "weight", weight)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "support_count", support_count)
        object.__setattr__(self, "average_fidelity", average_fidelity)
        object.__setattr__(self, "interactions", interactions)
        object.__setattr__(self, "metadata", metadata)


@dataclass(frozen=True, slots=True)
class LinkRelationSuggestion:
    """Recommendation describing a promising relation to explore."""

    source: str
    target: str
    score: float
    confidence: float
    rationale: tuple[str, ...] = ()

    def __post_init__(self) -> None:  # pragma: no cover - dataclass normalisation
        source = _normalise_identifier(self.source, field_name="source")
        target = _normalise_identifier(self.target, field_name="target")
        if source == target:
            raise ValueError("suggestions must link different entities")
        score = max(float(self.score), 0.0)
        confidence = _clamp(self.confidence)
        rationale = tuple(
            reason.strip()
            for reason in self.rationale
            if isinstance(reason, str) and reason.strip()
        )
        object.__setattr__(self, "source", source)
        object.__setattr__(self, "target", target)
        object.__setattr__(self, "score", score)
        object.__setattr__(self, "confidence", confidence)
        object.__setattr__(self, "rationale", rationale)


@dataclass(frozen=True, slots=True)
class LinkSnapshot:
    """Serializable snapshot of entities and relations managed by the model."""

    entities: tuple[LinkEntity, ...]
    relations: tuple[LinkRelation, ...]

    def as_dict(self) -> dict[str, object]:
        return {
            "entities": [
                {
                    "identifier": entity.identifier,
                    "label": entity.label,
                    "metadata": dict(entity.metadata or {}),
                }
                for entity in self.entities
            ],
            "relations": [
                {
                    "source": relation.source,
                    "target": relation.target,
                    "weight": relation.weight,
                    "confidence": relation.confidence,
                    "support_count": relation.support_count,
                    "average_fidelity": relation.average_fidelity,
                    "interactions": dict(relation.interactions),
                    "metadata": dict(relation.metadata or {}),
                }
                for relation in self.relations
            ],
        }

    @classmethod
    def from_dict(cls, payload: Mapping[str, object]) -> LinkSnapshot:
        if not isinstance(payload, Mapping):
            raise TypeError("snapshot payload must be a mapping")
        entity_payloads = payload.get("entities", [])
        relation_payloads = payload.get("relations", [])
        entities = []
        for item in entity_payloads:
            if not isinstance(item, Mapping):
                raise TypeError("entity entry must be a mapping")
            entities.append(
                LinkEntity(
                    identifier=str(item.get("identifier", "")),
                    label=(
                        str(item.get("label"))
                        if item.get("label") is not None
                        else None
                    ),
                    metadata=item.get("metadata"),
                )
            )
        relations = []
        for item in relation_payloads:
            if not isinstance(item, Mapping):
                raise TypeError("relation entry must be a mapping")
            relations.append(
                LinkRelation(
                    source=str(item.get("source", "")),
                    target=str(item.get("target", "")),
                    weight=float(item.get("weight", 0.0)),
                    confidence=float(item.get("confidence", 0.0)),
                    support_count=int(item.get("support_count", 0)),
                    average_fidelity=float(item.get("average_fidelity", 0.0)),
                    interactions=item.get("interactions", {}),
                    metadata=item.get("metadata"),
                )
            )
        return cls(entities=tuple(entities), relations=tuple(relations))


# ---------------------------------------------------------------------------
# Internal aggregation helpers
# ---------------------------------------------------------------------------


@dataclass
class _RelationStats:
    weight: float = 0.0
    support_count: int = 0
    fidelity_sum: float = 0.0
    interactions: MutableMapping[str, int] = field(default_factory=dict)
    metadata: Mapping[str, object] | None = None

    def register(self, evidence: LinkEvidence, *, decay: float) -> None:
        influence = evidence.intensity * (0.5 + 0.5 * evidence.fidelity)
        self.weight = (self.weight * (1.0 - decay)) + influence
        self.support_count += 1
        self.fidelity_sum += evidence.fidelity
        self.interactions[evidence.interaction] = (
            self.interactions.get(evidence.interaction, 0) + 1
        )
        if evidence.metadata is not None:
            self.metadata = MappingProxyType(dict(evidence.metadata))

    @property
    def average_fidelity(self) -> float:
        if self.support_count <= 0:
            return 0.0
        return _clamp(self.fidelity_sum / self.support_count)

    def confidence(self) -> float:
        if self.support_count <= 0:
            return 0.0
        base = 1.0 - exp(-0.5 * self.support_count)
        fidelity_factor = 0.6 + 0.4 * self.average_fidelity
        return _clamp(base * fidelity_factor)

    def score(self) -> float:
        return self.weight * self.confidence()

    def to_relation(self, source: str, target: str) -> LinkRelation:
        return LinkRelation(
            source=source,
            target=target,
            weight=self.weight,
            confidence=self.confidence(),
            support_count=self.support_count,
            average_fidelity=self.average_fidelity,
            interactions=self.interactions,
            metadata=self.metadata,
        )

    def merge(self, relation: LinkRelation) -> None:
        self.weight = max(self.weight, relation.weight)
        self.support_count = max(self.support_count, relation.support_count)
        self.fidelity_sum = max(
            self.fidelity_sum, relation.average_fidelity * relation.support_count
        )
        for name, amount in relation.interactions.items():
            self.interactions[name] = self.interactions.get(name, 0) + int(amount)
        if relation.metadata is not None:
            self.metadata = MappingProxyType(dict(relation.metadata))


# ---------------------------------------------------------------------------
# Public model API
# ---------------------------------------------------------------------------


class DynamicLinkModel:
    """Infer and maintain weighted relations between registered entities."""

    def __init__(self, *, decay: float = 0.15) -> None:
        if not 0.0 < decay < 1.0:
            raise ValueError("decay must be between 0 and 1")
        self._decay = float(decay)
        self._entities: dict[str, LinkEntity] = {}
        self._relations: dict[tuple[str, str], _RelationStats] = {}

    # ------------------------------------------------------------------
    # Entity management
    # ------------------------------------------------------------------
    def upsert_entity(self, entity: LinkEntity | Mapping[str, object]) -> LinkEntity:
        candidate = self._coerce_entity(entity)
        self._entities[candidate.identifier] = candidate
        return candidate

    def upsert_entities(
        self, entities: Iterable[LinkEntity | Mapping[str, object]]
    ) -> None:
        for entity in entities:
            self.upsert_entity(entity)

    def remove_entity(self, identifier: str) -> bool:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        if identifier not in self._entities:
            return False
        self._entities.pop(identifier)
        for key in list(self._relations):
            if identifier in key:
                self._relations.pop(key, None)
        return True

    def get_entity(self, identifier: str) -> LinkEntity | None:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        return self._entities.get(identifier)

    def iter_entities(self) -> Sequence[LinkEntity]:
        return tuple(self._entities.values())

    # ------------------------------------------------------------------
    # Relation updates
    # ------------------------------------------------------------------
    def observe(self, evidence: LinkEvidence) -> None:
        self._ensure_entity(evidence.source)
        self._ensure_entity(evidence.target)
        self._apply_evidence(evidence.source, evidence.target, evidence)
        if evidence.bidirectional:
            self._apply_evidence(evidence.target, evidence.source, evidence)

    def observe_many(self, evidences: Iterable[LinkEvidence]) -> None:
        for evidence in evidences:
            self.observe(evidence)

    def _apply_evidence(
        self, source: str, target: str, evidence: LinkEvidence
    ) -> None:
        key = (source, target)
        stats = self._relations.get(key)
        if stats is None:
            stats = _RelationStats()
            self._relations[key] = stats
        stats.register(evidence, decay=self._decay)

    def get_relation(self, source: str, target: str) -> LinkRelation | None:
        source = _normalise_identifier(source, field_name="source")
        target = _normalise_identifier(target, field_name="target")
        stats = self._relations.get((source, target))
        if stats is None:
            return None
        return stats.to_relation(source, target)

    def remove_relation(self, source: str, target: str) -> bool:
        source = _normalise_identifier(source, field_name="source")
        target = _normalise_identifier(target, field_name="target")
        return self._relations.pop((source, target), None) is not None

    def iter_relations(self) -> Sequence[LinkRelation]:
        return tuple(
            stats.to_relation(source, target)
            for (source, target), stats in self._relations.items()
        )

    # ------------------------------------------------------------------
    # Suggestions and snapshots
    # ------------------------------------------------------------------
    def suggest_relations(
        self,
        identifier: str,
        *,
        limit: int = 5,
        min_confidence: float = 0.2,
    ) -> list[LinkRelationSuggestion]:
        identifier = _normalise_identifier(identifier, field_name="identifier")
        if identifier not in self._entities or limit <= 0:
            return []
        min_confidence = _clamp(min_confidence)
        suggestions_by_target: dict[str, LinkRelationSuggestion] = {}
        for (source, target), stats in self._relations.items():
            if source == identifier:
                other = target
            elif target == identifier:
                other = source
            else:
                continue
            confidence = stats.confidence()
            if confidence < min_confidence:
                continue
            rationale = tuple(
                sorted(
                    (name for name in stats.interactions if name),
                    key=lambda name: stats.interactions[name],
                    reverse=True,
                )[:3]
            )
            suggestion = LinkRelationSuggestion(
                source=identifier,
                target=other,
                score=stats.score(),
                confidence=confidence,
                rationale=rationale,
            )
            existing = suggestions_by_target.get(other)
            if existing is None or suggestion.score > existing.score:
                suggestions_by_target[other] = suggestion

        suggestions = sorted(
            suggestions_by_target.values(),
            key=lambda item: (-item.score, item.target),
        )
        return suggestions[:limit]

    def snapshot(self) -> LinkSnapshot:
        entities = tuple(
            sorted(self._entities.values(), key=lambda entity: entity.identifier)
        )
        relations = tuple(
            sorted(
                (
                    stats.to_relation(source, target)
                    for (source, target), stats in self._relations.items()
                ),
                key=lambda relation: (relation.source, relation.target),
            )
        )
        return LinkSnapshot(entities=entities, relations=relations)

    def merge_snapshot(self, snapshot: LinkSnapshot | Mapping[str, object]) -> None:
        if isinstance(snapshot, Mapping):
            snapshot = LinkSnapshot.from_dict(snapshot)
        if not isinstance(snapshot, LinkSnapshot):
            raise TypeError("snapshot must be a LinkSnapshot or mapping")
        for entity in snapshot.entities:
            self.upsert_entity(entity)
        for relation in snapshot.relations:
            self._ensure_entity(relation.source)
            self._ensure_entity(relation.target)
            stats = self._relations.get((relation.source, relation.target))
            if stats is None:
                stats = _RelationStats()
                self._relations[(relation.source, relation.target)] = stats
            stats.merge(relation)

    def clear(self) -> None:
        self._entities.clear()
        self._relations.clear()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _ensure_entity(self, identifier: str) -> LinkEntity:
        entity = self._entities.get(identifier)
        if entity is None:
            entity = LinkEntity(identifier=identifier)
            self._entities[identifier] = entity
        return entity

    @staticmethod
    def _coerce_entity(entity: LinkEntity | Mapping[str, object]) -> LinkEntity:
        if isinstance(entity, LinkEntity):
            return entity
        if isinstance(entity, Mapping):
            identifier = _normalise_identifier(
                str(entity.get("identifier") or entity.get("id") or ""),
                field_name="identifier",
            )
            label_value = entity.get("label") or entity.get("name")
            label = None if label_value is None else str(label_value)
            metadata = entity.get("metadata")
            return LinkEntity(identifier=identifier, label=label, metadata=metadata)
        raise TypeError("entity must be a LinkEntity or mapping")
