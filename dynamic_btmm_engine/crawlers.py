"""Market data crawler utilities feeding the Dynamic BTMM engine."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Iterable, Mapping, Tuple

from .model import BTMMIndicatorSnapshot

__all__ = ["BTMMDataCrawler", "SnapshotSource", "coerce_snapshot"]

SnapshotSource = Callable[[], Iterable[Mapping[str, object] | BTMMIndicatorSnapshot]]
Normalizer = Callable[[Mapping[str, object]], BTMMIndicatorSnapshot]


def coerce_snapshot(payload: Mapping[str, object]) -> BTMMIndicatorSnapshot:
    """Convert a loosely structured mapping into a snapshot."""

    def _as_float(key: str, default: float = 0.0) -> float:
        value = payload.get(key, default)
        return float(value) if value is not None else default

    def _as_int(key: str, default: int = 0) -> int:
        value = payload.get(key, default)
        return int(value) if value is not None else default

    def _as_datetime(key: str) -> datetime:
        value = payload.get(key)
        if isinstance(value, datetime):
            return value
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(float(value))
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        raise TypeError(f"unsupported timestamp value for {key!r}")

    return BTMMIndicatorSnapshot(
        timestamp=_as_datetime("timestamp"),
        price=_as_float("price"),
        ema5=_as_float("ema5"),
        ema13=_as_float("ema13"),
        ema50=_as_float("ema50"),
        tdi_rsi=_as_float("tdi_rsi"),
        tdi_signal=_as_float("tdi_signal"),
        tdi_volatility_band=_as_float("tdi_volatility_band", 1.0),
        asian_range_high=_as_float("asian_range_high"),
        asian_range_low=_as_float("asian_range_low"),
        cycle_level=_as_int("cycle_level", 1),
        candle_pattern=str(payload.get("candle_pattern") or "") or None,
        adr_high=payload.get("adr_high"),
        adr_low=payload.get("adr_low"),
        session=str(payload.get("session") or "") or None,
        annotations=tuple(
            str(item)
            for item in payload.get("annotations", [])
            if str(item).strip()
        ),
    )


@dataclass(slots=True)
class BTMMDataCrawler:
    """Fetch, normalise, and cache BTMM indicator snapshots."""

    source: SnapshotSource
    normalizer: Normalizer = coerce_snapshot

    def fetch(self) -> Tuple[BTMMIndicatorSnapshot, ...]:
        """Fetch all snapshots from the source and normalise them."""

        snapshots: list[BTMMIndicatorSnapshot] = []
        for payload in self.source():
            if isinstance(payload, BTMMIndicatorSnapshot):
                snapshots.append(payload)
            else:
                snapshots.append(self.normalizer(payload))
        return tuple(snapshots)

    def latest(self) -> BTMMIndicatorSnapshot | None:
        """Return the most recent snapshot if the source yields any data."""

        items = self.fetch()
        if not items:
            return None
        return max(items, key=lambda snapshot: snapshot.timestamp)
