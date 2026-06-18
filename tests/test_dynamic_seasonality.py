from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from dynamic_seasonality import (
    DynamicSeasonality,
    SeasonalObservation,
)


def make_observation(
    value: float,
    *,
    day_offset: int = 0,
    weight: float = 1.0,
    period: str | None = None,
) -> SeasonalObservation:
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    timestamp = base + timedelta(days=day_offset)
    return SeasonalObservation(value=value, timestamp=timestamp, weight=weight, period=period)


class TestDynamicSeasonality:
    def test_snapshot_and_index_metrics(self) -> None:
        engine = DynamicSeasonality(period="day_of_week", window=16)
        engine.ingest_many(
            [
                make_observation(120.0, day_offset=0),
                make_observation(130.0, day_offset=7),
                make_observation(80.0, day_offset=1),
                make_observation(75.0, day_offset=8),
                make_observation(100.0, day_offset=2),
            ]
        )

        snapshot = engine.snapshot()
        assert snapshot.period == "day_of_week"
        assert snapshot.total_observations == 5
        assert snapshot.baseline == pytest.approx(101.0)
        assert snapshot.amplitude == pytest.approx(47.5)
        assert snapshot.dominant_periods[0] == "monday"

        profile_map = {profile.period: profile for profile in snapshot.profiles}
        assert profile_map["monday"].mean == pytest.approx(125.0)
        assert profile_map["tuesday"].mean == pytest.approx(77.5)
        assert profile_map["wednesday"].momentum == pytest.approx(0.0)
        assert profile_map["monday"].contribution == pytest.approx(2 / 5)
        assert profile_map["tuesday"].median == pytest.approx(77.5)
        assert profile_map["monday"].latest_value == pytest.approx(130.0)
        assert profile_map["monday"].latest_timestamp.tzinfo is timezone.utc

        assert engine.seasonality_index("monday") > 0
        assert engine.seasonality_index("tuesday") < 0

    def test_ingestion_variants_and_window(self) -> None:
        engine = DynamicSeasonality(period="month", window=3)
        january = datetime(2024, 1, 5, tzinfo=timezone.utc)
        engine.ingest({"value": 10.0, "timestamp": january, "weight": 2.0, "period": "Cycle-A"})
        engine.ingest(15.0, timestamp=january.replace(month=2))
        engine.ingest(20.0, timestamp=january.replace(month=3))
        assert len(engine.observations) == 3

        profiles = engine.profiles()
        profile_map = {profile.period: profile for profile in profiles}
        assert "cycle-a" in profile_map
        assert profile_map["cycle-a"].weight == pytest.approx(2.0)
        assert profile_map["february"].count == 1

        dictionary_view = engine.observations[0].as_dict()
        assert dictionary_view["period"] == "cycle-a"
        assert dictionary_view["timestamp"].endswith("+00:00")

    def test_empty_snapshot_and_errors(self) -> None:
        engine = DynamicSeasonality()
        snapshot = engine.snapshot()
        assert snapshot.total_observations == 0
        assert snapshot.profiles == ()
        assert snapshot.as_dict()["profiles"] == []

        with pytest.raises(KeyError):
            engine.seasonality_index("monday")
        with pytest.raises(ValueError):
            engine.seasonality_index("")
