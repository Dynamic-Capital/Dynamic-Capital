"""Discipline and subject taxonomies for the Dynamic Trading language model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

__all__ = [
    "TradingDiscipline",
    "DYNAMIC_TRADING_FIELDS",
    "get_trading_discipline",
    "list_trading_discipline_names",
]


@dataclass(frozen=True, slots=True)
class TradingDiscipline:
    """A taxonomy node linking a Dynamic Trading field with its subjects."""

    name: str
    subjects: tuple[str, ...]

    def __post_init__(self) -> None:
        if not self.name.strip():  # pragma: no cover - defensive branch
            raise ValueError("discipline name must not be empty")
        object.__setattr__(self, "name", self.name.strip())
        cleaned_subjects: tuple[str, ...] = tuple(
            subject.strip() for subject in self.subjects if subject.strip()
        )
        if not cleaned_subjects:
            raise ValueError("disciplines must declare at least one subject")
        object.__setattr__(self, "subjects", cleaned_subjects)

    def as_dict(self) -> Mapping[str, Sequence[str]]:
        """Return a serialisable mapping representation."""

        return {"name": self.name, "subjects": self.subjects}


_DISCIPLINE_SEQUENCE: tuple[TradingDiscipline, ...] = (
    TradingDiscipline(
        name="Dynamic Trading Natural Sciences",
        subjects=(
            "Dynamic Physics",
            "Dynamic Chemistry",
            "Dynamic Biology",
            "Dynamic Geology",
        ),
    ),
    TradingDiscipline(
        name="Dynamic Trading Social Sciences",
        subjects=(
            "Dynamic Economics",
            "Dynamic Psychology",
            "Dynamic Sociology",
            "Dynamic Political Science",
        ),
    ),
    TradingDiscipline(
        name="Dynamic Trading Humanities",
        subjects=(
            "Dynamic History",
            "Dynamic Philosophy",
            "Dynamic Literature",
            "Dynamic Languages",
        ),
    ),
    TradingDiscipline(
        name="Dynamic Trading Formal Sciences",
        subjects=(
            "Dynamic Mathematics",
            "Dynamic Statistics",
            "Dynamic Computer Science (Theory)",
        ),
    ),
    TradingDiscipline(
        name="Dynamic Trading Applied Sciences",
        subjects=(
            "Dynamic Engineering",
            "Dynamic Medicine",
            "Dynamic Computer Science (Applied)",
        ),
    ),
    TradingDiscipline(
        name="Dynamic Trading Arts",
        subjects=(
            "Dynamic Fine Arts",
            "Dynamic Music",
            "Dynamic Theatre",
            "Dynamic Film",
        ),
    ),
)


def _build_discipline_lookup(
    disciplines: tuple[TradingDiscipline, ...],
) -> tuple[
    tuple[TradingDiscipline, ...],
    Mapping[str, TradingDiscipline],
    tuple[str, ...],
]:
    """Construct immutable lookup helpers for discipline retrieval."""

    lookup: dict[str, TradingDiscipline] = {}
    names: list[str] = []
    for discipline in disciplines:
        key = discipline.name.casefold()
        if key in lookup:
            raise ValueError(
                f"duplicate trading discipline name detected: {discipline.name}"
            )
        lookup[key] = discipline
        names.append(discipline.name)
    return disciplines, lookup, tuple(names)


DYNAMIC_TRADING_FIELDS, _DISCIPLINE_BY_KEY, _DISCIPLINE_NAMES = _build_discipline_lookup(
    _DISCIPLINE_SEQUENCE
)


def get_trading_discipline(name: str) -> TradingDiscipline:
    """Retrieve a trading discipline by name."""

    key = name.strip().casefold()
    if not key:
        raise KeyError("Unknown trading discipline: <empty>")
    try:
        return _DISCIPLINE_BY_KEY[key]
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise KeyError(f"Unknown trading discipline: {name}") from exc


def list_trading_discipline_names() -> tuple[str, ...]:
    """Return the ordered list of discipline names."""

    return _DISCIPLINE_NAMES
