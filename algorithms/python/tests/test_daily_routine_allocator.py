from __future__ import annotations

from typing import Any, Mapping, Sequence, cast

from algorithms.python.daily_routine_allocator import DailyRoutineAllocator
from algorithms.python.supabase_sync import SupabaseTableWriter


class _CollectingWriter:
    """Lightweight stub that records upserts for assertions."""

    def __init__(self) -> None:
        self.rows: list[Mapping[str, Any]] = []

    def upsert(self, rows: Sequence[Mapping[str, Any]]) -> int:
        self.rows.extend(rows)
        return len(rows)


def _allocator(quotes: Sequence[str] | None = None) -> DailyRoutineAllocator:
    writer = cast(SupabaseTableWriter, _CollectingWriter())
    return DailyRoutineAllocator(writer=writer, quotes=quotes)


def test_allocator_infers_category_and_formats_notification() -> None:
    allocator = _allocator(["Quote"])
    prompts = allocator.generate_prompts(
        [
            {
                "time_slot": "04:30",
                "title": "Fajr | Masjid + Qur'an",
                "notes": "Hydrate 300ml; stretch 2 min before recitation.",
            }
        ]
    )
    prompt = prompts[0]
    assert prompt.category == "Prayer"
    assert prompt.tip == "Hydrate 300ml; stretch 2 min before recitation."
    assert prompt.notification.startswith("🌅 Fajr | Masjid + Qur'an")
    assert "hydrate" in prompt.notification.lower()


def test_allocator_rotates_quotes_and_falls_back_when_empty() -> None:
    allocator = _allocator(["Quote A", "Quote B"])
    prompts = allocator.generate_prompts(
        [
            {"time_slot": "06:00", "title": "London Prep", "notes": "Bias W/D/H4 → H1."},
            {"time_slot": "08:00", "title": "Breakfast", "notes": "Protein 40g."},
        ]
    )
    assert prompts[0].quote == "Quote A"
    assert prompts[1].quote == "Quote B"

    fallback_allocator = _allocator([])
    fallback_prompt = fallback_allocator.generate_prompts(
        [{"time_slot": "21:30", "title": "Sleep Reset"}]
    )[0]
    assert fallback_prompt.quote  # falls back to default text


def test_sync_uses_writer_upsert() -> None:
    collector = _CollectingWriter()
    writer = cast(SupabaseTableWriter, collector)
    allocator = DailyRoutineAllocator(writer=writer, quotes=["Quote"])

    count = allocator.sync([
        {
            "time_slot": "20:30",
            "title": "Journaling / Mentorship Prep",
            "notes": "3-min journal; 25-min learning.",
        }
    ])

    assert count == 1
    assert collector.rows[0]["time_slot"] == "20:30"
    assert collector.rows[0]["category"] == "Journaling"
