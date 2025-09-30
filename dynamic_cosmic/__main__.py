"""Command line interface for the :mod:`dynamic_cosmic` engine."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable, Mapping, MutableMapping, Sequence

from .cosmic import (
    CosmicBridge,
    CosmicCoordinate,
    CosmicPhenomenon,
    CosmicSignal,
    CosmicTimelineEvent,
    DynamicCosmic,
)

DEFAULT_SCENARIO = {
    "phenomena": [
        {
            "identifier": "aurora-core",
            "location": {"x": 0.0, "y": 1.8, "z": -0.4},
            "magnitude": 8.2,
            "volatility": 0.28,
            "signals": [
                {
                    "identifier": "aurora-band",
                    "wavelength_nm": 540.0,
                    "amplitude": 4.6,
                    "coherence": 0.82,
                    "origin": "Solar Observatory",
                },
                {
                    "identifier": "ion-rain",
                    "wavelength_nm": 620.0,
                    "amplitude": 3.1,
                    "coherence": 0.65,
                    "origin": "Ionospheric Array",
                },
            ],
            "tags": ["aurora", "core"],
        },
        {
            "identifier": "quantum-halo",
            "location": [-1.4, 0.6, 1.9],
            "magnitude": 6.7,
            "volatility": 0.18,
            "signals": [
                {
                    "identifier": "halo-spin",
                    "wavelength_nm": 480.0,
                    "amplitude": 5.2,
                    "coherence": 0.77,
                    "origin": "Quantum Beacon",
                }
            ],
            "tags": ["halo"],
        },
        {
            "identifier": "nebula-resonance",
            "location": {"x": 2.4, "y": -0.8, "z": -1.2},
            "magnitude": 7.4,
            "volatility": 0.42,
            "signals": [
                {
                    "identifier": "plasma-wave",
                    "wavelength_nm": 700.0,
                    "amplitude": 6.8,
                    "coherence": 0.58,
                    "origin": "Deep Space Relay",
                }
            ],
            "tags": ["nebula", "resonance"],
        },
    ],
    "bridges": [
        {
            "source": "aurora-core",
            "target": "quantum-halo",
            "stability": 0.76,
            "flux": 5.4,
            "route_length": 1.6,
        },
        {
            "source": "quantum-halo",
            "target": "nebula-resonance",
            "stability": 0.64,
            "flux": 4.1,
            "route_length": 2.3,
        },
    ],
    "events": [
        {
            "description": "Heliospheric fluctuation detected",
            "impact": 0.58,
        },
        {
            "description": "Bridge reinforcement cycle completed",
            "impact": 0.34,
        },
    ],
}


def _parse_coordinate(value: Mapping[str, Any] | Sequence[float]) -> CosmicCoordinate:
    """Normalise a coordinate definition into a :class:`CosmicCoordinate`.

    The original implementation repeated this conversion in several call sites
    which became increasingly error-prone as the JSON schema gained optional
    aliases. Consolidating the parsing logic behind this helper keeps the
    validation in one place while also making the configuration loader easier to
    read and maintain.
    """

    if isinstance(value, CosmicCoordinate):
        return value

    if isinstance(value, Mapping):
        components = (value.get("x"), value.get("y"), value.get("z"))
    else:
        components = value

    try:
        x, y, z = components
    except Exception as exc:  # pragma: no cover - defensive guard
        raise ValueError("coordinate must provide three components") from exc
    return CosmicCoordinate(float(x), float(y), float(z))


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value))
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError("timestamp strings must be ISO-8601 compatible") from exc
    raise TypeError("unsupported timestamp format")


def _parse_signal(payload: CosmicSignal | Mapping[str, Any]) -> CosmicSignal:
    if isinstance(payload, CosmicSignal):
        return payload
    if isinstance(payload, Mapping):
        return CosmicSignal(**payload)
    raise TypeError("signals must be mappings or CosmicSignal instances")


def _parse_signals(payload: Iterable[CosmicSignal | Mapping[str, Any]]) -> tuple[CosmicSignal, ...]:
    return tuple(sorted((_parse_signal(item) for item in payload), key=lambda signal: signal.identifier))


def _build_phenomena(definitions: Iterable[Mapping[str, Any]]) -> list[CosmicPhenomenon]:
    phenomena: list[CosmicPhenomenon] = []
    for definition in definitions:
        location_data = definition.get("location")
        if location_data is None:
            raise ValueError("phenomenon definitions require a location")

        # Clone the mapping to avoid mutating the original definition provided
        # by the caller. This makes it safe to reuse configuration dictionaries
        # across multiple runs without worrying about hidden side-effects.
        params: MutableMapping[str, Any] = dict(definition)
        params["identifier"] = str(params.get("identifier"))
        params["location"] = _parse_coordinate(location_data)
        params["magnitude"] = float(params.get("magnitude", 0.0))
        params["volatility"] = float(params.get("volatility", 0.0))
        params["signals"] = _parse_signals(params.get("signals", ()))
        params["tags"] = tuple(params.get("tags", ()))

        phenomena.append(CosmicPhenomenon(**params))
    return phenomena


def _build_bridges(definitions: Iterable[Mapping[str, Any]], engine: DynamicCosmic) -> None:
    for definition in definitions:
        params = {
            "source": str(definition.get("source")),
            "target": str(definition.get("target")),
            "stability": float(definition.get("stability", 0.0)),
            "flux": float(definition.get("flux", 0.0)),
            "route_length": float(definition.get("route_length", 1.0)),
            "tags": tuple(definition.get("tags", ())),
        }
        engine.register_bridge(CosmicBridge(**params))


def _build_events(definitions: Iterable[Mapping[str, Any]], engine: DynamicCosmic) -> None:
    for definition in definitions:
        event_data = dict(definition)
        if "timestamp" in event_data and not isinstance(event_data["timestamp"], datetime):
            event_data["timestamp"] = _parse_timestamp(event_data["timestamp"])

        event_data["description"] = str(event_data.get("description"))
        event_data["impact"] = float(event_data.get("impact", 0.0))
        event_data["tags"] = tuple(event_data.get("tags", ()))

        engine.record_event(CosmicTimelineEvent(**event_data))


def _load_config(path: Path) -> Mapping[str, Any]:
    data = json.loads(path.read_text())
    if not isinstance(data, Mapping):
        raise TypeError("configuration root must be a JSON object")
    return data


def build_engine(config: Mapping[str, Any]) -> DynamicCosmic:
    history_limit = int(config.get("history_limit", 500))
    phenomena = _build_phenomena(config.get("phenomena", []))
    expansion_config = config.get("expansion_model")
    engine = DynamicCosmic(
        phenomena=phenomena,
        history_limit=history_limit,
        expansion_model=expansion_config,
    )
    _build_bridges(config.get("bridges", []), engine)
    _build_events(config.get("events", []), engine)

    injections = config.get("signals", [])
    for injection in injections:
        identifier = injection.get("phenomenon")
        signal = injection.get("signal")
        if identifier is None or signal is None:
            raise ValueError("signal injections require 'phenomenon' and 'signal'")
        engine.ingest_signal(str(identifier), signal)
    return engine


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the Dynamic Cosmic engine and emit telemetry")
    parser.add_argument(
        "--config",
        type=Path,
        help="Path to a JSON configuration file describing phenomena, bridges, and events.",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="Pretty-print the resulting telemetry snapshot.",
    )
    args = parser.parse_args(argv)

    config = DEFAULT_SCENARIO
    if args.config:
        config = _load_config(args.config)

    engine = build_engine(config)
    snapshot = engine.snapshot()
    payload = {
        "resilience": snapshot.get("resilience"),
        "phenomena": snapshot.get("phenomena", []),
        "bridges": snapshot.get("bridges", []),
        "events": snapshot.get("events", []),
        "expansion": snapshot.get("expansion", {}),
    }

    if args.pretty:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print(json.dumps(payload))
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    raise SystemExit(main())
