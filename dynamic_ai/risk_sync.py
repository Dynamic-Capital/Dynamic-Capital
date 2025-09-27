"""Utilities for synchronising Dynamic AI risk guidance with MT5."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Iterable, List, Mapping, MutableMapping, Sequence

from .risk import RiskContext, assign_sl_tp


@dataclass
class PositionSnapshot:
    """Minimal MT5 position representation used for risk adjustments."""

    ticket: str
    symbol: str
    side: str
    entry_price: float
    volatility: float
    treasury_health: float = 1.0


def build_mt5_risk_adjustments(
    positions: Sequence[PositionSnapshot],
    context: RiskContext,
    *,
    trailing_stop_multiplier: float = 0.75,
) -> List[MutableMapping[str, object]]:
    """Generate desired SL/TP/trailing-stop adjustments for open MT5 positions."""

    adjustments: List[MutableMapping[str, object]] = []
    for position in positions:
        side = position.side.upper()
        sl, tp = assign_sl_tp(
            entry=position.entry_price,
            signal=side,
            volatility=position.volatility,
            treasury_health=position.treasury_health,
        )
        if sl is None and tp is None:
            continue

        trailing_stop = round(position.volatility * trailing_stop_multiplier, 2)
        adjustments.append(
            {
                "ticket": str(position.ticket),
                "symbol": position.symbol,
                "desired_stop_loss": sl,
                "desired_take_profit": tp,
                "trailing_stop_distance": trailing_stop,
                "notes": "Auto-adjusted by Dynamic AI risk engine",
            }
        )

    return adjustments


def _request(url: str, payload: Mapping[str, object], *, secret: str) -> None:
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "content-type": "application/json",
        "authorization": f"Bearer {secret}",
    }
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    backoff = 0.5
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                if response.status >= 400:
                    body = response.read().decode("utf-8", "ignore")
                    raise RuntimeError(f"HTTP {response.status}: {body}")
                return
        except (urllib.error.URLError, RuntimeError) as exc:  # pragma: no cover
            if attempt == 2:
                raise
            time.sleep(backoff)
            backoff *= 2


def sync_mt5_risk_adjustments(
    positions: Iterable[PositionSnapshot],
    context: RiskContext,
    *,
    endpoint: str | None = None,
    secret: str | None = None,
) -> List[MutableMapping[str, object]]:
    """Build adjustments and push them to the MT5 risk edge function."""

    endpoint = endpoint or os.environ.get("MT5_RISK_WEBHOOK_URL")
    if not endpoint:
        raise RuntimeError("MT5_RISK_WEBHOOK_URL is not configured")
    secret = secret or os.environ.get("MT5_RISK_WEBHOOK_SECRET")
    if not secret:
        raise RuntimeError("MT5_RISK_WEBHOOK_SECRET is not configured")

    snapshot_positions = [
        pos if isinstance(pos, PositionSnapshot) else PositionSnapshot(**pos)  # type: ignore[arg-type]
        for pos in positions
    ]

    adjustments = build_mt5_risk_adjustments(snapshot_positions, context)
    if adjustments:
        _request(endpoint, {"adjustments": adjustments}, secret=secret)
    return adjustments


__all__ = [
    "PositionSnapshot",
    "build_mt5_risk_adjustments",
    "sync_mt5_risk_adjustments",
]
