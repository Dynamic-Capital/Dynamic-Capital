"""Information respiration engine managing organisational inflow/outflow."""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field
from statistics import fmean
from typing import Deque, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "ChannelLoad",
    "DynamicRespirationEngine",
    "InformationPulse",
    "RespirationSnapshot",
]


def _normalise_text(value: str, *, field_name: str) -> str:
    if not isinstance(value, str):
        raise TypeError(f"{field_name} must be a string")
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _normalise_tags(tags: Iterable[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    cleaned: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        candidate = _normalise_text(str(tag), field_name="tag").lower()
        if candidate not in seen:
            seen.add(candidate)
            cleaned.append(candidate)
    return tuple(cleaned)


def _clamp_ratio(value: float) -> float:
    try:
        numeric = float(value)
    except (TypeError, ValueError) as exc:
        raise TypeError("ratio values must be real numbers") from exc

    if math.isnan(numeric) or math.isinf(numeric):
        raise ValueError("ratio values must be finite")
    if numeric < 0.0:
        raise ValueError("ratio values must be non-negative")
    return numeric


@dataclass(slots=True)
class ChannelLoad:
    """Aggregated respiration metrics for a single channel."""

    channel: str
    inflow: float
    outflow: float
    net: float
    share: float

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "channel": self.channel,
            "inflow": self.inflow,
            "outflow": self.outflow,
            "net": self.net,
            "share": self.share,
        }


@dataclass(slots=True)
class InformationPulse:
    """Representation of a single inflow or outflow information pulse."""

    channel: str
    direction: str
    magnitude: float
    tags: tuple[str, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.channel = _normalise_text(self.channel, field_name="channel").lower()
        direction = _normalise_text(self.direction, field_name="direction").lower()
        if direction not in {"inflow", "outflow"}:
            raise ValueError("direction must be either 'inflow' or 'outflow'")
        self.direction = direction
        self.magnitude = _clamp_ratio(self.magnitude)
        self.tags = _normalise_tags(self.tags)
        if self.metadata is not None:
            if not isinstance(self.metadata, Mapping):
                raise TypeError("metadata must be a mapping if provided")
            self.metadata = dict(self.metadata)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "channel": self.channel,
            "direction": self.direction,
            "magnitude": self.magnitude,
            "tags": list(self.tags),
            "metadata": dict(self.metadata or {}),
        }


@dataclass(slots=True)
class RespirationSnapshot:
    """Summary of respiration telemetry and balancing recommendations."""

    inflow_total: float
    outflow_total: float
    balance_ratio: float
    state: str
    recent_tags: tuple[str, ...]
    recommended_actions: tuple[str, ...]

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "inflow_total": self.inflow_total,
            "outflow_total": self.outflow_total,
            "balance_ratio": self.balance_ratio,
            "state": self.state,
            "recent_tags": list(self.recent_tags),
            "recommended_actions": list(self.recommended_actions),
        }


class DynamicRespirationEngine:
    """Track information intake/output and maintain breathable balance."""

    def __init__(
        self,
        *,
        history: int = 288,
        equilibrium_ratio: float = 1.0,
        overwhelmed_ratio: float = 1.4,
        depleted_ratio: float = 0.6,
    ) -> None:
        if history <= 0:
            raise ValueError("history must be positive")
        if equilibrium_ratio <= 0.0:
            raise ValueError("equilibrium_ratio must be positive")
        if overwhelmed_ratio <= equilibrium_ratio:
            raise ValueError("overwhelmed_ratio must exceed equilibrium_ratio")
        if depleted_ratio >= equilibrium_ratio:
            raise ValueError("depleted_ratio must be below equilibrium_ratio")

        self._history = int(history)
        self._pulses: Deque[InformationPulse] = deque(maxlen=self._history)
        self._equilibrium_ratio = float(equilibrium_ratio)
        self._overwhelmed_ratio = float(overwhelmed_ratio)
        self._depleted_ratio = float(depleted_ratio)

    def record(self, pulse: InformationPulse | Mapping[str, object]) -> InformationPulse:
        resolved = self._coerce_pulse(pulse)
        self._pulses.append(resolved)
        return resolved

    def extend(self, pulses: Iterable[InformationPulse | Mapping[str, object]]) -> None:
        for pulse in pulses:
            self.record(pulse)

    def reset(self) -> None:
        self._pulses.clear()

    def assess(self, *, window: int | None = None) -> RespirationSnapshot:
        candidates = self._select(window)
        if not candidates:
            return RespirationSnapshot(
                inflow_total=0.0,
                outflow_total=0.0,
                balance_ratio=1.0,
                state="stagnant",
                recent_tags=(),
                recommended_actions=("activate_external_listening",),
            )

        inflow_total = sum(pulse.magnitude for pulse in candidates if pulse.direction == "inflow")
        outflow_total = sum(pulse.magnitude for pulse in candidates if pulse.direction == "outflow")
        balance_ratio = self._compute_balance(inflow_total, outflow_total)
        state, actions = self._derive_actions(balance_ratio)
        tags = self._collect_recent_tags(candidates)

        return RespirationSnapshot(
            inflow_total=inflow_total,
            outflow_total=outflow_total,
            balance_ratio=balance_ratio,
            state=state,
            recent_tags=tags,
            recommended_actions=actions,
        )

    def rolling_balance(self, *, window: int = 12) -> float:
        candidates = self._select(window)
        if not candidates:
            return 1.0
        inflow_running = 0.0
        outflow_running = 0.0
        ratios: list[float] = []
        for pulse in candidates:
            if pulse.direction == "inflow":
                inflow_running += pulse.magnitude
            else:
                outflow_running += pulse.magnitude
            ratios.append(self._compute_balance(inflow_running, outflow_running))
        return fmean(ratios)

    def channel_load(self, *, window: int | None = None) -> tuple[ChannelLoad, ...]:
        candidates = self._select(window)
        if not candidates:
            return ()

        totals = {"inflow": 0.0, "outflow": 0.0}
        aggregated: dict[str, dict[str, float]] = {}
        for pulse in candidates:
            channel_bucket = aggregated.setdefault(pulse.channel, {"inflow": 0.0, "outflow": 0.0})
            channel_bucket[pulse.direction] += pulse.magnitude
            totals[pulse.direction] += pulse.magnitude

        grand_total = totals["inflow"] + totals["outflow"]
        loads: list[ChannelLoad] = []
        for channel, metrics in aggregated.items():
            inflow_total = metrics["inflow"]
            outflow_total = metrics["outflow"]
            channel_total = inflow_total + outflow_total
            share = channel_total / grand_total if grand_total else 0.0
            loads.append(
                ChannelLoad(
                    channel=channel,
                    inflow=inflow_total,
                    outflow=outflow_total,
                    net=inflow_total - outflow_total,
                    share=share,
                )
            )

        loads.sort(key=lambda load: load.share, reverse=True)
        return tuple(loads)

    def momentum(self, *, short_window: int = 24, long_window: int = 96) -> float:
        if short_window <= 0:
            raise ValueError("short_window must be positive")
        if long_window <= 0:
            raise ValueError("long_window must be positive")
        if short_window >= long_window:
            raise ValueError("short_window must be smaller than long_window")

        short_pulses = self._select(short_window)
        long_pulses = self._select(long_window)
        if not long_pulses:
            return 0.0

        def _totals(pulses: Sequence[InformationPulse]) -> tuple[float, float]:
            inflow_total = sum(pulse.magnitude for pulse in pulses if pulse.direction == "inflow")
            outflow_total = sum(pulse.magnitude for pulse in pulses if pulse.direction == "outflow")
            return inflow_total, outflow_total

        short_inflow, short_outflow = _totals(short_pulses)
        long_inflow, long_outflow = _totals(long_pulses)

        short_ratio = self._compute_balance(short_inflow, short_outflow) if short_pulses else 1.0
        long_ratio = self._compute_balance(long_inflow, long_outflow)
        return short_ratio - long_ratio

    def _coerce_pulse(self, pulse: InformationPulse | Mapping[str, object]) -> InformationPulse:
        if isinstance(pulse, InformationPulse):
            return pulse
        if not isinstance(pulse, Mapping):
            raise TypeError("pulse must be an InformationPulse or mapping")
        return InformationPulse(
            channel=pulse.get("channel", "unspecified"),
            direction=pulse.get("direction", "inflow"),
            magnitude=float(pulse.get("magnitude", 0.0)),
            tags=tuple(pulse.get("tags", ()) or ()),
            metadata=pulse.get("metadata"),
        )

    def _select(self, window: int | None) -> tuple[InformationPulse, ...]:
        if window is None:
            return tuple(self._pulses)
        if not isinstance(window, int):
            raise TypeError("window must be an integer or None")
        if window <= 0:
            raise ValueError("window must be a positive integer")
        if window >= len(self._pulses):
            return tuple(self._pulses)
        return tuple(list(self._pulses)[-window:])

    def _compute_balance(self, inflow_total: float, outflow_total: float) -> float:
        if outflow_total == 0:
            return inflow_total if inflow_total > 0 else 1.0
        return inflow_total / outflow_total

    def _derive_actions(self, balance_ratio: float) -> tuple[str, tuple[str, ...]]:
        if balance_ratio >= self._overwhelmed_ratio:
            actions = (
                "tighten_intake_filters",
                "increase_synthesis_capacity",
                "schedule_signal_detox",
            )
            return "overwhelmed", actions

        if balance_ratio <= self._depleted_ratio:
            actions = (
                "expand_market_listening",
                "refresh_external_briefs",
                "initiate_signal_import",
            )
            return "depleted", actions

        if abs(balance_ratio - self._equilibrium_ratio) <= 0.1:
            actions = (
                "sustain_current_feeds",
                "audit_signal_quality",
            )
            return "balanced", actions

        if balance_ratio > self._equilibrium_ratio:
            actions = (
                "prioritise_summary_publications",
                "route_surplus_to_analysis",
            )
            return "intake_bias", actions

        actions = (
            "publish_internal_briefs",
            "activate_storytelling_channels",
        )
        return "output_bias", actions

    def _collect_recent_tags(self, pulses: Sequence[InformationPulse]) -> tuple[str, ...]:
        seen: set[str] = set()
        ordered: list[str] = []
        for pulse in reversed(pulses):
            for tag in pulse.tags:
                if tag not in seen:
                    seen.add(tag)
                    ordered.append(tag)
            if len(ordered) >= 12:
                break
        return tuple(reversed(ordered))
