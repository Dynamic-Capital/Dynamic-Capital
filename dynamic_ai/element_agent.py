"""Dedicated ElementAgent implementation for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, fields
from typing import Any, Dict, Iterable, Mapping, Sequence, TYPE_CHECKING

from algorithms.python.trading_psychology_elements import (
    Element,
    ElementProfile,
    ElementSignal,
    PsychologyTelemetry,
    score_elements,
)
from dynamic_algo.dynamic_elements import (
    DynamicElementAlgo,
    ElementContribution,
    ElementSummary,
)

if TYPE_CHECKING:  # pragma: no cover - import-time only
    from .agents import ElementAgentResult

__all__ = ["ElementAgent"]

_SIGNAL_OPTION_KEYS = frozenset({"weight", "timestamp", "source", "metadata"})
_READINESS_ELEMENTS = frozenset({Element.EARTH, Element.LIGHT})
_RECOVERY_ELEMENTS = frozenset({Element.DARKNESS})
_ELEMENT_ORDER = {element: index for index, element in enumerate(Element)}
_TELEMETRY_FIELD_NAMES = frozenset(field.name for field in fields(PsychologyTelemetry))


def _element_rank(element: Element) -> int:
    return _ELEMENT_ORDER[element]


def _summary_level(summary: ElementSummary) -> str:
    score = summary.average_score
    element = summary.element

    if element in _READINESS_ELEMENTS:
        if score >= 7.0:
            return "peak"
        if score >= 4.0:
            return "building"
        return "nascent"

    if element in _RECOVERY_ELEMENTS:
        if score >= 7.0:
            return "surging"
        if score >= 4.0:
            return "stabilising"
        return "recovering"

    if score >= 7.0:
        return "critical"
    if score >= 4.0:
        return "elevated"
    return "stable"


def _format_highlight(summary: ElementSummary) -> str:
    momentum = f"{summary.momentum:+.2f}" if summary.momentum else "+0.00"
    base = f"{summary.name.title()} {summary.average_score:.2f} ({_summary_level(summary)})"
    base += f" Δ{momentum}"
    if summary.top_sources:
        sources = ", ".join(summary.top_sources)
        base += f" via {sources}"
    return base


def _prepare_metadata(value: Any) -> Dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, Mapping):
        return dict(value)
    raise TypeError("metadata must be a mapping")


def _merge_metadata(
    base: Mapping[str, Any] | None, extra: Mapping[str, Any] | None
) -> Dict[str, Any] | None:
    if not base and not extra:
        return None
    merged: Dict[str, Any] = {}
    if base:
        merged.update(base)
    if extra:
        merged.update(extra)
    return merged or None


def _coerce_psychology_telemetry(value: Any) -> PsychologyTelemetry:
    if isinstance(value, PsychologyTelemetry):
        return value
    if isinstance(value, Mapping):
        payload = {
            key: raw
            for key, raw in value.items()
            if key in _TELEMETRY_FIELD_NAMES
        }
        return PsychologyTelemetry(**payload)
    raise TypeError("telemetry must be PsychologyTelemetry or mapping")


def _extract_telemetry_bundle(
    value: Any,
) -> tuple[PsychologyTelemetry, Dict[str, Any]]:
    if isinstance(value, Mapping):
        telemetry_payload = {
            key: raw
            for key, raw in value.items()
            if key in _TELEMETRY_FIELD_NAMES
        }
        options = {
            key: value[key]
            for key in _SIGNAL_OPTION_KEYS.intersection(value.keys())
        }
        return _coerce_psychology_telemetry(telemetry_payload), dict(options)
    return _coerce_psychology_telemetry(value), {}


def _coerce_element_signal(value: Any) -> ElementSignal:
    if isinstance(value, ElementSignal):
        return value
    if isinstance(value, Mapping):
        element_value = value.get("element")
        if isinstance(element_value, Element):
            element = element_value
        elif isinstance(element_value, str):
            element = Element(element_value.lower())
        else:
            raise TypeError("signal requires an 'element' identifier")

        if "score" not in value:
            raise TypeError("signal requires a 'score' value")

        score = max(0.0, min(10.0, float(value.get("score", 0.0))))
        level = str(value.get("level", "stable"))
        reasons_source = value.get("reasons")
        if isinstance(reasons_source, Iterable) and not isinstance(
            reasons_source, (str, bytes)
        ):
            reasons = tuple(str(reason) for reason in reasons_source if str(reason))
        elif reasons_source is None:
            reasons = ()
        else:
            reasons = (str(reasons_source),)

        rec_source = value.get("recommendations")
        if isinstance(rec_source, Iterable) and not isinstance(
            rec_source, (str, bytes)
        ):
            recommendations = tuple(str(rec) for rec in rec_source if str(rec))
        elif rec_source is None:
            recommendations = ()
        else:
            recommendations = (str(rec_source),)

        return ElementSignal(
            element=element,
            score=score,
            level=level,
            reasons=reasons,
            recommendations=recommendations,
        )
    raise TypeError("element signals must be ElementSignal instances or mappings")


def _iter_element_signals(payload: Any) -> tuple[ElementSignal, ...]:
    if payload is None:
        return ()
    if isinstance(payload, ElementProfile):
        return tuple(payload.signals)
    if isinstance(payload, ElementSignal):
        return (payload,)
    if isinstance(payload, Mapping):
        if "signals" in payload:
            return _iter_element_signals(payload["signals"])
        if {"element", "score"}.issubset(payload.keys()):
            return (_coerce_element_signal(payload),)
    if isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
        signals: list[ElementSignal] = []
        for item in payload:
            signals.extend(_iter_element_signals(item))
        return tuple(signals)
    raise TypeError("element signals must be ElementSignal instances or mappings")


def _resolve_signal_bundle(
    payload: Any,
) -> tuple[tuple[ElementSignal, ...], Dict[str, Any]]:
    if isinstance(payload, Mapping) and "signals" in payload:
        options = {
            key: payload[key]
            for key in _SIGNAL_OPTION_KEYS.intersection(payload.keys())
        }
        return _iter_element_signals(payload["signals"]), dict(options)
    return _iter_element_signals(payload), {}


def _merge_signal_options(
    *,
    default_weight: Any,
    default_timestamp: Any,
    default_source: Any,
    default_metadata: Mapping[str, Any] | None,
    overrides: Mapping[str, Any],
) -> Dict[str, Any]:
    weight = overrides.get("weight")
    if weight is None:
        weight = default_weight
    if weight is None:
        weight = 1.0

    timestamp = overrides.get("timestamp", default_timestamp)
    source = overrides.get("source", default_source)

    override_metadata_raw = overrides.get("metadata") if "metadata" in overrides else None
    if "metadata" in overrides:
        override_metadata = _prepare_metadata(override_metadata_raw)
    else:
        override_metadata = None

    metadata = _merge_metadata(default_metadata, override_metadata)

    return {
        "weight": weight,
        "timestamp": timestamp,
        "source": source,
        "metadata": metadata,
    }


def _record_signals(
    algo: DynamicElementAlgo,
    signals: Sequence[ElementSignal],
    *,
    weight: Any,
    source: Any,
    timestamp: Any,
    metadata: Mapping[str, Any] | None,
) -> None:
    if not signals:
        return

    resolved_weight = weight if weight is not None else 1.0
    for signal in signals:
        entry_metadata: Dict[str, Any] = {}
        if metadata:
            entry_metadata.update(metadata)
        entry_metadata.setdefault("level", signal.level)
        if signal.reasons:
            entry_metadata.setdefault("reasons", list(signal.reasons))
        if signal.recommendations:
            entry_metadata.setdefault(
                "recommendations", list(signal.recommendations)
            )
        try:
            algo.record(
                signal.element,
                signal.score,
                weight=resolved_weight,
                source=source,
                timestamp=timestamp,
                metadata=entry_metadata or None,
            )
        except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
            raise ValueError(str(exc)) from exc


def _iter_contribution_payloads(
    payload: Any,
) -> Iterable[ElementContribution | Mapping[str, Any]]:
    if payload is None:
        return ()
    if isinstance(payload, ElementContribution):
        return (payload,)
    if isinstance(payload, Mapping):
        return (payload,)
    if isinstance(payload, Iterable) and not isinstance(payload, (str, bytes)):
        return tuple(
            item
            for item in payload
            if isinstance(item, (ElementContribution, Mapping))
        )
    raise TypeError(
        "Element contributions must be ElementContribution instances or mappings."
    )


def _record_contribution(
    algo: DynamicElementAlgo, entry: ElementContribution | Mapping[str, Any]
) -> ElementContribution:
    if isinstance(entry, ElementContribution):
        return algo.record(
            entry.element,
            entry.score,
            weight=entry.weight,
            source=entry.source,
            timestamp=entry.timestamp,
            metadata=entry.metadata,
        )

    element = entry.get("element") or entry.get("name")
    if element is None:
        raise ValueError("Element contribution is missing an 'element' field.")

    if "score" in entry:
        score = entry["score"]
    elif "value" in entry:
        score = entry["value"]
    elif "intensity" in entry:
        score = entry["intensity"]
    else:
        raise ValueError("Element contribution is missing a score value.")

    weight = entry.get("weight", entry.get("w", 1.0))
    source = entry.get("source") or entry.get("origin")
    timestamp = entry.get("timestamp") or entry.get("time") or entry.get("captured_at")
    metadata = entry.get("metadata")

    return algo.record(
        element,
        score,
        weight=weight,
        source=source,
        timestamp=timestamp,
        metadata=metadata,
    )


def _coerce_focus(value: Any) -> str | Element | None:
    if value is None:
        return None
    if isinstance(value, Element):
        return value
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


@dataclass(slots=True)
class _ElementAgentState:
    algo: DynamicElementAlgo


class ElementAgent:
    """Persona orchestrating :class:`DynamicElementAlgo` telemetry."""

    name = "elements"

    def __init__(self, algo: DynamicElementAlgo | None = None) -> None:
        self._state = _ElementAgentState(algo or DynamicElementAlgo())

    @property
    def algo(self) -> DynamicElementAlgo:
        return self._state.algo

    def run(self, payload: Mapping[str, Any]) -> ElementAgentResult:
        from .agents import ElementAgentResult  # local import to avoid cycles

        context = dict(payload or {})

        if context.get("clear"):
            target = context.get("clear")
            if isinstance(target, (str, Element)):
                self.algo.clear(target)
            elif isinstance(target, Iterable) and not isinstance(target, (str, bytes)):
                for item in target:
                    self.algo.clear(item)
            else:
                self.algo.clear()

        entries = context.get("contributions")
        if entries is None:
            entries = context.get("contribution")
        if entries is None and {"element", "score"}.issubset(context.keys()):
            entries = {
                "element": context.get("element"),
                "score": context.get("score"),
                "weight": context.get("weight"),
                "source": context.get("source"),
                "timestamp": context.get("timestamp"),
                "metadata": context.get("metadata"),
            }

        if entries is not None:
            try:
                contributions = _iter_contribution_payloads(entries)
            except TypeError as exc:  # pragma: no cover - defensive guardrail
                raise ValueError(str(exc)) from exc

            for entry in contributions:
                try:
                    _record_contribution(self.algo, entry)
                except (TypeError, ValueError) as exc:
                    raise ValueError(f"Invalid element contribution: {exc}") from exc

        if "metadata" in context:
            try:
                base_metadata = _prepare_metadata(context.get("metadata"))
            except TypeError as exc:
                raise ValueError(str(exc)) from exc
        else:
            base_metadata = None

        default_weight = context.get("weight")
        default_source = context.get("source")
        default_timestamp = context.get("timestamp")

        telemetry_payload = context.get("telemetry")
        if telemetry_payload is not None:
            try:
                telemetry, overrides = _extract_telemetry_bundle(telemetry_payload)
                signal_options = _merge_signal_options(
                    default_weight=default_weight,
                    default_timestamp=default_timestamp,
                    default_source=default_source,
                    default_metadata=base_metadata,
                    overrides=overrides,
                )
                profile = score_elements(telemetry)
                _record_signals(self.algo, profile.signals, **signal_options)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid psychology telemetry: {exc}") from exc

        profile_payload = context.get("profile")
        if profile_payload is not None:
            try:
                signals, overrides = _resolve_signal_bundle(profile_payload)
                signal_options = _merge_signal_options(
                    default_weight=default_weight,
                    default_timestamp=default_timestamp,
                    default_source=default_source,
                    default_metadata=base_metadata,
                    overrides=overrides,
                )
                _record_signals(self.algo, signals, **signal_options)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid element profile: {exc}") from exc

        signals_payload = context.get("signals")
        if signals_payload is not None:
            try:
                signals, overrides = _resolve_signal_bundle(signals_payload)
                signal_options = _merge_signal_options(
                    default_weight=default_weight,
                    default_timestamp=default_timestamp,
                    default_source=default_source,
                    default_metadata=base_metadata,
                    overrides=overrides,
                )
                _record_signals(self.algo, signals, **signal_options)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid element signal: {exc}") from exc

        focus_candidate = (
            context.get("focus")
            or context.get("spotlight")
            or context.get("priority")
            or context.get("element_focus")
        )
        focus = _coerce_focus(focus_candidate)

        snapshot = self.algo.snapshot()

        focus_summary: ElementSummary | None = None
        if focus is not None:
            try:
                focus_summary = self.algo.summary(focus)
            except (TypeError, ValueError):
                focus_summary = None

        summaries = sorted(
            snapshot.summaries,
            key=lambda summary: (summary.average_score, -_element_rank(summary.element)),
            reverse=True,
        )
        highlights = [
            _format_highlight(summary)
            for summary in summaries
            if summary.sample_count > 0
        ][:3]

        balance = snapshot.balance_index
        confidence = max(0.0, min(1.0, (balance + 10.0) / 20.0))

        dominant = snapshot.dominant_element.title()
        rationale_parts = [
            f"{dominant} leads at {snapshot.dominant_score:.2f} ({snapshot.dominant_level}).",
            f"Readiness {snapshot.readiness_index:.2f} vs caution {snapshot.caution_index:.2f}.",
        ]
        if focus_summary is not None and focus_summary.sample_count > 0:
            rationale_parts.append(
                f"Focus {focus_summary.name.title()} momentum {focus_summary.momentum:+.2f}."
            )

        recommendations: list[str] = []
        if balance < -1.5:
            recommendations.append("Caution outweighs readiness; activate recovery rituals.")
        if balance > 1.5:
            recommendations.append("Readiness dominant; consider scaling high-confidence plays.")
        if snapshot.recovery_index >= 3.5:
            recommendations.append("Recovery signals rising; allocate decompression windows.")
        if snapshot.dispersion >= 2.0:
            recommendations.append("Element dispersion elevated; harmonise contributions across squads.")
        if focus_summary is not None and focus_summary.momentum <= -1.0:
            recommendations.append(
                f"{focus_summary.name.title()} momentum negative; stabilise supporting workflows."
            )
        if not recommendations:
            recommendations.append("Elemental posture balanced; maintain current cadence.")

        return ElementAgentResult(
            agent=self.name,
            rationale=" ".join(rationale_parts),
            confidence=confidence,
            snapshot=snapshot,
            focus=focus_summary,
            highlights=tuple(dict.fromkeys(highlights)),
            recommendations=tuple(dict.fromkeys(recommendations)),
        )
