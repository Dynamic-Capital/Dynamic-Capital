"""Currency correlation analytics orchestrated by a dual-LLM ensemble."""

from __future__ import annotations

import json
import math
import statistics
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .multi_llm import (
    CompletionClient,
    LLMConfig,
    collect_strings,
    parse_json_response,
    serialise_runs,
)


Number = float | int


@dataclass(slots=True)
class CorrelationSeries:
    """Historical closing prices for a currency pair."""

    pair: str
    closes: Sequence[Number]
    timestamps: Sequence[Any] = field(default_factory=tuple)


@dataclass(slots=True)
class CurrencyCorrelationRequest:
    """Input payload for :class:`CurrencyCorrelationCalculator`."""

    base_pair: str
    series: Sequence[CorrelationSeries | Mapping[str, Any]]
    timeframe: Optional[str] = None
    window: Optional[int] = None
    context: Dict[str, Any] = field(default_factory=dict)
    analytics: Dict[str, float] = field(default_factory=dict)
    macro_events: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class CurrencyCorrelationReport:
    """Structured output returned by the correlation calculator."""

    base_pair: str
    correlations: Dict[str, float]
    positive_pairs: list[str]
    negative_pairs: list[str]
    neutral_pairs: list[str]
    narrative: str
    strategic_actions: list[str]
    hedging_candidates: list[str]
    stacking_candidates: list[str]
    alerts: list[str]
    confidence: Optional[float]
    metadata: Dict[str, Any]
    raw_response: Optional[str]


@dataclass(slots=True)
class CurrencyCorrelationCalculator:
    """Compute correlation telemetry and arbitrate insights via Grok-1 & DeepSeek."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    grok_temperature: float = 0.2
    grok_nucleus_p: float = 0.9
    grok_max_tokens: int = 384
    deepseek_temperature: float = 0.15
    deepseek_nucleus_p: float = 0.9
    deepseek_max_tokens: int = 384
    min_samples: int = 4
    top_k_pairs: int = 8
    stack_threshold: float = 0.6
    hedge_threshold: float = 0.5
    neutral_threshold: float = 0.25

    def calculate(self, request: CurrencyCorrelationRequest) -> CurrencyCorrelationReport:
        """Return correlation analytics and strategic guidance for FX portfolios."""

        payload, optimisation_meta, correlations, series_meta = self._prepare_payload(request)

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
        deepseek_payload = parse_json_response(deepseek_run.response, fallback_key="analysis") or {}

        positive_pairs = [pair for pair, score in correlations.items() if score >= self.neutral_threshold]
        negative_pairs = [pair for pair, score in correlations.items() if score <= -self.neutral_threshold]
        neutral_pairs = [pair for pair, score in correlations.items() if abs(score) < self.neutral_threshold]

        narrative = self._resolve_narrative(grok_payload, deepseek_payload)
        confidence = self._resolve_confidence(grok_payload, deepseek_payload)

        hedges = collect_strings(
            [pair for pair, score in correlations.items() if score <= -self.hedge_threshold],
            grok_payload.get("hedges"),
            deepseek_payload.get("hedge_candidates"),
        )
        stacks = collect_strings(
            [pair for pair, score in correlations.items() if score >= self.stack_threshold],
            grok_payload.get("stacking_candidates"),
            deepseek_payload.get("stacking_candidates"),
        )
        actions = collect_strings(
            grok_payload.get("actions"),
            grok_payload.get("recommendations"),
            deepseek_payload.get("recommended_actions"),
            deepseek_payload.get("risk_mitigations"),
        )
        alerts = collect_strings(
            grok_payload.get("alerts"),
            deepseek_payload.get("alerts"),
            deepseek_payload.get("warnings"),
        )
        if deepseek_payload and not alerts:
            candidate = deepseek_payload.get("analysis")
            if isinstance(candidate, str) and candidate.strip():
                alerts = collect_strings(alerts, candidate)

        metadata: Dict[str, Any] = {
            "grok": grok_payload,
            "deepseek": deepseek_payload,
            "calculations": {
                "correlations": correlations,
                "series": series_meta,
            },
            "prompt_optimisation": optimisation_meta,
        }

        raw_response = serialise_runs((grok_run, deepseek_run))

        return CurrencyCorrelationReport(
            base_pair=payload["base_pair"],
            correlations=correlations,
            positive_pairs=positive_pairs,
            negative_pairs=negative_pairs,
            neutral_pairs=neutral_pairs,
            narrative=narrative,
            strategic_actions=actions,
            hedging_candidates=hedges,
            stacking_candidates=stacks,
            alerts=alerts,
            confidence=confidence,
            metadata=metadata,
            raw_response=raw_response,
        )

    # ------------------------------------------------------------------
    # Payload preparation
    # ------------------------------------------------------------------

    def _prepare_payload(
        self, request: CurrencyCorrelationRequest
    ) -> tuple[Dict[str, Any], Dict[str, Any], Dict[str, float], Dict[str, Any]]:
        if not request.series:
            raise ValueError("series cannot be empty")

        series_map: Dict[str, CorrelationSeries] = {}
        for entry in request.series:
            series = self._coerce_series(entry)
            key = series.pair.strip().upper()
            if not key:
                continue
            series_map[key] = series

        base_key = request.base_pair.strip().upper()
        if not base_key:
            raise ValueError("base_pair is required")
        if base_key not in series_map:
            raise ValueError(f"base_pair {base_key} missing from series")

        base_returns, base_meta = self._series_returns(series_map[base_key].closes, request.window)
        if len(base_returns) < self.min_samples:
            raise ValueError("base series does not contain enough samples for correlation analysis")

        correlations: Dict[str, float] = {}
        series_meta: Dict[str, Any] = {base_key: base_meta}
        retained_pairs = 0
        omitted_pairs = 0

        for key, series in sorted(series_map.items()):
            if key == base_key:
                continue
            returns, meta = self._series_returns(series.closes, request.window)
            if len(returns) < self.min_samples:
                omitted_pairs += 1
                series_meta[key] = {**meta, "reason": "insufficient_samples"}
                continue

            sample_count = min(len(base_returns), len(returns))
            base_slice = base_returns[-sample_count:]
            candidate_slice = returns[-sample_count:]
            correlation = self._pearson(base_slice, candidate_slice)
            if correlation is None:
                omitted_pairs += 1
                series_meta[key] = {**meta, "reason": "zero_variance"}
                continue

            retained_pairs += 1
            meta.update({
                "samples": sample_count,
                "volatility": self._volatility(candidate_slice),
            })
            series_meta[key] = meta
            correlations[key] = round(correlation, 4)

        sorted_pairs = sorted(correlations.items(), key=lambda item: abs(item[1]), reverse=True)
        top_pairs = dict(sorted_pairs[: self.top_k_pairs])

        analytics = self._select_numeric_mapping(request.analytics, limit=8)
        macro_events = self._dedupe_strings(request.macro_events, limit=8)
        context = {k: v for k, v in request.context.items() if v not in (None, "")}

        payload: Dict[str, Any] = {
            "base_pair": base_key,
            "timeframe": request.timeframe or "",
            "window": request.window,
            "top_correlations": top_pairs,
            "stack_candidates": [pair for pair, score in sorted_pairs if score >= self.stack_threshold][: self.top_k_pairs],
            "hedge_candidates": [pair for pair, score in sorted_pairs if score <= -self.hedge_threshold][: self.top_k_pairs],
            "neutral_candidates": [pair for pair, score in sorted_pairs if abs(score) < self.neutral_threshold][: self.top_k_pairs],
            "analytics": analytics,
            "macro_events": macro_events,
            "context": context,
        }

        optimisation_meta = {
            "series_supplied": len(series_map),
            "series_retained": retained_pairs,
            "series_omitted": omitted_pairs,
            "base_samples": len(base_returns),
            "stack_threshold": self.stack_threshold,
            "hedge_threshold": self.hedge_threshold,
            "neutral_threshold": self.neutral_threshold,
            "top_k_pairs": self.top_k_pairs,
        }

        return payload, optimisation_meta, top_pairs, series_meta

    def _coerce_series(self, value: CorrelationSeries | Mapping[str, Any]) -> CorrelationSeries:
        if isinstance(value, CorrelationSeries):
            return value
        if not isinstance(value, Mapping):
            raise TypeError("series entries must be CorrelationSeries or mapping objects")
        pair = str(value.get("pair") or value.get("symbol") or "").strip()
        closes = value.get("closes") or value.get("prices")
        if not isinstance(closes, Iterable):
            raise ValueError(f"series for {pair or 'unknown pair'} must supply an iterable of closes")
        timestamps = value.get("timestamps")
        if isinstance(timestamps, Iterable) and not isinstance(timestamps, (str, bytes)):
            ts_sequence: Sequence[Any] = tuple(timestamps)
        else:
            ts_sequence = tuple()
        return CorrelationSeries(pair=pair, closes=tuple(closes), timestamps=ts_sequence)

    def _series_returns(self, closes: Sequence[Number], window: Optional[int]) -> tuple[list[float], Dict[str, Any]]:
        values: list[float] = []
        omitted = 0
        for raw in closes:
            try:
                number = float(raw)
            except (TypeError, ValueError):
                omitted += 1
                continue
            if not math.isfinite(number):
                omitted += 1
                continue
            values.append(number)

        if window is not None and window > 0:
            values = values[-(window + 1) :]

        returns: list[float] = []
        skipped = 0
        for previous, current in zip(values, values[1:]):
            if math.isclose(previous, 0.0, abs_tol=1e-12):
                skipped += 1
                continue
            returns.append((current - previous) / previous)

        meta = {
            "price_samples": len(values),
            "price_omitted": omitted,
            "return_samples": len(returns),
            "return_omitted": skipped,
            "volatility": self._volatility(returns),
        }
        return returns, meta

    @staticmethod
    def _volatility(samples: Sequence[float]) -> Optional[float]:
        if len(samples) < 2:
            return None
        try:
            return round(statistics.pstdev(samples), 6)
        except statistics.StatisticsError:
            return None

    @staticmethod
    def _pearson(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
        if len(xs) < 2 or len(ys) < 2:
            return None
        mean_x = statistics.fmean(xs)
        mean_y = statistics.fmean(ys)
        cov = 0.0
        var_x = 0.0
        var_y = 0.0
        for x, y in zip(xs, ys):
            dx = x - mean_x
            dy = y - mean_y
            cov += dx * dy
            var_x += dx * dx
            var_y += dy * dy
        denominator = math.sqrt(var_x * var_y)
        if denominator == 0:
            return None
        return max(-1.0, min(1.0, cov / denominator))

    def _select_numeric_mapping(self, payload: Mapping[str, Any], *, limit: int) -> Dict[str, float]:
        items: list[tuple[str, float]] = []
        for key, value in payload.items():
            try:
                numeric = float(value)
            except (TypeError, ValueError):
                continue
            items.append((str(key), numeric))
        items.sort(key=lambda item: abs(item[1]), reverse=True)
        return {key: round(val, 4) for key, val in items[:limit]}

    def _dedupe_strings(self, values: Iterable[str], *, limit: int) -> list[str]:
        seen: set[str] = set()
        results: list[str] = []
        for value in values:
            text = str(value).strip()
            if not text or text in seen:
                continue
            results.append(text)
            seen.add(text)
            if len(results) >= limit:
                break
        return results

    # ------------------------------------------------------------------
    # Prompt construction
    # ------------------------------------------------------------------

    def _build_grok_prompt(
        self, payload: Mapping[str, Any], optimisation_meta: Mapping[str, Any]
    ) -> str:
        payload_json = json.dumps(payload, indent=2, sort_keys=True, default=str)
        optimisation_json = json.dumps(optimisation_meta, indent=2, sort_keys=True, default=str)
        return textwrap.dedent(
            f"""
            You are Grok-1 acting as Dynamic Capital's senior FX risk strategist.
            Analyse the currency correlation telemetry and reason step-by-step
            about diversification, hedging, and concentration risk before
            responding. Return a single minified JSON object with:
              - "narrative": concise explanation of the correlation state.
              - "actions": array of portfolio adjustments or monitoring tasks.
              - "hedges": array of pairs suitable for hedging the base pair.
              - "stacking_candidates": array of pairs that reinforce the bias.
              - "alerts": optional array of urgent considerations.
              - "confidence": optional number between 0 and 1.
            Do not emit markdown or commentary outside the JSON payload.

            Optimisation stats:
            {optimisation_json}

            Correlation telemetry:
            {payload_json}
            """
        ).strip()

    def _build_deepseek_prompt(
        self,
        payload: Mapping[str, Any],
        grok_payload: Mapping[str, Any],
        optimisation_meta: Mapping[str, Any],
    ) -> str:
        payload_json = json.dumps(payload, indent=2, sort_keys=True, default=str)
        grok_json = json.dumps(grok_payload, indent=2, sort_keys=True, default=str)
        optimisation_json = json.dumps(optimisation_meta, indent=2, sort_keys=True, default=str)
        return textwrap.dedent(
            f"""
            You are DeepSeek-V3 acting as the risk arbiter for Dynamic Capital.
            Review the Grok-1 assessment and stress test the correlation outlook.
            Respond with a compact JSON object containing:
              - "analysis": short critique of Grok-1's narrative.
              - "recommended_actions": array refining or challenging the plan.
              - "hedge_candidates": array of pairs to neutralise exposure.
              - "stacking_candidates": array of pairs to express conviction.
              - "warnings": optional array of regime-shift concerns.
              - "confidence_modifier": optional multiplier between 0 and 1.
              - "risk_score": optional number between 0 and 1 quantifying risk.
            Avoid markdown and keep the JSON minified.

            Optimisation stats:
            {optimisation_json}

            Grok-1 proposal:
            {grok_json}

            Correlation telemetry:
            {payload_json}
            """
        ).strip()

    # ------------------------------------------------------------------
    # Post-processing helpers
    # ------------------------------------------------------------------

    def _resolve_narrative(
        self,
        grok_payload: Mapping[str, Any] | None,
        deepseek_payload: Mapping[str, Any] | None,
    ) -> str:
        candidates = []
        if grok_payload:
            narrative = grok_payload.get("narrative")
            if isinstance(narrative, str) and narrative.strip():
                candidates.append(narrative.strip())
        if deepseek_payload:
            analysis = deepseek_payload.get("analysis")
            if isinstance(analysis, str) and analysis.strip():
                candidates.append(analysis.strip())
        if not candidates:
            if grok_payload and isinstance(grok_payload.get("narrative"), str):
                return grok_payload["narrative"]
            if deepseek_payload and isinstance(deepseek_payload.get("analysis"), str):
                return deepseek_payload["analysis"]
        return "\n".join(candidates) if candidates else ""

    def _resolve_confidence(
        self,
        grok_payload: Mapping[str, Any] | None,
        deepseek_payload: Mapping[str, Any] | None,
    ) -> Optional[float]:
        base = self._extract_float(grok_payload, "confidence") if grok_payload else None
        if base is None and grok_payload:
            stacks = grok_payload.get("stacking_candidates")
            if isinstance(stacks, Sequence) and stacks:
                base = min(1.0, max(0.0, len(stacks) / max(self.top_k_pairs, 1)))
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

    @staticmethod
    def _extract_float(payload: Mapping[str, Any] | None, key: str) -> Optional[float]:
        if not payload or key not in payload:
            return None
        value = payload.get(key)
        try:
            return float(value)
        except (TypeError, ValueError):
            return None


__all__ = [
    "CorrelationSeries",
    "CurrencyCorrelationCalculator",
    "CurrencyCorrelationReport",
    "CurrencyCorrelationRequest",
]

