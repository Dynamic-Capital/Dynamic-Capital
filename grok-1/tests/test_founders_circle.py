from __future__ import annotations

import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from founders_circle import (  # noqa: E402
    ChannelAllocation,
    FoundersCirclePlan,
    generate_founders_circle_plan,
    summarize_plan,
)


def test_generate_plan_uses_config_defaults() -> None:
    plan = generate_founders_circle_plan(
        vip_channel_members=120,
        vip_group_members=95,
        mentorship_channel_members=60,
        mentorship_group_members=75,
        trading_pool_members=40,
    )

    assert isinstance(plan, FoundersCirclePlan)
    assert pytest.approx(plan.max_supply, rel=1e-6) == 100_000_000
    assert pytest.approx(plan.allocation_pct, rel=1e-6) == 0.06
    assert pytest.approx(plan.total_pool, rel=1e-6) == 6_000_000

    names = [allocation.label for allocation in plan.channel_allocations]
    assert names == [
        "VIP Channel",
        "VIP Group",
        "Mentorship Channel",
        "Mentorship Group",
        "Trading Pool",
    ]

    per_member = [allocation.per_member for allocation in plan.channel_allocations]
    assert per_member[0] > per_member[1]
    assert per_member[-1] > per_member[0]


def test_generate_plan_deterministic_with_custom_inputs() -> None:
    plan = generate_founders_circle_plan(
        max_supply=1_500_000,
        allocation_pct=0.08,
        vip_channel_members=80,
        vip_group_members=60,
        mentorship_channel_members=30,
        mentorship_group_members=45,
        trading_pool_members=25,
        engagement_multipliers={"trading_pool": 1.6},
    )

    expected_totals = [
        36369.0685,
        24980.6678,
        18337.4341,
        21659.051,
        18653.7786,
    ]
    allocations = [allocation.allocation for allocation in plan.channel_allocations]
    for actual, expected in zip(allocations, expected_totals):
        assert pytest.approx(actual, rel=1e-6) == expected

    per_member = [allocation.per_member for allocation in plan.channel_allocations]
    assert pytest.approx(per_member[0], rel=1e-6) == 454.6134
    assert pytest.approx(per_member[2], rel=1e-6) == 611.2478


def test_generate_plan_validation() -> None:
    with pytest.raises(ValueError):
        generate_founders_circle_plan(
            max_supply=1_000_000,
            allocation_pct=-0.1,
            vip_channel_members=10,
            vip_group_members=10,
            mentorship_channel_members=10,
            mentorship_group_members=10,
            trading_pool_members=10,
        )

    with pytest.raises(ValueError):
        generate_founders_circle_plan(
            max_supply=0,
            allocation_pct=0.1,
            vip_channel_members=10,
            vip_group_members=10,
            mentorship_channel_members=10,
            mentorship_group_members=10,
            trading_pool_members=10,
        )

    with pytest.raises(ValueError):
        generate_founders_circle_plan(
            max_supply=1_000_000,
            allocation_pct=0.1,
            vip_channel_members=-1,
            vip_group_members=10,
            mentorship_channel_members=10,
            mentorship_group_members=10,
            trading_pool_members=10,
        )


def test_summarize_plan_renders_output() -> None:
    plan = FoundersCirclePlan(
        max_supply=1000.0,
        allocation_pct=0.1,
        total_pool=100.0,
        channel_allocations=(
            ChannelAllocation(
                key="vip_channel",
                label="VIP Channel",
                members=20,
                multiplier=1.2,
                allocation=40.0,
                per_member=2.0,
                eligibility_note="Test eligibility",
            ),
        ),
    )

    summary = summarize_plan(plan)
    assert "Founders Circle Pool" in summary
    assert "VIP Channel" in summary
    assert "2.00" in summary

