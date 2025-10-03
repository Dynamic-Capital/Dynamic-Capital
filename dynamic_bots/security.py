"""Bot wrapper for broadcasting security posture updates."""

from __future__ import annotations

from dynamic_agents.security import DynamicSecurityAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.security import DynamicSecurityHelper
from dynamic_keepers.security import DynamicSecurityKeeper

__all__ = ["DynamicSecurityBot"]


class DynamicSecurityBot(InsightBot):
    """Compose, persist, and format security posture updates."""

    def __init__(
        self,
        *,
        agent: DynamicSecurityAgent | None = None,
        helper: DynamicSecurityHelper | None = None,
        keeper: DynamicSecurityKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicSecurityAgent(),
            helper=helper or DynamicSecurityHelper(),
            keeper=keeper or DynamicSecurityKeeper(),
        )

    def publish_security_update(
        self,
        *,
        domain: str | None = None,
        horizon_hours: int = 24,
    ) -> str:
        insight = self.agent.detailed_insight(domain=domain, horizon_hours=horizon_hours)
        self.keeper.record(insight.raw)
        return self.helper.compose_digest(insight)
