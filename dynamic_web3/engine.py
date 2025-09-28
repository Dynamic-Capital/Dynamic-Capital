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
    "DynamicWeb3Engine",
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
