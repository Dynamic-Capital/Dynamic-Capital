from __future__ import annotations

from algorithms.python.fundamental_positioning import (
    FundamentalHighlight,
    FundamentalHighlightsGenerator,
    FundamentalHighlightsSyncJob,
    FundamentalSnapshot,
)


class MemoryWriter:
    def __init__(self):
        self.rows = []

    def upsert(self, rows):
        self.rows = list(rows)
        return len(self.rows)


def test_generator_creates_ordered_highlights():
    generator = FundamentalHighlightsGenerator()
    snapshots = [
        FundamentalSnapshot(
            asset="NVDA",
            sector="Semiconductors",
            growth_score=82,
            value_score=45,
            quality_score=78,
            catalysts=("Blackwell ramp", "Hyperscaler capex commitments"),
            risk_notes=("Scale into weakness",),
            metrics={"YoY revenue": "+262%"},
        ),
        FundamentalSnapshot(
            asset="XOM",
            sector="Energy",
            growth_score=32,
            value_score=58,
            quality_score=40,
            catalysts=("OPEC+ policy signals",),
            risk_notes=("Tight stop above $125",),
            metrics={"Dividend yield": "3.1%"},
        ),
    ]

    highlights = generator.generate(snapshots)

    assert len(highlights) == 2
    assert highlights[0].asset == "NVDA"
    assert highlights[0].positioning == "Overweight"
    assert "Growth 82.0" in highlights[0].summary
    assert highlights[1].positioning == "Underweight"
    assert "Tight stop" in highlights[1].risk_controls


def test_sync_job_serialises_highlights():
    writer = MemoryWriter()
    sync_job = FundamentalHighlightsSyncJob(writer=writer)
    highlight = FundamentalHighlight(
        asset="ABC",
        sector="Tech",
        positioning="Market weight",
        summary="Test summary",
        catalysts=["Earnings"],
        risk_controls="Use protective puts",
        metrics=[{"label": "Metric", "value": "42"}],
    )

    count = sync_job.run([highlight])

    assert count == 1
    assert writer.rows[0]["asset"] == "ABC"
    assert writer.rows[0]["metrics"][0]["value"] == "42"
    assert "updated_at" in writer.rows[0]
