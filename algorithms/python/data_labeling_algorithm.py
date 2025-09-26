"""Adaptive data labelling helpers for offline and live workflows."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from statistics import pstdev
from typing import (
    Callable,
    Deque,
    Dict,
    Iterable,
    List,
    Mapping,
    Optional,
    Protocol,
    Sequence,
)

from .trade_logic import FeaturePipeline, LabeledFeature, MarketSnapshot


@dataclass(slots=True)
class AdaptiveLabelingConfig:
    """Configuration for :class:`AdaptiveLabelingAlgorithm`.

    Attributes
    ----------
    lookahead:
        Number of steps ahead used to generate the ground-truth label.
    neutral_zone_pips:
        Baseline neutral zone below which price moves are considered noise.
    volatility_window:
        Number of recent price changes to inspect when estimating volatility.
    min_threshold:
        Lower bound applied to the dynamic threshold in pip units.
    max_threshold:
        Upper bound applied to the dynamic threshold in pip units.
    confidence_slope:
        Controls how quickly label confidence increases as the move exceeds the
        dynamic threshold. Higher values lead to faster saturation towards 1.
    """

    lookahead: int = 4
    neutral_zone_pips: float = 2.0
    volatility_window: int = 20
    min_threshold: float = 0.5
    max_threshold: float = 25.0
    confidence_slope: float = 1.0


class AdaptiveLabelingAlgorithm:
    """Produce labels with a volatility-aware neutral zone."""

    def __init__(self, *, pipeline: Optional[FeaturePipeline] = None) -> None:
        self.pipeline = pipeline or FeaturePipeline()

    def label(
        self,
        snapshots: Sequence[MarketSnapshot],
        config: Optional[AdaptiveLabelingConfig] = None,
        *,
        metadata_fn: Optional[Callable[[MarketSnapshot], Dict[str, object]]] = None,
    ) -> List[LabeledFeature]:
        """Return labelled samples derived from ``snapshots``.

        Parameters
        ----------
        snapshots:
            Ordered market snapshots to label.
        config:
            Optional configuration object. When omitted the defaults are used.
        metadata_fn:
            Callable that receives the current snapshot and returns a metadata
            dictionary to merge with the automatically populated metadata.
        """

        if not snapshots:
            raise ValueError("snapshots sequence must be non-empty")

        cfg = config or AdaptiveLabelingConfig()
        if cfg.lookahead <= 0:
            raise ValueError("lookahead must be positive")
        if cfg.volatility_window < 0:
            raise ValueError("volatility_window cannot be negative")

        volatility = self._rolling_volatility(snapshots, cfg.volatility_window)

        transformed: List[tuple[MarketSnapshot, tuple[float, ...], float]] = []
        for idx, snapshot in enumerate(snapshots):
            features = self.pipeline.transform(snapshot.feature_vector(), update=True)
            transformed.append((snapshot, features, volatility[idx]))

        labelled: List[LabeledFeature] = []
        for idx, (snapshot, features, local_vol) in enumerate(transformed):
            target_idx = idx + cfg.lookahead
            if target_idx >= len(transformed):
                break
            future_snapshot = transformed[target_idx][0]
            labelled.append(
                self._build_label(
                    snapshot,
                    features,
                    local_vol,
                    future_snapshot,
                    cfg,
                    metadata_fn=metadata_fn,
                )
            )
        return labelled

    @staticmethod
    def summarise_distribution(samples: Iterable[LabeledFeature]) -> Dict[str, float]:
        """Return the proportion of each label class in ``samples``."""

        counts = {"positive": 0, "neutral": 0, "negative": 0}
        total = 0
        for sample in samples:
            total += 1
            if sample.label > 0:
                counts["positive"] += 1
            elif sample.label < 0:
                counts["negative"] += 1
            else:
                counts["neutral"] += 1
        if total == 0:
            return {key: 0.0 for key in counts}
        return {key: value / total for key, value in counts.items()}

    @staticmethod
    def _confidence_from_move(
        magnitude: float, threshold: float, config: AdaptiveLabelingConfig
    ) -> float:
        overshoot = max(0.0, magnitude - threshold)
        if overshoot == 0.0:
            return 0.0
        scale = max(1e-6, threshold / max(1.0, config.confidence_slope))
        return min(1.0, overshoot / (overshoot + scale))

    @staticmethod
    def _calculate_threshold(config: AdaptiveLabelingConfig, volatility: float) -> float:
        base = max(config.neutral_zone_pips, config.min_threshold)
        if volatility <= 0.0:
            return min(config.max_threshold, max(config.min_threshold, base))
        dynamic = base + 0.5 * volatility
        return min(config.max_threshold, max(config.min_threshold, dynamic))

    @staticmethod
    def _build_label(
        snapshot: MarketSnapshot,
        features: tuple[float, ...],
        local_vol: float,
        future_snapshot: MarketSnapshot,
        config: AdaptiveLabelingConfig,
        *,
        metadata_fn: Optional[Callable[[MarketSnapshot], Dict[str, object]]] = None,
    ) -> LabeledFeature:
        move = (future_snapshot.close - snapshot.close) / snapshot.pip_size
        magnitude = abs(move)
        threshold = AdaptiveLabelingAlgorithm._calculate_threshold(config, local_vol)

        if magnitude <= threshold:
            label = 0
            confidence = 0.0
        else:
            label = 1 if move > 0 else -1
            confidence = AdaptiveLabelingAlgorithm._confidence_from_move(
                magnitude, threshold, config
            )

        metadata: Dict[str, object] = dict(metadata_fn(snapshot) if metadata_fn else {})
        metadata.update(
            {
                "threshold_pips": threshold,
                "volatility_pips": local_vol,
                "move_pips": magnitude,
                "raw_move": move,
                "confidence": confidence,
                "lookahead": config.lookahead,
                "lookahead_target": future_snapshot.timestamp,
                "source_timestamp": snapshot.timestamp,
                "symbol": snapshot.symbol,
            }
        )

        return LabeledFeature(
            features=features,
            label=label,
            close=snapshot.close,
            timestamp=snapshot.timestamp,
            metadata=metadata,
        )

    @staticmethod
    def _rolling_volatility(
        snapshots: Sequence[MarketSnapshot], window: int
    ) -> List[float]:
        if window <= 1:
            return [0.0] * len(snapshots)

        values: deque[float] = deque(maxlen=window)
        volatilities: List[float] = []
        previous: Optional[MarketSnapshot] = None
        for snapshot in snapshots:
            if previous is None:
                volatilities.append(0.0)
                previous = snapshot
                continue

            pip_move = abs(snapshot.close - previous.close) / snapshot.pip_size
            values.append(pip_move)
            if len(values) >= 2:
                vol = float(pstdev(values))
            else:
                vol = 0.0
            volatilities.append(vol)
            previous = snapshot
        return volatilities


@dataclass(slots=True)
class _TransformedSnapshot:
    snapshot: MarketSnapshot
    features: tuple[float, ...]
    volatility: float


class OnlineAdaptiveLabeler:
    """Stream market snapshots and emit labels once lookahead is satisfied."""

    def __init__(
        self,
        *,
        config: Optional[AdaptiveLabelingConfig] = None,
        pipeline: Optional[FeaturePipeline] = None,
    ) -> None:
        self.config = config or AdaptiveLabelingConfig()
        if self.config.lookahead <= 0:
            raise ValueError("lookahead must be positive for online labelling")
        if self.config.volatility_window < 0:
            raise ValueError("volatility_window cannot be negative")
        self.pipeline = pipeline or FeaturePipeline()
        self._buffer: Deque[_TransformedSnapshot] = deque()
        self._volatility: Optional[Deque[float]] = None
        if self.config.volatility_window > 1:
            self._volatility = deque(maxlen=self.config.volatility_window)
        self._previous_snapshot: Optional[MarketSnapshot] = None

    def reset(self) -> None:
        """Clear buffered snapshots and volatility history."""

        self._buffer.clear()
        if self._volatility is not None:
            self._volatility.clear()
        self._previous_snapshot = None

    def push(
        self,
        snapshot: MarketSnapshot,
        *,
        metadata_fn: Optional[Callable[[MarketSnapshot], Dict[str, object]]] = None,
    ) -> List[LabeledFeature]:
        """Process a snapshot and emit any labels whose lookahead is satisfied."""

        features = self.pipeline.transform(snapshot.feature_vector(), update=True)
        local_vol = self._update_volatility(snapshot)
        self._buffer.append(
            _TransformedSnapshot(
                snapshot=snapshot,
                features=features,
                volatility=local_vol,
            )
        )

        emitted: List[LabeledFeature] = []
        # Once the buffer holds lookahead + 1 entries we can label the oldest.
        while len(self._buffer) > self.config.lookahead:
            base = self._buffer.popleft()
            target = self._buffer[self.config.lookahead - 1].snapshot
            emitted.append(
                AdaptiveLabelingAlgorithm._build_label(
                    base.snapshot,
                    base.features,
                    base.volatility,
                    target,
                    self.config,
                    metadata_fn=metadata_fn,
                )
            )
        return emitted

    def state_dict(self) -> Dict[str, object]:
        """Serialise the online labeller state for persistence."""

        return {
            "config": self.config,
            "pipeline": self.pipeline.state_dict(),
            "buffer": [
                {
                    "snapshot": entry.snapshot,
                    "features": entry.features,
                    "volatility": entry.volatility,
                }
                for entry in self._buffer
            ],
            "volatility": list(self._volatility or []),
            "previous_snapshot": self._previous_snapshot,
        }

    def load_state_dict(self, state: Dict[str, object]) -> None:
        """Restore state previously produced by :meth:`state_dict`."""

        self.reset()
        pipeline_state = state.get("pipeline")
        if isinstance(pipeline_state, dict):
            self.pipeline.load_state_dict(pipeline_state)
        buffer = state.get("buffer")
        if isinstance(buffer, list):
            for entry in buffer:
                snapshot = entry.get("snapshot")
                features = entry.get("features")
                volatility = entry.get("volatility")
                if not isinstance(snapshot, MarketSnapshot):
                    continue
                if not isinstance(features, tuple):
                    try:
                        features = tuple(features)  # type: ignore[arg-type]
                    except TypeError:
                        continue
                if not isinstance(volatility, (int, float)):
                    continue
                self._buffer.append(
                    _TransformedSnapshot(
                        snapshot=snapshot,
                        features=tuple(float(x) for x in features),
                        volatility=float(volatility),
                    )
                )
        previous = state.get("previous_snapshot")
        if isinstance(previous, MarketSnapshot):
            self._previous_snapshot = previous
        vol_state = state.get("volatility")
        if self._volatility is not None and isinstance(vol_state, list):
            for value in vol_state:
                try:
                    self._volatility.append(float(value))
                except (TypeError, ValueError):
                    continue

    def _update_volatility(self, snapshot: MarketSnapshot) -> float:
        if self._volatility is None:
            self._previous_snapshot = snapshot
            return 0.0

        previous = self._previous_snapshot
        self._previous_snapshot = snapshot
        if previous is None:
            return 0.0

        pip_move = abs(snapshot.close - previous.close) / snapshot.pip_size
        self._volatility.append(pip_move)
        if len(self._volatility) >= 2:
            return float(pstdev(self._volatility))
        return 0.0


class _Writer(Protocol):  # pragma: no cover - defined by SupabaseTableWriter
    def upsert(self, rows: Iterable[Mapping[str, object]]) -> int:
        ...


def _utcnow() -> datetime:
    return datetime.now(tz=timezone.utc)


class LiveLabelSyncService:
    """Persists labelled samples to an external table such as Supabase."""

    def __init__(self, writer: _Writer, *, clock: Callable[[], datetime] = _utcnow) -> None:
        self.writer = writer
        self.clock = clock

    def sync(self, samples: Sequence[LabeledFeature]) -> int:
        if not samples:
            return 0
        synced_at = self.clock()
        rows: List[Dict[str, object]] = []
        for sample in samples:
            metadata = dict(sample.metadata)
            rows.append(
                {
                    "symbol": metadata.get("symbol"),
                    "label": int(sample.label),
                    "confidence": float(metadata.get("confidence", 0.0)),
                    "threshold_pips": float(metadata.get("threshold_pips", 0.0)),
                    "volatility_pips": float(metadata.get("volatility_pips", 0.0)),
                    "move_pips": float(metadata.get("move_pips", 0.0)),
                    "raw_move": float(metadata.get("raw_move", 0.0)),
                    "lookahead": int(metadata.get("lookahead", 0)),
                    "source_timestamp": _coerce_timestamp(
                        metadata.get("source_timestamp"), sample.timestamp
                    ),
                    "lookahead_target": _coerce_timestamp(
                        metadata.get("lookahead_target"), None
                    ),
                    "close": float(sample.close),
                    "features": [float(value) for value in sample.features],
                    "timestamp": sample.timestamp,
                    "metadata": metadata,
                    "synced_at": synced_at,
                }
            )
        return self.writer.upsert(rows)


def _coerce_timestamp(value: object, fallback: Optional[datetime]) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return fallback
    return fallback


__all__ = [
    "AdaptiveLabelingConfig",
    "AdaptiveLabelingAlgorithm",
    "LiveLabelSyncService",
    "OnlineAdaptiveLabeler",
]
