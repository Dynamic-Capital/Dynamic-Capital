"""High-level management surface for the dynamic business engine."""

from __future__ import annotations

from dataclasses import asdict
from typing import Mapping, MutableMapping, cast

from dynamic_agents._insight import AgentInsight
from dynamic_agents.business import (
    AccountingSnapshot,
    BusinessEngineInsight,
    DynamicBusinessAgent,
    MarketingSnapshot,
    PsychologySnapshot,
    SalesSnapshot,
)
from dynamic_bots.business import DynamicBusinessBot
from dynamic_helpers.business import DynamicBusinessHelper
from dynamic_keepers.business import DynamicBusinessKeeper

__all__ = ["DynamicBusinessManager"]


class DynamicBusinessManager:
    """Coordinate ingestion, persistence, and reporting for business telemetry."""

    def __init__(
        self,
        *,
        bot: DynamicBusinessBot | None = None,
        agent: DynamicBusinessAgent | None = None,
        helper: DynamicBusinessHelper | None = None,
        keeper: DynamicBusinessKeeper | None = None,
    ) -> None:
        resolved_bot = bot or DynamicBusinessBot(
            agent=agent,
            helper=helper,
            keeper=keeper,
        )
        self._bot = resolved_bot
        self._last_insight: BusinessEngineInsight | None = None
        self._last_marker: tuple[int, int, int, int] | None = None

    @property
    def bot(self) -> DynamicBusinessBot:
        return self._bot

    @property
    def agent(self) -> DynamicBusinessAgent:
        return self._bot.business_agent

    @property
    def helper(self) -> DynamicBusinessHelper:
        return cast(DynamicBusinessHelper, self._bot.helper)

    @property
    def keeper(self) -> DynamicBusinessKeeper:
        return self._bot.business_keeper

    # ------------------------------------------------------------------
    # Data ingestion

    def ingest(
        self,
        *,
        sales: SalesSnapshot | None = None,
        accounting: AccountingSnapshot | None = None,
        marketing: MarketingSnapshot | None = None,
        psychology: PsychologySnapshot | None = None,
    ) -> None:
        """Store new telemetry snapshots on the underlying agent."""

        self.agent.ingest(
            sales=sales,
            accounting=accounting,
            marketing=marketing,
            psychology=psychology,
        )
        self._invalidate_cache()

    # ------------------------------------------------------------------
    # Reporting helpers

    def capture(self) -> BusinessEngineInsight:
        """Capture and persist a detailed snapshot."""

        insight = self.keeper.capture(self.agent)
        self._last_insight = insight
        self._last_marker = self._current_snapshot_marker()
        return insight

    def publish_digest(self) -> str:
        """Generate a digest suitable for asynchronous notifications."""

        return self.bot.plan()

    def status_summary(self) -> Mapping[str, object]:
        """Return a structured summary of the latest insight."""

        marker = self._current_snapshot_marker()
        detailed = self._last_insight
        if detailed is None:
            detailed = self._resolve_detailed_insight()
        elif self._last_marker != marker:
            detailed = self._refresh_from_agent()
        else:
            latest = self.keeper.latest
            if latest is not None and detailed.raw is not latest:
                detailed = self._compose_from_raw(latest)
        self._last_insight = detailed
        self._last_marker = marker
        payload: MutableMapping[str, object] = {
            "generated_at": detailed.raw.generated_at,
            "overall_health": detailed.overall_health,
            "sales": asdict(detailed.sales),
            "accounting": asdict(detailed.accounting),
            "marketing": asdict(detailed.marketing),
            "psychology": asdict(detailed.psychology),
        }
        return payload

    # ------------------------------------------------------------------
    # Internal helpers

    def _invalidate_cache(self) -> None:
        self._last_insight = None
        self._last_marker = None

    def _current_snapshot_marker(self) -> tuple[int, int, int, int]:
        return (
            id(self.agent.sales_history[-1]),
            id(self.agent.accounting_history[-1]),
            id(self.agent.marketing_history[-1]),
            id(self.agent.psychology_history[-1]),
        )

    def _resolve_detailed_insight(self) -> BusinessEngineInsight:
        latest = self.keeper.latest
        if latest is None or self._last_marker is None:
            return self._refresh_from_agent()
        return self._compose_from_raw(latest)

    def _refresh_from_agent(self) -> BusinessEngineInsight:
        return self.agent.detailed_insight()

    def _compose_from_raw(self, latest: AgentInsight) -> BusinessEngineInsight:
        return BusinessEngineInsight(
            raw=latest,
            sales=self.agent.sales_history[-1],
            accounting=self.agent.accounting_history[-1],
            marketing=self.agent.marketing_history[-1],
            psychology=self.agent.psychology_history[-1],
            sales_history=self.agent.sales_history,
            accounting_history=self.agent.accounting_history,
            marketing_history=self.agent.marketing_history,
            psychology_history=self.agent.psychology_history,
        )
