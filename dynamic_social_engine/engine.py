"""Adaptive engine for orchestrating social programming and engagement."""

from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from itertools import islice
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

__all__ = [
    "SocialChannel",
    "SocialPost",
    "EngagementSnapshot",
    "ChannelPerformance",
    "ScheduleContext",
    "ScheduledPost",
    "DynamicSocialEngine",
]


# ---------------------------------------------------------------------------
# helpers


def _normalise_text(value: str, *, field: str) -> str:
    """Return a stripped version of *value* or raise :class:`ValueError`."""

    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"{field} must not be empty")
    return cleaned


def _clamp(value: float, *, lower: float = 0.0, upper: float = 1.0) -> float:
    """Clamp ``value`` within the inclusive ``[lower, upper]`` range."""

    return max(lower, min(upper, value))


def _coerce_timezone(value: str | ZoneInfo | None) -> ZoneInfo:
    """Return a :class:`ZoneInfo` instance, defaulting to UTC when missing."""

    if isinstance(value, ZoneInfo):
        return value
    if not value:
        return ZoneInfo("UTC")
    try:
        return ZoneInfo(str(value))
    except ZoneInfoNotFoundError as exc:  # pragma: no cover - defensive
        raise ValueError(f"unknown timezone: {value!r}") from exc


def _to_datetime(value: datetime | str, *, tz: ZoneInfo) -> datetime:
    """Coerce a value into an aware :class:`datetime.datetime`."""

    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(_normalise_text(value, field="datetime"))

    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt.astimezone(tz)


def _segment_overlap(base: Sequence[str], target: Sequence[str]) -> float:
    """Return the ratio of overlapping audience tags between two sequences."""

    base_set = {item.lower() for item in base if item}
    target_set = {item.lower() for item in target if item}
    if not base_set or not target_set:
        return 0.0
    intersection = base_set.intersection(target_set)
    return len(intersection) / float(len(base_set | target_set))


# ---------------------------------------------------------------------------
# domain model


@dataclass(slots=True)
class SocialChannel:
    """Represents a distinct distribution surface for social programming."""

    name: str
    timezone: ZoneInfo | str = "UTC"
    objectives: Sequence[str] = field(default_factory=tuple)
    audience_segments: Sequence[str] = field(default_factory=tuple)
    cadence_per_day: float = 1.0
    baseline_engagement: float = 0.5

    def __post_init__(self) -> None:
        self.name = _normalise_text(self.name, field="channel name")
        self.timezone = _coerce_timezone(self.timezone)
        self.objectives = tuple(
            _normalise_text(obj, field="objective").lower()
            for obj in self.objectives
            if obj.strip()
        )
        self.audience_segments = tuple(
            _normalise_text(segment, field="audience segment").lower()
            for segment in self.audience_segments
            if segment.strip()
        )
        self.cadence_per_day = max(float(self.cadence_per_day), 0.0)
        self.baseline_engagement = _clamp(float(self.baseline_engagement))


@dataclass(slots=True)
class SocialPost:
    """Content item awaiting distribution across one or more channels."""

    identifier: str
    title: str
    body: str
    channels: Sequence[str]
    category: str = ""
    target_segments: Sequence[str] = field(default_factory=tuple)
    call_to_action: str = ""

    def __post_init__(self) -> None:
        self.identifier = _normalise_text(self.identifier, field="post identifier")
        self.title = _normalise_text(self.title, field="post title")
        self.body = _normalise_text(self.body, field="post body")
        channel_names: list[str] = []
        for channel in self.channels:
            cleaned = _normalise_text(channel, field="channel name")
            if cleaned.lower() not in {name.lower() for name in channel_names}:
                channel_names.append(cleaned)
        if not channel_names:
            raise ValueError("post must target at least one channel")
        self.channels = tuple(channel_names)
        self.category = self.category.strip().lower()
        self.target_segments = tuple(
            _normalise_text(segment, field="target segment").lower()
            for segment in self.target_segments
            if segment.strip()
        )
        self.call_to_action = self.call_to_action.strip()


@dataclass(slots=True)
class EngagementSnapshot:
    """Point-in-time performance metrics for a channel touchpoint."""

    channel: str
    timestamp: datetime
    impressions: int
    engagements: int
    clicks: int
    conversions: int
    sentiment: float = 0.0

    def __post_init__(self) -> None:
        self.channel = _normalise_text(self.channel, field="channel name").lower()
        if self.timestamp.tzinfo is None:
            self.timestamp = self.timestamp.replace(tzinfo=UTC)
        self.impressions = max(int(self.impressions), 0)
        self.engagements = max(int(self.engagements), 0)
        self.clicks = max(int(self.clicks), 0)
        self.conversions = max(int(self.conversions), 0)
        self.sentiment = _clamp(float(self.sentiment), lower=-1.0, upper=1.0)

    @property
    def engagement_rate(self) -> float:
        """Return the engagement rate for the snapshot."""

        if self.impressions == 0:
            return 0.0
        return min(self.engagements / float(self.impressions), 1.0)

    @property
    def click_through_rate(self) -> float:
        """Return the click-through rate for the snapshot."""

        if self.impressions == 0:
            return 0.0
        return min(self.clicks / float(self.impressions), 1.0)

    @property
    def conversion_rate(self) -> float:
        """Return the conversion rate for the snapshot."""

        if self.clicks == 0:
            return 0.0
        return min(self.conversions / float(self.clicks), 1.0)

    @property
    def score(self) -> float:
        """Composite quality score emphasising downstream outcomes."""

        return _clamp(
            (self.engagement_rate * 0.4)
            + (self.click_through_rate * 0.35)
            + (self.conversion_rate * 0.2)
            + (self.sentiment * 0.05),
            lower=0.0,
            upper=1.0,
        )


@dataclass(slots=True)
class ChannelPerformance:
    """Aggregated performance indicators for a given channel."""

    channel: str
    average_engagement_rate: float
    average_click_through_rate: float
    average_conversion_rate: float
    average_sentiment: float
    engagement_index: float
    best_hours: tuple[int, ...]


@dataclass(slots=True)
class ScheduleContext:
    """Defines the planning window and objectives for scheduling posts."""

    start: datetime | str
    end: datetime | str
    timezone: ZoneInfo | str = "UTC"
    objectives: Sequence[str] = field(default_factory=tuple)
    campaign_theme: str = ""
    max_posts_per_channel: Mapping[str, int] | None = None

    def __post_init__(self) -> None:
        tz = _coerce_timezone(self.timezone)
        self.timezone = tz
        self.start = _to_datetime(self.start, tz=tz)
        self.end = _to_datetime(self.end, tz=tz)
        if self.end <= self.start:
            raise ValueError("end must be later than start")
        self.objectives = tuple(
            _normalise_text(obj, field="objective").lower()
            for obj in self.objectives
            if obj.strip()
        )
        self.campaign_theme = self.campaign_theme.strip()
        if self.max_posts_per_channel is not None:
            self.max_posts_per_channel = {
                _normalise_text(channel, field="channel name").lower(): max(int(limit), 0)
                for channel, limit in self.max_posts_per_channel.items()
            }


@dataclass(slots=True)
class ScheduledPost:
    """Represents a scheduled placement for a social post."""

    post: SocialPost
    channel: str
    scheduled_for: datetime
    score: float
    reason: str

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "post": self.post.identifier,
            "channel": self.channel,
            "scheduled_for": self.scheduled_for.isoformat(),
            "score": self.score,
            "reason": self.reason,
        }


# ---------------------------------------------------------------------------
# engine


class DynamicSocialEngine:
    """Adaptive planner that balances cadence, performance, and objectives."""

    def __init__(
        self,
        *,
        history_window: int = 96,
        default_timezone: ZoneInfo | str = "UTC",
    ) -> None:
        if history_window <= 0:
            raise ValueError("history_window must be positive")
        self._history_window = int(history_window)
        self._default_timezone = _coerce_timezone(default_timezone)
        self._channels: dict[str, SocialChannel] = {}
        self._posts: dict[str, SocialPost] = {}
        self._engagement_history: dict[str, Deque[EngagementSnapshot]] = defaultdict(
            lambda: deque(maxlen=self._history_window)
        )
        self._hourly_scores: dict[str, MutableMapping[int, Deque[float]]] = defaultdict(
            lambda: defaultdict(lambda: deque(maxlen=self._history_window))
        )

    # -- channel management -------------------------------------------------

    def register_channel(self, channel: SocialChannel) -> None:
        """Register or replace a :class:`SocialChannel` configuration."""

        key = channel.name.lower()
        self._channels[key] = channel

    def get_channel(self, name: str) -> SocialChannel | None:
        """Return a previously registered channel if present."""

        return self._channels.get(name.lower())

    def iter_channels(self) -> Iterable[SocialChannel]:
        """Yield all registered channels."""

        return self._channels.values()

    # -- post management ----------------------------------------------------

    def register_post(self, post: SocialPost) -> None:
        """Register a post to be considered for scheduling."""

        self._posts[post.identifier.lower()] = post

    def remove_post(self, identifier: str) -> bool:
        """Remove a post by identifier, returning ``True`` when deleted."""

        key = identifier.strip().lower()
        return self._posts.pop(key, None) is not None

    def iter_posts(self) -> Iterable[SocialPost]:
        """Yield all registered posts."""

        return self._posts.values()

    # -- engagement tracking ------------------------------------------------

    def record_engagement(self, snapshot: EngagementSnapshot) -> None:
        """Persist engagement data and refresh hourly performance insights."""

        channel_key = snapshot.channel
        history = self._engagement_history[channel_key]
        history.append(snapshot)
        channel = self._channels.get(channel_key)
        tz = channel.timezone if channel else self._default_timezone
        local_timestamp = snapshot.timestamp.astimezone(tz)
        hour_bucket = local_timestamp.hour
        self._hourly_scores[channel_key][hour_bucket].append(snapshot.score)

    def iter_engagements(self, channel: str) -> Iterable[EngagementSnapshot]:
        """Yield engagement history for *channel* (if any)."""

        return tuple(self._engagement_history.get(channel.lower(), ()))

    # -- analytics ----------------------------------------------------------

    def summarise_channel(self, channel: str) -> ChannelPerformance | None:
        """Return :class:`ChannelPerformance` for ``channel`` when possible."""

        channel_key = channel.lower()
        snapshots = self._engagement_history.get(channel_key)
        if not snapshots:
            return None

        engagement_rates = [snapshot.engagement_rate for snapshot in snapshots]
        click_rates = [snapshot.click_through_rate for snapshot in snapshots]
        conversion_rates = [snapshot.conversion_rate for snapshot in snapshots]
        sentiments = [snapshot.sentiment for snapshot in snapshots]

        average_engagement = fmean(engagement_rates) if engagement_rates else 0.0
        average_click = fmean(click_rates) if click_rates else 0.0
        average_conversion = fmean(conversion_rates) if conversion_rates else 0.0
        average_sentiment = fmean(sentiments) if sentiments else 0.0

        engagement_index = _clamp(
            (average_engagement * 0.45)
            + (average_click * 0.35)
            + (average_conversion * 0.15)
            + (average_sentiment * 0.05),
        )

        hourly_scores = self._hourly_scores.get(channel_key, {})
        hour_averages: list[tuple[int, float]] = []
        for hour, values in hourly_scores.items():
            if values:
                hour_averages.append((hour, fmean(values)))
        hour_averages.sort(key=lambda item: item[1], reverse=True)
        best_hours = tuple(hour for hour, _ in islice(hour_averages, 6))

        return ChannelPerformance(
            channel=channel_key,
            average_engagement_rate=average_engagement,
            average_click_through_rate=average_click,
            average_conversion_rate=average_conversion,
            average_sentiment=average_sentiment,
            engagement_index=engagement_index,
            best_hours=best_hours,
        )

    # -- scheduling ---------------------------------------------------------

    def suggest_schedule(
        self,
        context: ScheduleContext,
        *,
        limit: int | None = None,
    ) -> list[ScheduledPost]:
        """Suggest placements for registered posts within *context*."""

        posts_by_channel: dict[str, list[SocialPost]] = defaultdict(list)
        for post in self._posts.values():
            for channel_name in post.channels:
                posts_by_channel[channel_name.lower()].append(post)

        if not posts_by_channel:
            return []

        timezone = context.timezone
        total_window = context.end - context.start
        window_hours = max(total_window.total_seconds() / 3600.0, 1.0)

        results: list[ScheduledPost] = []
        for channel_key, posts in posts_by_channel.items():
            channel = self._channels.get(channel_key)
            if channel is None:
                continue
            performance = self.summarise_channel(channel_key)
            if performance is None:
                # No historical data; fall back to baseline heuristics
                performance = ChannelPerformance(
                    channel=channel_key,
                    average_engagement_rate=0.0,
                    average_click_through_rate=0.0,
                    average_conversion_rate=0.0,
                    average_sentiment=0.0,
                    engagement_index=channel.baseline_engagement,
                    best_hours=tuple(),
                )

            max_posts = self._resolve_channel_limit(channel, context, window_hours)
            if max_posts == 0:
                continue

            ranked_posts = sorted(
                posts,
                key=lambda item: self._score_post(item, channel, performance, context),
                reverse=True,
            )

            scheduled = self._schedule_posts_for_channel(
                ranked_posts,
                channel,
                performance,
                context,
                max_posts,
            )
            results.extend(scheduled)

        results.sort(key=lambda item: item.scheduled_for)
        if limit is not None and limit > 0:
            results = results[:limit]
        return results

    # -- internals ----------------------------------------------------------

    def _resolve_channel_limit(
        self,
        channel: SocialChannel,
        context: ScheduleContext,
        window_hours: float,
    ) -> int:
        if context.max_posts_per_channel:
            override = context.max_posts_per_channel.get(channel.name.lower())
            if override is not None:
                return override
        cadence_limit = int(round(channel.cadence_per_day * (window_hours / 24.0)))
        return max(cadence_limit, 1) if channel.cadence_per_day > 0 else 0

    def _score_post(
        self,
        post: SocialPost,
        channel: SocialChannel,
        performance: ChannelPerformance,
        context: ScheduleContext,
    ) -> float:
        segment_match = _segment_overlap(channel.audience_segments, post.target_segments)
        objective_alignment = _segment_overlap(channel.objectives, context.objectives)
        engagement_bias = max(performance.engagement_index, channel.baseline_engagement)
        category_bonus = 0.05 if post.category and post.category in channel.objectives else 0.0
        score = engagement_bias * (0.6 + 0.3 * segment_match + 0.1 * objective_alignment)
        score += category_bonus
        if context.campaign_theme and context.campaign_theme.lower() in post.body.lower():
            score += 0.05
        return _clamp(score, lower=0.0, upper=1.5)

    def _schedule_posts_for_channel(
        self,
        posts: Sequence[SocialPost],
        channel: SocialChannel,
        performance: ChannelPerformance,
        context: ScheduleContext,
        max_posts: int,
    ) -> list[ScheduledPost]:
        tz = channel.timezone
        start = context.start.astimezone(tz)
        end = context.end.astimezone(tz)
        best_hours = performance.best_hours or tuple(range(0, 24, max(1, int(24 / max_posts))))
        best_hours = best_hours or (start.hour,)
        scheduled: list[ScheduledPost] = []
        current_day = start.replace(minute=0, second=0, microsecond=0)
        post_iter = iter(posts)
        while len(scheduled) < max_posts:
            try:
                post = next(post_iter)
            except StopIteration:
                break
            hour = best_hours[len(scheduled) % len(best_hours)]
            slot_time = self._next_occurrence(current_day, hour)
            if slot_time > end:
                break
            reason = self._build_reason(channel, performance, post, hour)
            scheduled.append(
                ScheduledPost(
                    post=post,
                    channel=channel.name,
                    scheduled_for=slot_time.astimezone(context.timezone),
                    score=self._score_post(post, channel, performance, context),
                    reason=reason,
                )
            )
            if (len(scheduled) % len(best_hours)) == 0:
                current_day += timedelta(days=1)
        return scheduled

    @staticmethod
    def _next_occurrence(reference: datetime, hour: int) -> datetime:
        candidate = reference.replace(hour=hour, minute=0, second=0, microsecond=0)
        if candidate < reference:
            candidate += timedelta(days=1)
        return candidate

    @staticmethod
    def _build_reason(
        channel: SocialChannel,
        performance: ChannelPerformance,
        post: SocialPost,
        hour: int,
    ) -> str:
        segments = []
        if performance.best_hours:
            segments.append(f"historical peak hour {hour:02d}:00")
        else:
            segments.append(f"maintaining {channel.cadence_per_day:.2f}/day cadence")
        if post.target_segments:
            segments.append(
                "segments: " + ", ".join(sorted(post.target_segments))
            )
        if post.category:
            segments.append(f"category: {post.category}")
        return " | ".join(segments)
