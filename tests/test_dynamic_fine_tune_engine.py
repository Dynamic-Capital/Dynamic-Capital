from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_fine_tune_engine import (
    DynamicFineTuneAgent,
    DynamicFineTuneEngine,
    DynamicFineTuneModel,
    FineTuneBot,
    FineTuneHelper,
    FineTuneKeeper,
    FineTuneRecord,
    FineTuneRecordBuilder,
    FineTuneCrawler,
)


def _ts(minutes: int) -> datetime:
    return datetime(2024, 1, 1, tzinfo=timezone.utc) + timedelta(minutes=minutes)


def test_ingest_and_stats_report_quality() -> None:
    engine = DynamicFineTuneEngine(capacity=4)
    accepted = engine.ingest(
        [
            {
                "prompt": "Summarise revenue drivers",
                "completion": "Focus on subscription expansion",
                "source": "analyst",
                "quality": 0.8,
                "priority": 0.7,
                "tags": ("finance", "summary"),
                "token_estimate": 120,
            },
            {
                "prompt": "Draft compliance checklist",
                "completion": "Ensure SOC2 and GDPR coverage",
                "source": "ops",
                "quality": 0.7,
                "priority": 0.6,
                "tags": ("governance",),
                "token_estimate": 90,
            },
        ]
    )

    stats = engine.stats()

    assert accepted == 2
    assert pytest.approx(stats["average_quality"], rel=1e-6) == 0.75
    assert stats["tag_histogram"] == {"finance": 1, "governance": 1, "summary": 1}
    assert stats["token_estimate_total"] == 210
    assert stats["sources"]["analyst"]["count"] == 1


def test_deduplication_skips_existing_records() -> None:
    engine = DynamicFineTuneEngine(deduplicate=True)
    record = FineTuneRecord(
        prompt="Outline retention strategy",
        completion="Introduce lifecycle campaigns",
        source="growth",
        quality=0.9,
        priority=0.8,
    )

    engine.ingest([record, record])

    assert len(engine.stats()["tag_histogram"]) == 0
    assert len(list(engine.recent(limit=5))) == 1


def test_harvest_prioritises_scores_and_optionally_removes() -> None:
    engine = DynamicFineTuneEngine(capacity=5, decay=0.05)
    engine.ingest(
        [
            FineTuneRecord(
                prompt="Classify sentiment",
                completion="Positive",
                source="labeler-a",
                quality=0.65,
                priority=0.6,
            ),
            FineTuneRecord(
                prompt="Respond to escalation",
                completion="Apologise and offer credit",
                source="labeler-b",
                quality=0.9,
                priority=0.8,
            ),
            FineTuneRecord(
                prompt="Plan experiment",
                completion="Run cohort analysis",
                source="labeler-c",
                quality=0.55,
                priority=0.4,
            ),
        ]
    )

    batch = engine.harvest(batch_size=2, minimum_quality=0.6, remove=True, notes="weekly export")

    assert batch.size == 2
    assert batch.notes == "weekly export"
    assert all(record.quality >= 0.6 for record in batch.records)
    remaining = engine.stats()["count"]
    assert remaining == 1


def test_capacity_evicts_oldest_records() -> None:
    engine = DynamicFineTuneEngine(capacity=2)
    engine.ingest(
        [
            FineTuneRecord(
                prompt="Explain carbon offset",
                completion="Offsets balance emissions",
                source="sustainability",
                quality=0.6,
                created_at=_ts(0),
            ),
            FineTuneRecord(
                prompt="Summarise roadmap",
                completion="Highlight platform upgrades",
                source="product",
                quality=0.7,
                created_at=_ts(10),
            ),
            FineTuneRecord(
                prompt="Document deployment",
                completion="Detail blue/green steps",
                source="platform",
                quality=0.8,
                created_at=_ts(20),
            ),
        ]
    )

    recent = engine.recent(limit=2)

    assert len(recent) == 2
    assert {record.source for record in recent} == {"product", "platform"}


def test_builder_and_helper_coordinate_with_model() -> None:
    builder = FineTuneRecordBuilder(default_quality=0.75, default_priority=0.6)
    model = DynamicFineTuneModel()
    agent = DynamicFineTuneAgent(model=model, builder=builder)
    crawler = FineTuneCrawler()

    def _fetcher() -> list[dict[str, object]]:
        return [
            {
                "prompt": "Draft executive summary",
                "completion": "Highlight revenue momentum",
                "tags": ("summary", "executive"),
            },
            {
                "prompt": "Explain retention uplift",
                "completion": "Focus on onboarding journeys",
                "source": "analytics",
                "tags": ("retention",),
                "quality": 0.85,
            },
        ]

    crawler.register("insights", _fetcher)
    ingested = agent.ingest_from_crawler(crawler)

    helper = FineTuneHelper(model)
    top_tags = helper.top_tags(limit=2)

    assert ingested == 2
    assert top_tags[0][0] in {"summary", "executive", "retention"}
    assert helper.recent_prompts(limit=1)[0] in {
        "Draft executive summary",
        "Explain retention uplift",
    }


def test_keeper_roundtrip(tmp_path) -> None:
    model = DynamicFineTuneModel()
    builder = FineTuneRecordBuilder()
    record = builder.build(
        prompt="Outline go-to-market",
        completion="Leverage partner marketing",
        source="strategy",
        tags=("gtm",),
    )
    model.ingest([record])

    keeper = FineTuneKeeper(indent=0)
    destination = keeper.save(model, tmp_path / "snapshot.json")

    restored_model = DynamicFineTuneModel()
    restored_count = keeper.restore(restored_model, destination)

    assert destination.exists()
    assert restored_count == 1
    assert restored_model.stats()["count"] == 1


def test_bot_cycle_runs_end_to_end(tmp_path) -> None:
    model = DynamicFineTuneModel()
    agent = DynamicFineTuneAgent(model=model)
    crawler = FineTuneCrawler()

    def _source() -> list[dict[str, object]]:
        return [
            {
                "prompt": "Classify support ticket",
                "completion": "Label as urgent",
                "source": "support",
                "quality": 0.8,
            },
            {
                "prompt": "Summarise feature request",
                "completion": "Detail analytics dashboard",
                "source": "product",
                "quality": 0.7,
            },
        ]

    crawler.register("support", _source)

    bot = FineTuneBot(agent=agent)
    report = bot.cycle(
        crawler,
        batch_size=1,
        minimum_quality=0.7,
        remove=False,
        persist_path=str(tmp_path / "export.json"),
        notes="nightly harvest",
    )

    assert report["ingested"] == 2
    assert report["batch"].size == 1
    assert (tmp_path / "export.json").exists()

