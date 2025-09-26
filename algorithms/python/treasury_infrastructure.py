"""Treasury infrastructure planner covering wallets, oracles, and controls."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

DEFAULT_ALLOCATIONS: Mapping[str, float] = {
    "buybacks": 0.30,
    "staking_rewards": 0.25,
    "reserves": 0.35,
    "risk_buffer": 0.10,
}

WALLET_REFERENCE: Mapping[str, Mapping[str, Any]] = {
    "buybacks": {
        "name": "Buyback Vault",
        "purpose": "Execute TWAP buybacks and burns across approved venues.",
        "automation": (
            "TWAP execution bot enforcing venue slippage and spend caps.",
            "Automatic burn transactions triggered after buyback settlement.",
        ),
    },
    "staking_rewards": {
        "name": "Staking Rewards Vault",
        "purpose": "Fund staking boosts and epoch payouts gated by governance.",
        "automation": (
            "Epoch scheduler updating reward weights every 30 days.",
            "Compliance checks verifying emissions against policy limits.",
        ),
    },
    "reserves": {
        "name": "Strategic Reserves Vault",
        "purpose": "Hold operational runway, liquidity, and opportunistic dry powder.",
        "automation": (
            "Liquidity provisioning bot for AMMs and OTC desk settlement.",
            "Monthly reconciliation workflow against custody statements.",
        ),
    },
    "risk_buffer": {
        "name": "Risk Buffer Vault",
        "purpose": "Segregated capital for drawdowns, security incidents, and emergencies.",
        "automation": (
            "Circuit breaker integration that freezes deployments on breach.",
            "Alerting hook notifying governance when balance falls below target.",
        ),
    },
}

DEFAULT_ORACLE_CONFIG: Mapping[str, Mapping[str, Any]] = {
    "USDT/TON": {
        "primary": "Chainlink",
        "fallbacks": ("RedStone", "TonAPI"),
        "update_interval_minutes": 15,
        "deviation_threshold": 0.02,
    },
    "TON/USD": {
        "primary": "Chainlink",
        "fallbacks": ("Binance", "OKX"),
        "update_interval_minutes": 10,
        "deviation_threshold": 0.025,
    },
    "DCT/USDT": {
        "primary": "DexScreener aggregated",
        "fallbacks": ("Gate.io", "MEXC"),
        "update_interval_minutes": 20,
        "deviation_threshold": 0.05,
    },
}


@dataclass(slots=True)
class TreasuryStatus:
    """Current treasury telemetry used to build an infrastructure plan."""

    nav: float
    monthly_profit: float
    monthly_operational_cost: float
    multisig_members: Sequence[str]
    existing_balances: Mapping[str, float] = field(default_factory=dict)
    oracle_assets: Sequence[str] = field(
        default_factory=lambda: ("USDT/TON", "TON/USD", "DCT/USDT")
    )
    oracle_preferences: Mapping[str, Sequence[str]] = field(default_factory=dict)
    chains: Sequence[str] = field(default_factory=lambda: ("TON", "Ethereum"))


@dataclass(slots=True)
class TreasuryPolicy:
    """Governance policy that shapes the infrastructure output."""

    allocation_ratios: Mapping[str, float] = field(
        default_factory=lambda: dict(DEFAULT_ALLOCATIONS)
    )
    multisig_quorum: float = 0.66
    risk_buffer_target_months: float = 6.0
    timelock_hours: int = 24
    buyback_cadence_hours: int = 12
    reward_epoch_days: int = 30


@dataclass(slots=True)
class TreasuryWalletPlan:
    """Multisig wallet configuration for a treasury bucket."""

    slug: str
    name: str
    purpose: str
    allocation_percentage: float
    target_amount: float
    chains: Sequence[str]
    signers: Sequence[str]
    threshold: int
    controls: Sequence[str]
    automation: Sequence[str]

    def to_dict(self) -> Mapping[str, Any]:
        return {
            "slug": self.slug,
            "name": self.name,
            "purpose": self.purpose,
            "allocation_percentage": self.allocation_percentage,
            "target_amount": self.target_amount,
            "chains": list(self.chains),
            "signers": list(self.signers),
            "threshold": self.threshold,
            "controls": list(self.controls),
            "automation": list(self.automation),
        }


@dataclass(slots=True)
class AllocationAction:
    """Transfer instruction for distributing monthly profits."""

    wallet_slug: str
    amount: float
    notes: Sequence[str]

    def to_dict(self) -> Mapping[str, Any]:
        return {
            "wallet": self.wallet_slug,
            "amount": self.amount,
            "notes": list(self.notes),
        }


@dataclass(slots=True)
class OracleIntegrationPlan:
    """Configuration for maintaining resilient oracle coverage."""

    asset_pair: str
    primary: str
    fallbacks: Sequence[str]
    update_interval_minutes: int
    deviation_threshold: float

    def to_dict(self) -> Mapping[str, Any]:
        return {
            "asset_pair": self.asset_pair,
            "primary": self.primary,
            "fallbacks": list(self.fallbacks),
            "update_interval_minutes": self.update_interval_minutes,
            "deviation_threshold": self.deviation_threshold,
        }


@dataclass(slots=True)
class TreasuryInfrastructurePlan:
    """Complete infrastructure blueprint for treasury operations."""

    nav: float
    runway_months: float
    wallets: Sequence[TreasuryWalletPlan]
    allocation_schedule: Sequence[AllocationAction]
    risk_buffer_target: float
    risk_buffer_gap: float
    oracle_integrations: Sequence[OracleIntegrationPlan]
    monitoring_hooks: Sequence[str]
    compliance_notes: Sequence[str]
    policy_notes: Sequence[str]

    def to_dict(self) -> Mapping[str, Any]:
        return {
            "nav": self.nav,
            "runway_months": self.runway_months,
            "wallets": [wallet.to_dict() for wallet in self.wallets],
            "allocation_schedule": [action.to_dict() for action in self.allocation_schedule],
            "risk_buffer_target": self.risk_buffer_target,
            "risk_buffer_gap": self.risk_buffer_gap,
            "oracle_integrations": [oracle.to_dict() for oracle in self.oracle_integrations],
            "monitoring_hooks": list(self.monitoring_hooks),
            "compliance_notes": list(self.compliance_notes),
            "policy_notes": list(self.policy_notes),
        }


class TreasuryInfrastructureBuilder:
    """Builds treasury infrastructure plans from telemetry and policy."""

    def __init__(self, policy: TreasuryPolicy | None = None) -> None:
        self.policy = policy or TreasuryPolicy()

    def build(self, status: TreasuryStatus) -> TreasuryInfrastructurePlan:
        allocations = self._normalise_allocations(self.policy.allocation_ratios)
        base_amounts = {
            slug: allocations.get(slug, 0.0) * status.monthly_profit
            for slug in WALLET_REFERENCE
        }
        risk_target = status.monthly_operational_cost * self.policy.risk_buffer_target_months
        current_buffer = float(status.existing_balances.get("risk_buffer", 0.0))
        required_top_up = max(0.0, risk_target - current_buffer)
        risk_allocation = self._calculate_risk_buffer_allocation(
            base_amount=base_amounts.get("risk_buffer", 0.0),
            required_top_up=required_top_up,
            available=status.monthly_profit,
        )

        adjusted_amounts = self._rebalance_other_wallets(
            base_amounts=base_amounts,
            risk_allocation=risk_allocation,
            total_profit=status.monthly_profit,
        )

        wallets = self._build_wallet_plans(status, adjusted_amounts)
        allocation_schedule = self._build_allocation_schedule(status, adjusted_amounts)
        oracle_integrations = self._build_oracle_plan(status)

        runway_months = self._calculate_runway(status.nav, status.monthly_operational_cost)
        risk_buffer_gap = max(0.0, risk_target - (current_buffer + risk_allocation))

        monitoring_hooks = [
            "Alert when risk buffer balance drops below target months of runway.",
            "Notify governance when multisig approvals exceed SLA thresholds.",
            "Emit events for each buyback and staking reward disbursement.",
        ]
        compliance_notes = [
            "Dual approval from Contributor Council and Token Assembly for treasury movements.",
            "Maintain immutable audit logs with transaction hashes and oracle proofs.",
            "Run quarterly custody reconciliations with third-party attestations.",
        ]
        policy_notes = [
            "Allocation ratios derived from Dynamic Capital treasury profit policy (30/25/35/10).",
            f"Risk buffer targets {self.policy.risk_buffer_target_months} months of operating expenses.",
            f"Enforce {self.policy.timelock_hours}h timelock on vault outflows with emergency guardian override.",
        ]

        return TreasuryInfrastructurePlan(
            nav=status.nav,
            runway_months=runway_months,
            wallets=wallets,
            allocation_schedule=allocation_schedule,
            risk_buffer_target=risk_target,
            risk_buffer_gap=risk_buffer_gap,
            oracle_integrations=oracle_integrations,
            monitoring_hooks=monitoring_hooks,
            compliance_notes=compliance_notes,
            policy_notes=policy_notes,
        )

    def _normalise_allocations(self, ratios: Mapping[str, float]) -> Mapping[str, float]:
        positive = {slug: max(float(ratios.get(slug, 0.0)), 0.0) for slug in WALLET_REFERENCE}
        total = sum(positive.values())
        if total <= 0:
            return {slug: 0.0 for slug in WALLET_REFERENCE}
        return {slug: value / total for slug, value in positive.items()}

    def _calculate_risk_buffer_allocation(
        self, *, base_amount: float, required_top_up: float, available: float
    ) -> float:
        candidate = max(base_amount, required_top_up)
        return min(max(candidate, 0.0), max(available, 0.0))

    def _rebalance_other_wallets(
        self,
        *,
        base_amounts: Mapping[str, float],
        risk_allocation: float,
        total_profit: float,
    ) -> Mapping[str, float]:
        adjusted = dict(base_amounts)
        adjusted["risk_buffer"] = risk_allocation
        if total_profit <= 0:
            return {slug: 0.0 for slug in adjusted}
        remaining = max(total_profit - risk_allocation, 0.0)
        other_slugs = [slug for slug in adjusted if slug != "risk_buffer"]
        total_other_base = sum(max(base_amounts.get(slug, 0.0), 0.0) for slug in other_slugs)
        if total_other_base <= 0:
            for slug in other_slugs:
                adjusted[slug] = 0.0
            return adjusted
        scale = remaining / total_other_base
        for slug in other_slugs:
            adjusted[slug] = max(base_amounts.get(slug, 0.0), 0.0) * scale
        return adjusted

    def _build_wallet_plans(
        self, status: TreasuryStatus, allocations: Mapping[str, float]
    ) -> list[TreasuryWalletPlan]:
        signers = list(status.multisig_members)
        threshold = self._determine_threshold(len(signers))
        controls = [
            f"{threshold}-of-{len(signers)} multisig enforced across {', '.join(status.chains)}",
            f"{self.policy.timelock_hours}h timelock with emergency guardian veto.",
        ]
        wallets: list[TreasuryWalletPlan] = []
        for slug, metadata in WALLET_REFERENCE.items():
            amount = max(allocations.get(slug, 0.0), 0.0)
            allocation_percentage = (
                amount / status.monthly_profit if status.monthly_profit > 0 else 0.0
            )
            wallet_controls = list(controls)
            wallet_controls.append("Segregated transaction queues with spend caps per vault.")
            wallets.append(
                TreasuryWalletPlan(
                    slug=slug,
                    name=str(metadata.get("name", slug.title())),
                    purpose=str(metadata.get("purpose", "")),
                    allocation_percentage=allocation_percentage,
                    target_amount=amount,
                    chains=tuple(status.chains),
                    signers=tuple(signers),
                    threshold=threshold,
                    controls=tuple(wallet_controls),
                    automation=tuple(metadata.get("automation", ())),
                )
            )
        return wallets

    def _build_allocation_schedule(
        self, status: TreasuryStatus, allocations: Mapping[str, float]
    ) -> list[AllocationAction]:
        schedule: list[AllocationAction] = []
        for slug in WALLET_REFERENCE:
            amount = max(allocations.get(slug, 0.0), 0.0)
            notes = self._allocation_notes(slug, status)
            schedule.append(AllocationAction(wallet_slug=slug, amount=amount, notes=tuple(notes)))
        return schedule

    def _allocation_notes(self, slug: str, status: TreasuryStatus) -> list[str]:
        notes = []
        if slug == "buybacks":
            notes.append(
                "Execute TWAP buybacks every "
                f"{self.policy.buyback_cadence_hours}h with slippage ≤ 25 bps."
            )
            notes.append("Archive execution proofs (tx hash, oracle price, venue) in transparency logs.")
        elif slug == "staking_rewards":
            notes.append(
                f"Queue staking epoch rewards on a {self.policy.reward_epoch_days}-day cycle via governance proposal."
            )
            notes.append("Validate emissions against on-chain staking participation metrics.")
        elif slug == "reserves":
            notes.append("Maintain ≥ 3 venue relationships for liquidity deployment and OTC fills.")
            notes.append("Rebalance cross-chain holdings quarterly to minimise custody risk.")
        elif slug == "risk_buffer":
            notes.append(
                "Top up emergency buffer until it covers "
                f"{self.policy.risk_buffer_target_months} months of operating expenses."
            )
            runway = self._calculate_runway(status.nav, status.monthly_operational_cost)
            notes.append(f"Current runway: {runway:.2f} months based on NAV and burn rate.")
        return notes

    def _build_oracle_plan(self, status: TreasuryStatus) -> list[OracleIntegrationPlan]:
        plans: list[OracleIntegrationPlan] = []
        for asset in status.oracle_assets:
            preferences = list(status.oracle_preferences.get(asset, ()))
            defaults = DEFAULT_ORACLE_CONFIG.get(asset, {})
            primary = preferences[0] if preferences else str(defaults.get("primary", "Manual feed"))
            fallbacks = tuple(preferences[1:]) if preferences else tuple(defaults.get("fallbacks", ()))
            update_interval = int(defaults.get("update_interval_minutes", 30))
            deviation_threshold = float(defaults.get("deviation_threshold", 0.05))
            plans.append(
                OracleIntegrationPlan(
                    asset_pair=asset,
                    primary=primary,
                    fallbacks=fallbacks,
                    update_interval_minutes=update_interval,
                    deviation_threshold=deviation_threshold,
                )
            )
        return plans

    def _calculate_runway(self, nav: float, burn: float) -> float:
        if burn <= 0:
            return float("inf") if nav > 0 else 0.0
        return max(nav / burn, 0.0)

    def _determine_threshold(self, signer_count: int) -> int:
        if signer_count <= 0:
            return 0
        quorum = max(min(self.policy.multisig_quorum, 1.0), 0.0)
        threshold = math.ceil(signer_count * quorum)
        if signer_count == 1:
            return 1
        return min(max(threshold, 2), signer_count)

