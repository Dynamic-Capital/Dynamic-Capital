"""Founders Circle allocation heuristics aligned with Dynamic Capital tokenomics.

The Grok-1 weights are far too heavy for unit tests, so this module provides a
deterministic allocator that mirrors the type of structured reasoning a Grok
assistant could perform.  The goal is to expose an easily testable helper that
translates token supply signals and member telemetry into an actionable
Founders Circle distribution plan.

The algorithm keeps the following principles in mind:

* Respect Dynamic Capital's on-chain configuration.  Unless callers override
  values explicitly, the helper reads ``dynamic-capital-ton/config.yaml`` to
  pull the canonical supply and treasury split percentages.
* Weight allocations by engagement.  Channels with higher membership counts or
  higher multipliers receive proportionally larger slices while still
  honouring guard rails for minimum representation.
* Produce structured output.  Callers receive per-channel allocation totals,
  per-member awards, and human readable eligibility notes so the plan can be
  surfaced directly in dashboards or sent to downstream automations.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Mapping, Sequence, Tuple


try:  # pragma: no cover - exercised indirectly through tests
    import yaml  # type: ignore
except Exception:  # pragma: no cover - fallback handles environments without PyYAML
    yaml = None  # type: ignore


_DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "dynamic-capital-ton" / "config.yaml"


@dataclass(frozen=True)
class ChannelAllocation:
    """Represents the allocation outcome for a specific Founders Circle cohort."""

    key: str
    label: str
    members: int
    multiplier: float
    allocation: float
    per_member: float
    eligibility_note: str


@dataclass(frozen=True)
class FoundersCirclePlan:
    """Container describing the complete Founders Circle allocation plan."""

    max_supply: float
    allocation_pct: float
    total_pool: float
    channel_allocations: Tuple[ChannelAllocation, ...]


def _parse_scalar(value: str) -> Any:
    if value.startswith("[") and value.endswith("]"):
        inner = value[1:-1].strip()
        if not inner:
            return []
        return [_parse_scalar(item.strip()) for item in inner.split(",")]
    if value.startswith("\"") and value.endswith("\""):
        return value[1:-1]
    lowered = value.lower()
    if lowered in {"true", "false"}:
        return lowered == "true"
    try:
        if "." in value:
            return float(value)
        return int(value)
    except ValueError:
        return value


def _minimal_yaml_load(text: str) -> Dict[str, Any]:
    """Parse a very small subset of YAML for repositories without PyYAML."""

    root: Dict[str, Any] = {}
    stack: list[tuple[int, Dict[str, Any]]] = [(-1, root)]
    for raw_line in text.splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue
        indent = len(raw_line) - len(raw_line.lstrip(" "))
        key, _, remainder = raw_line.strip().partition(":")
        value = remainder.strip()
        while stack and indent <= stack[-1][0]:
            stack.pop()
        parent = stack[-1][1]
        if not value:
            node: Dict[str, Any] = {}
            parent[key] = node
            stack.append((indent, node))
        else:
            parent[key] = _parse_scalar(value)
    return root


def _load_config(config: Mapping[str, Any] | None, *, config_path: Path) -> Mapping[str, Any]:
    if config is not None:
        return config
    text = config_path.read_text(encoding="utf-8")
    if yaml is not None:  # type: ignore[truthy-function]
        loaded = yaml.safe_load(text)  # type: ignore[attr-defined]
        if isinstance(loaded, Mapping):
            return loaded
        raise ValueError("Config file did not produce a mapping")
    return _minimal_yaml_load(text)


def _normalise_percentage(value: float) -> float:
    if value <= 0:
        raise ValueError("`allocation_pct` must be positive")
    if value > 1:
        value = value / 100.0
    if not 0 < value <= 1:
        raise ValueError("`allocation_pct` must be between 0 and 1 (or 0-100)")
    return value


def _default_allocation_fraction(config: Mapping[str, Any]) -> float:
    splits = config.get("splits", {})
    if isinstance(splits, Mapping):
        auto_invest = splits.get("autoInvestPct")
        try:
            auto_invest_value = float(auto_invest)
        except (TypeError, ValueError):
            auto_invest_value = 0.0
        # Allocate 20% of the auto-invest bucket by default.
        base_fraction = (auto_invest_value * 0.2) / 100.0
        if base_fraction > 0:
            return base_fraction
    # Fallback to a conservative 5% slice.
    return 0.05


def _suggest_eligibility(per_member: float, members: int) -> str:
    if members == 0 or per_member == 0:
        return "Recruit at least 25 verified members to unlock rewards."
    if per_member < 50:
        return "Open to members with ≥14 day tenure and active participation."
    if per_member < 150:
        return "Require KYC plus ≥100 DCT staked for 30 days."
    if per_member < 400:
        return "Require ≥250 DCT staked, governance vote, and 45 day tenure."
    return "Invite-only: charter members with ≥500 DCT staked and quarterly reviews."


def _round_token(value: float) -> float:
    return round(value, 4)


def generate_founders_circle_plan(
    *,
    max_supply: float | None = None,
    allocation_pct: float | None = None,
    vip_channel_members: int,
    vip_group_members: int,
    mentorship_channel_members: int,
    mentorship_group_members: int,
    trading_pool_members: int,
    config: Mapping[str, Any] | None = None,
    config_path: Path = _DEFAULT_CONFIG_PATH,
    engagement_multipliers: Mapping[str, float] | None = None,
    minimum_channel_share: float = 0.05,
) -> FoundersCirclePlan:
    """Generate an allocation plan for the Founders Circle incentive pool."""

    if minimum_channel_share < 0 or minimum_channel_share >= 1:
        raise ValueError("`minimum_channel_share` must be between 0 and 1")

    cfg = _load_config(config, config_path=config_path)
    supply = max_supply
    if supply is None:
        token_cfg = cfg.get("token", {})
        if not isinstance(token_cfg, Mapping):
            raise ValueError("Config missing token specification")
        supply_value = token_cfg.get("maxSupply")
        try:
            supply = float(supply_value)
        except (TypeError, ValueError):
            raise ValueError("Token max supply missing or invalid") from None
    if supply is None or supply <= 0:
        raise ValueError("`max_supply` must be positive")

    fraction = allocation_pct
    if fraction is None:
        fraction = _default_allocation_fraction(cfg)
    fraction = _normalise_percentage(float(fraction))

    channels: Sequence[tuple[str, str, int]] = (
        ("vip_channel", "VIP Channel", vip_channel_members),
        ("vip_group", "VIP Group", vip_group_members),
        ("mentorship_channel", "Mentorship Channel", mentorship_channel_members),
        ("mentorship_group", "Mentorship Group", mentorship_group_members),
        ("trading_pool", "Trading Pool", trading_pool_members),
    )

    for _, label, members in channels:
        if members < 0:
            raise ValueError(f"Member count for {label} cannot be negative")

    default_multipliers: Mapping[str, float] = {
        "vip_channel": 1.2,
        "vip_group": 1.0,
        "mentorship_channel": 1.3,
        "mentorship_group": 1.1,
        "trading_pool": 1.45,
    }

    multipliers: Dict[str, float] = {
        key: float((engagement_multipliers or {}).get(key, default_multipliers[key]))
        for key in default_multipliers
    }

    total_pool = _round_token(supply * fraction)
    reserved_fraction = min(minimum_channel_share, 1 / len(channels))
    reserved_total = total_pool * reserved_fraction * len(channels)
    variable_pool = max(total_pool - reserved_total, 0.0)
    base_per_channel = reserved_total / len(channels) if channels else 0.0

    weights = [max(members, 0) * multipliers[key] for key, _, members in channels]
    total_weight = sum(weights)
    if total_weight <= 0:
        weights = [1.0 for _ in channels]
        total_weight = float(len(channels))

    allocations: list[ChannelAllocation] = []
    for (key, label, members), weight in zip(channels, weights):
        share = base_per_channel
        share += variable_pool * (weight / total_weight)
        share = _round_token(share)
        per_member = _round_token(share / members) if members else 0.0
        eligibility = _suggest_eligibility(per_member, members)
        allocations.append(
            ChannelAllocation(
                key=key,
                label=label,
                members=members,
                multiplier=multipliers[key],
                allocation=share,
                per_member=per_member,
                eligibility_note=eligibility,
            )
        )

    return FoundersCirclePlan(
        max_supply=_round_token(supply),
        allocation_pct=_round_token(fraction),
        total_pool=total_pool,
        channel_allocations=tuple(allocations),
    )


def summarize_plan(plan: FoundersCirclePlan) -> str:
    """Return a human readable summary of a Founders Circle plan."""

    lines = [
        (
            f"Founders Circle Pool: {plan.total_pool:,.2f} DCT "
            f"({plan.allocation_pct * 100:.2f}% of supply)"
        )
    ]
    for allocation in plan.channel_allocations:
        lines.append(
            (
                f"- {allocation.label}: {allocation.allocation:,.2f} DCT "
                f"({allocation.members} members, multiplier {allocation.multiplier:.2f})"
                f" → {allocation.per_member:,.2f} per member. {allocation.eligibility_note}"
            )
        )
    return "\n".join(lines)

