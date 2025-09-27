"""Time keeper orchestration aligned with the multi-LLM desk stack."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time, timedelta, timezone, tzinfo
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence, Tuple

from .multi_llm import LLMConfig, LLMRun

MVT_TIMEZONE = timezone(timedelta(hours=5), name="MVT")


@dataclass(slots=True, frozen=True)
class TradingSession:
    """Represents a market trading window that needs tracking."""

    market: str
    open_time: time
    close_time: time
    timezone: tzinfo
    tags: Tuple[str, ...] = ()
    description: str = ""


@dataclass(slots=True, frozen=True)
class KillZone:
    """Represents a focused volatility window ("kill zone")."""

    name: str
    start: time
    end: time
    timezone: Optional[tzinfo] = None
    description: str = ""
    tags: Tuple[str, ...] = ()


@dataclass(slots=True)
class TimeKeeperSyncResult:
    """Structured output of the :class:`DynamicTimeKeeperAlgorithm`."""

    desk_time: datetime
    desk_timezone: tzinfo
    theme: Optional[str]
    algorithms: Tuple[str, ...]
    trading_windows: Sequence[MutableMapping[str, Any]]
    kill_zones: Sequence[MutableMapping[str, Any]]
    overlaps: Sequence[MutableMapping[str, Any]]
    llm_runs: Tuple[LLMRun, ...] = ()
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def summary(self) -> str:
        """Return a concise, human readable description of the sync."""

        parts: list[str] = [
            f"desk {self.desk_time:%Y-%m-%d %H:%M %Z}",
            f"{len(self.trading_windows)} sessions",
            f"{len(self.kill_zones)} kill zones",
        ]
        if self.algorithms:
            parts.append(f"{len(self.algorithms)} algorithms")
        if self.theme:
            parts.append(f"theme '{self.theme}'")
        active = [window for window in self.trading_windows if window.get("status") == "active"]
        if active:
            parts.append(f"{len(active)} active")
        return ", ".join(parts)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the synchronisation payload."""

        def serialise_window(window: Mapping[str, Any]) -> Dict[str, Any]:
            payload: Dict[str, Any] = dict(window)
            for key in ("start", "end"):
                value = payload.get(key)
                if isinstance(value, datetime):
                    payload[key] = value.isoformat()
            return payload

        payload: Dict[str, Any] = {
            "desk_time": self.desk_time.isoformat(),
            "desk_timezone": self.desk_timezone.tzname(None),
            "theme": self.theme,
            "algorithms": list(self.algorithms),
            "trading_windows": [serialise_window(window) for window in self.trading_windows],
            "kill_zones": [serialise_window(zone) for zone in self.kill_zones],
            "overlaps": [serialise_window(overlap) for overlap in self.overlaps],
            "summary": self.summary(),
        }
        if self.llm_runs:
            payload["llm_runs"] = [run.to_dict() for run in self.llm_runs]
        if self.metadata:
            payload["metadata"] = dict(self.metadata)
        return payload


class DynamicTimeKeeperAlgorithm:
    """Coordinates trading time windows and multi-LLM narratives."""

    def __init__(self, *, desk_timezone: tzinfo = MVT_TIMEZONE) -> None:
        self.desk_timezone = desk_timezone
        self._sessions: list[TradingSession] = []
        self._kill_zones: list[KillZone] = []

    def register_session(self, session: TradingSession) -> None:
        """Register a persistent trading session."""

        self._sessions.append(session)

    def register_kill_zone(self, zone: KillZone) -> None:
        """Register a persistent kill zone."""

        self._kill_zones.append(zone)

    def sync(
        self,
        *,
        as_of: Optional[datetime] = None,
        theme: Optional[str] = None,
        algorithms: Optional[Iterable[str]] = None,
        sessions: Optional[Iterable[TradingSession]] = None,
        kill_zones: Optional[Iterable[KillZone]] = None,
        llm_configs: Optional[Sequence[LLMConfig]] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> TimeKeeperSyncResult:
        """Synchronise trading windows, kill zones and optional LLM guidance."""

        desk_time = (as_of or datetime.now(tz=self.desk_timezone)).astimezone(self.desk_timezone)
        all_sessions = [*self._sessions, *(sessions or [])]
        if not all_sessions:
            raise ValueError("At least one trading session must be provided")

        all_kill_zones = [*self._kill_zones, *(kill_zones or [])]
        algorithm_tuple: Tuple[str, ...] = tuple(sorted({*(algorithms or [])}))

        trading_windows = [
            self._build_window(session=session, reference=desk_time) for session in all_sessions
        ]
        kill_zone_windows = [
            self._build_kill_zone(zone=zone, reference=desk_time) for zone in all_kill_zones
        ]
        overlaps = self._calculate_overlaps(trading_windows)

        metadata: Dict[str, Any] = dict(context or {})
        metadata["prompt"] = self._build_prompt(
            desk_time=desk_time,
            theme=theme,
            algorithms=algorithm_tuple,
            trading_windows=trading_windows,
            kill_zones=kill_zone_windows,
            overlaps=overlaps,
        )

        llm_runs: list[LLMRun] = []
        if llm_configs:
            for config in llm_configs:
                llm_runs.append(config.run(metadata["prompt"]))

        result = TimeKeeperSyncResult(
            desk_time=desk_time,
            desk_timezone=self.desk_timezone,
            theme=theme,
            algorithms=algorithm_tuple,
            trading_windows=trading_windows,
            kill_zones=kill_zone_windows,
            overlaps=overlaps,
            llm_runs=tuple(llm_runs),
            metadata=metadata,
        )
        return result

    def _build_window(self, *, session: TradingSession, reference: datetime) -> MutableMapping[str, Any]:
        start, end = self._normalise_bounds(
            start=session.open_time,
            end=session.close_time,
            source_tz=session.timezone,
            reference=reference,
        )
        status = "active" if start <= reference < end else "upcoming" if reference < start else "closed"
        return {
            "market": session.market,
            "start": start,
            "end": end,
            "status": status,
            "tags": list(session.tags),
            "description": session.description,
            "duration_minutes": int((end - start).total_seconds() // 60),
            "time_to_open_minutes": None
            if reference >= start
            else int((start - reference).total_seconds() // 60),
        }

    def _build_kill_zone(self, *, zone: KillZone, reference: datetime) -> MutableMapping[str, Any]:
        zone_tz = zone.timezone or self.desk_timezone
        start, end = self._normalise_bounds(
            start=zone.start,
            end=zone.end,
            source_tz=zone_tz,
            reference=reference,
        )
        status = "active" if start <= reference < end else "upcoming" if reference < start else "closed"
        return {
            "name": zone.name,
            "start": start,
            "end": end,
            "status": status,
            "tags": list(zone.tags),
            "description": zone.description,
            "duration_minutes": int((end - start).total_seconds() // 60),
        }

    def _normalise_bounds(
        self,
        *,
        start: time,
        end: time,
        source_tz: tzinfo,
        reference: datetime,
    ) -> Tuple[datetime, datetime]:
        reference_date = reference.astimezone(self.desk_timezone).date()
        start_dt = datetime.combine(reference_date, start, tzinfo=source_tz).astimezone(self.desk_timezone)
        end_dt = datetime.combine(reference_date, end, tzinfo=source_tz).astimezone(self.desk_timezone)
        if end_dt <= start_dt:
            end_dt += timedelta(days=1)
        if reference < start_dt and (start_dt - reference) > timedelta(hours=12):
            start_dt -= timedelta(days=1)
            end_dt -= timedelta(days=1)
        return start_dt, end_dt

    def _calculate_overlaps(
        self, trading_windows: Sequence[Mapping[str, Any]]
    ) -> list[MutableMapping[str, Any]]:
        overlaps: list[MutableMapping[str, Any]] = []
        for idx, first in enumerate(trading_windows):
            for other in trading_windows[idx + 1 :]:
                start_a = first["start"]
                end_a = first["end"]
                start_b = other["start"]
                end_b = other["end"]
                overlap_start = max(start_a, start_b)
                overlap_end = min(end_a, end_b)
                if overlap_start < overlap_end:
                    overlaps.append(
                        {
                            "markets": sorted([first["market"], other["market"]]),
                            "start": overlap_start,
                            "end": overlap_end,
                            "duration_minutes": int((overlap_end - overlap_start).total_seconds() // 60),
                        }
                    )
        return overlaps

    def _build_prompt(
        self,
        *,
        desk_time: datetime,
        theme: Optional[str],
        algorithms: Sequence[str],
        trading_windows: Sequence[Mapping[str, Any]],
        kill_zones: Sequence[Mapping[str, Any]],
        overlaps: Sequence[Mapping[str, Any]],
    ) -> str:
        lines = [
            "You are the Dynamic Capital time keeper orchestrating multi-LLM guidance.",
            f"Desk timezone: {self.desk_timezone.tzname(None)} (UTC+05:00).",
            f"Desk time: {desk_time.isoformat()}.",
        ]
        if theme:
            lines.append(f"Dynamic theme: {theme}.")
        if algorithms:
            lines.append("Algorithms in scope: " + ", ".join(algorithms) + ".")

        lines.append("Trading windows:")
        for window in trading_windows:
            lines.append(
                "- {market}: {start} to {end} ({status})".format(
                    market=window["market"],
                    start=window["start"].strftime("%H:%M"),
                    end=window["end"].strftime("%H:%M"),
                    status=window["status"],
                )
            )

        if kill_zones:
            lines.append("Kill zones:")
            for zone in kill_zones:
                lines.append(
                    "- {name}: {start} to {end} ({status})".format(
                        name=zone["name"],
                        start=zone["start"].strftime("%H:%M"),
                        end=zone["end"].strftime("%H:%M"),
                        status=zone["status"],
                    )
                )

        if overlaps:
            lines.append("Session overlaps:")
            for overlap in overlaps:
                lines.append(
                    "- {markets}: {start}-{end}".format(
                        markets=", ".join(overlap["markets"]),
                        start=overlap["start"].strftime("%H:%M"),
                        end=overlap["end"].strftime("%H:%M"),
                    )
                )

        lines.append(
            "Respond with JSON containing keys guidance, coordination_focus, and highlights summarising next actions."
        )
        return "\n".join(lines)


__all__ = [
    "MVT_TIMEZONE",
    "TradingSession",
    "KillZone",
    "TimeKeeperSyncResult",
    "DynamicTimeKeeperAlgorithm",
]
