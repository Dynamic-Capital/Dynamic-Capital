"""Discipline utilities aligning the playbook with orchestration stacks."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Mapping, MutableMapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_bots._base import InsightBot
from dynamic_helpers._base import InsightHelper
from dynamic_keepers._base import InsightKeeper

from .engine import PlaybookBlueprint, PlaybookContext, PlaybookEntry
from .sync import PlaybookSynchronizer

__all__ = [
    "PlaybookDisciplineInsight",
    "DynamicPlaybookAgent",
    "DynamicPlaybookHelper",
    "DynamicPlaybookKeeper",
    "DynamicPlaybookBot",
]


@dataclass(slots=True)
class PlaybookDisciplineInsight:
    """Structured package combining raw insights with the latest blueprint."""

    raw: AgentInsight
    blueprint: PlaybookBlueprint
    entries: tuple[PlaybookEntry, ...]


class DynamicPlaybookAgent:
    """Generate discipline insights by orchestrating the playbook synchronizer."""

    domain = "Dynamic Playbook"

    def __init__(self, *, synchronizer: PlaybookSynchronizer | None = None) -> None:
        self._synchronizer = synchronizer or PlaybookSynchronizer()

    @property
    def synchronizer(self) -> PlaybookSynchronizer:
        return self._synchronizer

    def implement(self, entry: PlaybookEntry | Mapping[str, object]) -> PlaybookEntry:
        return self._synchronizer.implement(entry)

    def implement_many(
        self, entries: Sequence[PlaybookEntry | Mapping[str, object]]
    ) -> tuple[PlaybookEntry, ...]:
        return self._synchronizer.implement_many(entries)

    def update(self, title: str, **changes: object) -> PlaybookEntry:
        return self._synchronizer.update(title, **changes)

    def remove(self, title: str) -> PlaybookEntry:
        return self._synchronizer.remove(title)

    def catalogue(self) -> tuple[PlaybookEntry, ...]:
        return self._synchronizer.catalogue()

    def discipline(
        self, context: PlaybookContext, *, limit: int | None = None
    ) -> PlaybookDisciplineInsight:
        blueprint = self._synchronizer.sync_blueprint(context, limit=limit)
        entries = self._synchronizer.catalogue()
        raw = self._compose_insight(blueprint, entries, context)
        return PlaybookDisciplineInsight(raw=raw, blueprint=blueprint, entries=entries)

    def generate_insight(
        self, *, context: PlaybookContext, limit: int | None = None
    ) -> AgentInsight:
        """Conform to :class:`~dynamic_agents._insight.InsightAgent` protocol."""

        return self.discipline(context, limit=limit).raw

    def _compose_insight(
        self,
        blueprint: PlaybookBlueprint,
        entries: Sequence[PlaybookEntry],
        context: PlaybookContext,
    ) -> AgentInsight:
        metrics = {
            "total_entries": float(blueprint.total_entries),
            "readiness_alignment": float(blueprint.readiness_alignment),
            "automation_alignment": float(blueprint.automation_alignment),
            "enablement_actions": float(len(blueprint.enablement_actions)),
            "escalation_steps": float(len(blueprint.escalation_plan)),
        }
        highlights = [
            blueprint.narrative,
            f"Focus streams: {', '.join(blueprint.focus_streams)}",
            f"Risk outlook: {blueprint.risk_outlook}",
        ]
        if blueprint.enablement_actions:
            highlights.append(f"Enablement priority: {blueprint.enablement_actions[0]}")
        if blueprint.escalation_plan:
            highlights.append(f"Escalation: {blueprint.escalation_plan[0]}")
        details: MutableMapping[str, object] = {
            "blueprint": blueprint.as_dict(),
            "entries": [self._serialise_entry(entry) for entry in entries],
            "mission": context.mission,
            "cadence": context.cadence,
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title="Dynamic Playbook Discipline",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    @staticmethod
    def _serialise_entry(entry: PlaybookEntry) -> MutableMapping[str, object]:
        payload = asdict(entry)
        payload["timestamp"] = entry.timestamp.isoformat()
        payload["tags"] = list(entry.tags)
        payload["dependencies"] = list(entry.dependencies)
        payload["owners"] = list(entry.owners)
        return payload


class DynamicPlaybookHelper(InsightHelper):
    """Compose discipline insights into detailed digests."""

    def __init__(self) -> None:
        super().__init__(tagline="Dynamic Playbook Discipline Digest")

    def compose_digest(self, insight: AgentInsight) -> str:
        digest = super().compose_digest(insight)
        details = insight.details or {}
        blueprint = details.get("blueprint")
        if not isinstance(blueprint, Mapping):
            return digest

        focus_streams = blueprint.get("focus_streams", [])
        enablement_actions = blueprint.get("enablement_actions", [])
        escalation_plan = blueprint.get("escalation_plan", [])

        lines = [digest, "", "Blueprint Summary:"]
        focus = ", ".join(focus_streams) if focus_streams else "execution"
        lines.append(f"Focus Streams: {focus}")
        lines.append(f"Risk Outlook: {blueprint.get('risk_outlook', 'Unknown')}")
        if enablement_actions:
            lines.append("Enablement Actions:")
            for action in enablement_actions:
                lines.append(f"  - {action}")
        if escalation_plan:
            lines.append("Escalation Plan:")
            for step in escalation_plan:
                lines.append(f"  - {step}")
        return "\n".join(lines)


class DynamicPlaybookKeeper(InsightKeeper):
    """Persist discipline insights and expose aggregate metrics."""

    def __init__(self, *, limit: int = 120) -> None:
        super().__init__(limit=limit)

    def discipline(
        self,
        agent: DynamicPlaybookAgent,
        *,
        context: PlaybookContext,
        limit: int | None = None,
    ) -> PlaybookDisciplineInsight:
        insight = agent.discipline(context, limit=limit)
        self.record(insight.raw)
        return insight

    def average_readiness(self) -> float:
        return self.average_metric("readiness_alignment")

    def average_automation(self) -> float:
        return self.average_metric("automation_alignment")


class DynamicPlaybookBot(InsightBot):
    """High-level bot that disciplines the playbook and produces digests."""

    def __init__(
        self,
        *,
        agent: DynamicPlaybookAgent | None = None,
        helper: DynamicPlaybookHelper | None = None,
        keeper: DynamicPlaybookKeeper | None = None,
    ) -> None:
        super().__init__(
            agent=agent or DynamicPlaybookAgent(),
            helper=helper or DynamicPlaybookHelper(),
            keeper=keeper or DynamicPlaybookKeeper(),
        )

    def discipline(
        self, *, context: PlaybookContext, limit: int | None = None
    ) -> str:
        return super().publish_update(context=context, limit=limit)
