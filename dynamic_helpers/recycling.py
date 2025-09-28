"""Helper utilities for working with the dynamic recycling engine."""

from __future__ import annotations

from typing import Iterable, Mapping, Sequence

from dynamic_recycling import (
    DynamicRecyclingEngine,
    MaterialStream,
    RecyclingEvent,
    RecyclingInsight,
    RecyclingStrategy,
)

__all__ = [
    "build_material_stream",
    "build_recycling_event",
    "summarise_recycling_events",
    "format_recycling_digest",
]


def build_material_stream(
    name: str,
    category: str,
    mass_kg: float,
    *,
    contamination_rate: float = 0.0,
    moisture_rate: float = 0.0,
    embodied_emissions_kg: float = 0.0,
) -> MaterialStream:
    """Construct a :class:`MaterialStream` with validation."""

    return MaterialStream(
        name=name,
        category=category,
        mass_kg=mass_kg,
        contamination_rate=contamination_rate,
        moisture_rate=moisture_rate,
        embodied_emissions_kg=embodied_emissions_kg,
    )


def build_recycling_event(
    *,
    stream: MaterialStream | Mapping[str, object],
    facility: str,
    recovery_rate: float,
    energy_used_kwh: float,
    labour_hours: float = 0.0,
    notes: str | None = None,
    tags: Sequence[str] | str | None = None,
    metadata: Mapping[str, object] | None = None,
) -> RecyclingEvent:
    """Normalise stream payloads before constructing an event."""

    resolved_stream = stream
    if not isinstance(resolved_stream, MaterialStream):
        resolved_stream = MaterialStream(**dict(stream))
    return RecyclingEvent(
        stream=resolved_stream,
        facility=facility,
        recovery_rate=recovery_rate,
        energy_used_kwh=energy_used_kwh,
        labour_hours=labour_hours,
        notes=notes,
        tags=tags,
        metadata=metadata,
    )


def summarise_recycling_events(
    engine: DynamicRecyclingEngine,
    events: Iterable[RecyclingEvent | Mapping[str, object]],
    *,
    window: int | None = None,
) -> RecyclingInsight:
    """Register events on ``engine`` and return the resulting insight."""

    engine.bulk_register(events)
    return engine.summarise(window=window)


def _format_percentage(value: float) -> str:
    return f"{value * 100:.1f}%"


def format_recycling_digest(
    insight: RecyclingInsight,
    strategy: RecyclingStrategy | None = None,
    *,
    include_alerts: bool = True,
) -> str:
    """Return a concise textual digest for messaging surfaces."""

    lines = [
        "♻️ Recycling update",
        (
            f"Input {insight.total_input_kg:,.1f} kg · Recovered {insight.total_recovered_kg:,.1f} kg"
        ),
        (
            f"Recycling rate {_format_percentage(insight.recycling_rate)} · "
            f"Avg recovery {_format_percentage(insight.avg_recovery_rate)}"
        ),
        (
            f"Contamination {_format_percentage(insight.contamination_index)} · "
            f"Energy {insight.energy_intensity_kwh_per_kg:.3f} kWh/kg"
        ),
        (
            f"Emissions {insight.projected_emissions_kg:,.2f} kg · "
            f"Labour {insight.labour_intensity_hours_per_tonne:.2f} h/t"
        ),
    ]

    if include_alerts and insight.alerts:
        lines.append("Alerts:")
        lines.extend(f"  • {alert}" for alert in insight.alerts)

    if strategy is not None:
        lines.append(f"Strategy focus: {strategy.focus_area}")
        if strategy.actions:
            lines.extend(f"  → {action}" for action in strategy.actions)
        lines.append(
            f"Expected efficiency gain: {_format_percentage(strategy.expected_efficiency_gain)}"
        )
        if strategy.notes:
            lines.append(f"Note: {strategy.notes}")

    return "\n".join(lines)
