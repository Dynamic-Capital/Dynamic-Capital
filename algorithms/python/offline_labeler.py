"""Offline labelling utilities that mirror the live strategy behaviour."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Iterable, List, Optional, Sequence

from .trade_logic import FeaturePipeline, LabeledFeature, MarketSnapshot


@dataclass(slots=True)
class LabelingConfig:
    lookahead: int = 4
    neutral_zone_pips: float = 2.0


class OfflineLabeler:
    """Replays the on-bar lookahead logic used by the live strategy."""

    def __init__(self, *, pipeline: Optional[FeaturePipeline] = None) -> None:
        self.pipeline = pipeline or FeaturePipeline()

    def label(
        self,
        snapshots: Sequence[MarketSnapshot],
        config: Optional[LabelingConfig] = None,
        *,
        metadata_fn: Optional[Callable[[MarketSnapshot], dict]] = None,
    ) -> List[LabeledFeature]:
        cfg = config or LabelingConfig()
        if cfg.lookahead <= 0:
            raise ValueError("lookahead must be positive for offline labelling")
        transformed: List[tuple[MarketSnapshot, tuple[float, ...]]] = []
        for snapshot in snapshots:
            features = self.pipeline.transform(snapshot.feature_vector(), update=True)
            transformed.append((snapshot, features))
        labelled: List[LabeledFeature] = []
        for idx, (snapshot, features) in enumerate(transformed):
            target_idx = idx + cfg.lookahead
            if target_idx >= len(transformed):
                break
            future_snapshot = transformed[target_idx][0]
            move_pips = abs(future_snapshot.close - snapshot.close) / snapshot.pip_size
            if move_pips < cfg.neutral_zone_pips:
                label = 0
            else:
                label = 1 if future_snapshot.close > snapshot.close else -1
            metadata = metadata_fn(snapshot) if metadata_fn else {}
            metadata = dict(metadata)
            metadata.update(
                {
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

    def state_dict(self) -> dict:
        return {"pipeline": self.pipeline.state_dict()}

    def load_state_dict(self, state: dict) -> None:
        if "pipeline" in state:
            self.pipeline.load_state_dict(state["pipeline"])


__all__ = [
    "LabelingConfig",
    "OfflineLabeler",
]
