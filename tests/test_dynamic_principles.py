from dynamic_playbook import (
    GovernancePrinciple,
    dynamic_governance_creation_principles,
    summarise_principles,
)


def test_dynamic_governance_creation_principles_shape() -> None:
    principles = dynamic_governance_creation_principles()

    assert len(principles) == 5
    assert all(isinstance(principle, GovernancePrinciple) for principle in principles)

    names = {principle.name for principle in principles}
    assert names == {"Clarity", "Inclusion", "Evidence", "Accountability", "Learning"}

    for principle in principles:
        assert principle.mandate
        assert principle.practices
        assert principle.evaluations
        assert all(practice.endswith(".") for practice in principle.practices)
        assert all(evaluation.endswith("?") for evaluation in principle.evaluations)


def test_summarise_principles_generates_digest_lines() -> None:
    principles = dynamic_governance_creation_principles()

    summaries = summarise_principles(principles)

    assert len(summaries) == len(principles)
    assert summaries[0].startswith("Clarity: ")
    assert all(principle.name in summary for principle, summary in zip(principles, summaries))
