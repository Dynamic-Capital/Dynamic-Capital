"""Allocator that converts daily blueprint rows into Supabase routine prompts."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, Mapping, Sequence

from .supabase_sync import SupabaseTableWriter

__all__ = [
    "RoutinePrompt",
    "DailyRoutineAllocator",
]


CATEGORY_KEYWORDS: Mapping[str, tuple[str, ...]] = {
    "Prayer": (
        "fajr",
        "dhuhr",
        "asr",
        "maghrib",
        "isha",
        "prayer",
        "salah",
    ),
    "Meal": (
        "breakfast",
        "lunch",
        "dinner",
        "meal",
        "suhoor",
        "suhur",
        "iftar",
    ),
    "Trading": (
        "trade",
        "trading",
        "market",
        "london",
        "ny",
        "check",
        "desk",
    ),
    "Journaling": (
        "journal",
        "journaling",
        "log",
        "chart review",
        "review",
        "mentorship",
        "debrief",
    ),
    "Sleep": (
        "sleep",
        "lights out",
        "bed",
        "rest",
        "wind down",
    ),
    "Training": (
        "training",
        "strength",
        "zone-2",
        "zone 2",
        "run",
        "conditioning",
        "mobility",
        "gym",
    ),
}

EMOJI_BY_CATEGORY: Mapping[str, str] = {
    "prayer": "🌅",
    "meal": "🍳",
    "trading": "📊",
    "journaling": "📖",
    "sleep": "😴",
    "training": "🏋️",
}

DEFAULT_QUOTES: tuple[str, ...] = (
    "Begin with remembrance, and the day will be blessed.",
    "Plan the trade, trade the plan.",
    "Discipline today compounds into tomorrow's edge.",
)

DEFAULT_TIP = "Show up with presence; honour the process."  # Fallback when notes are missing.
DEFAULT_QUOTE = "Stay intentional and aligned with your mission."


@dataclass(slots=True)
class RoutinePrompt:
    """Serialisable representation of a routine prompt row."""

    time_slot: str
    category: str
    title: str
    tip: str
    quote: str
    notification: str

    def to_record(self) -> dict[str, str]:
        return {
            "time_slot": self.time_slot,
            "category": self.category,
            "title": self.title,
            "tip": self.tip,
            "quote": self.quote,
            "notification": self.notification,
        }


class DailyRoutineAllocator:
    """Builds :class:`RoutinePrompt` rows and syncs them into Supabase."""

    def __init__(
        self,
        *,
        writer: SupabaseTableWriter,
        quotes: Sequence[str] | None = None,
        fallback_quote: str = DEFAULT_QUOTE,
    ) -> None:
        self.writer = writer
        prepared_quotes = [quote.strip() for quote in (quotes or DEFAULT_QUOTES) if quote and quote.strip()]
        self._quotes: tuple[str, ...] = tuple(prepared_quotes) if prepared_quotes else (fallback_quote,)
        self._fallback_quote = fallback_quote
        self._quote_index = 0

    def generate_prompts(self, blueprint_rows: Sequence[Mapping[str, Any]]) -> list[RoutinePrompt]:
        """Convert blueprint rows into routine prompts."""

        prompts: list[RoutinePrompt] = []
        for row in blueprint_rows:
            prompt = self._build_prompt(row)
            prompts.append(prompt)
        return prompts

    def sync(self, blueprint_rows: Sequence[Mapping[str, Any]]) -> int:
        """Generate prompts for the provided rows and persist them via Supabase."""

        prompts = self.generate_prompts(blueprint_rows)
        payload = [prompt.to_record() for prompt in prompts]
        return self.writer.upsert(payload)

    def _build_prompt(self, row: Mapping[str, Any]) -> RoutinePrompt:
        time_slot = self._coerce_required(row, ("time_slot", "slot", "time"))
        title = self._coerce_required(row, ("title", "block", "name"))
        tip = self._coerce_first(row, ("tip", "notes", "checklist", "instructions", "todo")) or DEFAULT_TIP
        category = self._resolve_category(row, title, tip)
        quote = self._next_quote()
        notification = self._format_notification(category, title, tip)
        return RoutinePrompt(
            time_slot=time_slot,
            category=category,
            title=title,
            tip=tip,
            quote=quote,
            notification=notification,
        )

    def _resolve_category(self, row: Mapping[str, Any], title: str, tip: str) -> str:
        explicit = row.get("category")
        if explicit:
            text = str(explicit).strip()
            if text:
                return text
        haystack = " ".join(
            part
            for part in (
                title,
                tip,
                str(row.get("notes", "")),
                str(row.get("description", "")),
                str(row.get("category_hint", "")),
            )
            if part
        ).lower()
        for category, keywords in CATEGORY_KEYWORDS.items():
            for keyword in keywords:
                pattern = rf"\b{re.escape(keyword.lower())}\b"
                if re.search(pattern, haystack):
                    return category
        return "General"

    def _format_notification(self, category: str, title: str, tip: str) -> str:
        emoji = EMOJI_BY_CATEGORY.get(category.lower(), "🔔")
        snippet = self._shorten_tip(tip)
        if snippet:
            return f"{emoji} {title} → {snippet}"
        return f"{emoji} {title}"

    def _shorten_tip(self, tip: str) -> str:
        sentences = [segment.strip() for segment in re.split(r"[.;]\s*", tip) if segment.strip()]
        if not sentences:
            return ""
        snippet = sentences[0]
        if len(snippet) > 80:
            snippet = snippet[:77].rstrip(",;:. ") + "…"
        return snippet

    def _coerce_required(self, row: Mapping[str, Any], keys: Iterable[str]) -> str:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        raise ValueError(f"Missing required field; expected one of {', '.join(keys)}")

    def _coerce_first(self, row: Mapping[str, Any], keys: Iterable[str]) -> str | None:
        for key in keys:
            value = row.get(key)
            if value is None:
                continue
            text = str(value).strip()
            if text:
                return text
        return None

    def _next_quote(self) -> str:
        if not self._quotes:
            return self._fallback_quote
        quote = self._quotes[self._quote_index]
        self._quote_index = (self._quote_index + 1) % len(self._quotes)
        return quote
