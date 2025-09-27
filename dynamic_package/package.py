"""High-level package bundling utilities for Dynamic Capital.

The module deliberately mirrors other ``dynamic_*`` packages so the
interface remains predictable across tooling.  Packages represent a
combination of capabilities, rituals, and value props that can be offered
as a commercial bundle.  The :class:`DynamicPackageDesigner` aggregates
candidate components and synthesises a recommended package based on a
runtime context (audience, budget guardrails, focus areas, etc.).

The implementation avoids external dependencies, providing deterministic
behaviour so unit tests can exercise the scoring heuristics in isolation.
"""

from __future__ import annotations

from collections import Counter, deque
from dataclasses import dataclass, field
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence


# ---------------------------------------------------------------------------
# normalisation helpers


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _normalise_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("value must not be empty")
    return cleaned


def _normalise_title(value: str) -> str:
    return _normalise_text(value)


def _normalise_lower(value: str) -> str:
    return _normalise_text(value).lower()


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


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


def _normalise_dependencies(dependencies: Sequence[str] | None) -> tuple[str, ...]:
    if not dependencies:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for dependency in dependencies:
        cleaned = dependency.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            ordered.append(cleaned)
    return tuple(ordered)


def _coerce_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


def _top_items(counter: Counter[str], *, limit: int) -> tuple[str, ...]:
    if limit <= 0:
        return ()
    return tuple(item for item, _ in counter.most_common(limit))


# ---------------------------------------------------------------------------
# dataclass definitions


@dataclass(slots=True)
class PackageComponent:
    """Represents a candidate capability or perk for a package."""

    name: str
    description: str
    category: str
    value: float = 0.6
    confidence: float = 0.6
    adoption: float = 0.5
    effort: float = 0.4
    pricing_anchor: float = 0.0
    tags: tuple[str, ...] = field(default_factory=tuple)
    dependencies: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_title(self.name)
        self.description = _normalise_text(self.description)
        self.category = _normalise_lower(self.category)
        self.value = _clamp(float(self.value))
        self.confidence = _clamp(float(self.confidence))
        self.adoption = _clamp(float(self.adoption))
        self.effort = _clamp(float(self.effort))
        self.pricing_anchor = max(float(self.pricing_anchor), 0.0)
        self.tags = _normalise_tags(self.tags)
        self.dependencies = _normalise_dependencies(self.dependencies)
        self.metadata = _coerce_mapping(self.metadata)

    @property
    def strategic_fit(self) -> float:
        """Weighted fit emphasising value delivery and adoption."""

        return _clamp(0.5 * self.value + 0.3 * self.adoption + 0.2 * self.confidence)

    @property
    def complexity(self) -> float:
        """Alias used when balancing innovation appetite versus risk."""

        return self.effort

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "name": self.name,
            "description": self.description,
            "category": self.category,
            "value": self.value,
            "confidence": self.confidence,
            "adoption": self.adoption,
            "effort": self.effort,
            "pricing_anchor": self.pricing_anchor,
            "tags": list(self.tags),
            "dependencies": list(self.dependencies),
            "metadata": dict(self.metadata) if self.metadata is not None else None,
        }


@dataclass(slots=True)
class PackageContext:
    """Runtime conditions that shape the recommended package."""

    segment: str
    price_ceiling: float
    innovation_appetite: float
    retention_focus: float
    risk_tolerance: float
    price_floor: float = 0.0
    max_components: int = 4
    focus_tags: tuple[str, ...] = field(default_factory=tuple)
    avoid_tags: tuple[str, ...] = field(default_factory=tuple)
    mandatory_components: tuple[str, ...] = field(default_factory=tuple)
    narrative_hook: str | None = None

    def __post_init__(self) -> None:
        self.segment = _normalise_text(self.segment)
        self.price_ceiling = float(self.price_ceiling)
        self.price_floor = float(self.price_floor)
        if self.price_ceiling <= 0:
            raise ValueError("price_ceiling must be positive")
        if self.price_floor < 0:
            raise ValueError("price_floor must not be negative")
        if self.price_floor > self.price_ceiling:
            raise ValueError("price_floor cannot exceed price_ceiling")
        self.innovation_appetite = _clamp(float(self.innovation_appetite))
        self.retention_focus = _clamp(float(self.retention_focus))
        self.risk_tolerance = _clamp(float(self.risk_tolerance))
        max_components = int(self.max_components)
        if max_components <= 0:
            raise ValueError("max_components must be positive")
        self.max_components = max_components
        self.focus_tags = _normalise_tags(self.focus_tags)
        self.avoid_tags = _normalise_tags(self.avoid_tags)
        self.mandatory_components = _normalise_dependencies(self.mandatory_components)
        self.narrative_hook = _normalise_optional_text(self.narrative_hook)

    @property
    def mandatory_lookup(self) -> set[str]:
        return {component.lower() for component in self.mandatory_components}

    @property
    def has_focus(self) -> bool:
        return bool(self.focus_tags)


@dataclass(slots=True)
class PackageDigest:
    """Synthesised recommendation for a package offering."""

    segment: str
    component_count: int
    price_point: float
    confidence: float
    innovation: float
    retention_lift: float
    highlight_components: tuple[str, ...]
    differentiators: tuple[str, ...]
    watchouts: tuple[str, ...]
    narrative: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "segment": self.segment,
            "component_count": self.component_count,
            "price_point": self.price_point,
            "confidence": self.confidence,
            "innovation": self.innovation,
            "retention_lift": self.retention_lift,
            "highlight_components": list(self.highlight_components),
            "differentiators": list(self.differentiators),
            "watchouts": list(self.watchouts),
            "narrative": self.narrative,
        }


# ---------------------------------------------------------------------------
# Package designer engine


class DynamicPackageDesigner:
    """Collect components and emit a context-aware package digest."""

    def __init__(self, *, history: int = 60) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        self._components: Deque[PackageComponent] = deque(maxlen=history)

    # ------------------------------------------------------------------ intake
    def register(self, component: PackageComponent | Mapping[str, object]) -> PackageComponent:
        resolved = self._coerce_component(component)
        self._components.append(resolved)
        return resolved

    def extend(self, components: Iterable[PackageComponent | Mapping[str, object]]) -> None:
        for component in components:
            self.register(component)

    def reset(self) -> None:
        self._components.clear()

    def catalogue(self) -> tuple[PackageComponent, ...]:
        return tuple(self._components)

    def _coerce_component(self, component: PackageComponent | Mapping[str, object]) -> PackageComponent:
        if isinstance(component, PackageComponent):
            return component
        if isinstance(component, Mapping):
            payload: MutableMapping[str, object] = dict(component)
            return PackageComponent(**payload)  # type: ignore[arg-type]
        raise TypeError("component must be PackageComponent or mapping")

    # -------------------------------------------------------------- diagnostics
    def _score_component(self, component: PackageComponent, context: PackageContext) -> float:
        base_value = 0.45 * component.value + 0.25 * component.adoption + 0.15 * component.confidence
        innovation_bias = 0.2 * context.innovation_appetite * (1.0 - component.effort)
        focus_bonus = 0.1 if set(component.tags) & set(context.focus_tags) else 0.0
        risk_penalty = (1.0 - context.risk_tolerance) * (1.0 - component.confidence) * 0.3
        complexity_penalty = 0.1 * component.effort
        return base_value + innovation_bias + focus_bonus - risk_penalty - complexity_penalty

    def _filter_components(self, context: PackageContext) -> list[PackageComponent]:
        if not self._components:
            raise RuntimeError("no components registered")

        avoid = set(context.avoid_tags)
        filtered = [
            component
            for component in self._components
            if not (set(component.tags) & avoid)
        ]
        if not filtered:
            raise RuntimeError("no components available after applying constraints")
        return filtered

    # ---------------------------------------------------------------- reporting
    def generate_package(self, context: PackageContext, *, limit: int | None = None) -> PackageDigest:
        if limit is None:
            limit = context.max_components
        else:
            limit = int(limit)
            if limit <= 0:
                raise ValueError("limit must be positive")

        candidates = self._filter_components(context)

        mandatory_lookup = context.mandatory_lookup
        mandatory: list[PackageComponent] = []
        optional: list[PackageComponent] = []
        for component in candidates:
            if component.name.lower() in mandatory_lookup:
                mandatory.append(component)
            else:
                optional.append(component)

        if len(mandatory) > limit:
            limit = len(mandatory)

        scored_optional = sorted(
            optional,
            key=lambda component: self._score_component(component, context),
            reverse=True,
        )

        selected: list[PackageComponent] = []
        for component in mandatory:
            if component not in selected:
                selected.append(component)

        for component in scored_optional:
            if len(selected) >= limit:
                break
            selected.append(component)

        if not selected:
            raise RuntimeError("no components selected for package")

        selected = selected[:limit]
        component_count = len(selected)

        confidences = [component.confidence for component in selected]
        confidence = fmean(confidences) if confidences else 0.0

        innovation_scores = [component.value for component in selected]
        innovation = _clamp(
            0.6 * (fmean(innovation_scores) if innovation_scores else 0.0)
            + 0.4 * context.innovation_appetite
            - 0.25 * (fmean([component.effort for component in selected]) if selected else 0.0)
        )

        retention = _clamp(
            0.7 * (fmean([component.adoption for component in selected]) if selected else 0.0)
            + 0.3 * context.retention_focus
        )

        anchor_prices = [component.pricing_anchor for component in selected if component.pricing_anchor > 0]
        if anchor_prices:
            base_price = fmean(anchor_prices)
        else:
            base_price = 0.6 * context.price_ceiling + 0.4 * context.price_floor
        price_point = min(max(base_price, context.price_floor), context.price_ceiling)
        price_point = round(price_point, 2)

        tag_counter: Counter[str] = Counter(tag for component in selected for tag in component.tags)
        differentiators = _top_items(tag_counter, limit=min(3, len(tag_counter)))
        if context.has_focus:
            for tag in context.focus_tags:
                if tag not in differentiators:
                    differentiators = differentiators + (tag,)

        highlight_components = tuple(component.name for component in selected)

        selected_names = {component.name.lower() for component in selected}
        watchouts: list[str] = []
        for component in selected:
            if component.confidence < 0.45:
                watchouts.append(f"Validate delivery confidence for {component.name}.")
            if component.effort > 0.7:
                watchouts.append(f"Resource heavy component: {component.name} requires staging.")
            missing_dependencies = [dep for dep in component.dependencies if dep.lower() not in selected_names]
            if missing_dependencies:
                dependency_list = ", ".join(missing_dependencies)
                watchouts.append(f"Add supporting components for {component.name}: {dependency_list}.")

        if not watchouts:
            watchouts.append("No critical delivery risks detected.")

        narrative_parts = [
            f"Package for {context.segment} targets {component_count} components at ${price_point:.2f}.",
            f"Confidence sits at {confidence:.2f} with innovation score {innovation:.2f}.",
            f"Retention lift projected at {retention:.2f}.",
        ]
        if context.narrative_hook:
            narrative_parts.append(context.narrative_hook)
        if differentiators:
            differentiator_list = ", ".join(differentiators)
            narrative_parts.append(f"Differentiators: {differentiator_list}.")
        if watchouts:
            narrative_parts.append(watchouts[0])

        narrative = " ".join(narrative_parts)

        return PackageDigest(
            segment=context.segment,
            component_count=component_count,
            price_point=price_point,
            confidence=confidence,
            innovation=innovation,
            retention_lift=retention,
            highlight_components=highlight_components,
            differentiators=differentiators,
            watchouts=tuple(watchouts),
            narrative=narrative,
        )

