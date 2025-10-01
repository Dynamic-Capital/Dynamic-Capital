"""Structured representation of the TCP/IP networking model."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterator, MutableMapping, Sequence

__all__ = [
    "LifecycleStage",
    "LayerDefinition",
    "OsiMapping",
    "Protocol",
    "TcpIpLayer",
    "TcpIpModel",
    "default_model",
]


class TcpIpLayer(str, Enum):
    """Enumerate the canonical layers of the TCP/IP model."""

    APPLICATION = "application"
    TRANSPORT = "transport"
    INTERNET = "internet"
    NETWORK_ACCESS = "network_access"

    @classmethod
    def from_value(cls, value: "TcpIpLayer | str") -> "TcpIpLayer":
        """Coerce an arbitrary value into a :class:`TcpIpLayer` member."""

        if isinstance(value, TcpIpLayer):
            return value
        normalised = str(value).strip().lower()
        for member in cls:
            if member.value == normalised:
                return member
        raise KeyError(f"unknown TCP/IP layer: {value!r}")


def _normalise_name(name: str) -> str:
    cleaned = str(name).strip()
    if not cleaned:
        raise ValueError("name must be a non-empty string")
    return cleaned


@dataclass(slots=True)
class Protocol:
    """Describe a protocol that participates in the TCP/IP model."""

    name: str
    layer: TcpIpLayer
    description: str
    guarantees: tuple[str, ...] = field(default_factory=tuple)
    default_ports: tuple[int, ...] = field(default_factory=tuple)
    secure_by_default: bool | None = None
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.guarantees = tuple(
            item
            for item in (
                str(entry).strip() for entry in self.guarantees
            )
            if item
        )

        ports: set[int] = set()
        for entry in self.default_ports:
            if entry is None:
                continue
            try:
                port = int(entry)
            except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
                raise TypeError("default port values must be integers") from exc
            if port < 0:
                raise ValueError("default port values must be >= 0")
            ports.add(port)
        self.default_ports = tuple(sorted(ports))

        self.notes = tuple(
            item
            for item in (
                str(entry).strip() for entry in self.notes
            )
            if item
        )

    @property
    def identity(self) -> str:
        """Return the canonical identifier for the protocol."""

        return self.name.lower()


@dataclass(slots=True)
class LayerDefinition:
    """Capture the responsibilities and protocols of a TCP/IP layer."""

    layer: TcpIpLayer
    description: str
    responsibilities: tuple[str, ...]
    protocols: tuple[Protocol, ...] = field(default_factory=tuple)
    technologies: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.responsibilities = tuple(item.strip() for item in self.responsibilities if item.strip())
        self.protocols = tuple(self.protocols)
        self.technologies = tuple(item.strip() for item in self.technologies if item.strip())

        for protocol in self.protocols:
            if protocol.layer is not self.layer:
                raise ValueError(
                    f"protocol {protocol.name!r} is declared for {protocol.layer.value} but attached to {self.layer.value}"
                )

    def protocol_names(self) -> tuple[str, ...]:
        """Return an ordered tuple of protocol names for the layer."""

        return tuple(protocol.name for protocol in self.protocols)

    def add_protocol(self, protocol: Protocol, *, replace: bool = False) -> None:
        """Insert ``protocol`` into the layer, optionally replacing an existing one."""

        if protocol.layer is not self.layer:
            raise ValueError(
                f"protocol {protocol.name!r} belongs to {protocol.layer.value} and cannot be stored in {self.layer.value}"
            )

        entries: MutableMapping[str, Protocol] = {item.identity: item for item in self.protocols}
        key = protocol.identity
        if key in entries and not replace:
            raise ValueError(f"protocol {protocol.name!r} already exists on layer {self.layer.value}")

        entries[key] = protocol
        self.protocols = tuple(sorted(entries.values(), key=lambda item: item.name.lower()))


@dataclass(slots=True)
class OsiMapping:
    """Relate an OSI layer to one or more TCP/IP layers."""

    osi_layer: str
    description: str
    tcp_ip_layers: tuple[TcpIpLayer, ...]
    notes: tuple[str, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        self.osi_layer = _normalise_name(self.osi_layer)
        self.description = self.description.strip()
        self.tcp_ip_layers = tuple(TcpIpLayer.from_value(layer) for layer in self.tcp_ip_layers)
        self.notes = tuple(note.strip() for note in self.notes if note.strip())

    def label(self) -> str:
        """Return the human-readable label for reporting."""

        return self.osi_layer.title()


@dataclass(slots=True)
class LifecycleStage:
    """Represent a canonical step in the addressing and session lifecycle."""

    name: str
    description: str
    layers: tuple[TcpIpLayer, ...]

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name)
        self.description = self.description.strip()
        self.layers = tuple(TcpIpLayer.from_value(layer) for layer in self.layers)

    def label(self) -> str:
        return self.name.title()


class TcpIpModel:
    """High-level container offering insights into the TCP/IP stack."""

    def __init__(
        self,
        layers: Sequence[LayerDefinition],
        *,
        osi_mappings: Sequence[OsiMapping] | None = None,
        lifecycle: Sequence[LifecycleStage] | None = None,
    ) -> None:
        if not layers:
            raise ValueError("at least one layer definition is required")

        self._layer_order: tuple[TcpIpLayer, ...] = tuple(layer.layer for layer in layers)
        self._layers: dict[TcpIpLayer, LayerDefinition] = {}
        self._protocol_index: dict[str, Protocol] = {}

        for layer in layers:
            if layer.layer in self._layers:
                raise ValueError(f"duplicate layer definition for {layer.layer.value}")
            self._layers[layer.layer] = layer

            for protocol in layer.protocols:
                key = protocol.identity
                if key in self._protocol_index:
                    raise ValueError(f"duplicate protocol declaration: {protocol.name!r}")
                self._protocol_index[key] = protocol

        self._osi_mappings: tuple[OsiMapping, ...] = tuple(osi_mappings or ())
        self._lifecycle: tuple[LifecycleStage, ...] = tuple(lifecycle or ())

    # ------------------------------------------------------------------
    # Layer accessors
    # ------------------------------------------------------------------
    @property
    def layers(self) -> tuple[LayerDefinition, ...]:
        """Return all layer definitions in canonical order."""

        return tuple(self._layers[layer] for layer in self._layer_order)

    def layer(self, value: TcpIpLayer | str) -> LayerDefinition:
        """Fetch the layer definition for ``value``."""

        layer = TcpIpLayer.from_value(value)
        try:
            return self._layers[layer]
        except KeyError as exc:  # pragma: no cover - defensive guardrail
            raise KeyError(f"layer {layer.value!r} is not registered") from exc

    def protocols(self, *, layer: TcpIpLayer | str | None = None) -> tuple[Protocol, ...]:
        """Return protocols optionally filtered by ``layer``."""

        if layer is None:
            return tuple(self._protocol_index[key] for key in sorted(self._protocol_index))
        definition = self.layer(layer)
        return definition.protocols

    # ------------------------------------------------------------------
    # Protocol operations
    # ------------------------------------------------------------------
    def get_protocol(self, name: str) -> Protocol:
        """Return a protocol by name (case-insensitive)."""

        key = _normalise_name(name).lower()
        try:
            return self._protocol_index[key]
        except KeyError as exc:
            raise KeyError(f"protocol {name!r} is not registered") from exc

    def register_protocol(self, protocol: Protocol, *, replace: bool = False) -> None:
        """Attach ``protocol`` to the model, updating indexes as required."""

        layer = self.layer(protocol.layer)
        key = protocol.identity
        existing = self._protocol_index.get(key)
        if existing is not None:
            if not replace:
                raise ValueError(f"protocol {protocol.name!r} already exists")
            if existing.layer is not protocol.layer:
                raise ValueError("cannot replace a protocol on a different layer")

        layer.add_protocol(protocol, replace=replace)
        self._protocol_index[key] = protocol

    # ------------------------------------------------------------------
    # OSI alignment
    # ------------------------------------------------------------------
    @property
    def osi_mappings(self) -> tuple[OsiMapping, ...]:
        return self._osi_mappings

    def describe_osi_layer(self, osi_layer: str) -> OsiMapping:
        """Return the OSI mapping for ``osi_layer`` (case-insensitive)."""

        key = _normalise_name(osi_layer).lower()
        for mapping in self._osi_mappings:
            if mapping.osi_layer.lower() == key:
                return mapping
        raise KeyError(f"OSI layer {osi_layer!r} is not defined")

    # ------------------------------------------------------------------
    # Lifecycle representation
    # ------------------------------------------------------------------
    @property
    def lifecycle(self) -> tuple[LifecycleStage, ...]:
        return self._lifecycle

    def iter_lifecycle(self) -> Iterator[LifecycleStage]:
        """Yield lifecycle stages in declaration order."""

        return iter(self._lifecycle)


def default_model() -> TcpIpModel:
    """Return the canonical Dynamic Capital TCP/IP model."""

    application = LayerDefinition(
        layer=TcpIpLayer.APPLICATION,
        description="Interfaces where user agents and services exchange structured data.",
        responsibilities=(
            "Serve product experiences, trading dashboards, and automation endpoints.",
            "Translate domain-specific intents into network transactions.",
            "Enforce presentation, encoding, and encryption policies at the edge.",
        ),
        protocols=(
            Protocol(
                name="HTTP",
                layer=TcpIpLayer.APPLICATION,
                description="Stateless request/response protocol powering web services.",
                guarantees=("application semantics", "extensibility via headers"),
                default_ports=(80,),
            ),
            Protocol(
                name="HTTPS",
                layer=TcpIpLayer.APPLICATION,
                description="TLS-secured HTTP for confidential and authenticated sessions.",
                guarantees=("encryption", "integrity", "server authentication"),
                default_ports=(443,),
                secure_by_default=True,
            ),
            Protocol(
                name="FTP",
                layer=TcpIpLayer.APPLICATION,
                description="File transfer protocol for bulk dataset and log exchange.",
                guarantees=("stateful transfers",),
                default_ports=(20, 21),
            ),
            Protocol(
                name="DNS",
                layer=TcpIpLayer.APPLICATION,
                description="Hierarchical name resolution for service discovery.",
                guarantees=("distributed caching", "eventual consistency"),
                default_ports=(53,),
                notes=("Supports UDP for speed and TCP for zone transfers.",),
            ),
            Protocol(
                name="DHCP",
                layer=TcpIpLayer.APPLICATION,
                description="Dynamic configuration for IP addressing and gateway distribution.",
                guarantees=("automatic lease negotiation",),
                default_ports=(67, 68),
            ),
        ),
        technologies=("REST APIs", "GraphQL schemas", "Edge gateways"),
    )

    transport = LayerDefinition(
        layer=TcpIpLayer.TRANSPORT,
        description="End-to-end delivery and flow control between communicating peers.",
        responsibilities=(
            "Segment application payloads into ordered exchanges.",
            "Guarantee reliability where required or minimise latency for streaming flows.",
            "Coordinate congestion control and session multiplexing.",
        ),
        protocols=(
            Protocol(
                name="TCP",
                layer=TcpIpLayer.TRANSPORT,
                description="Connection-oriented delivery with retransmission and ordering guarantees.",
                guarantees=("reliability", "in-order delivery", "congestion control"),
            ),
            Protocol(
                name="UDP",
                layer=TcpIpLayer.TRANSPORT,
                description="Minimal transport framing optimised for low-latency communication.",
                guarantees=("connectionless delivery", "best-effort latency"),
                notes=("Suitable for market data streams and media sessions.",),
            ),
        ),
        technologies=("QUIC", "SCTP"),
    )

    internet = LayerDefinition(
        layer=TcpIpLayer.INTERNET,
        description="Logical addressing and routing of packets across interconnected networks.",
        responsibilities=(
            "Assign globally unique IP addresses to infrastructure nodes.",
            "Route packets between autonomous systems and overlay networks.",
            "Resolve hardware destinations on local segments via auxiliary protocols.",
        ),
        protocols=(
            Protocol(
                name="IP",
                layer=TcpIpLayer.INTERNET,
                description="Core addressing and routing protocol spanning IPv4 and IPv6.",
                guarantees=("best-effort packet delivery", "fragmentation support"),
            ),
            Protocol(
                name="ARP",
                layer=TcpIpLayer.INTERNET,
                description="Maps IP addresses to link-layer MAC identifiers on local networks.",
                guarantees=("local resolution",),
            ),
        ),
        technologies=("BGP", "SD-WAN overlays", "Anycast routing"),
    )

    network_access = LayerDefinition(
        layer=TcpIpLayer.NETWORK_ACCESS,
        description="Physical and link-layer mechanisms that transmit frames on the medium.",
        responsibilities=(
            "Frame packets for delivery across wired and wireless media.",
            "Manage MAC addressing, channel access, and error detection.",
            "Provide redundant physical paths and segmentation primitives.",
        ),
        protocols=(),
        technologies=("Ethernet", "Wi-Fi", "Private 5G", "Optical fibre"),
    )

    osi_mappings = (
        OsiMapping(
            osi_layer="Application",
            description="User-facing workflows, APIs, and orchestration surfaces.",
            tcp_ip_layers=(TcpIpLayer.APPLICATION,),
            notes=("Tailor Dynamic Capital dashboards and automation agents at this layer.",),
        ),
        OsiMapping(
            osi_layer="Presentation",
            description="Data formatting, encryption, and serialization standards.",
            tcp_ip_layers=(TcpIpLayer.APPLICATION,),
            notes=("TLS enforcement and schema negotiation live alongside application logic.",),
        ),
        OsiMapping(
            osi_layer="Session",
            description="Connection lifecycle, negotiation, and context management.",
            tcp_ip_layers=(TcpIpLayer.APPLICATION, TcpIpLayer.TRANSPORT),
            notes=("WebSocket upgrades, API sessions, and workflow state transitions.",),
        ),
        OsiMapping(
            osi_layer="Transport",
            description="Reliable delivery, flow control, and congestion avoidance.",
            tcp_ip_layers=(TcpIpLayer.TRANSPORT,),
            notes=("Tune TCP windows and leverage UDP/QUIC for latency-sensitive streams.",),
        ),
        OsiMapping(
            osi_layer="Network",
            description="Logical addressing, routing, and inter-network connectivity.",
            tcp_ip_layers=(TcpIpLayer.INTERNET,),
            notes=("Design multi-region subnets, BGP peering, and SD-WAN overlays.",),
        ),
        OsiMapping(
            osi_layer="Data Link",
            description="Node-to-node delivery, framing, and link-level security.",
            tcp_ip_layers=(TcpIpLayer.NETWORK_ACCESS,),
            notes=("Standardise Ethernet, VLAN segmentation, and wireless access controls.",),
        ),
        OsiMapping(
            osi_layer="Physical",
            description="Transmission media and hardware interfaces for raw bit streams.",
            tcp_ip_layers=(TcpIpLayer.NETWORK_ACCESS,),
            notes=("Provision redundant fibre, satellite backup, and structured cabling.",),
        ),
    )

    lifecycle = (
        LifecycleStage(
            name="address allocation",
            description="DHCP assigns leases while critical infrastructure uses curated static addressing.",
            layers=(TcpIpLayer.APPLICATION, TcpIpLayer.INTERNET),
        ),
        LifecycleStage(
            name="name resolution",
            description="DNS resolves product and infrastructure domains to routable IP endpoints.",
            layers=(TcpIpLayer.APPLICATION,),
        ),
        LifecycleStage(
            name="packet delivery",
            description="Transport payloads are encapsulated and routed across WAN and internet fabrics.",
            layers=(TcpIpLayer.TRANSPORT, TcpIpLayer.INTERNET, TcpIpLayer.NETWORK_ACCESS),
        ),
        LifecycleStage(
            name="session continuity",
            description="Transport semantics keep exchanges consistent while applications compensate for loss where required.",
            layers=(TcpIpLayer.TRANSPORT, TcpIpLayer.APPLICATION),
        ),
    )

    return TcpIpModel(
        [application, transport, internet, network_access],
        osi_mappings=osi_mappings,
        lifecycle=lifecycle,
    )
