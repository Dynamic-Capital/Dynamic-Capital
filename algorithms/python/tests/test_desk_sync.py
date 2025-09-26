from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import pytest

from algorithms.python.desk_sync import (
    DeskSyncReport,
    TeamRolePlaybook,
    TeamRoleSyncAlgorithm,
    summarise_trade_logic,
    TradingDeskSynchroniser,
)
from algorithms.python.dynamic_protocol_planner import (
    ProtocolDraft,
    summarise_trade_logic as protocol_summarise_trade_logic,
)
from algorithms.python.trade_logic import TradeLogic


def _build_playbooks() -> list[TeamRolePlaybook]:
    return [
        TeamRolePlaybook(
            name="Strategist",
            objectives=("Align desk objectives", "Surface weekly focus"),
            workflow=(
                "Review KPI deltas",
                "Prioritise initiatives",
                "Publish strategy brief",
            ),
            outputs=("Strategy brief", "Updated risk register"),
            kpis=("Pipeline velocity", "Budget adherence"),
        ),
        TeamRolePlaybook(
            name="Quant Analyst",
            objectives=("Maintain trading models", "Validate signals"),
            workflow=(
                "Inspect training data",
                "Backtest parameter updates",
                "Publish findings to desk",
            ),
            outputs=("Model changelog", "Backtest summary"),
            kpis=("Signal quality", "Deployment latency"),
        ),
    ]


def test_team_role_sync_filters_and_serialises() -> None:
    playbooks = _build_playbooks()
    sync = TeamRoleSyncAlgorithm(playbooks)

    result = sync.synchronise(focus=("Strategist",), context={"shift": "nyc"})

    assert tuple(result.playbooks) == ("Strategist",)
    assert result.focus == ("Strategist",)
    assert result.context["role_count"] == 1
    payload = result.to_dict()
    assert payload["playbooks"]["Strategist"]["workflow"][0] == "Review KPI deltas"
    assert payload["focus"] == ["Strategist"]
    generated = datetime.fromisoformat(payload["generated_at"])
    assert generated.tzinfo is not None


class _StubPlanner:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    def generate_protocol(self, *, context=None, trade_logic=None, optimization_plan=None):  # noqa: D401 - signature mirrors planner
        self.calls.append(dict(context or {}))
        return ProtocolDraft(
            plan={
                "daily": {
                    "trade_plan": ["Check London session breakouts"],
                    "review": ["Annotate journal"],
                }
            },
            annotations={"source": "stub"},
        )


def test_trading_desk_synchroniser_builds_report() -> None:
    playbooks = _build_playbooks()
    sync = TeamRoleSyncAlgorithm(playbooks)
    planner = _StubPlanner()
    trade_logic = TradeLogic()

    orchestrator = TradingDeskSynchroniser(
        team_sync=sync,
        protocol_planner=planner,
        trade_logic=trade_logic,
    )

    report = orchestrator.build_report(
        focus_roles=["Strategist"],
        protocol_context={"market": "fx"},
        team_context={"shift": "nyc"},
    )

    assert isinstance(report, DeskSyncReport)
    assert planner.calls, "expected planner to be invoked"
    planner_context = planner.calls[0]
    assert planner_context["team_roles"] == ["Strategist"]
    assert planner_context["team_summary"].startswith("1 roles synchronised")

    report_payload = report.to_dict()
    assert report_payload["team"]["summary"].startswith("1 roles synchronised")
    assert report_payload["protocol"]["daily"]["trade_plan"] == ["Check London session breakouts"]
    assert report_payload["metadata"]["protocol_annotations"] == {"source": "stub"}
    assert report_payload["metadata"]["protocol_context"] == {"market": "fx"}
    assert report_payload["trade_logic"]["config"]["neighbors"] == trade_logic.config.neighbors
    generated_at = datetime.fromisoformat(report_payload["generated_at"])
    assert generated_at.tzinfo is not None and generated_at.tzinfo.utcoffset(generated_at) == timezone.utc.utcoffset(generated_at)


def test_team_role_sync_errors_on_unknown_focus() -> None:
    sync = TeamRoleSyncAlgorithm(_build_playbooks())
    with pytest.raises(KeyError):
        sync.synchronise(focus=("Unknown",))


def test_trade_logic_summary_aligns_with_protocol() -> None:
    trade_logic = TradeLogic()

    desk_summary = summarise_trade_logic(trade_logic)
    protocol_summary = protocol_summarise_trade_logic(trade_logic)

    assert desk_summary["config"] == protocol_summary["config"]
    assert desk_summary["adr"] == protocol_summary["adr"]
    assert desk_summary["smc"] == protocol_summary["smc"]
    assert "strategy" in desk_summary
