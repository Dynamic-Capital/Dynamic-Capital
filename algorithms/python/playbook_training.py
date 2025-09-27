"""Utilities for optimising playbooks and preparing AI training datasets."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, Optional, Sequence

from .desk_sync import TeamRolePlaybook
from .multi_llm import collect_strings

__all__ = [
    "PlaybookTrainingExample",
    "DEFAULT_TRAINING_INSTRUCTION",
    "normalise_statements",
    "optimise_playbook",
    "optimise_playbook_catalogue",
    "build_playbook_training_dataset",
]


@dataclass(slots=True)
class PlaybookTrainingExample:
    """A single prompt/completion pair suitable for supervised fine-tuning."""

    prompt: str
    completion: str
    metadata: Dict[str, Any] = field(default_factory=dict)


DEFAULT_TRAINING_INSTRUCTION = (
    "You are Dynamic Capital's coordination model. Ingest the structured role data "
    "and respond with JSON capturing priorities, workflow focus, outputs, KPIs, and "
    "quality metrics so automation systems can learn from the playbooks."
)


def normalise_statements(items: Sequence[str]) -> tuple[str, ...]:
    """Return a tuple with trimmed, deduplicated statements preserving order."""

    seen: set[str] = set()
    normalised: list[str] = []

    for raw in items:
        text = str(raw).strip()
        if not text:
            continue
        if text in seen:
            continue
        seen.add(text)
        normalised.append(text)

    return tuple(normalised)


def optimise_playbook(playbook: TeamRolePlaybook) -> TeamRolePlaybook:
    """Return a copy of ``playbook`` with normalised content sequences."""

    return TeamRolePlaybook(
        name=playbook.name.strip(),
        objectives=normalise_statements(playbook.objectives),
        workflow=normalise_statements(playbook.workflow),
        outputs=normalise_statements(playbook.outputs),
        kpis=normalise_statements(playbook.kpis),
    )


def optimise_playbook_catalogue(
    playbooks: Mapping[str, TeamRolePlaybook]
) -> Dict[str, TeamRolePlaybook]:
    """Optimise every playbook in the supplied catalogue."""

    return {name: optimise_playbook(playbook) for name, playbook in playbooks.items()}


def build_playbook_training_dataset(
    playbooks: Mapping[str, TeamRolePlaybook],
    *,
    focus: Optional[Iterable[str]] = None,
    instructions: Optional[str] = None,
    include_cohort_example: bool = True,
) -> list[PlaybookTrainingExample]:
    """Return supervised fine-tuning samples derived from ``playbooks``."""

    selected = _select_playbooks(playbooks, focus)
    dataset: list[PlaybookTrainingExample] = []

    instruction_text = (instructions or DEFAULT_TRAINING_INSTRUCTION).strip()

    for playbook in selected.values():
        optimised = optimise_playbook(playbook)
        metrics = _playbook_metrics(optimised)
        prompt = _build_role_prompt(optimised, instruction_text)
        completion_payload = {
            "role": optimised.name,
            "summary": _summarise_playbook(optimised),
            "priorities": list(optimised.objectives),
            "workflow": list(optimised.workflow),
            "outputs": list(optimised.outputs),
            "kpis": list(optimised.kpis),
            "metrics": metrics,
        }
        completion = json.dumps(completion_payload, indent=2, sort_keys=True)
        metadata = {
            "type": "single_role",
            "role": optimised.name,
            "metrics": metrics,
            "instruction": instruction_text,
        }
        dataset.append(
            PlaybookTrainingExample(prompt=prompt, completion=completion, metadata=metadata)
        )

    if include_cohort_example and len(selected) > 1:
        dataset.append(
            _build_cohort_example(list(selected.values()), instruction_text)
        )

    return dataset


def _select_playbooks(
    playbooks: Mapping[str, TeamRolePlaybook],
    focus: Optional[Iterable[str]],
) -> Dict[str, TeamRolePlaybook]:
    if focus is None:
        return dict(sorted(playbooks.items()))

    focus_tuple = tuple(focus)
    missing = [name for name in focus_tuple if name not in playbooks]
    if missing:
        raise KeyError(f"Unknown playbook(s): {', '.join(sorted(missing))}")
    return {name: playbooks[name] for name in focus_tuple}


def _playbook_metrics(playbook: TeamRolePlaybook) -> Dict[str, Any]:
    metrics = {
        "objective_count": len(playbook.objectives),
        "workflow_steps": len(playbook.workflow),
        "output_count": len(playbook.outputs),
        "kpi_count": len(playbook.kpis),
    }
    coverage_fields = (
        metrics["objective_count"],
        metrics["workflow_steps"],
        metrics["output_count"],
        metrics["kpi_count"],
    )
    metrics["coverage_score"] = round(
        sum(1 for value in coverage_fields if value > 0) / len(coverage_fields), 2
    )
    return metrics


def _build_role_prompt(playbook: TeamRolePlaybook, instruction: str) -> str:
    sections = [instruction, "", f"Role: {playbook.name}"]
    sections.append(_format_section("Objectives", playbook.objectives))
    sections.append(_format_section("Workflow", playbook.workflow))
    sections.append(_format_section("Outputs", playbook.outputs))
    sections.append(_format_section("KPIs", playbook.kpis))
    sections.append(
        "Respond with compact JSON using keys: summary, priorities, workflow, outputs, kpis, metrics."
    )
    return "\n".join(sections)


def _format_section(title: str, items: Sequence[str]) -> str:
    if not items:
        return f"{title}: None"
    lines = [f"{title}:"]
    lines.extend(f"- {item}" for item in items)
    return "\n".join(lines)


def _summarise_playbook(playbook: TeamRolePlaybook) -> str:
    objectives = list(playbook.objectives)
    summary_parts: list[str] = []
    if objectives:
        summary_parts.append(objectives[0])
    if playbook.outputs:
        summary_parts.append("Key outputs: " + ", ".join(playbook.outputs[:3]))
    if playbook.kpis:
        summary_parts.append("Tracked KPIs: " + ", ".join(playbook.kpis[:3]))
    return " ".join(summary_parts) if summary_parts else playbook.name


def _build_cohort_example(
    playbooks: Sequence[TeamRolePlaybook], instruction: str
) -> PlaybookTrainingExample:
    names = [playbook.name for playbook in playbooks]
    objectives = collect_strings(*(playbook.objectives for playbook in playbooks))
    workflows = collect_strings(*(playbook.workflow for playbook in playbooks))
    prompt_lines = [
        instruction,
        "",
        f"Roles: {', '.join(names)}",
        _format_section("Team Objectives", objectives),
        _format_section("Combined Workflow", workflows),
        "Summarise shared priorities and coordination handoffs in JSON format.",
    ]
    completion_payload: Dict[str, Any] = {
        "roles": names,
        "team_summary": " | ".join(_summarise_playbook(playbook) for playbook in playbooks),
        "shared_priorities": objectives,
        "handoff_pairs": _build_handoff_pairs(names),
        "coverage": {
            playbook.name: _playbook_metrics(optimise_playbook(playbook))
            for playbook in playbooks
        },
    }
    completion = json.dumps(completion_payload, indent=2, sort_keys=True)
    metadata = {
        "type": "cohort",
        "roles": names,
        "role_count": len(names),
        "instruction": instruction,
    }
    return PlaybookTrainingExample(
        prompt="\n".join(prompt_lines),
        completion=completion,
        metadata=metadata,
    )


def _build_handoff_pairs(names: Sequence[str]) -> list[str]:
    if len(names) < 2:
        return []
    pairs: list[str] = []
    for left, right in zip(names, names[1:]):
        pairs.append(f"{left} ↔ {right}")
    return pairs

