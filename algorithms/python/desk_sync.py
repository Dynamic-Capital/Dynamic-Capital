"""Trading desk synchronisation utilities.

This module glues together the high level automation pillars that keep
Dynamic Capital's trading desk aligned.  It provides a lightweight team role
registry, helpers for reconciling protocol guidance produced by the
``DynamicProtocolPlanner``, and deterministic summaries of the Lorentzian
trading logic so downstream systems can validate configuration drift.

The goal is to offer a single coordination point that upstream orchestration
services (for example, Supabase Edge Functions or Airflow DAGs) can call when
they need a coherent snapshot of the desk.  The implementation intentionally
keeps side-effects to a minimum so the algorithms remain fully testable.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, Mapping, MutableMapping, Optional, Sequence

from .dynamic_protocol_planner import ProtocolDraft, summarise_trade_logic as protocol_trade_logic_summary
from .trade_logic import PerformanceMetrics, TradeLogic

__all__ = [
    "TeamRolePlaybook",
    "TeamRoleSyncResult",
    "TeamRoleSyncAlgorithm",
    "summarise_trade_logic",
    "DeskSyncReport",
    "TradingDeskSynchroniser",
]


@dataclass(slots=True)
class TeamRolePlaybook:
    """Canonical workflow description for a trading desk role."""

    name: str
    objectives: Sequence[str]
    workflow: Sequence[str]
    outputs: Sequence[str] = field(default_factory=tuple)
    kpis: Sequence[str] = field(default_factory=tuple)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the playbook."""

        return {
            "name": self.name,
            "objectives": list(self.objectives),
            "workflow": list(self.workflow),
            "outputs": list(self.outputs),
            "kpis": list(self.kpis),
        }


@dataclass(slots=True)
class TeamRoleSyncResult:
    """Result of running :class:`TeamRoleSyncAlgorithm`."""

    playbooks: Dict[str, TeamRolePlaybook]
    generated_at: datetime
    focus: tuple[str, ...]
    context: Dict[str, Any]

    def summary(self) -> str:
        """Return a concise human readable summary."""

        roles = ", ".join(self.playbooks)
        if not roles:
            return "No roles registered"
        focus = f" (focus: {', '.join(self.focus)})" if self.focus else ""
        return f"{len(self.playbooks)} roles synchronised: {roles}{focus}"

    def to_dict(self) -> Dict[str, Any]:
        """Return the synchronisation payload in a JSON-friendly shape."""

        return {
            "generated_at": self.generated_at.isoformat(),
            "focus": list(self.focus),
            "context": dict(self.context),
            "playbooks": {name: playbook.to_dict() for name, playbook in self.playbooks.items()},
            "summary": self.summary(),
        }


class TeamRoleSyncAlgorithm:
    """Deterministic registry that exposes trading desk playbooks."""

    def __init__(self, playbooks: Iterable[TeamRolePlaybook]):
        self._playbooks: Dict[str, TeamRolePlaybook] = {}
        for playbook in playbooks:
            if playbook.name in self._playbooks:
                raise ValueError(f"duplicate playbook registered for {playbook.name}")
            self._playbooks[playbook.name] = playbook
        if not self._playbooks:
            raise ValueError("at least one playbook must be supplied")

    def synchronise(
        self,
        *,
        focus: Optional[Iterable[str]] = None,
        context: Optional[Mapping[str, Any]] = None,
    ) -> TeamRoleSyncResult:
        """Return the playbooks that match the optional focus set."""

        focus_tuple: tuple[str, ...] = tuple(focus or ())
        if focus_tuple:
            missing = [name for name in focus_tuple if name not in self._playbooks]
            if missing:
                raise KeyError(f"Unknown playbook(s): {', '.join(missing)}")
            selected = {name: self._playbooks[name] for name in focus_tuple}
        else:
            selected = dict(sorted(self._playbooks.items()))

        payload_context: Dict[str, Any] = dict(context or {})
        payload_context.setdefault("role_count", len(selected))

        return TeamRoleSyncResult(
            playbooks=selected,
            generated_at=datetime.now(tz=UTC),
            focus=focus_tuple,
            context=payload_context,
        )


def summarise_trade_logic(trade_logic: TradeLogic) -> Dict[str, Any]:
    """Return a snapshot of the trading logic aligned with protocol summaries."""

    summary = protocol_trade_logic_summary(trade_logic)

    risk = getattr(trade_logic, "risk", None)
    metrics_payload: Dict[str, Any] | None = summary.get("risk_metrics")
    if risk is not None:
        metrics = None
        metrics_fn = getattr(risk, "metrics", None)
        if callable(metrics_fn):
            try:
                metrics = metrics_fn()
            except Exception:  # pragma: no cover - risk metrics are optional
                metrics = None
        if isinstance(metrics, PerformanceMetrics):
            metrics_dict = asdict(metrics)
            if metrics_payload:
                metrics_payload = {**metrics_payload, **metrics_dict}
            else:
                metrics_payload = metrics_dict
    if metrics_payload:
        summary["risk_metrics"] = metrics_payload

    strategy = getattr(trade_logic, "strategy", None)
    if strategy is not None:
        summary.setdefault("strategy", {
            "neighbors": getattr(strategy, "neighbors", None),
            "max_rows": getattr(strategy, "max_rows", None),
            "label_lookahead": getattr(strategy, "label_lookahead", None),
            "neutral_zone_pips": getattr(strategy, "neutral_zone_pips", None),
        })

    if "config" not in summary:
        summary["config"] = asdict(trade_logic.config)

    return summary


@dataclass(slots=True)
class DeskSyncReport:
    """Combined synchronisation payload for the trading desk."""

    generated_at: datetime
    team: TeamRoleSyncResult
    protocol: ProtocolDraft
    trade_logic: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the report."""

        return {
            "generated_at": self.generated_at.isoformat(),
            "team": self.team.to_dict(),
            "protocol": self.protocol.to_dict(),
            "trade_logic": self.trade_logic,
            "metadata": dict(self.metadata),
        }


class TradingDeskSynchroniser:
    """Orchestrates team, protocol, and trading logic synchronisation."""

    def __init__(
        self,
        *,
        team_sync: TeamRoleSyncAlgorithm,
        protocol_planner,
        trade_logic: TradeLogic,
    ) -> None:
        self._team_sync = team_sync
        self._protocol_planner = protocol_planner
        self._trade_logic = trade_logic

    def build_report(
        self,
        *,
        focus_roles: Optional[Iterable[str]] = None,
        protocol_context: Optional[Mapping[str, Any]] = None,
        team_context: Optional[Mapping[str, Any]] = None,
    ) -> DeskSyncReport:
        """Run the synchronisation routines and return a :class:`DeskSyncReport`."""

        team_result = self._team_sync.synchronise(focus=focus_roles, context=team_context)
        protocol = self._protocol_planner.generate_protocol(
            context=self._merge_context(protocol_context, team_result)
        )
        trade_summary = summarise_trade_logic(self._trade_logic)
        metadata = {
            "team_summary": team_result.summary(),
            "protocol_annotations": dict(protocol.annotations),
        }
        if protocol_context:
            metadata["protocol_context"] = dict(protocol_context)
        return DeskSyncReport(
            generated_at=datetime.now(tz=UTC),
            team=team_result,
            protocol=protocol,
            trade_logic=trade_summary,
            metadata=metadata,
        )

    @staticmethod
    def _merge_context(
        protocol_context: Optional[Mapping[str, Any]],
        team_result: TeamRoleSyncResult,
    ) -> MutableMapping[str, Any]:
        context: MutableMapping[str, Any] = dict(protocol_context or {})
        context.setdefault("team_roles", list(team_result.playbooks))
        context.setdefault("team_summary", team_result.summary())
        context.setdefault("role_count", len(team_result.playbooks))
        return context
