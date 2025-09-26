from __future__ import annotations

from typing import Any, Dict, List

from algorithms.python.desk_token_hub import (
    CHECKLIST_REFERENCE,
    TokenHubDevelopmentContext,
    TokenHubDevelopmentOrchestrator,
)


class StubClient:
    def __init__(self, responses: List[str]) -> None:
        self._responses = list(responses)
        self.calls: List[Dict[str, Any]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float,
        max_tokens: int,
        nucleus_p: float,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "nucleus_p": nucleus_p,
            }
        )
        assert self._responses, "Unexpected extra completion request"
        return self._responses.pop(0)


def test_token_hub_sync_merges_llm_guidance() -> None:
    grok_response = """
    {
      "summary": "Focus on staking flows and compliance guardrails for the next sprint.",
      "priority_actions": [
        "Integrate TON wallet authentication for staking actions",
        "Publish governance delegation playbook"
      ],
      "risks": ["Treasury controls not exercised across mint functions"],
      "roadmap_alignment": ["Phase 1 deliverables tracking"],
      "checklist_updates": {
        "foundation_architecture": [
          {
            "task": "Integrate TON wallet authentication and transaction signing for all on-chain actions.",
            "status": "in_progress",
            "owner": "Protocol Squad"
          }
        ],
        "governance_experience": [
          {
            "task": "Support delegation workflows for Token Assembly representatives.",
            "status": "needs_review",
            "notes": "Waiting on council feedback"
          }
        ]
      }
    }
    """
    deepseek_response = """
    {
      "priority_refinements": [
        "Add automated alerts for quorum drops"
      ],
      "challenges": [
        "Compliance evidence storage lacks export automation"
      ],
      "roadmap_notes": ["Phase 2 dashboards require analytics schema"],
      "checklist_adjustments": {
        "Compliance & Risk Controls": [
          {
            "task": "Log compliance decisions and provide exportable reports for regulators.",
            "status": "blocked",
            "owner": "Risk & Compliance",
            "notes": "Need archival bucket encryption policy"
          }
        ],
        "Data Room": [
          {
            "task": "Publish security posture update",
            "status": "pending"
          }
        ]
      }
    }
    """

    grok_client = StubClient([grok_response.strip()])
    deepseek_client = StubClient([deepseek_response.strip()])

    orchestrator = TokenHubDevelopmentOrchestrator(
        grok_client=grok_client,
        deepseek_client=deepseek_client,
    )

    context = TokenHubDevelopmentContext(
        release_phase="Phase 1",
        product_updates=("Desk Hub UI audit complete",),
        treasury_snapshot={"runway_months": 18},
        governance_snapshot={"active_proposals": 2},
        compliance_alerts=("Awaiting SOC2 attestation",),
        analytics={"daily_active_users": 1200},
        stakeholder_requests=("Enable phased rollout to VIP cohort",),
        open_questions=("Do we support cross-chain staking at launch?",),
    )

    report = orchestrator.synchronise(context)

    assert report.summary == "Focus on staking flows and compliance guardrails for the next sprint."
    assert "Integrate TON wallet authentication for staking actions" in report.priority_actions
    assert "Add automated alerts for quorum drops" in report.priority_actions
    assert "Compliance evidence storage lacks export automation" in report.risk_calls
    assert "Phase 2 dashboards require analytics schema" in report.roadmap_alignment

    foundation_tasks = {
        item["task"]: item for item in report.checklist["foundation_architecture"]
    }
    assert (
        foundation_tasks[
            "Integrate TON wallet authentication and transaction signing for all on-chain actions."
        ]["status"]
        == "in_progress"
    )
    assert (
        foundation_tasks[
            "Integrate TON wallet authentication and transaction signing for all on-chain actions."
        ]["owner"]
        == "Protocol Squad"
    )

    assert "compliance_risk_controls" in report.checklist
    compliance_entry = next(
        item
        for item in report.checklist["compliance_risk_controls"]
        if item["task"]
        == "Log compliance decisions and provide exportable reports for regulators."
    )
    assert compliance_entry["status"] == "blocked"
    assert compliance_entry["owner"] == "Risk & Compliance"

    assert "data_room" in report.checklist
    assert report.checklist["data_room"][0]["task"] == "Publish security posture update"

    assert report.metadata["context"]["release_phase"] == "Phase 1"
    assert report.raw_response is not None

    assert len(grok_client.calls) == 1
    assert len(deepseek_client.calls) == 1

    assert set(CHECKLIST_REFERENCE.keys()).issuperset(
        {key for key in report.checklist.keys() if key != "data_room"}
    )
