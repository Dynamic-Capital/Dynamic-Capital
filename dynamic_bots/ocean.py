"""Bot wrappers delivering financial dynamic ocean insights."""

from __future__ import annotations

from dynamic_agents.ocean import DynamicOceanLayerAgent
from dynamic_helpers.ocean import DynamicOceanLayerHelper
from dynamic_keepers.ocean import DynamicOceanLayerKeeper

__all__ = [
    "DynamicOceanLayerBot",
    "DynamicEpipelagicBot",
    "DynamicMesopelagicBot",
    "DynamicBathypelagicBot",
    "DynamicAbyssopelagicBot",
    "DynamicHadalpelagicBot",
]


class DynamicOceanLayerBot:
    """High-level interface that formats and dispatches layer insights."""

    def __init__(
        self,
        *,
        agent: DynamicOceanLayerAgent,
        helper: DynamicOceanLayerHelper | None = None,
        keeper: DynamicOceanLayerKeeper | None = None,
    ) -> None:
        self._agent = agent
        self._helper = helper or DynamicOceanLayerHelper(agent.profile)
        self._keeper = keeper or DynamicOceanLayerKeeper(agent.profile)

    @property
    def agent(self) -> DynamicOceanLayerAgent:
        return self._agent

    @property
    def helper(self) -> DynamicOceanLayerHelper:
        return self._helper

    @property
    def keeper(self) -> DynamicOceanLayerKeeper:
        return self._keeper

    def publish_update(self, **overrides: object) -> str:
        signal = self._agent.capture_signal(
            depth=overrides.get("depth"),
            location=overrides.get("location"),
            timestamp=overrides.get("timestamp"),
        )
        self._keeper.record(signal)
        summary = None
        try:
            summary = self._agent.summarise()
        except RuntimeError:
            summary = None
        return self._helper.compose_digest(signal, summary=summary)


class DynamicEpipelagicBot(DynamicOceanLayerBot):
    pass


class DynamicMesopelagicBot(DynamicOceanLayerBot):
    pass


class DynamicBathypelagicBot(DynamicOceanLayerBot):
    pass


class DynamicAbyssopelagicBot(DynamicOceanLayerBot):
    pass


class DynamicHadalpelagicBot(DynamicOceanLayerBot):
    pass
