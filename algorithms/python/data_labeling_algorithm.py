"""Adaptive offline data labelling helpers."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from statistics import pstdev
from typing import Callable, Dict, Iterable, List, Optional, Sequence

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
            move = (future_snapshot.close - snapshot.close) / snapshot.pip_size
            magnitude = abs(move)
            threshold = self._calculate_threshold(cfg, local_vol)

            if magnitude <= threshold:
                label = 0
                confidence = 0.0
            else:
                label = 1 if move > 0 else -1
                confidence = self._confidence_from_move(magnitude, threshold, cfg)

            metadata: Dict[str, object] = dict(metadata_fn(snapshot) if metadata_fn else {})
            metadata.update(
                {
                    "threshold_pips": threshold,
                    "volatility_pips": local_vol,
                    "move_pips": magnitude,
                    "raw_move": move,
                    "confidence": confidence,
                    "lookahead": cfg.lookahead,
                    "lookahead_target": future_snapshot.timestamp.isoformat(),
                    "source_timestamp": snapshot.timestamp.isoformat(),
                }
            )

            labelled.append(
                LabeledFeature(
                    features=features,
                    label=label,
                    close=snapshot.close,
                    timestamp=snapshot.timestamp,
                    metadata=metadata,
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


__all__ = ["AdaptiveLabelingConfig", "AdaptiveLabelingAlgorithm"]
