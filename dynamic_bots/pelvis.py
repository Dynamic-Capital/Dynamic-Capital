"""Bot wiring for Dynamic Skeleton insights."""

from __future__ import annotations

from typing import ClassVar

from dynamic_agents.skull import DynamicSkullAgent
from dynamic_bots._base import InsightBot
from dynamic_helpers.rib import DynamicRibHelper
from dynamic_keepers.vertebrae import DynamicVertebraeKeeper

__all__ = ["DynamicPelvisBot"]


class DynamicPelvisBot(InsightBot):
    """Publish skeleton governance updates as formatted digests."""

    role: ClassVar[str] = (
        "Pelvis anchor sequencing agent, keeper, and helper into motion-ready updates."
    )
    _tasks: ClassVar[tuple[str, ...]] = (
        "Kick off skull agent insight generation.",
        "Ensure vertebrae keeper records structural history.",
        "Channel rib helper digests for downstream delivery.",
    )

    def __init__(
        self,
        *,
        agent: DynamicSkullAgent | None = None,
        helper: DynamicRibHelper | None = None,
        keeper: DynamicVertebraeKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicSkullAgent(),
            helper=helper or DynamicRibHelper(),
            keeper=keeper or DynamicVertebraeKeeper(),
        )

    @property
    def tasks(self) -> tuple[str, ...]:
        """Tasks stewarded by the pelvis bot."""

        return self._tasks

    def orchestrate(self) -> str:
        """Capture the latest skeleton insight and return the digest."""

        return super().publish_update()

    def assignment_brief(self) -> tuple[dict[str, object], ...]:
        """Return sequential role assignments for the skeleton automation chain."""

        def describe(component: object, label: str) -> dict[str, object]:
            role = getattr(component, "role", f"{label.title()} component")
            tasks = tuple(getattr(component, "tasks", ()))
            return {"label": label, "role": role, "tasks": tasks}

        return (
            describe(self.agent, "agent"),
            describe(self.keeper, "keeper"),
            describe(self.helper, "helper"),
            {"label": "bot", "role": self.role, "tasks": self.tasks},
        )
