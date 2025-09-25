"""Utilities for requesting Grok-backed advice on trading decisions."""

from __future__ import annotations

import json
import random
import re
import sys
import textwrap
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Match, Optional, Protocol, Sequence

from .trade_logic import ActivePosition, MarketSnapshot, TradeSignal


class CompletionClient(Protocol):  # pragma: no cover - interface definition
    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        """Return a completion for the supplied prompt."""


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
    """High-level adapter that prompts an LLM for risk/context adjustments."""

    client: CompletionClient
    temperature: float = 0.25
    nucleus_p: float = 0.9
    max_tokens: int = 256
    source: str = "grok"

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
        metadata = self._base_metadata(prompt)
        feedback = AdvisorFeedback(
            metadata=metadata,
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
        summary = self._prompt_summary()
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

    def _prompt_summary(self) -> str:
        return textwrap.dedent(
            """
            You are reviewing a foreign-exchange trading signal. Return a single JSON object
            with the fields:
              - "adjusted_confidence": number between 0 and 1 when you recommend overriding the
                supplied confidence (omit the field to keep the value unchanged)
              - "rationale": short human-readable explanation (string)
              - "alerts": optional array of strings highlighting material risks or TODOs
            Keep commentary concise and grounded in the provided telemetry.
            """
        ).strip()

    def _base_metadata(self, prompt: str) -> Dict[str, Any]:
        return {"source": self.source, "prompt": prompt}

    def _parse_response(self, response: str) -> Optional[Dict[str, Any]]:
        text = response.strip()
        if not text:
            return None
        cleaned, reasoning = self._strip_reasoning_markers(text)
        data = self._extract_json_payload(cleaned)
        if isinstance(data, dict):
            payload = self._normalise_payload(data)
            if reasoning and "analysis" not in payload:
                payload["analysis"] = reasoning
            return payload
        result: Dict[str, Any] = {"rationale": cleaned or text}
        if reasoning:
            result["analysis"] = reasoning
        return result

    @staticmethod
    def _strip_reasoning_markers(text: str) -> tuple[str, Optional[str]]:
        """Remove <think> blocks while preserving their content separately."""

        analysis_parts: list[str] = []
        think_pattern = re.compile(r"<think>(.*?)</think>", flags=re.DOTALL | re.IGNORECASE)

        def _collect(match: Match[str]) -> str:
            inner = match.group(1).strip()
            if inner:
                analysis_parts.append(inner)
            return ""

        stripped = think_pattern.sub(_collect, text)
        stripped = re.sub(r"</?think>", "", stripped, flags=re.IGNORECASE).strip()
        analysis = "\n\n".join(analysis_parts) if analysis_parts else None
        return stripped, analysis

    @staticmethod
    def _extract_json_payload(text: str) -> Dict[str, Any] | str:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, flags=re.DOTALL)
            if not match:
                return text
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return text

    @staticmethod
    def _normalise_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        if "final" in payload and isinstance(payload["final"], dict):
            final = dict(payload["final"])
            analysis = payload.get("analysis") or payload.get("thoughts")
            if analysis and "analysis" not in final:
                final["analysis"] = analysis
            if "alerts" in payload and "alerts" not in final:
                final["alerts"] = payload["alerts"]
            return final
        if "result" in payload and isinstance(payload["result"], dict):
            result = dict(payload["result"])
            for key in ("analysis", "thoughts"):
                if key in payload and key not in result:
                    result[key] = payload[key]
            return result
        return payload

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
    "GrokAdvisor",
    "LocalGrokClient",
    "TradeAdvisor",
]
