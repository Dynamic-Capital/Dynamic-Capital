"""Dhivehi language stewardship agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic.intelligence.ai_apps.dhivehi_language import (
    DhivehiLanguageAsset,
    DhivehiLanguageEvaluation,
    DhivehiLanguageSnapshot,
    DynamicDhivehiLanguage,
)

__all__ = ["DhivehiLanguageAgentInsight", "DynamicDhivehiLanguageAgent"]


@dataclass(slots=True)
class DhivehiLanguageAgentInsight:
    """Typed wrapper exposing Dhivehi language insight details."""

    raw: AgentInsight
    snapshot: DhivehiLanguageSnapshot
    at_risk_assets: tuple[DhivehiLanguageAsset, ...]
    pending_actions: tuple[str, ...]


class DynamicDhivehiLanguageAgent:
    """Generate insights describing Dhivehi language readiness."""

    domain = "Dhivehi Language Operations"

    def __init__(self, *, engine: DynamicDhivehiLanguage | None = None) -> None:
        self._engine = engine or DynamicDhivehiLanguage()

    # ------------------------------------------------------------------
    # asset & evaluation ingestion

    @property
    def engine(self) -> DynamicDhivehiLanguage:
        return self._engine

    def register_asset(
        self, asset: DhivehiLanguageAsset | Mapping[str, object]
    ) -> DhivehiLanguageAsset:
        return self._engine.register_asset(asset)

    def update_asset(self, identifier: str, **updates: object) -> DhivehiLanguageAsset:
        return self._engine.update_asset(identifier, **updates)

    def record_evaluation(
        self, evaluation: DhivehiLanguageEvaluation | Mapping[str, object]
    ) -> DhivehiLanguageEvaluation:
        return self._engine.record_evaluation(evaluation)

    # ------------------------------------------------------------------
    # insight generation

    def generate_insight(self) -> AgentInsight:
        snapshot = self._engine.generate_snapshot()
        return self._build_insight(snapshot)

    def detailed_insight(self) -> DhivehiLanguageAgentInsight:
        snapshot = self._engine.generate_snapshot()
        raw = self._build_insight(snapshot)
        return DhivehiLanguageAgentInsight(
            raw=raw,
            snapshot=snapshot,
            at_risk_assets=snapshot.at_risk_assets,
            pending_actions=snapshot.pending_actions,
        )

    def _build_insight(self, snapshot: DhivehiLanguageSnapshot) -> AgentInsight:
        metrics = {
            "assets": float(len(snapshot.assets)),
            "average_coverage": float(snapshot.average_coverage),
            "average_quality": float(snapshot.average_quality),
            "evaluation_score": float(snapshot.weighted_evaluation_score),
            "at_risk_assets": float(len(snapshot.at_risk_assets)),
            "pending_actions": float(len(snapshot.pending_actions)),
        }

        highlights = self._build_highlights(snapshot)

        details: dict[str, object] = {
            "snapshot": snapshot,
            "at_risk_assets": snapshot.at_risk_assets,
            "pending_actions": snapshot.pending_actions,
            "category_scores": dict(snapshot.category_scores),
        }

        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Dhivehi Language Operations Pulse",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def _build_highlights(self, snapshot: DhivehiLanguageSnapshot) -> Sequence[str]:
        highlights: list[str] = []
        if snapshot.at_risk_assets:
            top = snapshot.at_risk_assets[0]
            highlights.append(
                f"{top.name} requires attention (coverage {top.coverage:.0%}, quality {top.quality_score:.0%})."
            )
        else:
            highlights.append("All tracked Dhivehi assets meet coverage and quality thresholds.")

        if snapshot.pending_actions:
            highlights.append(f"Next actions: {snapshot.pending_actions[0]}")

        if snapshot.category_scores:
            best_category = max(snapshot.category_scores.items(), key=lambda item: item[1])
            highlights.append(
                f"Strongest capability: {best_category[0]} at {best_category[1]:.0%} weighted score."
            )

        return highlights
