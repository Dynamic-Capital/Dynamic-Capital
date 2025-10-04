"""Reporting helpers that organise Dynamic Trading narratives by discipline."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable, Mapping, Sequence

from .fields import (
    TradingDiscipline,
    get_trading_discipline,
    list_trading_discipline_names,
)
from .model import MarketNarrative

__all__ = ["NarrativeDeck"]


def _normalise_subjects(subjects: Sequence[str] | None) -> tuple[str, ...]:
    if not subjects:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for subject in subjects:
        text = " ".join(str(subject).split())
        if not text:
            continue
        lowered = text.casefold()
        if lowered not in seen:
            seen.add(lowered)
            cleaned.append(text)
    return tuple(cleaned)


@dataclass(slots=True)
class NarrativeDeck:
    """Collection of market narratives with discipline-aware utilities."""

    narratives: tuple[MarketNarrative, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        if isinstance(self.narratives, Iterable) and not isinstance(
            self.narratives, tuple
        ):
            items = tuple(self.narratives)
        else:
            items = self.narratives

        validated: list[MarketNarrative] = []
        for narrative in items:
            if not isinstance(narrative, MarketNarrative):
                raise TypeError(
                    "NarrativeDeck accepts only MarketNarrative instances"
                )
            validated.append(narrative)

        object.__setattr__(self, "narratives", tuple(validated))

    def filter_by_discipline(
        self,
        discipline: TradingDiscipline | str,
        *,
        subjects: Sequence[str] | None = None,
    ) -> tuple[MarketNarrative, ...]:
        """Return narratives that match the requested discipline and subjects."""

        resolved = (
            discipline
            if isinstance(discipline, TradingDiscipline)
            else get_trading_discipline(discipline)
        )
        subject_focus = {subject.casefold() for subject in _normalise_subjects(subjects)}

        matches: list[MarketNarrative] = []
        for narrative in self.narratives:
            if narrative.discipline is None:
                continue
            if narrative.discipline.name != resolved.name:
                continue
            if subject_focus:
                narrative_subjects = {
                    subject.casefold() for subject in narrative.discipline_subjects
                }
                if not subject_focus.intersection(narrative_subjects):
                    continue
            matches.append(narrative)

        return tuple(matches)

    def group_by_discipline(self) -> Mapping[str, tuple[MarketNarrative, ...]]:
        """Cluster narratives by their discipline field with an unclassified bucket."""

        grouped: dict[str, list[MarketNarrative]] = {}
        for narrative in self.narratives:
            key = narrative.discipline.name if narrative.discipline else "Unclassified"
            grouped.setdefault(key, []).append(narrative)
        return {key: tuple(values) for key, values in grouped.items()}

    def to_markdown(self, *, include_unclassified: bool = True) -> str:
        """Render the deck as markdown grouped by discipline headings."""

        if not self.narratives:
            return "# Narrative Deck\n\n_No narratives available._\n"

        grouped = self.group_by_discipline()
        lines: list[str] = ["# Narrative Deck"]

        for field_name in list_trading_discipline_names():
            narratives = grouped.get(field_name)
            if not narratives:
                continue
            lines.extend(["", f"## {field_name}"])
            for index, narrative in enumerate(narratives, start=1):
                lines.extend(
                    [
                        "",
                        f"### {index}. {narrative.headline}",
                        narrative.thesis,
                        "",
                        f"- Confidence: {narrative.confidence:.0%}",
                    ]
                )
                if narrative.tags:
                    lines.append("- Tags: " + ", ".join(narrative.tags))
                if narrative.discipline_subjects:
                    lines.append(
                        "- Subjects: " + ", ".join(narrative.discipline_subjects)
                    )

        if include_unclassified and "Unclassified" in grouped:
            lines.extend(["", "## Unclassified"])
            for index, narrative in enumerate(grouped["Unclassified"], start=1):
                lines.extend(
                    [
                        "",
                        f"### {index}. {narrative.headline}",
                        narrative.thesis,
                        "",
                        f"- Confidence: {narrative.confidence:.0%}",
                    ]
                )
                if narrative.tags:
                    lines.append("- Tags: " + ", ".join(narrative.tags))

        lines.append("")
        return "\n".join(lines)
