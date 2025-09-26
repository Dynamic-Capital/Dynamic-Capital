"""Utilities for requesting Grok-backed advice on trading decisions."""

from __future__ import annotations

import json
import math
import random
import sys
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Optional, Protocol, Sequence

from .multi_llm import CompletionClient, LLMConfig, LLMRun, collect_strings, parse_json_response, serialise_runs
from .trade_logic import ActivePosition, MarketSnapshot, TradeSignal


@dataclass(slots=True)
class AdvisorFeedback:
    """Structured response from a trade advisor."""

    adjusted_signal: Optional[TradeSignal] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    raw_response: Optional[str] = None


class TradeAdvisor(Protocol):  # pragma: no cover - interface definition
    def review(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        context: Dict[str, Any],
        open_positions: Sequence[ActivePosition],
    ) -> Optional[AdvisorFeedback]:
        """Return optional adjustments for the supplied signal."""


@dataclass(slots=True)
class GrokAdvisor:
    """High-level adapter that prompts Grok for risk/context adjustments."""

    client: CompletionClient
    temperature: float = 0.25
    nucleus_p: float = 0.9
    max_tokens: int = 256

    def review(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        context: Dict[str, Any],
        open_positions: Sequence[ActivePosition],
    ) -> Optional[AdvisorFeedback]:
        prompt = self._build_prompt(snapshot=snapshot, signal=signal, context=context, open_positions=open_positions)
        response = self.client.complete(
            prompt,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            nucleus_p=self.nucleus_p,
        )
        feedback = AdvisorFeedback(
            metadata={"source": "grok", "prompt": prompt},
            raw_response=response.strip() or None,
        )
        parsed = self._parse_response(response)
        if parsed:
            feedback.metadata.update(parsed)
            new_conf = self._extract_confidence(parsed)
            if new_conf is not None:
                adjusted = TradeSignal(
                    direction=signal.direction,
                    confidence=new_conf,
                    votes=signal.votes,
                    neighbors_considered=signal.neighbors_considered,
                )
                feedback.adjusted_signal = adjusted
        return feedback

    def _build_prompt(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        context: Dict[str, Any],
        open_positions: Sequence[ActivePosition],
    ) -> str:
        open_lines = [
            f"- {pos.symbol} {self._direction(pos.direction)} {pos.size} @ {pos.entry_price}"
            for pos in open_positions
        ]
        if not open_lines:
            open_lines = ["- none"]
        summary = textwrap.dedent(
            f"""
            You are reviewing a foreign-exchange trading signal. Return a single JSON object
            with the fields:
              - "adjusted_confidence": number between 0 and 1 when you recommend overriding the
                supplied confidence (omit the field to keep the value unchanged)
              - "rationale": short human-readable explanation (string)
              - "alerts": optional array of strings highlighting material risks or TODOs
            Keep commentary concise and grounded in the provided telemetry.
            """
        ).strip()
        context_json = json.dumps(context, indent=2, default=str, sort_keys=True)
        prompt = textwrap.dedent(
            f"""
            {summary}

            Signal:
              direction: {self._direction(signal.direction)}
              confidence: {signal.confidence:.4f}
              votes: {signal.votes}
              neighbours: {signal.neighbors_considered}

            Market snapshot:
              symbol: {snapshot.symbol}
              timestamp: {snapshot.timestamp.isoformat()}
              close: {snapshot.close}
              rsi_fast: {snapshot.rsi_fast}
              adx_fast: {snapshot.adx_fast}
              rsi_slow: {snapshot.rsi_slow}
              adx_slow: {snapshot.adx_slow}
              seasonal_bias: {snapshot.seasonal_bias}
              seasonal_confidence: {snapshot.seasonal_confidence}

            Context modifiers:
            {context_json}

            Open positions:
            {chr(10).join(open_lines)}
            """
        ).strip()
        return prompt

    @staticmethod
    def _direction(direction: int) -> str:
        if direction > 0:
            return "long"
        if direction < 0:
            return "short"
        return "flat"

    @staticmethod
    def _parse_response(response: str) -> Optional[Dict[str, Any]]:
        return parse_json_response(response, fallback_key="rationale")

    @staticmethod
    def _extract_confidence(payload: Dict[str, Any]) -> Optional[float]:
        for key in ("adjusted_confidence", "confidence", "final_confidence"):
            if key in payload:
                try:
                    value = float(payload[key])
                except (TypeError, ValueError):
                    continue
                return max(0.0, min(1.0, value))
        return None


@dataclass(slots=True)
class DualLLMAdvisor:
    """Trade advisor that ensembles Grok-1 guidance with DeepSeek-V3 risk checks."""

    grok_client: CompletionClient
    deepseek_client: CompletionClient
    grok_temperature: float = 0.25
    grok_nucleus_p: float = 0.9
    grok_max_tokens: int = 256
    deepseek_temperature: float = 0.15
    deepseek_nucleus_p: float = 0.9
    deepseek_max_tokens: int = 256
    risk_floor: float = 0.25
    risk_weight: float = 0.5
    _grok: GrokAdvisor = field(init=False, repr=False)

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "_grok",
            GrokAdvisor(
                client=self.grok_client,
                temperature=self.grok_temperature,
                nucleus_p=self.grok_nucleus_p,
                max_tokens=self.grok_max_tokens,
            ),
        )

    def review(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        context: Dict[str, Any],
        open_positions: Sequence[ActivePosition],
    ) -> Optional[AdvisorFeedback]:
        grok_feedback = self._grok.review(
            snapshot=snapshot,
            signal=signal,
            context=context,
            open_positions=open_positions,
        )

        working_signal = signal
        metadata: Dict[str, Any] = {"source": "dual_llm"}
        runs: list[LLMRun] = []
        combined_alerts: list[str] = []

        if grok_feedback:
            metadata["grok"] = dict(grok_feedback.metadata)
            combined_alerts = collect_strings(grok_feedback.metadata.get("alerts"))
            if grok_feedback.raw_response:
                runs.append(
                    LLMRun(
                        name="grok",
                        prompt=grok_feedback.metadata.get("prompt", ""),
                        response=grok_feedback.raw_response,
                        parameters={
                            "temperature": self.grok_temperature,
                            "max_tokens": self.grok_max_tokens,
                            "nucleus_p": self.grok_nucleus_p,
                        },
                    )
                )
            if grok_feedback.adjusted_signal is not None:
                working_signal = grok_feedback.adjusted_signal
        else:
            metadata["grok"] = {}

        risk_prompt = self._build_risk_prompt(
            snapshot=snapshot,
            signal=working_signal,
            context=context,
            open_positions=open_positions,
            grok_feedback=grok_feedback,
        )

        metadata["deepseek"] = {"prompt": risk_prompt}
        deepseek_run = LLMConfig(
            name="deepseek",
            client=self.deepseek_client,
            temperature=self.deepseek_temperature,
            nucleus_p=self.deepseek_nucleus_p,
            max_tokens=self.deepseek_max_tokens,
        ).run(risk_prompt)
        deepseek_response = deepseek_run.response
        if deepseek_run.response:
            runs.append(deepseek_run)

        parsed = GrokAdvisor._parse_response(deepseek_response) or {}
        metadata["deepseek"].update(parsed)

        deepseek_alerts = collect_strings(parsed.get("alerts"))
        if deepseek_alerts:
            combined_alerts = collect_strings(combined_alerts, deepseek_alerts)

        applied_confidence = working_signal.confidence
        absolute_confidence = self._absolute_confidence(parsed)
        modifier: Optional[float] = None

        if absolute_confidence is not None:
            applied_confidence = absolute_confidence
            metadata["deepseek"]["applied_confidence"] = applied_confidence
        else:
            modifier = self._confidence_modifier(parsed)
            if modifier is None:
                modifier = self._risk_multiplier(parsed)
            if modifier is not None:
                applied_confidence = working_signal.confidence * modifier
                metadata["deepseek"]["applied_modifier"] = modifier

        applied_confidence = max(0.0, min(1.0, applied_confidence))

        adjusted_signal: Optional[TradeSignal] = None
        if not math.isclose(applied_confidence, working_signal.confidence, rel_tol=1e-6):
            adjusted_signal = TradeSignal(
                direction=working_signal.direction,
                confidence=applied_confidence,
                votes=working_signal.votes,
                neighbors_considered=working_signal.neighbors_considered,
            )
        elif grok_feedback and grok_feedback.adjusted_signal is not None:
            adjusted_signal = grok_feedback.adjusted_signal

        if combined_alerts:
            metadata["alerts"] = combined_alerts

        raw_response = serialise_runs(runs)

        return AdvisorFeedback(
            adjusted_signal=adjusted_signal,
            metadata=metadata,
            raw_response=raw_response,
        )

    def _build_risk_prompt(
        self,
        *,
        snapshot: MarketSnapshot,
        signal: TradeSignal,
        context: Dict[str, Any],
        open_positions: Sequence[ActivePosition],
        grok_feedback: Optional[AdvisorFeedback],
    ) -> str:
        snapshot_payload: Dict[str, Any] = {
            "symbol": snapshot.symbol,
            "timestamp": snapshot.timestamp.isoformat(),
            "close": snapshot.close,
            "rsi_fast": snapshot.rsi_fast,
            "adx_fast": snapshot.adx_fast,
            "rsi_slow": snapshot.rsi_slow,
            "adx_slow": snapshot.adx_slow,
            "seasonal_bias": snapshot.seasonal_bias,
            "seasonal_confidence": snapshot.seasonal_confidence,
            "pip_size": snapshot.pip_size,
        }
        if snapshot.correlation_scores:
            snapshot_payload["correlation_scores"] = snapshot.correlation_scores

        open_summary = [
            {
                "symbol": pos.symbol,
                "direction": GrokAdvisor._direction(pos.direction),
                "size": pos.size,
                "entry_price": pos.entry_price,
                "stop_loss": pos.stop_loss,
                "take_profit": pos.take_profit,
                "opened_at": pos.opened_at.isoformat() if pos.opened_at else None,
            }
            for pos in open_positions
        ]

        grok_summary: Dict[str, Any] = {}
        if grok_feedback:
            grok_summary.update(grok_feedback.metadata)
            if grok_feedback.adjusted_signal is not None:
                grok_summary.setdefault(
                    "adjusted_confidence",
                    grok_feedback.adjusted_signal.confidence,
                )
            if grok_feedback.raw_response:
                grok_summary.setdefault("raw_response", grok_feedback.raw_response)

        snapshot_json = json.dumps(snapshot_payload, indent=2, default=str, sort_keys=True)
        context_json = json.dumps(context, indent=2, default=str, sort_keys=True)
        grok_json = json.dumps(grok_summary, indent=2, default=str, sort_keys=True)
        positions_json = json.dumps(open_summary, indent=2, default=str, sort_keys=True)

        return textwrap.dedent(
            f"""
            You are DeepSeek-V3 acting as the chief risk officer for a systematic FX desk.
            Review the proposed trade and Grok-1 commentary. Respond with a single JSON object containing:
              - "confidence_modifier": optional multiplier between 0 and 1 to scale the input confidence.
              - "adjusted_confidence": optional absolute confidence override between 0 and 1.
              - "risk_score": optional aggregate risk score between 0 and 1 (higher means more risk).
              - "alerts": optional array of short risk callouts.
              - "rationale": optional concise explanation.
            Ensure the response is minified machine-readable JSON with no extra prose.

            Signal under review:
              direction: {GrokAdvisor._direction(signal.direction)}
              confidence: {signal.confidence:.4f}
              votes: {signal.votes}
              neighbours: {signal.neighbors_considered}

            Market snapshot:
            {snapshot_json}

            Context modifiers:
            {context_json}

            Grok analysis:
            {grok_json}

            Open positions:
            {positions_json}
            """
        ).strip()

    @staticmethod
    def _absolute_confidence(payload: Dict[str, Any]) -> Optional[float]:
        value = DualLLMAdvisor._extract_float(payload, ("adjusted_confidence", "final_confidence"))
        if value is None:
            return None
        return max(0.0, min(1.0, value))

    @staticmethod
    def _confidence_modifier(payload: Dict[str, Any]) -> Optional[float]:
        value = DualLLMAdvisor._extract_float(
            payload,
            ("confidence_modifier", "confidence_scale", "scale", "multiplier"),
        )
        if value is None:
            return None
        return max(0.0, min(1.0, value))

    def _risk_multiplier(self, payload: Dict[str, Any]) -> Optional[float]:
        value = self._extract_float(
            payload,
            ("risk_score", "risk", "penalty", "confidence_penalty"),
        )
        if value is None:
            return None
        value = max(0.0, min(1.0, value))
        modifier = 1.0 - value * self.risk_weight
        modifier = max(self.risk_floor, min(1.0, modifier))
        return modifier

    @staticmethod
    def _extract_float(payload: Dict[str, Any], keys: Sequence[str]) -> Optional[float]:
        for key in keys:
            if key not in payload:
                continue
            try:
                value = float(payload[key])
            except (TypeError, ValueError):
                continue
            if math.isnan(value) or math.isinf(value):  # pragma: no cover - defensive
                continue
            return value
        return None

@dataclass
class LocalGrokClient:
    """Completion client that proxies the reference Grok runner."""

    runner: Any
    nucleus_p: float = 0.9
    auto_initialize: bool = False

    def __post_init__(self) -> None:
        self._generator = None
        self._request_cls = None
        self._nucleus_p = self.nucleus_p
        self._rng = random.Random(42)
        if self.auto_initialize:
            self.initialize()

    def initialize(self) -> None:
        self._ensure_runtime()
        if getattr(self.runner, "params", None) is not None:
            return
        if hasattr(self.runner, "initialize"):
            self.runner.initialize()

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self._ensure_runtime()
        if getattr(self.runner, "params", None) is None and hasattr(self.runner, "initialize"):
            self.runner.initialize()
        if self._generator is None and hasattr(self.runner, "run"):
            self._generator = self.runner.run()
        if self._generator is None:
            raise RuntimeError("Runner does not provide a generator interface")
        generator = self._generator
        request_cls = self._request_cls
        if request_cls is None:
            raise RuntimeError("Grok runtime was not initialised correctly")
        next(generator)
        request = request_cls(
            prompt=prompt,
            temperature=temperature,
            nucleus_p=nucleus_p or self._nucleus_p,
            rng_seed=self._rng.getrandbits(64),
            max_len=max_tokens,
        )
        return generator.send(request)

    def _ensure_runtime(self) -> None:
        if self._request_cls is not None:
            return
        grok_root = Path(__file__).resolve().parents[2] / "grok-1"
        if str(grok_root) not in sys.path:
            sys.path.insert(0, str(grok_root))
        import runners  # type: ignore  # noqa: WPS433,E402

        self._request_cls = getattr(runners, "Request")
        self._generator = None


__all__ = [
    "AdvisorFeedback",
    "CompletionClient",
    "DualLLMAdvisor",
    "GrokAdvisor",
    "LocalGrokClient",
    "TradeAdvisor",
]
