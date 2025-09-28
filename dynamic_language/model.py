"""Data models supporting the Dynamic Language engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, MutableMapping, Sequence, cast

__all__ = [
    "LanguageCapability",
    "LanguageProfile",
    "DynamicLanguageModel",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_lower(value: str, *, field_name: str) -> str:
    return _normalise_text(value, field_name=field_name).lower()


def _normalise_tuple(values: Sequence[str] | None) -> tuple[str, ...]:
    if not values:
        return ()
    cleaned: list[str] = []
    for value in values:
        candidate = value.strip()
        if candidate:
            cleaned.append(candidate)
    return tuple(cleaned)


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    numeric = float(value)
    if numeric < lower:
        return lower
    if numeric > upper:
        return upper
    return numeric


def _ensure_mapping(mapping: Mapping[str, object] | None, *, field_name: str) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):
        raise TypeError(f"{field_name} must be a mapping if provided")
    return dict(mapping)


def _merge_unique(
    existing: Sequence[str], additional: Sequence[str] | None
) -> tuple[str, ...]:
    """Return a tuple preserving order while adding new unique values."""

    if not additional:
        return tuple(existing)
    merged: list[str] = list(existing)
    seen = {item for item in existing}
    for value in _normalise_tuple(additional):
        if value not in seen:
            merged.append(value)
            seen.add(value)
    return tuple(merged)


@dataclass(slots=True)
class LanguageCapability:
    """Represents how well a language supports a particular domain."""

    domain: str
    proficiency: float
    maturity: float = 0.5
    ecosystem: float = 0.5
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.domain = _normalise_lower(self.domain, field_name="domain")
        self.proficiency = _clamp(self.proficiency)
        self.maturity = _clamp(self.maturity)
        self.ecosystem = _clamp(self.ecosystem)
        self.notes = _normalise_tuple(self.notes)

    @property
    def readiness(self) -> float:
        """Weighted readiness score favouring proficiency."""

        return round(
            (self.proficiency * 0.6)
            + (self.maturity * 0.25)
            + (self.ecosystem * 0.15),
            4,
        )

    def to_payload(self) -> dict[str, object]:
        """Return a serialisable representation without derived fields."""

        return {
            "domain": self.domain,
            "proficiency": self.proficiency,
            "maturity": self.maturity,
            "ecosystem": self.ecosystem,
            "notes": list(self.notes),
        }


def _coerce_capability(capability: LanguageCapability | Mapping[str, object]) -> LanguageCapability:
    if isinstance(capability, LanguageCapability):
        return capability
    if not isinstance(capability, Mapping):
        raise TypeError("capability must be a LanguageCapability or mapping")
    data: MutableMapping[str, object] = dict(capability)
    domain = data.pop("domain")
    proficiency = data.pop("proficiency")
    return LanguageCapability(domain=domain, proficiency=proficiency, **data)


@dataclass(slots=True)
class LanguageProfile:
    """Describes a programming language within the engine."""

    name: str
    family: str
    runtime: str
    typing: str
    paradigms: tuple[str, ...] = field(default_factory=tuple)
    primary_use_cases: tuple[str, ...] = field(default_factory=tuple)
    capabilities: tuple[LanguageCapability, ...] = field(default_factory=tuple)
    community_health: float = 0.5
    interoperability: float = 0.5
    stability: float = 0.5
    release_velocity: float = 0.5
    strengths: tuple[str, ...] = field(default_factory=tuple)
    cautions: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field_name="name")
        self.family = _normalise_text(self.family, field_name="family")
        self.runtime = _normalise_lower(self.runtime, field_name="runtime")
        self.typing = _normalise_lower(self.typing, field_name="typing")
        self.paradigms = _normalise_tuple(self.paradigms)
        self.primary_use_cases = _normalise_tuple(self.primary_use_cases)
        self.capabilities = tuple(_coerce_capability(cap) for cap in self.capabilities)
        self.community_health = _clamp(self.community_health)
        self.interoperability = _clamp(self.interoperability)
        self.stability = _clamp(self.stability)
        self.release_velocity = _clamp(self.release_velocity)
        self.strengths = _normalise_tuple(self.strengths)
        self.cautions = _normalise_tuple(self.cautions)
        self.metadata = _ensure_mapping(self.metadata, field_name="metadata")

    @property
    def adaptability_index(self) -> float:
        """Aggregate indicator of how flexible the language is."""

        baseline = (
            self.community_health
            + self.interoperability
            + self.stability
            + self.release_velocity
        ) / 4.0
        if not self.capabilities:
            capability_readiness = 0.5
        else:
            capability_readiness = sum(cap.readiness for cap in self.capabilities) / len(
                self.capabilities
            )
        return round((baseline * 0.6) + (capability_readiness * 0.4), 4)

    def score_for_domain(self, domain: str) -> float:
        """Return the readiness score for ``domain``."""

        cleaned = _normalise_lower(domain, field_name="domain")
        matching = [cap.readiness for cap in self.capabilities if cap.domain == cleaned]
        if not matching:
            # degrade baseline performance slightly when there is no direct match
            return round(max(0.0, self.adaptability_index - 0.1), 4)
        return round((sum(matching) / len(matching)) * 0.7 + self.adaptability_index * 0.3, 4)

    def summary(self) -> str:
        """Return a human-readable description of the profile."""

        capabilities = (
            ", ".join(sorted({cap.domain for cap in self.capabilities}))
            or "generalist"
        )
        return (
            f"{self.name} ({self.typing}-typed {self.family}) — runtime {self.runtime} "
            f"with strengths in {capabilities}."
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "family": self.family,
            "runtime": self.runtime,
            "typing": self.typing,
            "paradigms": list(self.paradigms),
            "primary_use_cases": list(self.primary_use_cases),
            "capabilities": [
                {
                    "domain": cap.domain,
                    "proficiency": cap.proficiency,
                    "maturity": cap.maturity,
                    "ecosystem": cap.ecosystem,
                    "notes": list(cap.notes),
                    "readiness": cap.readiness,
                }
                for cap in self.capabilities
            ],
            "community_health": self.community_health,
            "interoperability": self.interoperability,
            "stability": self.stability,
            "release_velocity": self.release_velocity,
            "strengths": list(self.strengths),
            "cautions": list(self.cautions),
            "metadata": dict(self.metadata or {}),
            "adaptability_index": self.adaptability_index,
        }

    def to_payload(self) -> dict[str, object]:
        """Return constructor-compatible data for refinement operations."""

        return {
            "name": self.name,
            "family": self.family,
            "runtime": self.runtime,
            "typing": self.typing,
            "paradigms": list(self.paradigms),
            "primary_use_cases": list(self.primary_use_cases),
            "capabilities": [cap.to_payload() for cap in self.capabilities],
            "community_health": self.community_health,
            "interoperability": self.interoperability,
            "stability": self.stability,
            "release_velocity": self.release_velocity,
            "strengths": list(self.strengths),
            "cautions": list(self.cautions),
            "metadata": dict(self.metadata or {}),
        }

    def refined(
        self,
        *,
        overrides: Mapping[str, object] | None = None,
        extend_capabilities: Iterable[LanguageCapability | Mapping[str, object]] | None = None,
        extend_strengths: Sequence[str] | None = None,
        extend_cautions: Sequence[str] | None = None,
        extend_use_cases: Sequence[str] | None = None,
        metadata_updates: Mapping[str, object] | None = None,
    ) -> "LanguageProfile":
        """Return an updated profile with merged refinements."""

        payload = self.to_payload()

        if overrides:
            for key, value in overrides.items():
                if key == "capabilities" and value is not None:
                    processed: list[object] = []
                    for capability in cast(Iterable[object], value):
                        if isinstance(capability, LanguageCapability):
                            processed.append(capability.to_payload())
                        elif isinstance(capability, Mapping):
                            processed.append(dict(capability))
                        else:  # pragma: no cover - defensive programming
                            raise TypeError(
                                "capabilities override must contain LanguageCapability or mapping"
                            )
                    payload[key] = processed
                else:
                    payload[key] = value

        if extend_capabilities:
            capability_payloads = list(payload.get("capabilities", []))
            for capability in extend_capabilities:
                if isinstance(capability, LanguageCapability):
                    capability_payloads.append(capability.to_payload())
                elif isinstance(capability, Mapping):
                    capability_payloads.append(dict(capability))
                else:  # pragma: no cover - defensive programming
                    raise TypeError(
                        "extend_capabilities must contain LanguageCapability or mapping"
                    )
            payload["capabilities"] = capability_payloads

        if extend_strengths:
            existing = tuple(payload.get("strengths", []))
            payload["strengths"] = list(_merge_unique(existing, extend_strengths))

        if extend_cautions:
            existing = tuple(payload.get("cautions", []))
            payload["cautions"] = list(_merge_unique(existing, extend_cautions))

        if extend_use_cases:
            existing = tuple(payload.get("primary_use_cases", []))
            payload["primary_use_cases"] = list(
                _merge_unique(existing, extend_use_cases)
            )

        if metadata_updates:
            metadata = dict(payload.get("metadata") or {})
            metadata.update(metadata_updates)
            payload["metadata"] = metadata

        return LanguageProfile(**payload)


class DynamicLanguageModel:
    """Container for orchestrating language profiles."""

    def __init__(
        self,
        profiles: Iterable[LanguageProfile | Mapping[str, object]] | None = None,
    ) -> None:
        self._profiles: dict[str, LanguageProfile] = {}
        if profiles:
            for profile in profiles:
                self.register_language(profile)

    def __contains__(self, name: str) -> bool:  # pragma: no cover - trivial
        return name.strip().lower() in self._profiles

    def register_language(
        self, profile: LanguageProfile | Mapping[str, object]
    ) -> LanguageProfile:
        if not isinstance(profile, LanguageProfile):
            if not isinstance(profile, Mapping):
                raise TypeError("profile must be a LanguageProfile or mapping")
            profile = LanguageProfile(**dict(profile))
        key = profile.name.lower()
        self._profiles[key] = profile
        return profile

    def get(self, name: str) -> LanguageProfile:
        key = _normalise_lower(name, field_name="name")
        try:
            return self._profiles[key]
        except KeyError as exc:
            raise KeyError(f"unknown language: {name!r}") from exc

    def list_languages(self) -> tuple[LanguageProfile, ...]:
        return tuple(sorted(self._profiles.values(), key=lambda item: item.name.lower()))

    def recommend(
        self, domain: str, *, limit: int | None = None
    ) -> tuple[tuple[LanguageProfile, float], ...]:
        if not self._profiles:
            return ()
        cleaned = _normalise_lower(domain, field_name="domain")
        scored = [
            (profile, profile.score_for_domain(cleaned))
            for profile in self._profiles.values()
        ]
        scored.sort(key=lambda item: item[1], reverse=True)
        if limit is not None and limit >= 0:
            scored = scored[:limit]
        return tuple(scored)

    def snapshot(self) -> list[dict[str, object]]:
        return [profile.as_dict() for profile in self.list_languages()]

    def refine_language(
        self,
        name: str,
        *,
        profile: LanguageProfile | Mapping[str, object] | None = None,
        overrides: Mapping[str, object] | None = None,
        extend_capabilities: Iterable[LanguageCapability | Mapping[str, object]]
        | None = None,
        extend_strengths: Sequence[str] | None = None,
        extend_cautions: Sequence[str] | None = None,
        extend_use_cases: Sequence[str] | None = None,
        metadata_updates: Mapping[str, object] | None = None,
    ) -> LanguageProfile:
        """Refine an existing language profile with incremental updates."""

        existing = self.get(name)
        if profile is not None:
            if not isinstance(profile, LanguageProfile):
                if not isinstance(profile, Mapping):
                    raise TypeError(
                        "profile must be a LanguageProfile or mapping when provided"
                    )
                profile = LanguageProfile(**dict(profile))
            if profile.name.lower() != existing.name.lower():
                raise ValueError(
                    "replacement profile name must match the existing entry"
                )
            refined = profile
        else:
            refined = existing.refined(
                overrides=overrides,
                extend_capabilities=extend_capabilities,
                extend_strengths=extend_strengths,
                extend_cautions=extend_cautions,
                extend_use_cases=extend_use_cases,
                metadata_updates=metadata_updates,
            )

        self._profiles[existing.name.lower()] = refined
        return refined
