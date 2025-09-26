"""Generate trading desk plan snapshots from the Lorentzian trade logic."""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable, List, Mapping, Protocol, Sequence

from .desk_plan_formatter import render_desk_plan
from .trade_logic import (
    ActivePosition,
    MarketSnapshot,
    TradeConfig,
    TradeDecision,
    TradeLogic,
    TradeSignal,
)


class StaticStrategy:
    def __init__(self, signal: TradeSignal) -> None:
        self._signal = signal

    def update(self, snapshot: MarketSnapshot) -> TradeSignal:  # pragma: no cover - simple pass-through
        return self._signal


@dataclass(slots=True)
class Scenario:
    id: str
    config: TradeConfig
    signal: TradeSignal
    snapshot: MarketSnapshot
    open_positions: List[ActivePosition]


class RolloutNotFoundError(RuntimeError):
    """Raised when a rollout identifier cannot be resolved to scenario data."""


class RolloutDataSource(Protocol):
    """Abstract source of rollout metadata."""

    def load_rollout(self, rollout: str) -> Sequence[Mapping[str, Any]] | None:
        """Return serialized scenario metadata for *rollout* or ``None`` when missing."""


class JsonRolloutDataSource:
    """Read rollout scenarios from timestamped JSON artifacts."""

    def __init__(self, base_path: Path | None = None) -> None:
        root = Path(__file__).resolve().parents[2]
        self._base_path = base_path or root / "apps" / "web" / "data" / "rollouts"

    def load_rollout(self, rollout: str) -> Sequence[Mapping[str, Any]] | None:
        path = self._resolve_path(rollout)
        if not path or not path.is_file():
            raise RolloutNotFoundError(self._format_missing_message(rollout))
        try:
            data = json.loads(path.read_text())
        except json.JSONDecodeError as exc:  # pragma: no cover - malformed input
            raise RuntimeError(f"Unable to parse rollout data at {path}: {exc}") from exc
        if not isinstance(data, Iterable):
            raise RuntimeError(f"Rollout payload at {path} must be an iterable of scenarios")
        return list(data)

    def available_rollouts(self) -> list[str]:
        if not self._base_path.exists():
            return []
        return sorted(path.stem for path in self._base_path.glob("*.json"))

    def _resolve_path(self, rollout: str) -> Path | None:
        candidate = Path(rollout)
        if candidate.is_absolute():
            return candidate
        if candidate.suffix:
            return (self._base_path / candidate).resolve()
        return (self._base_path / f"{rollout}.json").resolve()

    def _format_missing_message(self, rollout: str) -> str:
        options = self.available_rollouts()
        if options:
            formatted = ", ".join(options)
            return f"No rollout data found for '{rollout}'. Available rollouts: {formatted}."
        return (
            f"No rollout data found for '{rollout}'."
            " Provide a rollout slug or date that matches a JSON artifact."
        )


def _run_scenario(scenario: Scenario) -> tuple[TradeDecision, MarketSnapshot]:
    logic = TradeLogic(config=scenario.config)
    logic.strategy = StaticStrategy(scenario.signal)
    decisions = logic.on_bar(
        scenario.snapshot,
        open_positions=scenario.open_positions,
    )
    decision = next(dec for dec in decisions if dec.action == "open")
    return decision, scenario.snapshot


def _direction(decision: TradeDecision) -> str:
    if decision.direction and decision.direction > 0:
        return "long"
    if decision.direction and decision.direction < 0:
        return "short"
    return "flat"


def _price_decimals(pip_size: float | None) -> int:
    if pip_size is None or pip_size <= 0:
        return 2
    try:
        quant = Decimal(str(pip_size)).normalize()
    except InvalidOperation:
        return 2
    exponent = -quant.as_tuple().exponent
    if exponent < 0:
        exponent = 0
    return max(0, min(6, exponent))


def _round_price(value: float | None, *, pip_size: float | None) -> float | None:
    if value is None:
        return None
    decimals = _price_decimals(pip_size)
    return round(value, decimals)


def _round_confidence(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 4)


def _scenario_data(decision: TradeDecision, snapshot: MarketSnapshot) -> dict:
    plan = render_desk_plan(decision, pip_size=snapshot.pip_size)
    context = decision.context or {}
    return {
        "symbol": decision.symbol,
        "direction": _direction(decision),
        "entry": _round_price(decision.entry, pip_size=snapshot.pip_size),
        "stopLoss": _round_price(decision.stop_loss, pip_size=snapshot.pip_size),
        "takeProfit": _round_price(decision.take_profit, pip_size=snapshot.pip_size),
        "originalConfidence": _round_confidence(context.get("original_confidence")),
        "finalConfidence": _round_confidence(context.get("final_confidence")),
        "reason": decision.reason,
        "plan": plan,
    }


def _parse_timestamp(value: Any, *, field: str) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if not isinstance(value, str):
        raise ValueError(f"Expected ISO formatted timestamp for {field!r}, got {value!r}")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:  # pragma: no cover - defensive programming
        raise ValueError(f"Invalid timestamp '{value}' for field {field!r}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _parse_optional_timestamp(value: Any, *, field: str) -> datetime | None:
    if value is None:
        return None
    return _parse_timestamp(value, field=field)


def _build_config(payload: Mapping[str, Any]) -> TradeConfig:
    if not isinstance(payload, Mapping):
        raise ValueError("Trade configuration must be a mapping")
    return TradeConfig(**dict(payload))


def _build_signal(payload: Mapping[str, Any]) -> TradeSignal:
    if not isinstance(payload, Mapping):
        raise ValueError("Trade signal must be a mapping")
    return TradeSignal(**dict(payload))


def _build_snapshot(payload: Mapping[str, Any]) -> MarketSnapshot:
    if not isinstance(payload, Mapping):
        raise ValueError("Market snapshot must be a mapping")
    payload = dict(payload)
    payload["timestamp"] = _parse_timestamp(payload.get("timestamp"), field="snapshot.timestamp")
    return MarketSnapshot(**payload)


def _build_positions(payload: Iterable[Mapping[str, Any]]) -> List[ActivePosition]:
    positions: List[ActivePosition] = []
    for index, entry in enumerate(payload):
        if not isinstance(entry, Mapping):
            raise ValueError(f"Open position #{index} must be a mapping")
        data = dict(entry)
        opened_at = _parse_optional_timestamp(data.get("opened_at"), field=f"open_positions[{index}].opened_at")
        if opened_at is not None:
            data["opened_at"] = opened_at
        else:
            data.pop("opened_at", None)
        positions.append(ActivePosition(**data))
    return positions


def build_scenarios(
    rollout: str,
    *,
    data_source: RolloutDataSource | None = None,
) -> List[Scenario]:
    source = data_source or JsonRolloutDataSource()
    metadata = source.load_rollout(rollout)
    if not metadata:
        raise RolloutNotFoundError(f"No scenarios available for rollout '{rollout}'.")

    scenarios: List[Scenario] = []
    for index, raw in enumerate(metadata):
        if not isinstance(raw, Mapping):
            raise ValueError(f"Scenario #{index} must be a mapping")
        try:
            scenario_id = raw["id"]
            config = _build_config(raw["config"])
            signal = _build_signal(raw["signal"])
            snapshot = _build_snapshot(raw["snapshot"])
            open_positions_payload = raw.get("open_positions", [])
        except KeyError as exc:
            missing = exc.args[0]
            raise ValueError(f"Scenario #{index} is missing required key '{missing}'") from exc

        if not isinstance(open_positions_payload, Iterable):
            raise ValueError("open_positions must be an iterable")
        open_positions = _build_positions(open_positions_payload)

        scenarios.append(
            Scenario(
                id=str(scenario_id),
                config=config,
                signal=signal,
                snapshot=snapshot,
                open_positions=open_positions,
            )
        )

    return scenarios


def generate_snapshot(
    rollout: str,
    *,
    data_source: RolloutDataSource | None = None,
) -> dict:
    snapshot: dict[str, dict] = {}
    for scenario in build_scenarios(rollout, data_source=data_source):
        decision, market_snapshot = _run_scenario(scenario)
        snapshot[scenario.id] = _scenario_data(decision, market_snapshot)
    return snapshot


def _default_output_path() -> Path:
    root = Path(__file__).resolve().parents[2]
    return root / "apps" / "web" / "data" / "trading-desk-plan.json"


def materialize_desk_plan(
    rollout: str,
    *,
    data_source: RolloutDataSource | None = None,
    output_path: Path | None = None,
) -> Path:
    data = generate_snapshot(rollout, data_source=data_source)
    target = output_path or _default_output_path()
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, indent=2, sort_keys=True))
    return target


def _parse_rollout_date(value: str) -> date:
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid rollout date '{value}'. Expected ISO 8601 (YYYY-MM-DD)."
        ) from exc
    return parsed.date()


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--rollout",
        help="Rollout slug to materialize (for example 'fomc-2025-03-19').",
    )
    group.add_argument(
        "--rollout-date",
        type=_parse_rollout_date,
        help="Rollout date to materialize (ISO format, e.g. 2025-03-21).",
    )
    parser.add_argument(
        "--data-root",
        type=Path,
        help="Override the rollout JSON directory (defaults to apps/web/data/rollouts).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write the trading desk plan to this file instead of the default location.",
    )
    return parser.parse_args(argv)


def _resolve_rollout_identifier(args: argparse.Namespace) -> str:
    if args.rollout:
        return args.rollout
    assert args.rollout_date is not None
    return args.rollout_date.isoformat()


def main(argv: Sequence[str] | None = None) -> None:
    args = _parse_args(argv)
    rollout_identifier = _resolve_rollout_identifier(args)
    data_source: RolloutDataSource | None = None
    if args.data_root is not None:
        data_source = JsonRolloutDataSource(base_path=args.data_root)
    try:
        target = materialize_desk_plan(
            rollout_identifier,
            data_source=data_source,
            output_path=args.output,
        )
    except RolloutNotFoundError as exc:
        raise SystemExit(str(exc)) from exc
    print(f"Wrote {target}")


if __name__ == "__main__":  # pragma: no cover - manual utility
    main()
