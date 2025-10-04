from dynamic_trading_language import (
    MarketNarrative,
    NarrativeDeck,
    get_trading_discipline,
)


def _build_narrative(
    headline: str,
    discipline_name: str | None = None,
    subjects: tuple[str, ...] | None = None,
) -> MarketNarrative:
    discipline = (
        get_trading_discipline(discipline_name) if discipline_name else None
    )
    return MarketNarrative(
        headline=headline,
        thesis="Dynamic desk is tracking rotational momentum cues.",
        key_levels=("Entry: 4300.0000",),
        risk_mitigation=("Respect overnight gap",),
        call_to_action="Stage entries with real-time liquidity checks.",
        confidence=0.58,
        style="institutional",
        discipline=discipline,
        discipline_subjects=subjects or (),
        tags=("ES", "INTRADAY"),
    )


def test_filter_by_discipline_and_subject_focus() -> None:
    applied_sciences = get_trading_discipline("Dynamic Trading Applied Sciences")
    applied_subjects = (
        "Dynamic Engineering",
        "Dynamic Computer Science (Applied)",
    )
    narratives = (
        _build_narrative(
            "Applied sciences rotation",
            applied_sciences.name,
            applied_subjects,
        ),
        _build_narrative(
            "Natural sciences focus",
            "Dynamic Trading Natural Sciences",
            ("Dynamic Physics",),
        ),
        _build_narrative("Cross-asset brief"),
    )

    deck = NarrativeDeck(narratives)

    filtered = deck.filter_by_discipline(applied_sciences, subjects=("Dynamic Engineering",))

    assert len(filtered) == 1
    assert filtered[0].headline == "Applied sciences rotation"

    filtered_by_name = deck.filter_by_discipline(
        "Dynamic Trading Natural Sciences", subjects=("Dynamic Physics",)
    )

    assert len(filtered_by_name) == 1
    assert filtered_by_name[0].discipline_subjects == ("Dynamic Physics",)


def test_narrative_deck_markdown_groups_by_discipline() -> None:
    deck = NarrativeDeck(
        (
            _build_narrative(
                "Applied sciences rotation",
                "Dynamic Trading Applied Sciences",
                ("Dynamic Engineering",),
            ),
            _build_narrative(
                "Unclassified briefing",
            ),
        )
    )

    markdown = deck.to_markdown()

    assert "# Narrative Deck" in markdown
    assert "## Dynamic Trading Applied Sciences" in markdown
    assert "Applied sciences rotation" in markdown
    assert "Dynamic Engineering" in markdown
    assert "## Unclassified" in markdown
