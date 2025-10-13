"""Parser for the Dynamic Trading language intent specification."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable, Mapping

from .model import TradeIntent, _normalise_optional_float, _normalise_optional_text

__all__ = ["parse_trade_intent", "TradeIntentParseError"]


class TradeIntentParseError(ValueError):
    """Raised when the DSL input cannot be converted into a ``TradeIntent``."""


_FIELD_ALIASES = {
    "instrument": {"instrument", "symbol"},
    "direction": {"direction", "side"},
    "conviction": {"conviction", "confidence"},
    "timeframe": {"timeframe", "horizon"},
    "catalysts": {"catalysts", "drivers"},
    "entry": {"entry", "entry_price"},
    "target": {"target", "target_price"},
    "stop": {"stop", "stop_loss"},
    "reasoning": {"reasoning", "thesis"},
    "risk_notes": {"risk_notes", "risks"},
    "metrics": {"metrics", "signals"},
    "style": {"style"},
    "created_at": {"created_at", "timestamp"},
}

_DEPRECATED_TOKENS = {"->", "::", "catalyst[", "risk["}


def _split_lines(content: str) -> Iterable[tuple[str, str]]:
    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        for token in _DEPRECATED_TOKENS:
            if token in line:
                raise TradeIntentParseError(
                    "deprecated grammar detected; use 'key: value' pairs instead"
                )
        if ":" in line:
            key, value = line.split(":", 1)
        elif "=" in line:
            key, value = line.split("=", 1)
        else:
            raise TradeIntentParseError(
                "lines must contain ':' or '=' separating field names and values"
            )
        yield key.strip().lower(), value.strip()


def _resolve_field_name(name: str) -> str:
    for canonical, aliases in _FIELD_ALIASES.items():
        if name in aliases:
            return canonical
    raise TradeIntentParseError(f"unknown field '{name}' in trade intent payload")


def _parse_sequence(value: str) -> tuple[str, ...]:
    if not value:
        return ()
    separators = [";", "|", ","]
    for separator in separators:
        if separator in value:
            parts = [item.strip() for item in value.split(separator)]
            return tuple(part for part in parts if part)
    cleaned = value.strip()
    return (cleaned,) if cleaned else ()


def _parse_metrics(value: str) -> Mapping[str, float] | None:
    if not value:
        return None
    entries: dict[str, float] = {}
    for part in value.split(","):
        item = part.strip()
        if not item:
            continue
        if "=" in item:
            key, raw = item.split("=", 1)
        elif ":" in item:
            key, raw = item.split(":", 1)
        else:
            raise TradeIntentParseError(
                "metrics must use 'name=value' syntax separated by commas"
            )
        key_clean = key.strip()
        if not key_clean:
            raise TradeIntentParseError("metric names must not be empty")
        entries[key_clean] = float(raw.strip())
    return entries or None


def _parse_timestamp(value: str) -> datetime:
    if not value:
        raise TradeIntentParseError("created_at requires an ISO8601 timestamp")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise TradeIntentParseError("invalid ISO8601 timestamp") from exc
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def parse_trade_intent(content: str) -> TradeIntent:
    """Parse the DSL definition into a :class:`TradeIntent`."""

    if not content or not content.strip():
        raise TradeIntentParseError("trade intent payload must not be empty")

    payload: dict[str, object] = {}
    for key, raw_value in _split_lines(content):
        field = _resolve_field_name(key)
        if field in payload:
            raise TradeIntentParseError(f"field '{field}' provided multiple times")
        match field:
            case "catalysts" | "risk_notes":
                payload[field] = _parse_sequence(raw_value)
            case "metrics":
                payload[field] = _parse_metrics(raw_value)
            case "entry" | "target" | "stop":
                payload[field] = _normalise_optional_float(raw_value)
            case "conviction":
                payload[field] = float(raw_value)
            case "created_at":
                payload[field] = _parse_timestamp(raw_value)
            case "reasoning":
                payload[field] = _normalise_optional_text(raw_value)
            case "style":
                payload[field] = raw_value.strip() or None
            case _:
                payload[field] = raw_value

    required = {"instrument", "direction", "conviction", "timeframe"}
    missing = sorted(required.difference(payload))
    if missing:
        raise TradeIntentParseError(
            "missing required field(s): " + ", ".join(missing)
        )

    optional_float_fields = {"entry", "target", "stop"}
    for field in optional_float_fields.intersection(payload):
        value = payload[field]
        if isinstance(value, str):
            payload[field] = _normalise_optional_float(value)

    if payload.get("style") is None:
        payload.pop("style", None)

    return TradeIntent(**payload)
