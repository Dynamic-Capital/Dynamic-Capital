"""Automated economic catalyst generation from AwesomeAPI price history."""

from __future__ import annotations

import logging
import re

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Iterable, Mapping, MutableMapping, Sequence

from .awesome_api import (
    AwesomeAPIAutoCalculator,
    AwesomeAPIAutoMetrics,
    AwesomeAPIError,
)
from .supabase_sync import SupabaseTableWriter

LOGGER = logging.getLogger(__name__)

ImpactLevel = str  # Aliased for clarity when constructing catalyst payloads


@dataclass(frozen=True, slots=True)
class EconomicCatalyst:
    """Represents an automatically generated market catalyst."""

    pair: str
    observed_at: datetime
    headline: str
    impact: ImpactLevel
    market_focus: tuple[str, ...]
    commentary: str
    metrics: Mapping[str, float]
    source: str = "awesomeapi"

    @classmethod
    def from_mapping(cls, payload: Mapping[str, Any]) -> "EconomicCatalyst":
        """Normalise a mapping into an :class:`EconomicCatalyst` instance.

        The Supabase REST API and cached JSON artifacts return dictionaries
        that mirror the catalyst schema.  Trading workflows often ingest those
        payloads directly, so this helper converts them into the strongly typed
        dataclass used throughout the algorithms package.
        """

        def _coerce_datetime(value: Any) -> datetime:
            if isinstance(value, datetime):
                return value if value.tzinfo else value.replace(tzinfo=UTC)
            if not isinstance(value, str):
                raise ValueError("observed_at must be a datetime or ISO string")
            try:
                parsed = datetime.fromisoformat(value)
            except ValueError as exc:  # pragma: no cover - malformed input guard
                raise ValueError(f"Invalid observed_at timestamp: {value!r}") from exc
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=UTC)
            return parsed

        def _ensure_strings(value: Any) -> tuple[str, ...]:
            if value is None:
                return tuple()
            if isinstance(value, str):
                tokens = [token.strip() for token in re.split(r"[\n,|;]", value)]
            elif isinstance(value, Iterable):
                tokens = []
                for token in value:
                    if isinstance(token, str):
                        tokens.append(token.strip())
            else:
                return tuple()
            return tuple(token for token in tokens if token)

        def _coerce_metrics(value: Any) -> Mapping[str, float]:
            if not isinstance(value, Mapping):
                return {}
            metrics: dict[str, float] = {}
            for key, metric in value.items():
                label = str(key)
                try:
                    metrics[label] = float(metric)
                except (TypeError, ValueError):
                    continue
            return metrics

        pair = str(payload.get("pair") or payload.get("symbol") or "").strip()
        if not pair:
            raise ValueError("pair is required to build an EconomicCatalyst")

        headline = str(payload.get("headline") or payload.get("title") or "").strip()
        if not headline:
            raise ValueError("headline is required to build an EconomicCatalyst")

        impact = str(payload.get("impact") or payload.get("impact_level") or "Medium").strip()
        if not impact:
            impact = "Medium"
        impact = impact[0].upper() + impact[1:].lower() if impact else "Medium"

        commentary_raw = payload.get("commentary") or payload.get("summary") or ""
        commentary = str(commentary_raw).strip()

        observed_at_value = payload.get("observed_at") or payload.get("observedAt")
        if observed_at_value is None:
            raise ValueError("observed_at is required to build an EconomicCatalyst")
        observed_at = _coerce_datetime(observed_at_value)

        focus_raw = (
            payload.get("market_focus")
            or payload.get("marketFocus")
            or payload.get("focus")
            or ()
        )
        market_focus = _ensure_strings(focus_raw)
        if not market_focus:
            market_focus = _ensure_strings(payload.get("market_focus"))
        focus = tuple(EconomicCatalystGenerator._normalise_focus(market_focus, pair))

        metrics = _coerce_metrics(payload.get("metrics"))

        source = str(payload.get("source") or payload.get("provider") or "awesomeapi").strip()
        if not source:
            source = "awesomeapi"

        return cls(
            pair=pair,
            observed_at=observed_at,
            headline=headline,
            impact=impact,
            market_focus=focus,
            commentary=commentary,
            metrics=metrics,
            source=source,
        )

    def to_macro_event(self) -> str:
        """Summarise the catalyst into a compact macro event headline."""

        timestamp = self.observed_at.astimezone(UTC).strftime("%d %b %H:%M UTC")
        focus = ", ".join(self.market_focus) if self.market_focus else self.pair
        change = self.metrics.get("percentage_change") if self.metrics else None
        change_text = f" Δ{change:+.2f}%" if isinstance(change, (int, float)) else ""
        commentary = f" – {self.commentary}" if self.commentary else ""
        return f"[{self.impact}] {focus}: {self.headline}{change_text} ({timestamp}){commentary}"


@dataclass(slots=True)
class EconomicCatalystGenerator:
    """Translate AwesomeAPI analytics into catalyst payloads."""

    source: str = "awesomeapi"

    def build(
        self,
        pair: str,
        metrics: AwesomeAPIAutoMetrics,
        observed_at: datetime,
        *,
        market_focus: Sequence[str] | None = None,
    ) -> EconomicCatalyst:
        impact = self._classify_impact(metrics)
        headline = self._build_headline(metrics, impact)
        commentary = self._build_commentary(metrics)
        focus = tuple(self._normalise_focus(market_focus or (), pair))
        payload_metrics = self._select_metrics(metrics)
        return EconomicCatalyst(
            pair=pair,
            observed_at=observed_at,
            headline=headline,
            impact=impact,
            market_focus=focus,
            commentary=commentary,
            metrics=payload_metrics,
            source=self.source,
        )

    @staticmethod
    def _classify_impact(metrics: AwesomeAPIAutoMetrics) -> ImpactLevel:
        move = abs(metrics.percentage_change)
        trend = abs(metrics.trend_strength) * 100.0
        range_ratio = (
            (metrics.price_range / metrics.average_close * 100.0)
            if metrics.average_close
            else 0.0
        )
        if move >= 1.75 or trend >= 5.0 or (range_ratio >= 3.0 and move >= 0.5):
            return "High"
        if move >= 0.75 or trend >= 2.5 or (range_ratio >= 1.5 and move >= 0.25):
            return "Medium"
        return "Low"

    @staticmethod
    def _build_headline(metrics: AwesomeAPIAutoMetrics, impact: ImpactLevel) -> str:
        magnitude = abs(metrics.percentage_change)
        if magnitude < 0.05:
            direction = "flat"
        elif metrics.absolute_change > 0:
            direction = "higher"
        elif metrics.absolute_change < 0:
            direction = "lower"
        else:
            direction = "flat"
        return (
            f"{metrics.pair} closes {direction} {magnitude:.2f}% – {impact} impact risk signal"
        )

    @staticmethod
    def _build_commentary(metrics: AwesomeAPIAutoMetrics) -> str:
        direction = "gain" if metrics.absolute_change > 0 else "pullback" if metrics.absolute_change < 0 else "unchanged"
        change = abs(metrics.absolute_change)
        change_pct = abs(metrics.percentage_change)
        range_pct = (
            metrics.price_range / metrics.average_close * 100.0
            if metrics.average_close
            else 0.0
        )
        trend_pct = metrics.trend_strength * 100.0
        volatility_pct = (
            metrics.volatility / metrics.average_close * 100.0
            if metrics.average_close
            else 0.0
        )
        return (
            f"Latest close at {metrics.latest_close:.4f} marks a {direction} of "
            f"{change:.4f} ({change_pct:.2f}%). Two-sided range spans {range_pct:.2f}% "
            f"with average close {metrics.average_close:.4f}. Trend strength prints "
            f"{trend_pct:+.2f}% and realised volatility sits near {volatility_pct:.2f}% of price."
        )

    @staticmethod
    def _normalise_focus(market_focus: Sequence[str], pair: str) -> Iterable[str]:
        if market_focus:
            for token in market_focus:
                token_clean = token.strip()
                if token_clean:
                    yield token_clean
        if pair:
            components = [component.strip() for component in pair.split("-") if component.strip()]
            for component in components:
                if component not in market_focus:
                    yield component
            yield pair

    @staticmethod
    def _select_metrics(metrics: AwesomeAPIAutoMetrics) -> Mapping[str, float]:
        return {
            "latest_close": round(float(metrics.latest_close), 6),
            "percentage_change": round(float(metrics.percentage_change), 6),
            "absolute_change": round(float(metrics.absolute_change), 6),
            "cumulative_return": round(float(metrics.cumulative_return), 6),
            "trend_strength": round(float(metrics.trend_strength), 6),
            "volatility": round(float(metrics.volatility), 6),
            "average_daily_change": round(float(metrics.average_daily_change), 6),
        }


@dataclass(slots=True)
class EconomicCatalystSyncJob:
    """Fetch AwesomeAPI history and persist catalyst snapshots to Supabase."""

    pairs: Mapping[str, Sequence[str]]
    writer: SupabaseTableWriter
    calculator: AwesomeAPIAutoCalculator = field(default_factory=AwesomeAPIAutoCalculator)
    generator: EconomicCatalystGenerator = field(default_factory=EconomicCatalystGenerator)
    history: int = 64

    def run(self) -> int:
        rows: list[MutableMapping[str, object]] = []
        for pair, focus in self.pairs.items():
            try:
                bars = self.calculator.client.fetch_bars(pair, limit=self.history)
            except AwesomeAPIError as exc:
                LOGGER.warning("Failed to fetch AwesomeAPI history for %s: %s", pair, exc)
                continue
            except Exception as exc:  # pragma: no cover - defensive guard
                LOGGER.warning("Unexpected error fetching AwesomeAPI data for %s: %s", pair, exc)
                continue

            if len(bars) < 2:
                LOGGER.warning("Insufficient AwesomeAPI history for %s", pair)
                continue

            try:
                metrics = self.calculator.compute_metrics(pair, bars=bars)
            except (AwesomeAPIError, ValueError) as exc:
                LOGGER.warning("Unable to compute AwesomeAPI metrics for %s: %s", pair, exc)
                continue

            observed_at = bars[-1].timestamp
            catalyst = self.generator.build(
                pair,
                metrics,
                observed_at,
                market_focus=focus,
            )
            rows.append(self._normalise(catalyst))

        if not rows:
            return 0
        return self.writer.upsert(rows)

    @staticmethod
    def _normalise(catalyst: EconomicCatalyst) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "pair": catalyst.pair,
            "observed_at": catalyst.observed_at,
            "headline": catalyst.headline,
            "impact": catalyst.impact,
            "market_focus": list(catalyst.market_focus),
            "commentary": catalyst.commentary,
            "metrics": dict(catalyst.metrics),
            "source": catalyst.source,
        }
        return payload


__all__ = [
    "EconomicCatalyst",
    "EconomicCatalystGenerator",
    "EconomicCatalystSyncJob",
]
