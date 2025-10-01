"""Dynamic asset type taxonomy helpers for trading systems.

This module centralises the lightweight metadata used to reason about the
different instrument archetypes Dynamic Capital monitors.  Research notebooks
and automation layers often need to answer simple questions such as "is this
symbol part of the FX majors bucket?" or "what leverage limit applies to this
token?" without reaching for Supabase or the live trading desk.

The :class:`DynamicTypeRegistry` provides a tiny, in-memory catalogue that is
safe to hydrate from fixtures or declarative JSON payloads.  Each
:class:`DynamicType` normalises identifiers, aliases, and descriptive metadata
so higher level services can resolve a type regardless of the casing or naming
convention used by upstream feeds.  The registry also exposes a
:meth:`classify` helper that returns a structured
:class:`TypeClassification` result capturing how a type was resolved along with
an interpretable confidence score.

The implementation mirrors the ergonomics of the other ``dynamic_algo``
modules (e.g. :mod:`dynamic.trading.algo.dynamic_nodes`) to keep orchestration code
consistent across the codebase.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Iterable, Iterator, Mapping, MutableMapping, Optional, Sequence, Tuple

__all__ = [
    "DynamicType",
    "DynamicTypeRegistry",
    "DynamicTypeError",
    "TypeConfigError",
    "TypeResolutionError",
    "TypeClassification",
]


class DynamicTypeError(RuntimeError):
    """Base exception for dynamic type taxonomy errors."""


class TypeConfigError(DynamicTypeError):
    """Raised when an invalid type descriptor is supplied."""


class TypeResolutionError(DynamicTypeError):
    """Raised when a type cannot be resolved from the supplied traits."""


def _normalise_identifier(value: str) -> str:
    raw = str(value).strip()
    if not raw:
        raise TypeConfigError("identifier values cannot be empty")
    return raw.upper()


def _normalise_category(value: str) -> str:
    raw = str(value).strip().lower()
    if not raw:
        raise TypeConfigError("category values cannot be empty")
    return raw


def _normalise_lookup(value: str) -> str:
    raw = str(value).strip()
    if not raw:
        raise TypeConfigError("lookup values cannot be empty")
    return raw.lower()


def _normalise_collection(values: Iterable[str] | None) -> tuple[str, ...]:
    if values is None:
        return ()
    seen: set[str] = set()
    normalised: list[str] = []
    for raw in values:
        token = str(raw).strip()
        if not token:
            continue
        lowered = token.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        normalised.append(token)
    return tuple(normalised)


def _normalise_tags(values: Iterable[str] | None) -> tuple[str, ...]:
    if values is None:
        return ()
    seen: set[str] = set()
    tags: list[str] = []
    for raw in values:
        token = str(raw).strip().lower()
        if not token or token in seen:
            continue
        seen.add(token)
        tags.append(token)
    return tuple(tags)


def _ensure_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeConfigError("metadata must be a mapping")
    return dict(metadata)


@dataclass(slots=True)
class DynamicType:
    """Normalised representation of a trading instrument archetype."""

    type_id: str
    category: str
    description: str | None = None
    risk_level: str | None = None
    leverage_limit: float | None = None
    margin_requirement: float | None = None
    aliases: tuple[str, ...] = field(default_factory=tuple)
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.type_id = _normalise_identifier(self.type_id)
        self.category = _normalise_category(self.category)

        if self.description is not None:
            description = str(self.description).strip()
            self.description = description or None

        if self.risk_level is not None:
            risk_level = str(self.risk_level).strip().lower()
            self.risk_level = risk_level or None

        if self.leverage_limit is not None:
            try:
                self.leverage_limit = float(self.leverage_limit)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
                raise TypeConfigError("leverage_limit must be numeric") from exc
            if self.leverage_limit <= 0:
                raise TypeConfigError("leverage_limit must be positive")

        if self.margin_requirement is not None:
            try:
                self.margin_requirement = float(self.margin_requirement)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
                raise TypeConfigError("margin_requirement must be numeric") from exc
            if self.margin_requirement < 0:
                raise TypeConfigError("margin_requirement cannot be negative")

        self.aliases = _normalise_collection(self.aliases)
        self.tags = _normalise_tags(self.tags)
        self.metadata = _ensure_metadata(self.metadata)

    # ------------------------------------------------------------------ helpers
    @property
    def lookup_tokens(self) -> tuple[str, ...]:
        """Return normalised tokens that can be used to resolve the type."""

        alias_tokens = tuple(_normalise_lookup(alias) for alias in self.aliases)
        return (_normalise_lookup(self.type_id),) + alias_tokens

    @property
    def tag_set(self) -> set[str]:  # pragma: no cover - trivial
        return set(self.tags)

    def matches(
        self,
        identifier: str | None = None,
        *,
        category: str | None = None,
        tags: Iterable[str] | None = None,
    ) -> bool:
        """Return ``True`` when the provided traits match this type."""

        if identifier is not None:
            token = _normalise_lookup(identifier)
            if token not in self.lookup_tokens:
                return False

        if category is not None and _normalise_category(category) != self.category:
            return False

        if tags is not None:
            required = {_normalise_lookup(tag) for tag in tags if str(tag).strip()}
            if required and not required.issubset(self.tag_set):
                return False

        return True

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "type_id": self.type_id,
            "category": self.category,
            "tags": list(self.tags),
        }
        if self.description:
            payload["description"] = self.description
        if self.risk_level:
            payload["risk_level"] = self.risk_level
        if self.leverage_limit is not None:
            payload["leverage_limit"] = self.leverage_limit
        if self.margin_requirement is not None:
            payload["margin_requirement"] = self.margin_requirement
        if self.aliases:
            payload["aliases"] = list(self.aliases)
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


@dataclass(slots=True)
class TypeClassification:
    """Structured result produced by :meth:`DynamicTypeRegistry.classify`."""

    dynamic_type: DynamicType
    confidence: float
    matched_by: tuple[str, ...]
    identifier: str | None = None

    @property
    def type_id(self) -> str:  # pragma: no cover - trivial
        return self.dynamic_type.type_id

    @property
    def category(self) -> str:  # pragma: no cover - trivial
        return self.dynamic_type.category

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "type_id": self.dynamic_type.type_id,
            "category": self.dynamic_type.category,
            "confidence": self.confidence,
            "matched_by": list(self.matched_by),
        }
        if self.identifier is not None:
            payload["identifier"] = self.identifier
        payload["metadata"] = dict(self.dynamic_type.metadata)
        return payload


class DynamicTypeRegistry:
    """Manage a collection of :class:`DynamicType` instances."""

    def __init__(self, types: Optional[Iterable[DynamicType | Mapping[str, object]]] = None) -> None:
        self._types: Dict[str, DynamicType] = {}
        self._aliases: Dict[str, str] = {}
        if types:
            for type_descriptor in types:
                self.register(type_descriptor)

    # ----------------------------------------------------------------- mutation
    def register(self, type_descriptor: DynamicType | Mapping[str, object]) -> DynamicType:
        if isinstance(type_descriptor, DynamicType):
            dynamic_type = type_descriptor
        elif isinstance(type_descriptor, Mapping):
            dynamic_type = DynamicType(**type_descriptor)  # type: ignore[arg-type]
        else:  # pragma: no cover - defensive guardrail
            raise TypeConfigError("type_descriptor must be a mapping or DynamicType instance")

        for token in dynamic_type.lookup_tokens:
            existing = self._aliases.get(token)
            if existing and existing != dynamic_type.type_id:
                raise TypeConfigError(
                    f"Alias '{token}' already registered for type '{existing}'"
                )

        self._types[dynamic_type.type_id] = dynamic_type
        for token in dynamic_type.lookup_tokens:
            self._aliases[token] = dynamic_type.type_id
        return dynamic_type

    def remove(self, type_id: str) -> bool:
        type_id_normalised = _normalise_identifier(type_id)
        dynamic_type = self._types.pop(type_id_normalised, None)
        if not dynamic_type:
            return False

        for token in dynamic_type.lookup_tokens:
            self._aliases.pop(token, None)
        return True

    # ------------------------------------------------------------------- lookup
    def __contains__(self, type_id: object) -> bool:  # pragma: no cover - trivial
        try:
            normalised = _normalise_identifier(type_id)  # type: ignore[arg-type]
        except TypeConfigError:
            return False
        return normalised in self._types

    def __len__(self) -> int:  # pragma: no cover - trivial
        return len(self._types)

    def __iter__(self) -> Iterator[DynamicType]:  # pragma: no cover - trivial
        return iter(self._types.values())

    def get(self, type_id: str) -> DynamicType:
        normalised = _normalise_identifier(type_id)
        try:
            return self._types[normalised]
        except KeyError as exc:  # pragma: no cover - defensive guardrail
            raise TypeResolutionError(f"Type '{type_id}' is not registered") from exc

    def resolve(
        self,
        identifier: str | None = None,
        *,
        category: str | None = None,
        tags: Iterable[str] | None = None,
    ) -> DynamicType:
        """Resolve a registered type using the supplied traits."""

        tag_set = {_normalise_lookup(tag) for tag in tags or () if str(tag).strip()}

        candidates: list[DynamicType] = []

        if identifier is not None:
            token = _normalise_lookup(identifier)
            type_id = self._aliases.get(token)
            if type_id is not None:
                candidate = self._types[type_id]
                candidates = [candidate]
        else:
            candidates = list(self._types.values())

        if category is not None:
            category_normalised = _normalise_category(category)
            candidates = [c for c in candidates or self._types.values() if c.category == category_normalised]
        elif not candidates:
            candidates = list(self._types.values())

        if tag_set:
            filtered = [c for c in candidates if tag_set.issubset(c.tag_set)]
            if filtered:
                candidates = filtered

        if not candidates:
            raise TypeResolutionError("No dynamic type matched the supplied traits")

        if len(candidates) > 1:
            identifiers = ", ".join(sorted(t.type_id for t in candidates))
            raise TypeResolutionError(f"Ambiguous dynamic type resolution: {identifiers}")

        return candidates[0]

    # ------------------------------------------------------------- classification
    def classify(
        self,
        payload: Mapping[str, object] | None = None,
        *,
        identifier: str | None = None,
        category: str | None = None,
        tags: Iterable[str] | None = None,
    ) -> TypeClassification:
        """Classify an arbitrary payload into a :class:`DynamicType`."""

        payload = payload or {}

        identifier = identifier or payload.get("identifier") or payload.get("symbol")  # type: ignore[assignment]
        category = category or payload.get("category") or payload.get("asset_class")  # type: ignore[assignment]
        raw_tags: Sequence[str] | str | None = tags or payload.get("tags") or payload.get("labels")  # type: ignore[assignment]

        resolved_tags: tuple[str, ...]
        if isinstance(raw_tags, str):
            resolved_tags = _normalise_tags(raw_tags.split(","))
        elif raw_tags is None:
            resolved_tags = ()
        else:
            resolved_tags = _normalise_tags(raw_tags)

        dynamic_type = self.resolve(identifier, category=category, tags=resolved_tags)

        matched_signals: list[str] = []
        if identifier is not None:
            lookup = _normalise_lookup(identifier)
            if lookup == _normalise_lookup(dynamic_type.type_id):
                matched_signals.append("identifier")
            elif lookup in dynamic_type.lookup_tokens:
                matched_signals.append("alias")

        if category is not None and _normalise_category(category) == dynamic_type.category:
            matched_signals.append("category")

        if resolved_tags:
            candidate_tags = set(resolved_tags)
            if candidate_tags.intersection(dynamic_type.tag_set):
                matched_signals.append("tags")

        confidence = round(len(matched_signals) / 3, 2) if matched_signals else 0.0
        return TypeClassification(
            dynamic_type=dynamic_type,
            confidence=confidence,
            matched_by=tuple(matched_signals),
            identifier=str(identifier) if identifier is not None else None,
        )

    # --------------------------------------------------------------- introspection
    def snapshot(self) -> Tuple[DynamicType, ...]:
        """Return an immutable snapshot of registered types."""

        return tuple(self._types.values())

    def category_summary(self) -> Mapping[str, int]:
        """Return a count of types grouped by category."""

        summary: Dict[str, int] = {}
        for dynamic_type in self._types.values():
            summary[dynamic_type.category] = summary.get(dynamic_type.category, 0) + 1
        return dict(sorted(summary.items()))

