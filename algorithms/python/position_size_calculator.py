"""Dynamic multi-LLM position sizing utilities."""

from __future__ import annotations

import json
import math
import textwrap
from dataclasses import dataclass, field
from typing import Any, Dict, Mapping, Optional, Sequence

from .multi_llm import LLMConfig, collect_strings, parse_json_response, serialise_runs

__all__ = [
    "PositionSizingRequest",
    "PositionSizingResult",
    "PositionSizingPlan",
    "DynamicPositionSizeCalculator",
    "PositionSizeLLMOrchestrator",
]


@dataclass(slots=True)
class PositionSizingRequest:
    """Inputs required to determine risk-aware position sizing."""

    symbol: str
    account_balance: float
    risk_per_trade_pct: float
    entry_price: float
    stop_price: float
    direction: str = "long"
    contract_size: float = 1.0
    pip_value: float | None = None
    volatility_percent: float | None = None
    atr: float | None = None
    atr_reference: float | None = None
    max_leverage: float | None = None
    risk_overrides: Mapping[str, float] = field(default_factory=dict)
    notes: Sequence[str] = field(default_factory=tuple)


@dataclass(slots=True)
class PositionSizingResult:
    """Intermediate result produced by :class:`DynamicPositionSizeCalculator`."""

    symbol: str
    direction: str
    risk_amount: float
    risk_per_unit: float
    base_units: float
    base_notional: float
    adjusted_units: float
    adjusted_notional: float
    final_units: float
    final_notional: float
    risk_multiple: float
    adjustments: Dict[str, float]
    metadata: Dict[str, Any]


@dataclass(slots=True)
class PositionSizingPlan:
    """Final position plan after incorporating multi-LLM feedback."""

    symbol: str
    direction: str
    risk_amount: float
    risk_per_unit: float
    base_units: float
    base_notional: float
    pre_llm_units: float
    pre_llm_notional: float
    recommended_units: float
    recommended_notional: float
    risk_multiple: float
    recommended_risk_multiple: float
    adjustments: Dict[str, float]
    llm_adjustments: Dict[str, Any]
    insights: list[str]
    mitigations: list[str]
    confidence: Optional[float]
    metadata: Dict[str, Any]
    raw_responses: Optional[str]


class DynamicPositionSizeCalculator:
    """Calculate base position sizing using deterministic risk constraints."""

    def __init__(
        self,
        *,
        min_units: float = 0.0,
        max_units: float | None = None,
    ) -> None:
        self._default_min_units = max(0.0, min_units)
        self._default_max_units = max_units if (max_units is None or max_units > 0) else None

    def calculate(self, request: PositionSizingRequest) -> PositionSizingResult:
        """Return the deterministic sizing result prior to LLM adjustments."""

        direction = request.direction.lower()
        if direction not in {"long", "short"}:
            raise ValueError("direction must be 'long' or 'short'")

        stop_distance = abs(request.entry_price - request.stop_price)
        if stop_distance <= 0:
            raise ValueError("stop_price must differ from entry_price")

        value_per_unit = self._resolve_value_per_unit(request)
        risk_per_unit = stop_distance * value_per_unit
        if risk_per_unit <= 0:
            raise ValueError("risk per unit must be positive")

        risk_amount = max(0.0, request.account_balance * (request.risk_per_trade_pct / 100.0))
        base_units = risk_amount / risk_per_unit if risk_per_unit else 0.0
        unit_notional = abs(request.entry_price) * value_per_unit
        base_notional = base_units * unit_notional

        volatility_multiplier = self._volatility_multiplier(request.volatility_percent)
        atr_multiplier = self._atr_multiplier(request.atr, request.atr_reference)
        combined_multiplier = max(0.5, volatility_multiplier * atr_multiplier)

        adjusted_units = base_units / combined_multiplier if combined_multiplier else base_units
        adjusted_notional = adjusted_units * unit_notional

        bounds_metadata = self._resolve_bounds(request, unit_notional)
        final_units = self._apply_bounds(adjusted_units, unit_notional, bounds_metadata)
        final_notional = final_units * unit_notional

        risk_multiple = (final_units * risk_per_unit) / risk_amount if risk_amount else 0.0

        adjustments = {
            "volatility_multiplier": volatility_multiplier,
            "atr_multiplier": atr_multiplier,
            "combined_multiplier": combined_multiplier,
        }
        if not math.isclose(final_units, adjusted_units, rel_tol=1e-9, abs_tol=1e-9):
            adjustments["bounds_applied"] = final_units / adjusted_units if adjusted_units else 0.0

        metadata: Dict[str, Any] = {
            "account_balance": request.account_balance,
            "risk_per_trade_pct": request.risk_per_trade_pct,
            "stop_distance": stop_distance,
            "unit_value": unit_notional,
        }
        metadata.update(bounds_metadata)

        return PositionSizingResult(
            symbol=request.symbol,
            direction=direction,
            risk_amount=risk_amount,
            risk_per_unit=risk_per_unit,
            base_units=base_units,
            base_notional=base_notional,
            adjusted_units=adjusted_units,
            adjusted_notional=adjusted_notional,
            final_units=final_units,
            final_notional=final_notional,
            risk_multiple=risk_multiple,
            adjustments=adjustments,
            metadata=metadata,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _resolve_value_per_unit(self, request: PositionSizingRequest) -> float:
        value = request.pip_value if request.pip_value is not None else request.contract_size
        if value <= 0:
            raise ValueError("contract_size or pip_value must be positive")
        return value

    def _volatility_multiplier(self, volatility_percent: float | None) -> float:
        if volatility_percent is None:
            return 1.0
        vol = max(0.0, float(volatility_percent))
        if vol <= 25.0:
            # Allow modest leverage for very quiet markets
            return 0.85 + (vol / 25.0) * 0.15
        if vol >= 75.0:
            return 1.4
        return 1.0 + (vol - 25.0) * 0.008

    def _atr_multiplier(self, atr: float | None, atr_reference: float | None) -> float:
        if atr is None or atr_reference in (None, 0):
            return 1.0
        ratio = max(0.1, float(atr) / float(atr_reference))
        ratio = min(ratio, 2.5)
        return ratio

    def _resolve_bounds(
        self, request: PositionSizingRequest, unit_notional: float
    ) -> Dict[str, Any]:
        overrides = request.risk_overrides
        min_units = self._coerce_positive(overrides.get("min_units"), default=self._default_min_units)
        max_units = self._coerce_positive(overrides.get("max_units"), default=self._default_max_units)
        min_notional = self._coerce_positive(overrides.get("min_notional"))
        max_notional_override = self._coerce_positive(overrides.get("max_notional"))

        leverage_cap = None
        if request.max_leverage:
            leverage_cap = max(0.0, request.max_leverage)
        max_notional = None
        if leverage_cap and request.account_balance:
            max_notional = leverage_cap * request.account_balance
        if max_notional_override:
            max_notional = min(max_notional or max_notional_override, max_notional_override)

        bounds: Dict[str, Any] = {
            "min_units": min_units,
            "max_units": max_units,
            "min_notional": min_notional,
            "max_notional": max_notional,
            "max_leverage": leverage_cap,
        }
        # Pre-compute unit count required to satisfy min/max notional constraints.
        if min_notional and unit_notional > 0:
            bounds["min_units_for_notional"] = min_notional / unit_notional
        if max_notional and unit_notional > 0:
            bounds["max_units_for_notional"] = max_notional / unit_notional
        return bounds

    def _apply_bounds(
        self,
        units: float,
        unit_notional: float,
        bounds: Mapping[str, Any],
    ) -> float:
        position_units = max(0.0, units)
        min_units = bounds.get("min_units")
        if isinstance(min_units, (int, float)):
            position_units = max(position_units, float(min_units))

        min_units_for_notional = bounds.get("min_units_for_notional")
        if isinstance(min_units_for_notional, (int, float)):
            position_units = max(position_units, float(min_units_for_notional))

        max_units = bounds.get("max_units")
        if isinstance(max_units, (int, float)) and max_units > 0:
            position_units = min(position_units, float(max_units))

        max_units_for_notional = bounds.get("max_units_for_notional")
        if isinstance(max_units_for_notional, (int, float)) and max_units_for_notional > 0:
            position_units = min(position_units, float(max_units_for_notional))

        max_notional = bounds.get("max_notional")
        if isinstance(max_notional, (int, float)) and max_notional > 0 and unit_notional > 0:
            position_units = min(position_units, float(max_notional) / unit_notional)

        return max(position_units, 0.0)

    @staticmethod
    def _coerce_positive(value: Any, *, default: float | None = None) -> float | None:
        if value is None:
            return default
        try:
            numeric = float(value)
        except (TypeError, ValueError):
            return default
        if numeric <= 0 or math.isnan(numeric) or math.isinf(numeric):
            return default
        return numeric


class PositionSizeLLMOrchestrator:
    """Blend deterministic sizing with multi-LLM qualitative overlays."""

    def __init__(
        self,
        calculator: DynamicPositionSizeCalculator,
        models: Sequence[LLMConfig],
        *,
        include_prompts: bool = False,
    ) -> None:
        self.calculator = calculator
        self.models = tuple(models)
        self.include_prompts = include_prompts

    def build_plan(self, request: PositionSizingRequest) -> PositionSizingPlan:
        """Return a position sizing plan with dynamic multi-LLM guidance."""

        base_result = self.calculator.calculate(request)
        context = self._build_context(request, base_result)

        runs = []
        multipliers: list[float] = []
        confidence_scores: list[float] = []
        adjustment_samples: dict[str, list[float]] = {}
        insights: list[str] = []
        mitigations: list[str] = []

        for config in self.models:
            prompt = self._render_prompt(context, config.name)
            run = config.run(prompt)
            runs.append(run)
            payload = parse_json_response(run.response, fallback_key="narrative") or {}

            multiplier = self._extract_multiplier(payload)
            if multiplier is not None:
                multipliers.append(multiplier)

            confidence = self._extract_confidence(payload)
            if confidence is not None:
                confidence_scores.append(confidence)

            adjustments_payload = payload.get("position_adjustments")
            if isinstance(adjustments_payload, Mapping):
                for key, value in adjustments_payload.items():
                    number = self._extract_number(value)
                    if number is None:
                        continue
                    adjustment_samples.setdefault(key, []).append(number)

            insights.extend(
                collect_strings(
                    payload.get("insights"),
                    payload.get("highlights"),
                    payload.get("narrative"),
                )
            )
            mitigations.extend(
                collect_strings(
                    payload.get("risk_controls"),
                    payload.get("mitigations"),
                    payload.get("risk_management"),
                    payload.get("hedges"),
                )
            )

        mean_multiplier = sum(multipliers) / len(multipliers) if multipliers else 1.0
        pre_llm_units = base_result.final_units
        recommended_units = pre_llm_units * mean_multiplier
        recommended_units = self._apply_plan_bounds(recommended_units, base_result.metadata)

        unit_value = base_result.metadata.get("unit_value", 0.0)
        recommended_notional = recommended_units * unit_value
        recommended_risk_multiple = (
            (recommended_units * base_result.risk_per_unit) / base_result.risk_amount
            if base_result.risk_amount
            else 0.0
        )

        applied_multiplier = (
            recommended_units / pre_llm_units if pre_llm_units else mean_multiplier
        )

        averaged_adjustments = {
            key: sum(values) / len(values)
            for key, values in adjustment_samples.items()
            if values
        }

        confidence = (
            sum(confidence_scores) / len(confidence_scores) if confidence_scores else None
        )

        llm_adjustments: Dict[str, Any] = {
            "mean_multiplier": mean_multiplier,
            "applied_multiplier": applied_multiplier,
        }
        if multipliers:
            llm_adjustments["model_multipliers"] = multipliers
        if averaged_adjustments:
            llm_adjustments["position_adjustments"] = averaged_adjustments
        if confidence is not None:
            llm_adjustments["model_confidence_mean"] = confidence

        metadata = {
            "calculator": base_result.metadata,
            "llm_models": [run.name for run in runs],
        }

        raw_responses = (
            serialise_runs(runs, include_prompt=self.include_prompts) if runs else None
        )

        return PositionSizingPlan(
            symbol=base_result.symbol,
            direction=base_result.direction,
            risk_amount=base_result.risk_amount,
            risk_per_unit=base_result.risk_per_unit,
            base_units=base_result.base_units,
            base_notional=base_result.base_notional,
            pre_llm_units=pre_llm_units,
            pre_llm_notional=base_result.final_notional,
            recommended_units=recommended_units,
            recommended_notional=recommended_notional,
            risk_multiple=base_result.risk_multiple,
            recommended_risk_multiple=recommended_risk_multiple,
            adjustments=dict(base_result.adjustments),
            llm_adjustments=llm_adjustments,
            insights=insights,
            mitigations=mitigations,
            confidence=confidence,
            metadata=metadata,
            raw_responses=raw_responses,
        )

    # ------------------------------------------------------------------
    # Prompt helpers
    # ------------------------------------------------------------------

    def _build_context(
        self, request: PositionSizingRequest, result: PositionSizingResult
    ) -> Dict[str, Any]:
        return {
            "symbol": request.symbol,
            "direction": result.direction,
            "account_balance": request.account_balance,
            "risk_per_trade_pct": request.risk_per_trade_pct,
            "entry_price": request.entry_price,
            "stop_price": request.stop_price,
            "risk_amount": result.risk_amount,
            "risk_per_unit": result.risk_per_unit,
            "base_units": result.base_units,
            "adjusted_units": result.adjusted_units,
            "final_units": result.final_units,
            "volatility_percent": request.volatility_percent,
            "atr": request.atr,
            "atr_reference": request.atr_reference,
            "notes": list(request.notes),
            "metadata": result.metadata,
        }

    def _render_prompt(self, context: Mapping[str, Any], model_name: str) -> str:
        instructions = textwrap.dedent(
            f"""
            You are {model_name} collaborating on institutional position sizing.
            Review the supplied JSON context and return structured guidance in JSON format.
            Respond with an object containing optional keys:
              - "sizing_multiplier" (float): multiplier to apply to the proposed units.
              - "position_adjustments" (object): numeric modifiers for specific themes.
              - "insights" (array): concise insight strings.
              - "risk_controls" or "mitigations" (array): risk management steps.
              - "confidence" (float 0-1): confidence in your recommendations.
            Focus on actionable risk overlays and avoid commentary outside the JSON payload.
            """
        ).strip()
        payload = json.dumps(context, indent=2, sort_keys=True, default=str)
        return f"{instructions}\nContext:\n{payload}"

    # ------------------------------------------------------------------
    # Extraction helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_multiplier(payload: Mapping[str, Any]) -> float | None:
        candidate = (
            payload.get("sizing_multiplier")
            or payload.get("size_multiplier")
            or payload.get("multiplier")
        )
        return PositionSizeLLMOrchestrator._extract_number(candidate)

    @staticmethod
    def _extract_confidence(payload: Mapping[str, Any]) -> float | None:
        candidate = payload.get("confidence")
        value = PositionSizeLLMOrchestrator._extract_number(candidate)
        if value is None:
            return None
        return max(0.0, min(1.0, value))

    @staticmethod
    def _extract_number(value: Any) -> float | None:
        if value is None:
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        if math.isnan(number) or math.isinf(number):
            return None
        return number

    def _apply_plan_bounds(
        self, units: float, metadata: Mapping[str, Any]
    ) -> float:
        unit_value = metadata.get("unit_value")
        if not isinstance(unit_value, (int, float)) or unit_value <= 0:
            return max(0.0, units)

        min_units = metadata.get("min_units")
        if isinstance(min_units, (int, float)):
            units = max(units, float(min_units))

        min_notional = metadata.get("min_notional")
        if isinstance(min_notional, (int, float)) and min_notional > 0:
            units = max(units, float(min_notional) / unit_value)

        max_units = metadata.get("max_units")
        if isinstance(max_units, (int, float)) and max_units > 0:
            units = min(units, float(max_units))

        max_notional = metadata.get("max_notional")
        if isinstance(max_notional, (int, float)) and max_notional > 0:
            units = min(units, float(max_notional) / unit_value)

        return max(0.0, units)

