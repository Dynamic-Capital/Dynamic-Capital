"""Dynamic firewall with contextual scoring and adaptive controls."""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from ipaddress import IPv4Network, IPv6Network, ip_address, ip_network
from typing import Deque, Iterable, Mapping, Sequence

import math
import re

from types import MappingProxyType

__all__ = [
    "DynamicFirewall",
    "FirewallAction",
    "FirewallCondition",
    "FirewallDecision",
    "FirewallEvent",
    "FirewallMetrics",
    "FirewallRule",
    "FirewallRuleSnapshot",
    "FirewallSnapshot",
    "RequestContext",
]


# ---------------------------------------------------------------------------
# helpers


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_tzaware(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _clamp01(value: float | int | None, *, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return default
    if math.isnan(numeric) or math.isinf(numeric):
        return default
    return max(0.0, min(1.0, numeric))


def _normalise_identifier(identifier: str) -> str:
    text = str(identifier).strip()
    if not text:
        raise ValueError("identifier must not be empty")
    return text


def _normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _normalise_tags(tags: Sequence[str] | None) -> tuple[str, ...]:
    if not tags:
        return ()
    normalised: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        cleaned = tag.strip().lower()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            normalised.append(cleaned)
    return tuple(normalised)


def _immutable_mapping(mapping: Mapping[str, object] | None) -> Mapping[str, object]:
    if mapping is None:
        return MappingProxyType({})
    if isinstance(mapping, MappingProxyType):
        return mapping
    return MappingProxyType(dict(mapping))


def _resolve_context_value(context: Mapping[str, object], key: str) -> object:
    if key in context:
        return context[key]
    if "." not in key:
        return context.get(key)
    current: object = context
    for part in key.split("."):
        if isinstance(current, Mapping) and part in current:
            current = current[part]
        else:
            return None
    return current


def _normalise_networks(values: Iterable[str] | None) -> list[IPv4Network | IPv6Network]:
    networks: list[IPv4Network | IPv6Network] = []
    if not values:
        return networks
    for raw in values:
        try:
            network = ip_network(str(raw), strict=False)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise ValueError(f"invalid network '{raw}'") from exc
        networks.append(network)
    return networks


def _ip_in_networks(ip_value: str | None, networks: Sequence[IPv4Network | IPv6Network]) -> bool:
    if not ip_value:
        return False
    try:
        address = ip_address(str(ip_value))
    except ValueError:
        return False
    return any(address in network for network in networks)


def _normalise_headers(headers: Mapping[str, str] | None) -> Mapping[str, str]:
    if headers is None:
        return {}
    normalised: dict[str, str] = {}
    for key, value in headers.items():
        normalised[str(key).lower()] = str(value)
    return MappingProxyType(normalised)


# ---------------------------------------------------------------------------
# request context


@dataclass(slots=True)
class RequestContext:
    """Structured view of an inbound request for evaluation."""

    source_ip: str | None = None
    country: str | None = None
    path: str | None = None
    method: str | None = None
    user_agent: str | None = None
    headers: Mapping[str, str] | None = None
    tags: Sequence[str] = field(default_factory=tuple)
    attributes: Mapping[str, object] = field(default_factory=dict)
    risk_score: float | None = None
    anomaly_score: float | None = None
    velocity: float | None = None
    identity: str | None = None

    def __post_init__(self) -> None:
        self.source_ip = _normalise_optional_text(self.source_ip)
        self.country = _normalise_optional_text(self.country)
        self.path = _normalise_optional_text(self.path)
        self.method = _normalise_optional_text(self.method)
        self.user_agent = _normalise_optional_text(self.user_agent)
        self.identity = _normalise_optional_text(self.identity)
        self.tags = _normalise_tags(self.tags)
        self.headers = _normalise_headers(self.headers)
        self.attributes = MappingProxyType(dict(self.attributes))
        self.risk_score = _clamp01(self.risk_score) if self.risk_score is not None else None
        self.anomaly_score = _clamp01(self.anomaly_score) if self.anomaly_score is not None else None
        self.velocity = float(self.velocity) if self.velocity is not None else None

    def as_mapping(self) -> Mapping[str, object]:
        payload: dict[str, object] = {
            "source_ip": self.source_ip,
            "country": self.country,
            "path": self.path,
            "method": self.method,
            "user_agent": self.user_agent,
            "headers": dict(self.headers),
            "tags": self.tags,
            "risk_score": self.risk_score,
            "anomaly_score": self.anomaly_score,
            "velocity": self.velocity,
            "identity": self.identity,
        }
        payload.update(self.attributes)
        return MappingProxyType(payload)


# ---------------------------------------------------------------------------
# firewall primitives


class FirewallAction(str, Enum):
    """Actions the firewall may recommend."""

    ALLOW = "allow"
    CHALLENGE = "challenge"
    DENY = "deny"


@dataclass(slots=True, frozen=True)
class FirewallDecision:
    """Result of evaluating a request."""

    action: FirewallAction
    score: float
    rule_id: str | None = None
    reasons: tuple[str, ...] = ()
    matched_conditions: tuple[str, ...] = ()
    metadata: Mapping[str, object] = field(default_factory=lambda: MappingProxyType({}))

    def __post_init__(self) -> None:
        object.__setattr__(self, "reasons", tuple(self.reasons))
        object.__setattr__(self, "matched_conditions", tuple(self.matched_conditions))
        object.__setattr__(self, "metadata", _immutable_mapping(self.metadata))


@dataclass(slots=True, frozen=True)
class FirewallEvent:
    """Historical record of a decision."""

    timestamp: datetime
    decision: FirewallDecision
    source_ip: str | None


@dataclass(slots=True, frozen=True)
class FirewallMetrics:
    """Aggregated firewall counters."""

    total_requests: int
    allowed: int
    challenged: int
    denied: int
    last_decision_at: datetime | None


@dataclass(slots=True)
class FirewallCondition:
    """Declarative condition checked against request context."""

    key: str
    operator: str
    value: object = None
    weight: float = 1.0
    case_sensitive: bool = False
    negate: bool = False
    label: str | None = None
    _compiled: object = field(init=False, repr=False)

    def __post_init__(self) -> None:
        self.key = _normalise_identifier(self.key)
        operator = _normalise_identifier(self.operator).lower()
        object.__setattr__(self, "operator", operator)
        if self.weight < 0.0:
            raise ValueError("weight must be non-negative")
        object.__setattr__(self, "weight", float(self.weight))
        self.label = _normalise_optional_text(self.label)
        object.__setattr__(self, "_compiled", self._prepare_value(self.value))

    # ------------------------------------------------------------------ compile helpers
    def _prepare_value(self, raw: object) -> object:
        operator = self.operator
        if operator in {"regex", "matches"}:
            pattern = str(raw)
            flags = 0 if self.case_sensitive else re.IGNORECASE
            try:
                return re.compile(pattern, flags)
            except re.error as exc:  # pragma: no cover - defensive guard
                raise ValueError(f"invalid regex pattern '{pattern}'") from exc
        if operator in {"in", "not_in"}:
            if raw is None:
                return tuple()
            if not isinstance(raw, Sequence) or isinstance(raw, (str, bytes)):
                raise ValueError("value for 'in'/'not_in' must be a sequence")
            normalised: list[object] = []
            for item in raw:
                if isinstance(item, str) and not self.case_sensitive:
                    normalised.append(item.lower())
                else:
                    normalised.append(item)
            return tuple(normalised)
        if operator == "between":
            if raw is None:
                raise ValueError("between requires a sequence of [min, max]")
            if not isinstance(raw, Sequence) or isinstance(raw, (str, bytes)) or len(raw) != 2:
                raise ValueError("between requires a two-value sequence")
            low = self._to_float(raw[0])
            high = self._to_float(raw[1])
            if low > high:
                low, high = high, low
            return (low, high)
        if operator == "ip_in_cidr":
            networks = _normalise_networks(raw if isinstance(raw, Sequence) and not isinstance(raw, (str, bytes)) else [raw])
            return tuple(networks)
        if operator in {"gt", "gte", "lt", "lte"}:
            return self._to_float(raw)
        if operator == "equals" and isinstance(raw, str) and not self.case_sensitive:
            return raw.lower()
        return raw

    @staticmethod
    def _to_float(value: object) -> float:
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("numeric comparison requires a numeric value") from exc

    # ------------------------------------------------------------------ evaluation helpers
    def _normalise_actual(self, actual: object) -> object:
        if isinstance(actual, str) and not self.case_sensitive:
            return actual.lower()
        return actual

    def _evaluate_operator(self, actual: object) -> bool:
        operator = self.operator
        expected = self._compiled

        if operator in {"equals", "=="}:
            return self._normalise_actual(actual) == expected
        if operator in {"not_equals", "!="}:
            return self._normalise_actual(actual) != expected
        if operator == "contains":
            if actual is None:
                return False
            if isinstance(actual, str):
                haystack = actual if self.case_sensitive else actual.lower()
                needle = str(self.value)
                needle = needle if self.case_sensitive else needle.lower()
                return needle in haystack
            if isinstance(actual, Sequence):
                return any(self._normalise_actual(item) == expected for item in actual)
            return False
        if operator == "in":
            actual_value = self._normalise_actual(actual)
            return actual_value in expected  # type: ignore[arg-type]
        if operator == "not_in":
            actual_value = self._normalise_actual(actual)
            return actual_value not in expected  # type: ignore[arg-type]
        if operator == "prefix":
            if not isinstance(actual, str):
                return False
            haystack = actual if self.case_sensitive else actual.lower()
            prefix = str(self.value)
            prefix = prefix if self.case_sensitive else prefix.lower()
            return haystack.startswith(prefix)
        if operator == "suffix":
            if not isinstance(actual, str):
                return False
            haystack = actual if self.case_sensitive else actual.lower()
            suffix = str(self.value)
            suffix = suffix if self.case_sensitive else suffix.lower()
            return haystack.endswith(suffix)
        if operator == "regex" or operator == "matches":
            if not isinstance(actual, str):
                return False
            pattern: re.Pattern[str] = expected  # type: ignore[assignment]
            return pattern.search(actual) is not None
        if operator == "gt":
            if actual is None:
                return False
            return self._to_float(actual) > expected  # type: ignore[arg-type]
        if operator == "gte":
            if actual is None:
                return False
            return self._to_float(actual) >= expected  # type: ignore[arg-type]
        if operator == "lt":
            if actual is None:
                return False
            return self._to_float(actual) < expected  # type: ignore[arg-type]
        if operator == "lte":
            if actual is None:
                return False
            return self._to_float(actual) <= expected  # type: ignore[arg-type]
        if operator == "between":
            if actual is None:
                return False
            value = self._to_float(actual)
            low, high = expected  # type: ignore[misc]
            return low <= value <= high
        if operator == "present":
            return actual is not None
        if operator == "absent":
            return actual is None
        if operator == "ip_in_cidr":
            if actual is None:
                return False
            return _ip_in_networks(str(actual), expected)  # type: ignore[arg-type]
        raise ValueError(f"unsupported operator '{operator}'")

    def evaluate(self, context: Mapping[str, object]) -> tuple[bool, float]:
        actual = _resolve_context_value(context, self.key)
        result = self._evaluate_operator(actual)
        if self.negate:
            result = not result
        gained = self.weight if result else 0.0
        return result, gained


@dataclass(slots=True)
class FirewallRule:
    """Firewall rule comprised of weighted conditions."""

    identifier: str
    action: FirewallAction
    conditions: Sequence[FirewallCondition] = field(default_factory=tuple)
    priority: int = 100
    threshold: float = 1.0
    description: str | None = None
    tags: Sequence[str] = field(default_factory=tuple)
    enabled: bool = True
    activation_at: datetime | None = None
    expires_at: datetime | None = None
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.identifier = _normalise_identifier(self.identifier)
        self.priority = int(self.priority)
        if self.priority < 0:
            raise ValueError("priority must be non-negative")
        self.threshold = float(self.threshold)
        if not 0.0 <= self.threshold <= 1.0:
            raise ValueError("threshold must be within [0, 1]")
        self.description = _normalise_optional_text(self.description)
        self.tags = _normalise_tags(self.tags)
        self.activation_at = _ensure_tzaware(self.activation_at)
        self.expires_at = _ensure_tzaware(self.expires_at)
        self.metadata = _immutable_mapping(self.metadata)
        self.conditions = tuple(self.conditions)

    def is_active(self, *, moment: datetime | None = None) -> bool:
        if not self.enabled:
            return False
        now = _ensure_tzaware(moment) or _utcnow()
        if self.activation_at and now < self.activation_at:
            return False
        if self.expires_at and now >= self.expires_at:
            return False
        return True

    def evaluate(self, context: Mapping[str, object]) -> tuple[bool, float, tuple[str, ...]]:
        if not self.conditions:
            return True, 1.0, ()
        total_weight = sum(condition.weight for condition in self.conditions) or 1.0
        score = 0.0
        matched: list[str] = []
        for condition in self.conditions:
            result, gained = condition.evaluate(context)
            if result:
                score += gained
                matched.append(condition.label or condition.key)
        ratio = score / total_weight
        return ratio >= self.threshold, ratio, tuple(matched)

    def snapshot(self) -> "FirewallRuleSnapshot":
        return FirewallRuleSnapshot(
            identifier=self.identifier,
            action=self.action,
            priority=self.priority,
            threshold=self.threshold,
            enabled=self.enabled,
            tags=self.tags,
            description=self.description,
            activation_at=self.activation_at,
            expires_at=self.expires_at,
            total_conditions=len(self.conditions),
        )


@dataclass(slots=True, frozen=True)
class FirewallRuleSnapshot:
    """Serializable view of a firewall rule."""

    identifier: str
    action: FirewallAction
    priority: int
    threshold: float
    enabled: bool
    tags: tuple[str, ...]
    description: str | None
    activation_at: datetime | None
    expires_at: datetime | None
    total_conditions: int


@dataclass(slots=True, frozen=True)
class FirewallSnapshot:
    """Point-in-time representation of firewall configuration."""

    metrics: FirewallMetrics
    rules: tuple[FirewallRuleSnapshot, ...]
    allowlist: tuple[str, ...]
    blocklist: tuple[str, ...]
    challenge_threshold: float
    block_threshold: float
    default_action: FirewallAction


# ---------------------------------------------------------------------------
# firewall engine


class DynamicFirewall:
    """Evaluates requests using static rules and dynamic risk heuristics."""

    def __init__(
        self,
        *,
        rules: Iterable[FirewallRule] | None = None,
        allowlist: Iterable[str] | None = None,
        blocklist: Iterable[str] | None = None,
        challenge_threshold: float = 0.6,
        block_threshold: float = 0.85,
        default_action: FirewallAction = FirewallAction.ALLOW,
        history_size: int = 256,
    ) -> None:
        if not 0.0 <= challenge_threshold <= 1.0:
            raise ValueError("challenge_threshold must be within [0, 1]")
        if not 0.0 <= block_threshold <= 1.0:
            raise ValueError("block_threshold must be within [0, 1]")
        if block_threshold < challenge_threshold:
            raise ValueError("block_threshold must be >= challenge_threshold")
        self._rules: dict[str, FirewallRule] = {}
        self._ordered: list[FirewallRule] = []
        self._allowlist: list[IPv4Network | IPv6Network] = _normalise_networks(allowlist)
        self._blocklist: list[IPv4Network | IPv6Network] = _normalise_networks(blocklist)
        self._challenge_threshold = challenge_threshold
        self._block_threshold = block_threshold
        self._default_action = default_action
        self._history: Deque[FirewallEvent] = deque(maxlen=max(16, history_size))
        self._metrics_total = 0
        self._metrics_allowed = 0
        self._metrics_challenged = 0
        self._metrics_denied = 0
        self._last_decision_at: datetime | None = None
        if rules:
            for rule in rules:
                self.register_rule(rule)

    # ------------------------------------------------------------------ lifecycle helpers
    def register_rule(self, rule: FirewallRule) -> None:
        self._rules[rule.identifier] = rule
        self._rebuild_order()

    def remove_rule(self, identifier: str) -> None:
        if identifier in self._rules:
            del self._rules[identifier]
            self._rebuild_order()

    def clear_rules(self) -> None:
        self._rules.clear()
        self._ordered.clear()

    def rules(self) -> tuple[FirewallRuleSnapshot, ...]:
        return tuple(rule.snapshot() for rule in self._ordered)

    # ------------------------------------------------------------------ allow/block helpers
    def trust(self, network: str) -> None:
        candidate = ip_network(str(network), strict=False)
        if candidate not in self._allowlist:
            self._allowlist.append(candidate)

    def ban(self, network: str) -> None:
        candidate = ip_network(str(network), strict=False)
        if candidate not in self._blocklist:
            self._blocklist.append(candidate)

    def untrust(self, network: str) -> None:
        candidate = ip_network(str(network), strict=False)
        self._allowlist = [existing for existing in self._allowlist if existing != candidate]

    def unban(self, network: str) -> None:
        candidate = ip_network(str(network), strict=False)
        self._blocklist = [existing for existing in self._blocklist if existing != candidate]

    # ------------------------------------------------------------------ evaluation
    def evaluate(self, context: Mapping[str, object] | RequestContext, *, moment: datetime | None = None) -> FirewallDecision:
        mapping = context.as_mapping() if isinstance(context, RequestContext) else context
        now = _ensure_tzaware(moment) or _utcnow()

        source_ip = _normalise_optional_text(str(mapping.get("source_ip"))) if mapping.get("source_ip") else None

        if _ip_in_networks(source_ip, self._allowlist):
            decision = FirewallDecision(
                action=FirewallAction.ALLOW,
                score=1.0,
                reasons=("allowlist",),
                metadata={"source_ip": source_ip},
            )
            self._record(decision, now, source_ip)
            return decision

        if _ip_in_networks(source_ip, self._blocklist):
            decision = FirewallDecision(
                action=FirewallAction.DENY,
                score=1.0,
                reasons=("blocklist",),
                metadata={"source_ip": source_ip},
            )
            self._record(decision, now, source_ip)
            return decision

        for rule in self._ordered:
            if not rule.is_active(moment=now):
                continue
            matched, score, matched_conditions = rule.evaluate(mapping)
            if matched:
                reasons: tuple[str, ...]
                if rule.description:
                    reasons = (rule.description,)
                else:
                    reasons = (f"rule:{rule.identifier}",)
                decision = FirewallDecision(
                    action=rule.action,
                    score=score,
                    rule_id=rule.identifier,
                    reasons=reasons,
                    matched_conditions=matched_conditions,
                    metadata={"tags": rule.tags, "priority": rule.priority},
                )
                self._record(decision, now, source_ip)
                return decision

        computed_risk = self._compute_risk(mapping)
        metadata: dict[str, object] = {"computed_risk": computed_risk}
        reasons: list[str] = []

        if computed_risk >= self._block_threshold:
            action = FirewallAction.DENY
            reasons.append("risk>=block_threshold")
        elif computed_risk >= self._challenge_threshold:
            action = FirewallAction.CHALLENGE
            reasons.append("risk>=challenge_threshold")
        else:
            action = self._default_action
            reasons.append("default")

        decision = FirewallDecision(
            action=action,
            score=computed_risk,
            reasons=tuple(reasons),
            metadata=metadata,
        )
        self._record(decision, now, source_ip)
        return decision

    def _compute_risk(self, context: Mapping[str, object]) -> float:
        risk_components: list[float] = []
        for key in ("risk_score", "anomaly_score", "suspicion_score"):
            if key in context:
                risk_components.append(_clamp01(context.get(key)))
        velocity = context.get("velocity")
        if velocity is not None:
            try:
                numeric_velocity = float(velocity)
            except (TypeError, ValueError):
                numeric_velocity = 0.0
            risk_components.append(_clamp01(numeric_velocity / 100.0))
        reputational = context.get("ip_reputation")
        if reputational is not None:
            risk_components.append(_clamp01(reputational))
        if not risk_components:
            return 0.0
        return max(risk_components)

    # ------------------------------------------------------------------ metrics & history
    def _record(self, decision: FirewallDecision, moment: datetime, source_ip: str | None) -> None:
        self._metrics_total += 1
        if decision.action is FirewallAction.ALLOW:
            self._metrics_allowed += 1
        elif decision.action is FirewallAction.CHALLENGE:
            self._metrics_challenged += 1
        elif decision.action is FirewallAction.DENY:
            self._metrics_denied += 1
        self._last_decision_at = moment
        self._history.append(
            FirewallEvent(
                timestamp=moment,
                decision=decision,
                source_ip=source_ip,
            )
        )

    def metrics(self) -> FirewallMetrics:
        return FirewallMetrics(
            total_requests=self._metrics_total,
            allowed=self._metrics_allowed,
            challenged=self._metrics_challenged,
            denied=self._metrics_denied,
            last_decision_at=self._last_decision_at,
        )

    def history(self) -> tuple[FirewallEvent, ...]:
        return tuple(self._history)

    def snapshot(self) -> FirewallSnapshot:
        return FirewallSnapshot(
            metrics=self.metrics(),
            rules=self.rules(),
            allowlist=tuple(network.compressed for network in self._allowlist),
            blocklist=tuple(network.compressed for network in self._blocklist),
            challenge_threshold=self._challenge_threshold,
            block_threshold=self._block_threshold,
            default_action=self._default_action,
        )

    def reset_metrics(self) -> None:
        self._metrics_total = 0
        self._metrics_allowed = 0
        self._metrics_challenged = 0
        self._metrics_denied = 0
        self._last_decision_at = None

    # ------------------------------------------------------------------ internal helpers
    def _rebuild_order(self) -> None:
        self._ordered = sorted(self._rules.values(), key=lambda rule: (rule.priority, rule.identifier))
