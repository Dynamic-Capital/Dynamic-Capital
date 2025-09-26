"""Trading data processing pipeline powered by Grok-1 and DeepSeek-V3."""

from __future__ import annotations

import json
import statistics
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence

from .grok_advisor import CompletionClient
from .trade_logic import ActivePosition, MarketSnapshot


@dataclass(slots=True)
class TradingDataRequest:
    """Payload describing the market state to analyse."""

    snapshots: Sequence[MarketSnapshot]
    context: Dict[str, Any] = field(default_factory=dict)
    analytics: Dict[str, float] = field(default_factory=dict)
    macro_events: Sequence[str] = field(default_factory=tuple)
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
        grok_response = self.grok_client.complete(
            grok_prompt,
            temperature=self.grok_temperature,
            max_tokens=self.grok_max_tokens,
            nucleus_p=self.grok_nucleus_p,
        )
        grok_payload = self._parse_payload(grok_response)

        deepseek_prompt = self._build_deepseek_prompt(payload, grok_payload, optimisation_meta)
        deepseek_response = self.deepseek_client.complete(
            deepseek_prompt,
            temperature=self.deepseek_temperature,
            max_tokens=self.deepseek_max_tokens,
            nucleus_p=self.deepseek_nucleus_p,
        )
        deepseek_payload = self._parse_payload(deepseek_response)

        alerts = self._collect_strings(
            grok_payload.get("alerts") if isinstance(grok_payload, Mapping) else None,
            deepseek_payload.get("alerts") if isinstance(deepseek_payload, Mapping) else None,
        )

        insights = self._collect_strings(
            (grok_payload or {}).get("insights") if isinstance(grok_payload, Mapping) else None,
            (grok_payload or {}).get("highlight") if isinstance(grok_payload, Mapping) else None,
            (grok_payload or {}).get("narrative") if isinstance(grok_payload, Mapping) else None,
            grok_response if not grok_payload else None,
        )
        risks = self._collect_strings(
            (grok_payload or {}).get("risks") if isinstance(grok_payload, Mapping) else None,
            (deepseek_payload or {}).get("risks") if isinstance(deepseek_payload, Mapping) else None,
            (deepseek_payload or {}).get("risk_mitigations")
            if isinstance(deepseek_payload, Mapping)
            else None,
            (deepseek_payload or {}).get("narrative") if isinstance(deepseek_payload, Mapping) else None,
            deepseek_response if not deepseek_payload else None,
        )

        confidence = self._resolve_confidence(grok_payload, deepseek_payload)

        metadata: Dict[str, Any] = {
            "grok": grok_payload,
            "deepseek": deepseek_payload,
            "prompt_optimisation": optimisation_meta,
        }

        raw_response = self._serialise_raw(
            {"model": "grok-1", "response": grok_response},
            {"model": "deepseek-v3", "response": deepseek_response},
        )

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

        payload: Dict[str, Any] = {
            "feature_summary": feature_summary,
            "context": context,
            "analytics": analytics,
            "macro_events": list(request.macro_events[:8]),
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

        optimisation_meta = {
            "snapshots_retained": len(retained),
            "snapshots_omitted": omitted,
            "context_pruned": context_pruned,
            "analytics_retained": len(analytics),
            "macro_events_retained": min(len(request.macro_events), 8),
            "open_positions_retained": min(len(request.open_positions), 6),
        }
        if omitted:
            optimisation_meta["first_snapshot"] = retained[0].timestamp.isoformat()
            optimisation_meta["last_snapshot"] = retained[-1].timestamp.isoformat()

        return payload, optimisation_meta

    def _summarise_snapshots(self, snapshots: Sequence[MarketSnapshot]) -> Dict[str, float]:
        closes = [snap.close for snap in snapshots]
        rsi_fast_values = [snap.rsi_fast for snap in snapshots]
        adx_fast_values = [snap.adx_fast for snap in snapshots]
        rsi_slow_values = [snap.rsi_slow for snap in snapshots]
        adx_slow_values = [snap.adx_slow for snap in snapshots]

        close_first = closes[0]
        close_last = closes[-1]
        momentum = (close_last - close_first) / close_first if close_first else 0.0
        range_high = max(
            (snap.high for snap in snapshots if snap.high is not None),
            default=close_last,
        )
        range_low = min(
            (snap.low for snap in snapshots if snap.low is not None),
            default=close_last,
        )
        range_span = range_high - range_low
        pct_range = range_span / close_last if close_last else 0.0

        def _safe_mean(values: Sequence[float]) -> float:
            return statistics.fmean(values) if values else 0.0

        def _safe_std(values: Sequence[float]) -> float:
            if len(values) <= 1:
                return 0.0
            return statistics.pstdev(values)

        rsi_fast_trend = rsi_fast_values[-1] - rsi_fast_values[0]
        adx_fast_trend = adx_fast_values[-1] - adx_fast_values[0]
        rsi_slow_trend = rsi_slow_values[-1] - rsi_slow_values[0]
        adx_slow_trend = adx_slow_values[-1] - adx_slow_values[0]

        return {
            "samples": float(len(snapshots)),
            "close_last": float(close_last),
            "close_mean": _safe_mean(closes),
            "close_volatility": _safe_std(closes),
            "momentum_pct": float(momentum),
            "range_high": float(range_high),
            "range_low": float(range_low),
            "range_pct": float(pct_range),
            "rsi_fast_mean": _safe_mean(rsi_fast_values),
            "rsi_fast_trend": float(rsi_fast_trend),
            "adx_fast_mean": _safe_mean(adx_fast_values),
            "adx_fast_trend": float(adx_fast_trend),
            "rsi_slow_mean": _safe_mean(rsi_slow_values),
            "rsi_slow_trend": float(rsi_slow_trend),
            "adx_slow_mean": _safe_mean(adx_slow_values),
            "adx_slow_trend": float(adx_slow_trend),
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

    def _collect_strings(self, *candidates: Optional[Iterable[str] | str]) -> list[str]:
        collected: list[str] = []
        for candidate in candidates:
            if candidate is None:
                continue
            if isinstance(candidate, str):
                text = candidate.strip()
                if text:
                    collected.append(text)
                continue
            for item in candidate:
                if isinstance(item, str):
                    text = item.strip()
                    if text:
                        collected.append(text)
        return collected

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

    def _parse_payload(self, response: str) -> Mapping[str, Any] | None:
        text = (response or "").strip()
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                snippet = text[start : end + 1]
                try:
                    parsed = json.loads(snippet)
                except json.JSONDecodeError:
                    return {"narrative": text}
            else:
                return {"narrative": text}
        if isinstance(parsed, MutableMapping):
            return dict(parsed)
        return {"narrative": text}

    def _serialise_raw(self, *entries: Mapping[str, Any]) -> str:
        parts = [json.dumps(entry, indent=2, default=str, sort_keys=True) for entry in entries]
        return "\n\n".join(parts)


__all__ = [
    "TradingDataProcessor",
    "TradingDataRequest",
    "TradingDataResult",
]
