"""Marketing performance aggregation utilities for Dynamic Capital."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Deque, Dict, Iterable, Mapping, MutableMapping, Optional, Tuple

__all__ = [
    "MarketingTouchpoint",
    "ChannelPerformance",
    "CampaignSnapshot",
    "DynamicMarketingAlgo",
]


def _coerce_timestamp(value: datetime | str | None) -> datetime:
    """Return a timezone-aware :class:`datetime` for *value*."""

    if value is None:
        return datetime.now(timezone.utc)

    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    if isinstance(value, str):
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    raise TypeError("timestamp must be datetime, ISO string, or None")


def _coerce_int(value: object, *, default: int = 0) -> int:
    try:
        coerced = int(float(value))
    except (TypeError, ValueError):
        return default
    return max(coerced, default)


def _coerce_float(value: object, *, default: float = 0.0) -> float:
    try:
        coerced = float(value)
    except (TypeError, ValueError):
        return default
    return coerced


def _clamp(value: float, *, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


@dataclass(slots=True)
class MarketingTouchpoint:
    """Normalised representation of a marketing activity measurement."""

    campaign_id: str
    channel: str
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    spend: float = 0.0
    revenue: float = 0.0
    sentiment: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.campaign_id:
            raise ValueError("campaign_id is required")
        if not self.channel:
            raise ValueError("channel is required")

        self.campaign_id = str(self.campaign_id).upper()
        self.channel = str(self.channel).lower()

        self.impressions = _coerce_int(self.impressions)
        self.clicks = _coerce_int(self.clicks)
        self.conversions = _coerce_int(self.conversions)

        if self.impressions < 0 or self.clicks < 0 or self.conversions < 0:
            raise ValueError("engagement metrics must be non-negative")

        self.spend = max(0.0, _coerce_float(self.spend))
        self.revenue = max(0.0, _coerce_float(self.revenue))
        self.sentiment = _clamp(_coerce_float(self.sentiment), lower=-1.0, upper=1.0)
        self.timestamp = _coerce_timestamp(self.timestamp)


@dataclass(slots=True)
class ChannelPerformance:
    """Aggregated metrics for an individual marketing channel."""

    channel: str
    impressions: int
    clicks: int
    conversions: int
    spend: float
    revenue: float
    sentiment: float

    @property
    def ctr(self) -> float:
        if self.impressions <= 0:
            return 0.0
        return round(self.clicks / self.impressions, 4)

    @property
    def conversion_rate(self) -> float:
        denominator = self.clicks if self.clicks > 0 else self.impressions
        if denominator <= 0:
            return 0.0
        return round(self.conversions / denominator, 4)

    @property
    def roas(self) -> float | None:
        if self.spend <= 0:
            return None
        return round(self.revenue / self.spend, 4)


@dataclass(slots=True)
class CampaignSnapshot:
    """Aggregated marketing state for a specific campaign."""

    campaign_id: str
    touchpoint_count: int
    total_impressions: int
    total_clicks: int
    total_conversions: int
    total_spend: float
    total_revenue: float
    net_revenue: float
    average_sentiment: float
    ctr: float
    conversion_rate: float
    cost_per_acquisition: float | None
    roas: float | None
    momentum: float
    status: str
    last_touch_at: datetime | None
    channels: Tuple[ChannelPerformance, ...]

    @property
    def top_channel(self) -> str | None:
        return self.channels[0].channel if self.channels else None

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "campaign_id": self.campaign_id,
            "touchpoint_count": self.touchpoint_count,
            "total_impressions": self.total_impressions,
            "total_clicks": self.total_clicks,
            "total_conversions": self.total_conversions,
            "total_spend": self.total_spend,
            "total_revenue": self.total_revenue,
            "net_revenue": self.net_revenue,
            "average_sentiment": self.average_sentiment,
            "ctr": self.ctr,
            "conversion_rate": self.conversion_rate,
            "cost_per_acquisition": self.cost_per_acquisition,
            "roas": self.roas,
            "momentum": self.momentum,
            "status": self.status,
            "last_touch_at": self.last_touch_at.isoformat() if self.last_touch_at else None,
            "channels": [
                {
                    "channel": channel.channel,
                    "impressions": channel.impressions,
                    "clicks": channel.clicks,
                    "conversions": channel.conversions,
                    "spend": channel.spend,
                    "revenue": channel.revenue,
                    "sentiment": channel.sentiment,
                    "ctr": channel.ctr,
                    "conversion_rate": channel.conversion_rate,
                    "roas": channel.roas,
                }
                for channel in self.channels
            ],
        }


class DynamicMarketingAlgo:
    """Maintain rolling marketing telemetry and compute actionable insights."""

    def __init__(
        self,
        *,
        window_size: int | None = 240,
        window_duration: timedelta | None = timedelta(days=45),
    ) -> None:
        self.window_size = window_size
        self.window_duration = window_duration
        self._touchpoints: Dict[str, Deque[MarketingTouchpoint]] = {}

    # ---------------------------------------------------------------- utilities
    def _history_for(self, campaign_id: str) -> Deque[MarketingTouchpoint]:
        key = campaign_id.upper()
        if key not in self._touchpoints:
            self._touchpoints[key] = deque()
        return self._touchpoints[key]

    def _prune(
        self,
        history: Deque[MarketingTouchpoint],
        *,
        reference: datetime | None = None,
    ) -> None:
        if self.window_size is not None:
            while len(history) > self.window_size:
                history.popleft()

        if self.window_duration is not None and history:
            baseline = reference or history[-1].timestamp
            cutoff = baseline - self.window_duration
            while history and history[0].timestamp < cutoff:
                history.popleft()

    # ----------------------------------------------------------------- recording
    def record(
        self,
        campaign_id: str,
        *,
        channel: str,
        impressions: int | float = 0,
        clicks: int | float = 0,
        conversions: int | float = 0,
        spend: float = 0.0,
        revenue: float = 0.0,
        sentiment: float = 0.0,
        timestamp: datetime | str | None = None,
        metadata: Mapping[str, object] | None = None,
    ) -> MarketingTouchpoint:
        """Record a marketing touchpoint for *campaign_id*."""

        touch = MarketingTouchpoint(
            campaign_id=campaign_id,
            channel=channel,
            impressions=impressions,
            clicks=clicks,
            conversions=conversions,
            spend=spend,
            revenue=revenue,
            sentiment=sentiment,
            timestamp=timestamp,
            metadata=metadata,
        )

        history = self._history_for(campaign_id)
        history.append(touch)
        self._prune(history, reference=touch.timestamp)
        return touch

    def ingest(self, payload: Mapping[str, object], *, defaults: Mapping[str, object] | None = None) -> bool:
        """Best-effort ingestion for heterogeneous marketing payloads."""

        context: MutableMapping[str, object] = {}
        if defaults:
            context.update(defaults)
        context.update(payload)

        campaign_id = context.get("campaign_id") or context.get("campaign")
        channel = context.get("channel") or context.get("medium")

        if not campaign_id or not channel:
            return False

        try:
            self.record(
                campaign_id=str(campaign_id),
                channel=str(channel),
                impressions=context.get("impressions", 0),
                clicks=context.get("clicks", 0),
                conversions=context.get("conversions", context.get("signups", 0)),
                spend=context.get("spend", context.get("cost", 0.0)),
                revenue=context.get("revenue", context.get("attributed_revenue", 0.0)),
                sentiment=context.get("sentiment", context.get("score", 0.0)),
                timestamp=context.get("timestamp"),
                metadata=context.get("metadata"),
            )
        except (TypeError, ValueError):
            return False

        return True

    # ----------------------------------------------------------------- snapshots
    def snapshot(self, campaign_id: str) -> CampaignSnapshot:
        """Return the aggregated snapshot for *campaign_id*."""

        history = self._history_for(campaign_id)
        self._prune(history)
        if not history:
            return CampaignSnapshot(
                campaign_id=campaign_id.upper(),
                touchpoint_count=0,
                total_impressions=0,
                total_clicks=0,
                total_conversions=0,
                total_spend=0.0,
                total_revenue=0.0,
                net_revenue=0.0,
                average_sentiment=0.0,
                ctr=0.0,
                conversion_rate=0.0,
                cost_per_acquisition=None,
                roas=None,
                momentum=0.0,
                status="monitor",
                last_touch_at=None,
                channels=(),
            )

        total_impressions = 0
        total_clicks = 0
        total_conversions = 0
        total_spend = 0.0
        total_revenue = 0.0
        sentiment_total = 0.0
        sentiment_weight = 0.0
        channel_totals: Dict[str, Dict[str, float]] = {}

        for touch in history:
            total_impressions += touch.impressions
            total_clicks += touch.clicks
            total_conversions += touch.conversions
            total_spend += touch.spend
            total_revenue += touch.revenue

            weight = max(float(touch.conversions), float(touch.clicks) * 0.25, 1.0)
            sentiment_total += touch.sentiment * weight
            sentiment_weight += weight

            channel = channel_totals.setdefault(
                touch.channel,
                {
                    "impressions": 0.0,
                    "clicks": 0.0,
                    "conversions": 0.0,
                    "spend": 0.0,
                    "revenue": 0.0,
                    "sentiment": 0.0,
                    "weight": 0.0,
                },
            )
            channel["impressions"] += touch.impressions
            channel["clicks"] += touch.clicks
            channel["conversions"] += touch.conversions
            channel["spend"] += touch.spend
            channel["revenue"] += touch.revenue
            channel["sentiment"] += touch.sentiment * weight
            channel["weight"] += weight

        average_sentiment = round(
            sentiment_total / sentiment_weight if sentiment_weight else 0.0, 4
        )

        ctr = round(total_clicks / total_impressions, 4) if total_impressions else 0.0
        denominator = total_clicks if total_clicks else total_impressions
        conversion_rate = (
            round(total_conversions / denominator, 4) if denominator else 0.0
        )
        cpa = round(total_spend / total_conversions, 4) if total_conversions else None
        roas = round(total_revenue / total_spend, 4) if total_spend else None
        net_revenue = round(total_revenue - total_spend, 4)

        channels: Tuple[ChannelPerformance, ...] = tuple(
            ChannelPerformance(
                channel=name,
                impressions=int(metrics["impressions"]),
                clicks=int(metrics["clicks"]),
                conversions=int(metrics["conversions"]),
                spend=round(metrics["spend"], 4),
                revenue=round(metrics["revenue"], 4),
                sentiment=round(
                    metrics["sentiment"] / metrics["weight"] if metrics["weight"] else 0.0,
                    4,
                ),
            )
            for name, metrics in sorted(
                channel_totals.items(),
                key=lambda item: (
                    item[1]["conversions"],
                    item[1]["revenue"],
                    item[1]["clicks"],
                ),
                reverse=True,
            )
        )

        momentum = self._compute_momentum(history)
        status = self._classify_status(momentum, roas, net_revenue, average_sentiment)

        return CampaignSnapshot(
            campaign_id=history[-1].campaign_id,
            touchpoint_count=len(history),
            total_impressions=total_impressions,
            total_clicks=total_clicks,
            total_conversions=total_conversions,
            total_spend=round(total_spend, 4),
            total_revenue=round(total_revenue, 4),
            net_revenue=net_revenue,
            average_sentiment=average_sentiment,
            ctr=ctr,
            conversion_rate=conversion_rate,
            cost_per_acquisition=cpa,
            roas=roas,
            momentum=momentum,
            status=status,
            last_touch_at=history[-1].timestamp,
            channels=channels,
        )

    def snapshot_all(self) -> Dict[str, CampaignSnapshot]:
        """Return snapshots for every tracked campaign."""

        return {campaign: self.snapshot(campaign) for campaign in self._touchpoints}

    def campaign_state(self, campaign_id: str) -> Mapping[str, object]:
        """Return a serialisable mapping for the campaign state."""

        snapshot = self.snapshot(campaign_id)
        payload = snapshot.as_dict()
        payload["top_channel"] = snapshot.top_channel
        return payload

    def portfolio_summary(self) -> Mapping[str, object]:
        """Return aggregated metrics across all campaigns."""

        snapshots = [self.snapshot(name) for name in self._touchpoints]
        if not snapshots:
            return {
                "campaigns": 0,
                "active_campaigns": 0,
                "total_spend": 0.0,
                "total_revenue": 0.0,
                "net_revenue": 0.0,
                "average_momentum": 0.0,
            }

        total_spend = sum(s.total_spend for s in snapshots)
        total_revenue = sum(s.total_revenue for s in snapshots)
        net_revenue = round(total_revenue - total_spend, 4)
        active = sum(1 for s in snapshots if s.touchpoint_count > 0)
        average_momentum = round(
            sum(s.momentum for s in snapshots) / len(snapshots), 4
        )

        return {
            "campaigns": len(snapshots),
            "active_campaigns": active,
            "total_spend": round(total_spend, 4),
            "total_revenue": round(total_revenue, 4),
            "net_revenue": net_revenue,
            "average_momentum": average_momentum,
        }

    # ---------------------------------------------------------------- maintenance
    def clear(self, campaign_id: str | None = None) -> None:
        """Clear data for *campaign_id* or all campaigns when omitted."""

        if campaign_id is None:
            self._touchpoints.clear()
            return
        self._touchpoints.pop(campaign_id.upper(), None)

    def campaigns(self) -> Iterable[str]:
        """Return campaign identifiers currently tracked."""

        return tuple(self._touchpoints.keys())

    def history(self, campaign_id: str) -> Tuple[MarketingTouchpoint, ...]:
        """Return the touchpoints stored for *campaign_id*."""

        history = self._history_for(campaign_id)
        self._prune(history)
        return tuple(history)

    # ----------------------------------------------------------------- internals
    def _compute_momentum(self, history: Deque[MarketingTouchpoint]) -> float:
        if not history:
            return 0.0

        reference = history[-1].timestamp
        recent_cutoff = reference - timedelta(hours=48)
        trailing_cutoff = reference - timedelta(hours=96)

        recent_score = 0.0
        trailing_score = 0.0

        for touch in history:
            engagement = (touch.conversions * 3) + (touch.clicks * 0.5)
            engagement += max(touch.sentiment, 0.0) * 2
            engagement += max(touch.revenue - touch.spend, 0.0) / 100.0

            if touch.timestamp >= recent_cutoff:
                recent_score += engagement
            elif touch.timestamp >= trailing_cutoff:
                trailing_score += engagement

        if recent_score == 0 and trailing_score == 0:
            last_sentiment = history[-1].sentiment
            return round(_clamp((last_sentiment + 1.0) / 2.0, lower=0.0, upper=1.0), 4)

        total = recent_score + trailing_score
        momentum = (recent_score - trailing_score) / total if total else 0.0
        scaled = (momentum + 1.0) / 2.0
        return round(_clamp(scaled, lower=0.0, upper=1.0), 4)

    def _classify_status(
        self,
        momentum: float,
        roas: float | None,
        net_revenue: float,
        sentiment: float,
    ) -> str:
        if sentiment <= -0.4 and (roas is None or roas < 1.0):
            return "reset"

        if roas is not None and roas < 0.6:
            return "pause"

        if net_revenue < 0 and momentum < 0.45:
            return "pause"

        if momentum >= 0.75 and (roas is None or roas >= 1.15):
            return "scale"

        if momentum >= 0.55:
            return "optimize"

        if roas is not None and roas >= 1.0:
            return "monitor"

        return "stabilize"
