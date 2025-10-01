"""Optimisation utilities for Dynamic Capital's TON Sites footprint.

The TON ecosystem encourages decentralised hosting through TON Sites, TON DNS,
and TON Storage.  This module provides lightweight analytics primitives that
convert telemetry about individual sites into actionable optimisation plans.
It focuses on conditions we regularly monitor for investor-grade uptime:

* latency and availability relative to published SLAs
* the share of content pinned on TON Storage/IPFS versus legacy hosting
* transport security posture (TLS scores, certificate runway)
* delivery health, including asset weight and cache efficiency

The resulting plans can be surfaced in operator dashboards or fed into the
automation layer to escalate remediation work.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Mapping, MutableMapping, Sequence

__all__ = [
    "TonSiteProfile",
    "TonSiteOptimizationAction",
    "TonSiteOptimizationPlan",
    "TonSitePortfolioReport",
    "TonSiteOptimizer",
]


_ALLOWED_PRIORITIES = {"low", "normal", "high"}


def _normalise_text(value: str) -> str:
    if not isinstance(value, str):  # pragma: no cover - defensive guard
        raise TypeError("value must be a string")
    text = value.strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_domain(value: str) -> str:
    domain = _normalise_text(value).lower()
    if "." not in domain:
        raise ValueError("domain must include at least one dot")
    return domain


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _ensure_non_negative(value: float) -> float:
    return max(0.0, float(value))


def _ensure_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if mapping is None:
        return None
    if not isinstance(mapping, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(mapping)


@dataclass(slots=True)
class TonSiteProfile:
    """Snapshot of TON Site delivery and hosting telemetry."""

    domain: str
    average_latency_ms: float
    availability_30d: float
    ton_storage_ratio: float
    https_score: float
    dns_ttl_hours: float
    certificate_days_remaining: int
    asset_weight_kb: float
    edge_cache_hit_rate: float
    ipfs_pin_health: float
    ton_dns_verified: bool = True

    def __post_init__(self) -> None:
        self.domain = _normalise_domain(self.domain)
        self.average_latency_ms = _ensure_non_negative(self.average_latency_ms)
        self.availability_30d = _clamp01(self.availability_30d)
        self.ton_storage_ratio = _clamp01(self.ton_storage_ratio)
        self.https_score = _clamp01(self.https_score)
        self.dns_ttl_hours = _ensure_non_negative(self.dns_ttl_hours)
        self.certificate_days_remaining = int(max(0, self.certificate_days_remaining))
        self.asset_weight_kb = _ensure_non_negative(self.asset_weight_kb)
        self.edge_cache_hit_rate = _clamp01(self.edge_cache_hit_rate)
        self.ipfs_pin_health = _clamp01(self.ipfs_pin_health)
        self.ton_dns_verified = bool(self.ton_dns_verified)


@dataclass(slots=True)
class TonSiteOptimizationAction:
    """Actionable remediation step for a TON Site."""

    category: str
    description: str
    priority: str = "normal"
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.category = _normalise_text(self.category).lower()
        self.description = _normalise_text(self.description)
        priority = _normalise_text(self.priority).lower()
        if priority not in _ALLOWED_PRIORITIES:
            raise ValueError(f"priority must be one of {_ALLOWED_PRIORITIES!r}")
        self.priority = priority
        self.metadata = _ensure_mapping(self.metadata)


@dataclass(slots=True)
class TonSiteOptimizationPlan:
    """Aggregated optimisation plan for a single site."""

    domain: str
    score: float
    actions: tuple[TonSiteOptimizationAction, ...]
    focus_areas: tuple[str, ...]
    summary: str

    @property
    def high_priority_actions(self) -> int:
        return sum(1 for action in self.actions if action.priority == "high")

    @property
    def has_blockers(self) -> bool:
        return any(action.priority == "high" for action in self.actions)


@dataclass(slots=True)
class TonSitePortfolioReport:
    """Portfolio-level aggregation of TON Site optimisation plans."""

    plans: tuple[TonSiteOptimizationPlan, ...]
    average_score: float
    focus_area_counts: Mapping[str, int]
    high_priority_actions: int

    @property
    def needs_attention(self) -> bool:
        return self.high_priority_actions > 0


class TonSiteOptimizer:
    """Generate optimisation plans for TON Sites based on telemetry."""

    def __init__(
        self,
        *,
        latency_sla_ms: float = 450.0,
        availability_sla: float = 0.995,
        min_ton_storage_ratio: float = 0.6,
        min_https_score: float = 0.85,
        min_edge_cache_hit_rate: float = 0.7,
        max_asset_weight_kb: float = 1400.0,
        min_dns_ttl_hours: float = 1.0,
        min_certificate_days: int = 21,
        min_ipfs_pin_health: float = 0.9,
    ) -> None:
        if latency_sla_ms <= 0:
            raise ValueError("latency_sla_ms must be positive")
        if not 0 < availability_sla <= 1:
            raise ValueError("availability_sla must be in (0, 1]")
        if not 0 <= min_ton_storage_ratio <= 1:
            raise ValueError("min_ton_storage_ratio must be in [0, 1]")
        if not 0 <= min_https_score <= 1:
            raise ValueError("min_https_score must be in [0, 1]")
        if not 0 <= min_edge_cache_hit_rate <= 1:
            raise ValueError("min_edge_cache_hit_rate must be in [0, 1]")
        if max_asset_weight_kb <= 0:
            raise ValueError("max_asset_weight_kb must be positive")
        if min_dns_ttl_hours < 0:
            raise ValueError("min_dns_ttl_hours must be non-negative")
        if min_certificate_days < 0:
            raise ValueError("min_certificate_days must be non-negative")
        if not 0 <= min_ipfs_pin_health <= 1:
            raise ValueError("min_ipfs_pin_health must be in [0, 1]")

        self._latency_sla_ms = float(latency_sla_ms)
        self._availability_sla = float(availability_sla)
        self._min_ton_storage_ratio = float(min_ton_storage_ratio)
        self._min_https_score = float(min_https_score)
        self._min_edge_cache_hit_rate = float(min_edge_cache_hit_rate)
        self._max_asset_weight_kb = float(max_asset_weight_kb)
        self._min_dns_ttl_hours = float(min_dns_ttl_hours)
        self._min_certificate_days = int(min_certificate_days)
        self._min_ipfs_pin_health = float(min_ipfs_pin_health)

    def evaluate_site(self, profile: TonSiteProfile) -> TonSiteOptimizationPlan:
        actions: list[TonSiteOptimizationAction] = []
        focus_tags: set[str] = set()
        score = 100.0

        def register_action(action: TonSiteOptimizationAction, *, focus: str, penalty: float) -> None:
            nonlocal score
            actions.append(action)
            focus_tags.add(focus)
            score = max(0.0, score - penalty)

        # Performance: latency
        if profile.average_latency_ms > self._latency_sla_ms:
            delta = profile.average_latency_ms - self._latency_sla_ms
            penalty = min(delta / self._latency_sla_ms * 20.0, 20.0)
            priority = "high" if profile.average_latency_ms > self._latency_sla_ms * 1.5 else "normal"
            register_action(
                TonSiteOptimizationAction(
                    category="performance",
                    description=(
                        f"Reduce latency by ~{delta:.0f} ms to meet the {self._latency_sla_ms:.0f} ms SLA; "
                        "review CDN edges and bridge routing."
                    ),
                    priority=priority,
                    metadata={
                        "latencyMs": round(profile.average_latency_ms, 2),
                        "targetMs": round(self._latency_sla_ms, 2),
                    },
                ),
                focus="performance",
                penalty=penalty,
            )

        # Resilience: availability
        if profile.availability_30d < self._availability_sla:
            gap = self._availability_sla - profile.availability_30d
            penalty = min(gap / self._availability_sla * 25.0, 25.0)
            register_action(
                TonSiteOptimizationAction(
                    category="resilience",
                    description=(
                        f"Availability at {profile.availability_30d:.3f}; investigate incidents to restore "
                        f"the {self._availability_sla:.3f} SLA."
                    ),
                    priority="high" if gap > 0.01 else "normal",
                    metadata={"availability": round(profile.availability_30d, 4)},
                ),
                focus="resilience",
                penalty=penalty,
            )

        # Decentralisation: TON Storage usage
        if profile.ton_storage_ratio < self._min_ton_storage_ratio:
            gap = self._min_ton_storage_ratio - profile.ton_storage_ratio
            penalty = min(gap / max(self._min_ton_storage_ratio, 0.01) * 12.0, 12.0)
            register_action(
                TonSiteOptimizationAction(
                    category="decentralisation",
                    description=(
                        "Increase TON Storage coverage to keep content decentralised; ramp pinning "
                        f"from {profile.ton_storage_ratio:.0%} toward {self._min_ton_storage_ratio:.0%}."
                    ),
                    metadata={"currentRatio": round(profile.ton_storage_ratio, 3)},
                ),
                focus="decentralisation",
                penalty=penalty,
            )

        # Security: HTTPS score and certificate runway
        if profile.https_score < self._min_https_score:
            gap = self._min_https_score - profile.https_score
            penalty = min(gap / max(self._min_https_score, 0.01) * 15.0, 15.0)
            register_action(
                TonSiteOptimizationAction(
                    category="security",
                    description=(
                        "Improve TLS hardening; upgrade cipher suites and headers to raise the HTTPS score "
                        f"to {self._min_https_score:.0%}."
                    ),
                    priority="high" if profile.https_score < 0.6 else "normal",
                    metadata={"httpsScore": round(profile.https_score, 3)},
                ),
                focus="security",
                penalty=penalty,
            )

        if profile.certificate_days_remaining <= self._min_certificate_days:
            penalty = 10.0 if profile.certificate_days_remaining == 0 else 6.0
            register_action(
                TonSiteOptimizationAction(
                    category="security",
                    description=(
                        f"Renew TLS certificate; only {profile.certificate_days_remaining} days of coverage remaining."
                    ),
                    priority="high" if profile.certificate_days_remaining <= 7 else "normal",
                    metadata={"daysRemaining": profile.certificate_days_remaining},
                ),
                focus="security",
                penalty=penalty,
            )

        # Delivery: payload weight and cache efficiency
        if profile.asset_weight_kb > self._max_asset_weight_kb:
            excess = profile.asset_weight_kb - self._max_asset_weight_kb
            penalty = min(excess / self._max_asset_weight_kb * 10.0, 10.0)
            register_action(
                TonSiteOptimizationAction(
                    category="delivery",
                    description=(
                        "Reduce bundle size by trimming media or deferring non-critical assets; "
                        f"currently {profile.asset_weight_kb:.0f} kB."
                    ),
                    metadata={"assetWeightKb": round(profile.asset_weight_kb, 1)},
                ),
                focus="delivery",
                penalty=penalty,
            )

        if profile.edge_cache_hit_rate < self._min_edge_cache_hit_rate:
            gap = self._min_edge_cache_hit_rate - profile.edge_cache_hit_rate
            penalty = min(gap / max(self._min_edge_cache_hit_rate, 0.01) * 8.0, 8.0)
            register_action(
                TonSiteOptimizationAction(
                    category="delivery",
                    description=(
                        "Tune caching rules to lift edge hit rate; target at least "
                        f"{self._min_edge_cache_hit_rate:.0%}."
                    ),
                    metadata={"edgeHitRate": round(profile.edge_cache_hit_rate, 3)},
                ),
                focus="delivery",
                penalty=penalty,
            )

        # Integrity: IPFS pin health
        if profile.ipfs_pin_health < self._min_ipfs_pin_health:
            gap = self._min_ipfs_pin_health - profile.ipfs_pin_health
            penalty = min(gap / max(self._min_ipfs_pin_health, 0.01) * 12.0, 12.0)
            register_action(
                TonSiteOptimizationAction(
                    category="integrity",
                    description=(
                        "Restore redundant IPFS/TON Storage pins; ensure health exceeds "
                        f"{self._min_ipfs_pin_health:.0%}."
                    ),
                    priority="high" if profile.ipfs_pin_health < 0.5 else "normal",
                    metadata={"pinHealth": round(profile.ipfs_pin_health, 3)},
                ),
                focus="integrity",
                penalty=penalty,
            )

        # Operations: DNS hygiene
        if profile.dns_ttl_hours < self._min_dns_ttl_hours:
            penalty = 5.0
            register_action(
                TonSiteOptimizationAction(
                    category="operations",
                    description=(
                        "Increase DNS TTL to reduce resolver churn and improve caching stability."
                    ),
                    metadata={"ttlHours": round(profile.dns_ttl_hours, 2)},
                ),
                focus="operations",
                penalty=penalty,
            )

        if not profile.ton_dns_verified:
            penalty = 10.0
            register_action(
                TonSiteOptimizationAction(
                    category="compliance",
                    description="Verify TON DNS ownership to restore trusted resolution.",
                    priority="high",
                ),
                focus="compliance",
                penalty=penalty,
            )

        focus_areas = tuple(sorted(focus_tags))
        summary = (
            f"{profile.domain} scores {score:.1f}; focus on {', '.join(focus_areas) if focus_areas else 'ongoing monitoring'}."
        )
        return TonSiteOptimizationPlan(
            domain=profile.domain,
            score=round(score, 2),
            actions=tuple(actions),
            focus_areas=focus_areas,
            summary=summary,
        )

    def evaluate_portfolio(self, sites: Sequence[TonSiteProfile]) -> TonSitePortfolioReport:
        plans = tuple(self.evaluate_site(site) for site in sites)
        if not plans:
            return TonSitePortfolioReport(
                plans=(),
                average_score=100.0,
                focus_area_counts={},
                high_priority_actions=0,
            )

        focus_counter: Counter[str] = Counter()
        high_priority = 0
        for plan in plans:
            focus_counter.update(plan.focus_areas)
            high_priority += plan.high_priority_actions

        average_score = sum(plan.score for plan in plans) / len(plans)
        return TonSitePortfolioReport(
            plans=plans,
            average_score=round(average_score, 2),
            focus_area_counts=dict(focus_counter),
            high_priority_actions=high_priority,
        )
