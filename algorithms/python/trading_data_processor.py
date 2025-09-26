"""Trading data processing pipeline powered by Grok-1 and DeepSeek-V3."""

from __future__ import annotations

import json
import math
import textwrap
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import CompletionClient, LLMConfig, collect_strings, parse_json_response, serialise_runs
from .trade_logic import ActivePosition, MarketSnapshot
from .economic_catalysts import EconomicCatalyst


@dataclass(slots=True)
class TradingDataRequest:
    """Payload describing the market state to analyse."""

    snapshots: Sequence[MarketSnapshot]
    context: Dict[str, Any] = field(default_factory=dict)
    analytics: Dict[str, float] = field(default_factory=dict)
    macro_events: Sequence[str] = field(default_factory=tuple)
    catalysts: Sequence[EconomicCatalyst | Mapping[str, Any]] = field(default_factory=tuple)
    open_positions: Sequence[ActivePosition] = field(default_factory=tuple)
    notes: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class TradingDataResult:
    """Aggregated insights returned by :class:`TradingDataProcessor`."""

    feature_summary: Dict[str, float]
    normalized_features: Dict[str, float]
    insights: list[str]
    risks: list[str]
    alerts: list[str]
    confidence: Optional[float]
    metadata: Dict[str, Any]
    raw_response: Optional[str]


@dataclass(slots=True)
class TradingDataProcessor:
    """Optimises trading telemetry with Grok-1 and DeepSeek-V3 collaboration."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    grok_temperature: float = 0.2
    grok_nucleus_p: float = 0.9
    grok_max_tokens: int = 384
    deepseek_temperature: float = 0.15
    deepseek_nucleus_p: float = 0.9
    deepseek_max_tokens: int = 384
    max_snapshots: int = 96
    analytics_top_k: int = 12

    def process(self, request: TradingDataRequest) -> TradingDataResult:
        """Run the dual-LLM data processing workflow for the supplied request."""

        payload, optimisation_meta = self._prepare_payload(request)

        grok_prompt = self._build_grok_prompt(payload, optimisation_meta)
        grok_run = LLMConfig(
            name="grok-1",
            client=self.grok_client,
            temperature=self.grok_temperature,
            nucleus_p=self.grok_nucleus_p,
            max_tokens=self.grok_max_tokens,
        ).run(grok_prompt)
        grok_payload = parse_json_response(grok_run.response, fallback_key="narrative") or {}

        deepseek_prompt = self._build_deepseek_prompt(payload, grok_payload, optimisation_meta)
        deepseek_run = LLMConfig(
            name="deepseek-v3",
            client=self.deepseek_client,
            temperature=self.deepseek_temperature,
            nucleus_p=self.deepseek_nucleus_p,
            max_tokens=self.deepseek_max_tokens,
        ).run(deepseek_prompt)
        deepseek_payload = parse_json_response(deepseek_run.response, fallback_key="narrative") or {}

        alerts = collect_strings(
            grok_payload.get("alerts"),
            deepseek_payload.get("alerts"),
        )

        insights = collect_strings(
            grok_payload.get("insights"),
            grok_payload.get("highlight"),
            grok_payload.get("narrative"),
            grok_run.response if not grok_payload else None,
        )
        risks = collect_strings(
            grok_payload.get("risks"),
            deepseek_payload.get("risks"),
            deepseek_payload.get("risk_mitigations"),
            deepseek_payload.get("narrative"),
            deepseek_run.response if not deepseek_payload else None,
        )

        confidence = self._resolve_confidence(grok_payload, deepseek_payload)

        metadata: Dict[str, Any] = {
            "grok": grok_payload,
            "deepseek": deepseek_payload,
            "prompt_optimisation": optimisation_meta,
        }

        raw_response = serialise_runs((grok_run, deepseek_run))

        feature_summary = payload["feature_summary"]
        normalized_features: Dict[str, float] = {}
        if isinstance(grok_payload, Mapping):
            candidate = grok_payload.get("normalized_features")
            if isinstance(candidate, Mapping):
                normalized_features = self._extract_numeric_mapping(candidate)

        if not normalized_features:
            normalized_features = dict(feature_summary)

        return TradingDataResult(
            feature_summary=dict(feature_summary),
            normalized_features=normalized_features,
            insights=insights,
            risks=risks,
            alerts=alerts,
            confidence=confidence,
            metadata=metadata,
            raw_response=raw_response,
        )

    # ------------------------------------------------------------------
    # Payload preparation
    # ------------------------------------------------------------------

    def _prepare_payload(
        self, request: TradingDataRequest
    ) -> tuple[Dict[str, Any], Dict[str, Any]]:
        if not request.snapshots:
            raise ValueError("snapshots cannot be empty")

        snapshots = tuple(sorted(request.snapshots, key=lambda snap: snap.timestamp))
        retained = snapshots[-self.max_snapshots :]
        omitted = max(0, len(snapshots) - len(retained))

        feature_summary = self._summarise_snapshots(retained)

        context = {k: v for k, v in request.context.items() if v not in (None, "")}
        context_pruned = len(request.context) - len(context)

        analytics = self._select_top_k_analytics(request.analytics)

        catalyst_events, catalyst_details = self._prepare_catalysts(request.catalysts)
        macro_candidates = [self._normalise_event_text(event) for event in request.macro_events]
        macro_candidates.extend(catalyst_events)

        deduped_macro_events: list[str] = []
        seen_events: set[str] = set()
        for event in macro_candidates:
            if not event or event in seen_events:
                continue
            deduped_macro_events.append(event)
            seen_events.add(event)

        macro_events = deduped_macro_events[:8]
        macro_omitted = max(0, len([event for event in macro_candidates if event]) - len(macro_events))

        payload: Dict[str, Any] = {
            "feature_summary": feature_summary,
            "context": context,
            "analytics": analytics,
            "macro_events": macro_events,
            "open_positions": [
                {
                    "symbol": pos.symbol,
                    "direction": pos.direction,
                    "size": pos.size,
                    "entry_price": pos.entry_price,
                }
                for pos in request.open_positions[:6]
            ],
            "notes": list(request.notes[:8]),
        }
        if catalyst_details:
            payload["catalysts"] = catalyst_details

        optimisation_meta = {
            "snapshots_retained": len(retained),
            "snapshots_omitted": omitted,
            "context_pruned": context_pruned,
            "analytics_retained": len(analytics),
            "macro_events_retained": len(macro_events),
            "macro_events_omitted": macro_omitted,
            "macro_events_from_catalysts": len(catalyst_events),
            "catalysts_supplied": len(request.catalysts),
            "open_positions_retained": min(len(request.open_positions), 6),
        }
        if omitted:
            optimisation_meta["first_snapshot"] = retained[0].timestamp.isoformat()
            optimisation_meta["last_snapshot"] = retained[-1].timestamp.isoformat()

        return payload, optimisation_meta

    # ------------------------------------------------------------------
    # Snapshot statistics
    # ------------------------------------------------------------------

    @dataclass(slots=True)
    class _RunningStats:
        """Incremental accumulator for means and population variance."""

        count: int = 0
        mean: float = 0.0
        m2: float = 0.0

        def add(self, value: float) -> None:
            self.count += 1
            delta = value - self.mean
            self.mean += delta / self.count
            delta2 = value - self.mean
            self.m2 += delta * delta2

        def mean_value(self) -> float:
            return self.mean if self.count else 0.0

        def std_dev(self) -> float:
            if self.count <= 1:
                return 0.0
            return math.sqrt(self.m2 / self.count)

    def _prepare_catalysts(
        self, catalysts: Sequence[EconomicCatalyst | Mapping[str, Any]]
    ) -> tuple[list[str], list[dict[str, Any]]]:
        if not catalysts:
            return [], []

        candidates: list[tuple[datetime, str, dict[str, Any]]] = []
        for entry in catalysts:
            try:
                if isinstance(entry, EconomicCatalyst):
                    catalyst = entry
                elif isinstance(entry, Mapping):
                    catalyst = EconomicCatalyst.from_mapping(entry)
                else:
                    continue
            except (ValueError, TypeError):
                continue

            detail = {
                "pair": catalyst.pair,
                "headline": catalyst.headline,
                "impact": catalyst.impact,
                "observed_at": catalyst.observed_at.isoformat(),
                "commentary": catalyst.commentary,
                "market_focus": list(catalyst.market_focus),
                "source": catalyst.source,
                "metrics": {
                    key: float(value)
                    for key, value in catalyst.metrics.items()
                    if isinstance(value, (int, float))
                },
            }
            candidates.append((catalyst.observed_at, catalyst.to_macro_event(), detail))

        if not candidates:
            return [], []

        candidates.sort(key=lambda item: item[0], reverse=True)
        events = [self._normalise_event_text(event) for _, event, _ in candidates]
        details = [detail for *_, detail in candidates[:6]]
        return events, details

    def _normalise_event_text(self, event: Any) -> str:
        if isinstance(event, str):
            return event.strip()
        if event is None:
            return ""
        return str(event).strip()

    def _summarise_snapshots(self, snapshots: Sequence[MarketSnapshot]) -> Dict[str, float]:
        close_stats = self._RunningStats()
        rsi_fast_stats = self._RunningStats()
        adx_fast_stats = self._RunningStats()
        rsi_slow_stats = self._RunningStats()
        adx_slow_stats = self._RunningStats()
        velocity_stats = self._RunningStats()
        acceleration_stats = self._RunningStats()
        jerk_stats = self._RunningStats()
        energy_stats = self._RunningStats()
        stress_stats = self._RunningStats()
        bias_stats = self._RunningStats()

        close_first = float(snapshots[0].close)
        close_last = close_first

        rsi_fast_first = snapshots[0].rsi_fast
        adx_fast_first = snapshots[0].adx_fast
        rsi_slow_first = snapshots[0].rsi_slow
        adx_slow_first = snapshots[0].adx_slow

        rsi_fast_last = rsi_fast_first
        adx_fast_last = adx_fast_first
        rsi_slow_last = rsi_slow_first
        adx_slow_last = adx_slow_first

        range_high: Optional[float] = None
        range_low: Optional[float] = None

        for snap in snapshots:
            close = float(snap.close)
            close_stats.add(close)
            close_last = close

            rsi_fast_stats.add(float(snap.rsi_fast))
            adx_fast_stats.add(float(snap.adx_fast))
            rsi_slow_stats.add(float(snap.rsi_slow))
            adx_slow_stats.add(float(snap.adx_slow))

            rsi_fast_last = snap.rsi_fast
            adx_fast_last = snap.adx_fast
            rsi_slow_last = snap.rsi_slow
            adx_slow_last = snap.adx_slow

            if snap.mechanical_velocity is not None:
                velocity_stats.add(float(snap.mechanical_velocity))
            if snap.mechanical_acceleration is not None:
                acceleration_stats.add(float(snap.mechanical_acceleration))
            if snap.mechanical_jerk is not None:
                jerk_stats.add(float(snap.mechanical_jerk))
            if snap.mechanical_energy is not None:
                energy_stats.add(float(snap.mechanical_energy))
            if snap.mechanical_stress_ratio is not None:
                stress_stats.add(float(snap.mechanical_stress_ratio))

            bias_stats.add(float(snap.mechanical_bias()))

            if snap.high is not None:
                high = float(snap.high)
                range_high = high if range_high is None else max(range_high, high)
            if snap.low is not None:
                low = float(snap.low)
                range_low = low if range_low is None else min(range_low, low)

        range_high = range_high if range_high is not None else close_last
        range_low = range_low if range_low is not None else close_last
        range_span = range_high - range_low
        pct_range = range_span / close_last if close_last else 0.0

        momentum = (close_last - close_first) / close_first if close_first else 0.0

        rsi_fast_trend = float(rsi_fast_last - rsi_fast_first)
        adx_fast_trend = float(adx_fast_last - adx_fast_first)
        rsi_slow_trend = float(rsi_slow_last - rsi_slow_first)
        adx_slow_trend = float(adx_slow_last - adx_slow_first)

        return {
            "samples": float(len(snapshots)),
            "close_last": float(close_last),
            "close_mean": close_stats.mean_value(),
            "close_volatility": close_stats.std_dev(),
            "momentum_pct": float(momentum),
            "range_high": float(range_high),
            "range_low": float(range_low),
            "range_pct": float(pct_range),
            "rsi_fast_mean": rsi_fast_stats.mean_value(),
            "rsi_fast_trend": rsi_fast_trend,
            "adx_fast_mean": adx_fast_stats.mean_value(),
            "adx_fast_trend": adx_fast_trend,
            "rsi_slow_mean": rsi_slow_stats.mean_value(),
            "rsi_slow_trend": rsi_slow_trend,
            "adx_slow_mean": adx_slow_stats.mean_value(),
            "adx_slow_trend": adx_slow_trend,
            "mechanical_velocity_mean": velocity_stats.mean_value(),
            "mechanical_acceleration_mean": acceleration_stats.mean_value(),
            "mechanical_jerk_mean": jerk_stats.mean_value(),
            "mechanical_energy_mean": energy_stats.mean_value(),
            "mechanical_stress_mean": stress_stats.mean_value(),
            "mechanical_bias_mean": bias_stats.mean_value(),
        }

    def _select_top_k_analytics(self, analytics: Mapping[str, float]) -> Dict[str, float]:
        if not analytics:
            return {}

        def _sort_key(item: tuple[str, float]) -> tuple[int, float, str]:
            name, value = item
            magnitude = abs(float(value))
            return (-1 if magnitude >= 1 else 0, -magnitude, name)

        items = sorted(analytics.items(), key=_sort_key)
        top_items = items[: self.analytics_top_k]
        return {name: float(value) for name, value in top_items}

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    def _build_grok_prompt(self, payload: Mapping[str, Any], meta: Mapping[str, Any]) -> str:
        features_json = json.dumps(payload["feature_summary"], indent=2, default=str, sort_keys=True)
        context_json = json.dumps(payload.get("context", {}), indent=2, default=str, sort_keys=True)
        analytics_json = json.dumps(payload.get("analytics", {}), indent=2, default=str, sort_keys=True)
        events_json = json.dumps(payload.get("macro_events", []), indent=2, default=str)
        notes_json = json.dumps(payload.get("notes", []), indent=2, default=str)

        optimisation_note = self._format_optimisation_meta(meta)

        return textwrap.dedent(
            f"""
            You are Grok-1 serving as Dynamic Capital's quantitative strategist.
            Think step-by-step about the telemetry before responding. Return a single
            minified JSON object with the keys:
              - "normalized_features": map of rescaled factor scores between -1 and 1.
              - "insights": array of observations about momentum, liquidity, or carry.
              - "risks": array of brewing threats or dislocations.
              - "confidence": optional number between 0 and 1 for the data quality.
              - "alerts": optional array of urgent callouts.
            Do not include markdown or commentary outside the JSON payload.

            {optimisation_note}

            Aggregated feature summary:
            {features_json}

            Context modifiers:
            {context_json}

            Quantitative analytics:
            {analytics_json}

            Macro events:
            {events_json}

            Desk notes:
            {notes_json}
            """
        ).strip()

    def _build_deepseek_prompt(
        self,
        payload: Mapping[str, Any],
        grok_payload: Mapping[str, Any] | None,
        meta: Mapping[str, Any],
    ) -> str:
        feature_json = json.dumps(payload.get("feature_summary", {}), indent=2, default=str, sort_keys=True)
        grok_json = json.dumps(grok_payload or {}, indent=2, default=str, sort_keys=True)
        context_json = json.dumps(payload.get("context", {}), indent=2, default=str, sort_keys=True)
        optimisation_note = self._format_optimisation_meta(meta)

        return textwrap.dedent(
            f"""
            You are DeepSeek-V3, Dynamic Capital's chief risk officer.
            Review the Grok-1 analysis and stress-test it for blind spots. Work
            step-by-step through liquidity, regime stability, and compliance risk
            before responding. Return a single minified JSON object with:
              - "confidence_modifier": optional multiplier (0-1) to adjust conviction.
              - "risk_score": optional number between 0 and 1 where higher means more risk.
              - "risks": optional array of notable threats.
              - "risk_mitigations": optional array of position management steps.
              - "alerts": optional array of urgent warnings.
            Do not include markdown or narrative outside the JSON payload.

            {optimisation_note}

            Aggregated features:
            {feature_json}

            Grok-1 intelligence:
            {grok_json}

            Context modifiers:
            {context_json}
            """
        ).strip()

    def _format_optimisation_meta(self, meta: Mapping[str, Any]) -> str:
        if not meta:
            return "All relevant context supplied."
        summary = json.dumps(dict(meta), indent=2, sort_keys=True)
        return f"All relevant context supplied. Optimisation stats: {summary}"

    # ------------------------------------------------------------------
    # Helper utilities
    # ------------------------------------------------------------------

    def _resolve_confidence(
        self,
        grok_payload: Mapping[str, Any] | None,
        deepseek_payload: Mapping[str, Any] | None,
    ) -> Optional[float]:
        base = self._extract_float(grok_payload, "confidence") if grok_payload else None
        if base is None and grok_payload:
            candidate = grok_payload.get("normalized_features")
            if isinstance(candidate, Mapping):
                numeric = self._extract_numeric_mapping(candidate)
                if numeric:
                    density = sum(abs(value) for value in numeric.values())
                    base = max(0.0, min(1.0, density / max(len(numeric), 1)))

        if base is None:
            return None

        modifier = self._extract_float(deepseek_payload, "confidence_modifier") if deepseek_payload else None
        risk_score = self._extract_float(deepseek_payload, "risk_score") if deepseek_payload else None

        confidence = base
        if modifier is not None:
            confidence *= modifier
        if risk_score is not None:
            confidence *= max(0.0, 1.0 - risk_score)
        return max(0.0, min(1.0, confidence))

    def _extract_float(self, payload: Mapping[str, Any] | None, key: str) -> Optional[float]:
        if not payload or key not in payload:
            return None
        value = payload.get(key)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _extract_numeric_mapping(self, payload: Mapping[str, Any]) -> Dict[str, float]:
        numeric: Dict[str, float] = {}
        for key, value in payload.items():
            try:
                numeric[key] = float(value)
            except (TypeError, ValueError):
                continue
        return numeric

__all__ = [
    "TradingDataProcessor",
    "TradingDataRequest",
    "TradingDataResult",
]
