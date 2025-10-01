"""Dynamic Web3 network orchestration and diagnostics."""

from __future__ import annotations

from dataclasses import dataclass, field
from statistics import mean
from types import MappingProxyType
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence

__all__ = [
    "Web3Network",
    "SmartContract",
    "TransactionProfile",
    "NetworkTelemetry",
    "Web3Action",
    "NetworkHealthSummary",
    "Web3UnifiedBuild",
    "Web3GoLiveReadiness",
    "DynamicWeb3Engine",
    "GoLiveBlockedError",
]


def _ensure_mapping(metadata: Mapping[str, object] | None) -> MutableMapping[str, object]:
    if metadata is None:
        return {}
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guard
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


def _normalise_identifier(value: str) -> str:
    text = str(value).strip()
    if not text:
        raise ValueError("value must not be empty")
    return text


def _normalise_key(value: str) -> str:
    return _normalise_identifier(value).lower()


def _normalise_address(value: str) -> str:
    text = str(value).strip().lower()
    if not text:
        raise ValueError("address must not be empty")
    return text


def _normalise_category(value: str) -> str:
    return _normalise_identifier(value).lower().replace(" ", "-")


def _normalise_tags(values: Sequence[str] | None) -> tuple[str, ...]:
    if values is None:
        return ()
    seen: set[str] = set()
    cleaned: list[str] = []
    for value in values:
        text = str(value).strip().lower()
        if text and text not in seen:
            seen.add(text)
            cleaned.append(text)
    return tuple(cleaned)


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _ensure_non_negative_int(value: int) -> int:
    integer = int(value)
    if integer < 0:
        raise ValueError("value must be non-negative")
    return integer


@dataclass(slots=True)
class Web3Network:
    """Definition of a supported Web3 network."""

    name: str
    chain_id: int
    rpc_endpoint: str
    block_time_seconds: float = 2.0
    finality_threshold: int = 12
    reliability_target: float = 0.97
    metadata: Mapping[str, object] | None = None
    tags: Sequence[str] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_identifier(self.name)
        self.chain_id = int(self.chain_id)
        if self.chain_id < 0:
            raise ValueError("chain_id must be non-negative")
        self.rpc_endpoint = _normalise_identifier(self.rpc_endpoint)
        self.block_time_seconds = max(float(self.block_time_seconds), 0.0)
        self.finality_threshold = _ensure_non_negative_int(self.finality_threshold)
        self.reliability_target = _clamp01(self.reliability_target)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class SmartContract:
    """Metadata describing a monitored smart contract."""

    address: str
    network: str
    category: str = "general"
    owner: str | None = None
    risk_score: float = 0.5
    metadata: Mapping[str, object] | None = None
    tags: Sequence[str] | None = None

    def __post_init__(self) -> None:
        self.address = _normalise_address(self.address)
        self.network = _normalise_identifier(self.network)
        self.category = _normalise_category(self.category)
        self.owner = self.owner.strip() if isinstance(self.owner, str) and self.owner.strip() else None
        self.risk_score = _clamp01(self.risk_score)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))
        self.tags = _normalise_tags(self.tags)


@dataclass(slots=True)
class TransactionProfile:
    """Aggregated transaction behaviour for a contract."""

    contract_address: str
    success_rate: float
    average_fee: float
    volume_24h: float
    average_latency_ms: float
    pending_transactions: int = 0
    error_rate: float | None = None

    def __post_init__(self) -> None:
        self.contract_address = _normalise_address(self.contract_address)
        self.success_rate = _clamp01(self.success_rate)
        self.average_fee = max(float(self.average_fee), 0.0)
        self.volume_24h = max(float(self.volume_24h), 0.0)
        self.average_latency_ms = max(float(self.average_latency_ms), 0.0)
        self.pending_transactions = _ensure_non_negative_int(self.pending_transactions)
        if self.error_rate is None:
            self.error_rate = _clamp01(1.0 - self.success_rate)
        else:
            self.error_rate = _clamp01(self.error_rate)


@dataclass(slots=True)
class NetworkTelemetry:
    """Operational telemetry sampled from a Web3 network."""

    block_gap: int
    uptime_ratio: float
    utilisation: float
    latency_ms: float
    pending_transactions: int
    error_ratio: float = 0.0
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.block_gap = _ensure_non_negative_int(self.block_gap)
        self.uptime_ratio = _clamp01(self.uptime_ratio)
        self.utilisation = _clamp01(self.utilisation)
        self.latency_ms = max(float(self.latency_ms), 0.0)
        self.pending_transactions = _ensure_non_negative_int(self.pending_transactions)
        self.error_ratio = _clamp01(self.error_ratio)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))


@dataclass(slots=True)
class Web3Action:
    """Operational action suggested by the Web3 engine."""

    category: str
    description: str
    priority: str = "normal"
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        self.category = _normalise_category(self.category)
        self.description = _normalise_identifier(self.description)
        priority = _normalise_category(self.priority)
        if priority not in {"low", "normal", "high"}:
            raise ValueError("priority must be low, normal, or high")
        self.priority = priority
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))


@dataclass(slots=True)
class NetworkHealthSummary:
    """Summary of a network's health computed by the engine."""

    network: str
    reliability_score: float
    utilisation: float
    finality_gap: int
    average_latency_ms: float
    contract_success_rate: float
    alerts: tuple[str, ...]
    actions: tuple[Web3Action, ...]
    metadata: Mapping[str, object] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.network = _normalise_identifier(self.network)
        self.reliability_score = _clamp01(self.reliability_score)
        self.utilisation = _clamp01(self.utilisation)
        self.finality_gap = _ensure_non_negative_int(self.finality_gap)
        self.average_latency_ms = max(float(self.average_latency_ms), 0.0)
        self.contract_success_rate = _clamp01(self.contract_success_rate)
        self.alerts = tuple(_normalise_identifier(alert) for alert in self.alerts)
        self.actions = tuple(self.actions)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))


@dataclass(slots=True)
class Web3UnifiedBuild:
    """Aggregated build output across evaluated Web3 networks."""

    summaries: tuple[NetworkHealthSummary, ...]
    average_reliability: float
    average_utilisation: float
    aggregate_alerts: tuple[str, ...]
    aggregate_actions: tuple[Web3Action, ...]
    total_pending_transactions: int
    metadata: Mapping[str, object]

    def __post_init__(self) -> None:
        self.summaries = tuple(self.summaries)
        if not self.summaries:
            raise ValueError("summaries must not be empty")
        self.average_reliability = _clamp01(self.average_reliability)
        self.average_utilisation = _clamp01(self.average_utilisation)
        self.aggregate_alerts = tuple(_normalise_identifier(alert) for alert in self.aggregate_alerts)
        self.aggregate_actions = tuple(self.aggregate_actions)
        self.total_pending_transactions = _ensure_non_negative_int(self.total_pending_transactions)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))


@dataclass(slots=True)
class Web3GoLiveReadiness:
    """Represents a go-live readiness assessment derived from a unified build."""

    project: str
    status: str
    unified_build: Web3UnifiedBuild
    ready_networks: tuple[str, ...]
    networks_requiring_attention: tuple[str, ...]
    blocking_alerts: tuple[str, ...]
    critical_actions: tuple[Web3Action, ...]
    total_pending_transactions: int
    metadata: Mapping[str, object]

    def __post_init__(self) -> None:
        self.project = _normalise_identifier(self.project)
        status = _normalise_category(self.status)
        if status not in {"ready", "blocked", "attention"}:
            raise ValueError("status must be ready, blocked, or attention")
        self.status = status
        self.ready_networks = tuple(_normalise_identifier(name) for name in self.ready_networks)
        self.networks_requiring_attention = tuple(
            _normalise_identifier(name) for name in self.networks_requiring_attention
        )
        self.blocking_alerts = tuple(_normalise_identifier(alert) for alert in self.blocking_alerts)
        self.critical_actions = tuple(self.critical_actions)
        self.total_pending_transactions = _ensure_non_negative_int(self.total_pending_transactions)
        self.metadata = MappingProxyType(_ensure_mapping(self.metadata))


class GoLiveBlockedError(RuntimeError):
    """Raised when a go-live attempt is blocked by outstanding issues."""

    def __init__(self, readiness: Web3GoLiveReadiness):
        detail_sections: list[str] = []

        if readiness.networks_requiring_attention:
            networks = ", ".join(readiness.networks_requiring_attention)
            detail_sections.append(f"networks requiring attention: {networks}")

        if readiness.blocking_alerts:
            alerts = ", ".join(readiness.blocking_alerts)
            detail_sections.append(f"blocking alerts: {alerts}")

        if readiness.critical_actions:
            actions = ", ".join(
                action.description for action in readiness.critical_actions
            )
            detail_sections.append(f"critical actions: {actions}")

        detail_text = f" ({'; '.join(detail_sections)})" if detail_sections else ""
        message = (
            f"Project '{readiness.project}' is not ready to go live"
            f" (status: {readiness.status}){detail_text}"
        )

        super().__init__(message)
        self.readiness: Web3GoLiveReadiness = readiness


class DynamicWeb3Engine:
    """Coordinates health tracking across Web3 networks and contracts."""

    def __init__(
        self,
        *,
        reliability_floor: float = 0.9,
        congestion_threshold: float = 0.75,
        latency_target_ms: float = 250.0,
    ) -> None:
        self._networks: Dict[str, Web3Network] = {}
        self._contracts: Dict[str, SmartContract] = {}
        self._profiles: Dict[str, TransactionProfile] = {}
        self.reliability_floor = _clamp01(reliability_floor)
        self.congestion_threshold = _clamp01(congestion_threshold)
        self.latency_target_ms = max(float(latency_target_ms), 0.0)

    # ------------------------------------------------------------------
    # registration methods

    def register_network(self, network: Web3Network) -> None:
        key = _normalise_key(network.name)
        if key in self._networks:
            raise ValueError(f"network '{network.name}' is already registered")
        self._networks[key] = network

    def register_contract(self, contract: SmartContract) -> None:
        network_key = _normalise_key(contract.network)
        if network_key not in self._networks:
            raise ValueError(f"network '{contract.network}' is not registered")
        contract_key = _normalise_address(contract.address)
        if contract_key in self._contracts:
            raise ValueError(f"contract '{contract.address}' is already registered")
        self._contracts[contract_key] = contract

    # ------------------------------------------------------------------
    # ingestion

    def ingest_transaction_profile(self, profile: TransactionProfile) -> None:
        contract_key = _normalise_address(profile.contract_address)
        if contract_key not in self._contracts:
            raise ValueError(f"contract '{profile.contract_address}' is not registered")
        self._profiles[contract_key] = profile

    # ------------------------------------------------------------------
    # evaluation

    def evaluate_network(self, network_name: str, telemetry: NetworkTelemetry) -> NetworkHealthSummary:
        network_key = _normalise_key(network_name)
        if network_key not in self._networks:
            raise ValueError(f"network '{network_name}' is not registered")
        network = self._networks[network_key]

        related_profiles: list[TransactionProfile] = []
        for address, contract in self._contracts.items():
            if _normalise_key(contract.network) == network_key and address in self._profiles:
                related_profiles.append(self._profiles[address])

        if related_profiles:
            success_rates = [profile.success_rate for profile in related_profiles]
            latencies = [profile.average_latency_ms for profile in related_profiles]
            pending = [profile.pending_transactions for profile in related_profiles]
            average_success = mean(success_rates)
            average_contract_latency = mean(latencies)
            aggregate_pending = sum(pending)
        else:
            average_success = network.reliability_target
            average_contract_latency = telemetry.latency_ms
            aggregate_pending = 0

        reliability_score = _clamp01(
            (network.reliability_target + telemetry.uptime_ratio + average_success) / 3.0
        )
        utilisation = max(telemetry.utilisation, min(1.0, telemetry.pending_transactions / 1_000))
        finality_gap = max(telemetry.block_gap - network.finality_threshold, 0)
        average_latency = max(telemetry.latency_ms, average_contract_latency)

        alerts: list[str] = []
        actions: list[Web3Action] = []

        if reliability_score < self.reliability_floor:
            alerts.append(
                f"Reliability score {reliability_score:.2f} below floor {self.reliability_floor:.2f}"
            )
            priority = "high" if reliability_score < self.reliability_floor - 0.1 else "normal"
            actions.append(
                Web3Action(
                    category="stability",
                    description=f"Escalate reliability incident for {network.name}",
                    priority=priority,
                )
            )

        if utilisation > self.congestion_threshold:
            alerts.append(
                f"Network utilisation {utilisation:.2f} above congestion threshold {self.congestion_threshold:.2f}"
            )
            actions.append(
                Web3Action(
                    category="throughput",
                    description=f"Scale routing capacity on {network.name}",
                    priority="high",
                )
            )

        if average_latency > self.latency_target_ms:
            alerts.append(
                f"Latency {average_latency:.0f}ms exceeds target {self.latency_target_ms:.0f}ms"
            )
            actions.append(
                Web3Action(
                    category="latency",
                    description=f"Optimise RPC endpoints for {network.name}",
                    priority="normal",
                )
            )

        if finality_gap > 0:
            alerts.append(
                f"Finality gap of {finality_gap} blocks exceeds threshold {network.finality_threshold}"
            )

        for contract_address, contract in self._contracts.items():
            if _normalise_key(contract.network) != network_key:
                continue
            profile = self._profiles.get(contract_address)
            if profile and profile.success_rate < 0.9:
                alerts.append(
                    f"Contract {contract.address} success rate {profile.success_rate:.2f} below target"
                )
                actions.append(
                    Web3Action(
                        category="contract",
                        description=f"Review {contract.address} for regressions",
                        priority="normal",
                        metadata={"network": network.name, "contract": contract.address},
                    )
                )

        summary_metadata: Dict[str, object] = {
            "network": network.name,
            "telemetry": telemetry.metadata,
            "registered_contracts": sum(
                1 for contract in self._contracts.values() if _normalise_key(contract.network) == network_key
            ),
            "profiled_contracts": len(related_profiles),
            "aggregate_pending": aggregate_pending + telemetry.pending_transactions,
        }

        return NetworkHealthSummary(
            network=network.name,
            reliability_score=reliability_score,
            utilisation=utilisation,
            finality_gap=finality_gap,
            average_latency_ms=average_latency,
            contract_success_rate=average_success,
            alerts=tuple(alerts),
            actions=tuple(actions),
            metadata=summary_metadata,
        )

    # ------------------------------------------------------------------
    # inspection helpers

    def registered_networks(self) -> Iterable[Web3Network]:
        return tuple(self._networks.values())

    def registered_contracts(self) -> Iterable[SmartContract]:
        return tuple(self._contracts.values())

    def tracked_profiles(self) -> Iterable[TransactionProfile]:
        return tuple(self._profiles.values())

    # ------------------------------------------------------------------
    # unified build orchestration

    def build_unified_status(
        self, telemetry_map: Mapping[str, NetworkTelemetry]
    ) -> Web3UnifiedBuild:
        if not telemetry_map:
            raise ValueError("telemetry_map must not be empty")

        normalised_telemetry: Dict[str, NetworkTelemetry] = {}
        for name, telemetry in telemetry_map.items():
            key = _normalise_key(name)
            if key in normalised_telemetry:
                raise ValueError(f"duplicate telemetry provided for network '{name}'")
            normalised_telemetry[key] = telemetry

        missing = [
            network.name
            for key, network in self._networks.items()
            if key not in normalised_telemetry
        ]
        if missing:
            joined = ", ".join(sorted(missing))
            raise ValueError(f"missing telemetry for registered networks: {joined}")

        extra = [
            name
            for name, telemetry in telemetry_map.items()
            if _normalise_key(name) not in self._networks
        ]
        if extra:
            joined = ", ".join(sorted(extra))
            raise ValueError(f"unknown networks in telemetry_map: {joined}")

        summaries: list[NetworkHealthSummary] = []
        total_reliability = 0.0
        total_utilisation = 0.0
        total_pending = 0
        aggregate_alerts: list[str] = []
        aggregate_actions: list[Web3Action] = []

        for key, telemetry in normalised_telemetry.items():
            network_name = self._networks[key].name
            summary = self.evaluate_network(network_name, telemetry)
            summaries.append(summary)
            total_reliability += summary.reliability_score
            total_utilisation += summary.utilisation
            aggregate_alerts.extend(summary.alerts)
            aggregate_actions.extend(summary.actions)
            pending = summary.metadata.get("aggregate_pending")
            if isinstance(pending, (int, float)):
                total_pending += int(pending)
            else:
                total_pending += telemetry.pending_transactions

        count = len(summaries)
        average_reliability = total_reliability / count if count else 0.0
        average_utilisation = total_utilisation / count if count else 0.0

        metadata = {
            "evaluated_networks": tuple(summary.network for summary in summaries),
            "telemetry_samples": count,
        }

        return Web3UnifiedBuild(
            summaries=tuple(summaries),
            average_reliability=average_reliability,
            average_utilisation=average_utilisation,
            aggregate_alerts=tuple(aggregate_alerts),
            aggregate_actions=tuple(aggregate_actions),
            total_pending_transactions=total_pending,
            metadata=metadata,
        )

    def compile_project_build(
        self,
        telemetry_map: Mapping[str, NetworkTelemetry],
        *,
        project_name: str = "Dynamic Capital",
        metadata: Mapping[str, object] | None = None,
    ) -> Web3GoLiveReadiness:
        """Produce a go-live readiness summary for the supplied telemetry."""

        unified = self.build_unified_status(telemetry_map)

        ready: list[str] = []
        attention: list[str] = []
        blocking_alerts: list[str] = []
        critical_actions: list[Web3Action] = []

        for summary in unified.summaries:
            network_ready = (
                summary.reliability_score >= self.reliability_floor
                and summary.utilisation <= self.congestion_threshold
                and summary.average_latency_ms <= self.latency_target_ms
                and summary.finality_gap == 0
                and summary.contract_success_rate >= 0.9
            )

            if network_ready:
                ready.append(summary.network)
            else:
                attention.append(summary.network)
                blocking_alerts.extend(summary.alerts)
                critical_actions.extend(
                    action for action in summary.actions if action.priority == "high"
                )

        status = "ready"
        if attention:
            status = "blocked" if blocking_alerts else "attention"

        combined_metadata: MutableMapping[str, object] = {
            "project": project_name,
            "average_reliability": unified.average_reliability,
            "average_utilisation": unified.average_utilisation,
            "evaluated_networks": unified.metadata.get("evaluated_networks", ()),
        }
        combined_metadata.update(_ensure_mapping(metadata))

        return Web3GoLiveReadiness(
            project=project_name,
            status=status,
            unified_build=unified,
            ready_networks=tuple(ready),
            networks_requiring_attention=tuple(attention),
            blocking_alerts=tuple(blocking_alerts),
            critical_actions=tuple(critical_actions),
            total_pending_transactions=unified.total_pending_transactions,
            metadata=combined_metadata,
        )
        
    def go_live(
        self,
        telemetry_map: Mapping[str, NetworkTelemetry],
        *,
        project_name: str = "Dynamic Capital",
        metadata: Mapping[str, object] | None = None,
    ) -> Web3GoLiveReadiness:
        """Validate readiness and return the go-live summary.

        The method wraps :meth:`compile_project_build` and enforces that the
        resulting readiness status is ``"ready"``. If the project still has
        blocking alerts or networks requiring attention, a
        :class:`GoLiveBlockedError` is raised describing the outstanding work.
        """

        readiness = self.compile_project_build(
            telemetry_map,
            project_name=project_name,
            metadata=metadata,
        )

        if readiness.status != "ready":
            raise GoLiveBlockedError(readiness)

        return readiness
