"""Tests for the Dynamic Domain planner."""

from __future__ import annotations

from dynamic_domain import (
    DomainChangeType,
    DomainRecord,
    DynamicDomainManager,
)


def test_domain_record_normalisation() -> None:
    record = DomainRecord(
        type="cname",
        name="WWW ",
        data="Example.COM.",
        ttl="600",
        priority=None,
        metadata={"owner": "ops"},
    )

    assert record.type == "CNAME"
    assert record.name == "www"
    assert record.data == "example.com"
    assert record.ttl == 600
    assert record.metadata == {"owner": "ops"}


def test_plan_creates_missing_records() -> None:
    manager = DynamicDomainManager("Example.COM")

    desired = [
        DomainRecord(type="A", name="@", data="1.2.3.4", ttl=300, managed=True),
        DomainRecord(type="TXT", name="@", data="v=spf1 include:example.com", ttl=3600, managed=True),
    ]

    plan = manager.plan(desired)

    assert plan.total_changes == 2
    assert all(change.action is DomainChangeType.CREATE for change in plan.creates)
    assert {change.record.data for change in plan.creates} == {"1.2.3.4", "v=spf1 include:example.com"}


def test_plan_updates_changed_records() -> None:
    existing = DomainRecord(type="A", name="@", data="1.2.3.4", ttl=300, managed=True)
    manager = DynamicDomainManager("example.com", existing=[existing])

    desired = [DomainRecord(type="A", name="@", data="1.2.3.4", ttl=600, managed=True)]

    plan = manager.plan(desired)

    assert plan.total_changes == 1
    (change,) = plan.updates
    assert change.action is DomainChangeType.UPDATE
    assert change.differences == {"ttl": (300, 600)}


def test_plan_prunes_managed_records_when_requested() -> None:
    existing_managed = DomainRecord(type="TXT", name="@", data="managed", ttl=3600, managed=True)
    manager = DynamicDomainManager("example.com", existing=[existing_managed])

    plan = manager.plan([], prune=True)

    assert plan.total_changes == 1
    (deletion,) = plan.deletes
    assert deletion.action is DomainChangeType.DELETE
    assert deletion.record.data == "managed"


def test_plan_does_not_prune_unmanaged_records() -> None:
    existing_unmanaged = DomainRecord(type="TXT", name="@", data="leave-me", ttl=3600, managed=False)
    manager = DynamicDomainManager("example.com", existing=[existing_unmanaged])

    plan = manager.plan([], prune=True)

    assert plan.is_empty()
