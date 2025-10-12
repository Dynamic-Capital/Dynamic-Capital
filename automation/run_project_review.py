"""Execute the project review → optimisation workflow end-to-end.

This helper mirrors how programme management uses :mod:`dynamic_project`
utilities to synthesise branch health, team readiness, and release
recommendations.  It ingests a JSON topology description, hydrates the
``DynamicBranchPlanner`` with live status data, and emits a structured
artifact that downstream automation (dashboards, alerting, release gates)
can consume without embedding domain logic.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dynamic_branch import DynamicBranchPlanner
from dynamic_project import audit_and_optimise_project_branches_and_teams


def _normalise_string_sequence(value: Any) -> tuple[str, ...]:
    """Return a tuple of trimmed strings extracted from ``value``."""

    if value is None:
        return ()
    if isinstance(value, (str, bytes)):
        text = str(value).strip()
        return (text,) if text else ()
    if not isinstance(value, Sequence):
        return ()
    items: list[str] = []
    for entry in value:
        text = str(entry).strip()
        if text and text not in items:
            items.append(text)
    return tuple(items)


def _parse_timestamp(raw: Any) -> datetime | None:
    """Parse ISO8601 timestamps used in branch status payloads."""

    if raw is None:
        return None
    text = str(raw).strip()
    if not text:
        return None
    if text.endswith("Z"):
        text = f"{text[:-1]}+00:00"
    timestamp = datetime.fromisoformat(text)
    if timestamp.tzinfo is None:
        return timestamp.replace(tzinfo=timezone.utc)
    return timestamp.astimezone(timezone.utc)


def _coerce_status_payload(status: Mapping[str, Any]) -> dict[str, Any]:
    payload = {str(key): value for key, value in status.items()}
    timestamp = _parse_timestamp(payload.get("last_commit_at"))
    if timestamp is not None:
        payload["last_commit_at"] = timestamp
    else:
        payload.pop("last_commit_at", None)
    return payload


def _load_topology(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text())
    except FileNotFoundError as exc:  # pragma: no cover - defensive guardrail
        raise SystemExit(f"Topology file not found: {path}") from exc
    except json.JSONDecodeError as exc:  # pragma: no cover - defensive guardrail
        raise SystemExit(f"Failed to parse topology JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise SystemExit("Topology payload must be a JSON object")
    return data


def _branch_definitions(topology: Mapping[str, Any]) -> Sequence[Mapping[str, Any]]:
    branches = topology.get("branches")
    if not isinstance(branches, Sequence) or not branches:
        raise SystemExit("Topology must define at least one branch entry")
    coerced: list[Mapping[str, Any]] = []
    for entry in branches:
        if not isinstance(entry, Mapping):
            raise SystemExit("Branch definitions must be mappings")
        coerced.append({str(key): value for key, value in entry.items()})
    return coerced


def _branch_statuses(topology: Mapping[str, Any]) -> Sequence[dict[str, Any]]:
    statuses = topology.get("statuses") or ()
    if not isinstance(statuses, Sequence):
        raise SystemExit("Topology statuses must be a list")
    coerced: list[dict[str, Any]] = []
    for entry in statuses:
        if not isinstance(entry, Mapping):
            raise SystemExit("Branch statuses must be mappings")
        coerced.append(_coerce_status_payload(entry))
    return coerced


def _planner_from_topology(topology: Mapping[str, Any]) -> DynamicBranchPlanner:
    planner = DynamicBranchPlanner(definitions=_branch_definitions(topology))
    for status in _branch_statuses(topology):
        planner.update_status(status)
    return planner


def _review_payload(review, overview: Mapping[str, Any]) -> dict[str, Any]:
    plan_snapshot = {name: plan.as_dict() for name, plan in overview.items()}
    organisation = review.organisation.to_dict()
    audit = review.audit.to_dict()
    optimisation = review.optimisation.to_dict()
    return {
        "organisation": organisation,
        "audit": audit,
        "optimisation": optimisation,
        "recommendedNextSteps": list(review.recommended_next_steps),
        "overview": plan_snapshot,
        "metrics": {
            "branchCount": review.organisation.branch_count,
            "teamCount": review.organisation.team_count,
            "readyCount": len(review.audit.ready),
            "findingCount": review.audit.issue_count,
            "blockedCount": len(review.audit.blocked),
            "pendingCount": len(review.optimisation.pending),
        },
    }


def _build_review(
    planner: DynamicBranchPlanner,
    *,
    focus_labels: Sequence[str],
    context: Mapping[str, Any] | None,
    include_optional: bool,
    roles: Sequence[str],
):
    return audit_and_optimise_project_branches_and_teams(
        planner,
        focus=focus_labels,
        context=context,
        include_optional_playbooks=include_optional,
        roles=roles,
    )


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Run the project review and optimisation workflow")
    parser.add_argument(
        "--config",
        type=Path,
        default=ROOT / "automation" / "project_topology.json",
        help="Path to the project topology JSON file",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "automation" / "logs" / "project-review.json",
        help="Destination for the project review payload",
    )
    args = parser.parse_args(argv)

    topology = _load_topology(args.config)
    planner = _planner_from_topology(topology)

    focus_labels = _normalise_string_sequence(topology.get("focus"))
    role_list = _normalise_string_sequence(topology.get("roles"))
    include_optional = bool(topology.get("includeOptionalPlaybooks", True))
    context = topology.get("context") if isinstance(topology.get("context"), Mapping) else None

    review = _build_review(
        planner,
        focus_labels=focus_labels,
        context=context,
        include_optional=include_optional,
        roles=role_list,
    )
    overview = planner.overview()

    payload = _review_payload(review, overview)
    payload["generatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["automation"] = "project_review"
    payload["focus"] = list(review.organisation.focus)
    payload["inputs"] = {
        "branchDefinitions": len(topology.get("branches") or []),
        "statusEntries": len(topology.get("statuses") or []),
    }
    if context:
        payload["context"] = {str(key): value for key, value in context.items()}
    if role_list:
        payload["teamRoles"] = list(role_list)

    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2) + "\n")

    print("Project review summary")
    print(f"Focus: {', '.join(payload['focus']) or '—'}")
    metrics = payload["metrics"]
    print(
        "Branches: "
        f"{metrics['branchCount']} (ready {metrics['readyCount']}, findings {metrics['findingCount']}, pending {metrics['pendingCount']})"
    )
    if payload["recommendedNextSteps"]:
        print("Recommended next steps:")
        for step in payload["recommendedNextSteps"]:
            print(f"  - {step}")
    else:
        print("No outstanding next steps")
    print(f"Wrote project review to {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
