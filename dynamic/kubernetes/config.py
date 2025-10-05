"""Structured validation helpers for Kubernetes manifests."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Sequence

__all__ = [
    "EnvVar",
    "PortMapping",
    "VolumeMount",
    "VolumeSpec",
    "ContainerSpec",
    "K8sConfig",
]


def _require_non_empty_text(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        if value is None:
            raise ValueError(f"{field_name} must be provided")
        value = str(value)
    text = value.strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _require_mapping(value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{field_name} must be a mapping")
    return dict(value)


def _iter_mappings(value: Any, field_name: str) -> tuple[dict[str, Any], ...]:
    if value is None:
        return ()
    if not isinstance(value, Sequence) or isinstance(value, (str, bytes)):
        raise TypeError(f"{field_name} must be a sequence of mappings")
    items: list[dict[str, Any]] = []
    for index, item in enumerate(value):
        items.append(_require_mapping(item, f"{field_name}[{index}]"))
    return tuple(items)


def _require_port(value: Any, field_name: str) -> int:
    try:
        port = int(value)
    except (TypeError, ValueError):
        raise TypeError(f"{field_name} must be an integer") from None
    if port <= 0 or port > 65535:
        raise ValueError(f"{field_name} must be between 1 and 65535")
    return port


@dataclass(slots=True)
class EnvVar:
    name: str
    value: str | None = None
    value_from: Mapping[str, Any] | None = None

    def __post_init__(self) -> None:
        if (self.value is None) == (self.value_from is None):
            raise ValueError(
                f"EnvVar {self.name!r} requires exactly one of 'value' or 'valueFrom'"
            )

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "EnvVar":
        data = _require_mapping(mapping, "env")
        name = _require_non_empty_text(data.get("name"), "env.name")
        has_value = "value" in data
        has_value_from = "valueFrom" in data
        if has_value == has_value_from:
            raise ValueError(
                f"env {name!r} must define exactly one of 'value' or 'valueFrom'"
            )
        if has_value:
            value = _require_non_empty_text(data["value"], f"env.value for {name}")
            return cls(name=name, value=value)
        value_from = _require_mapping(data["valueFrom"], f"env.valueFrom for {name}")
        return cls(name=name, value_from=value_from)


@dataclass(slots=True)
class PortMapping:
    container_port: int
    host_port: int | None = None
    host_ip: str | None = None

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "PortMapping":
        data = _require_mapping(mapping, "port")
        container_port = _require_port(data.get("containerPort"), "containerPort")
        host_port = data.get("hostPort")
        resolved_host_port = _require_port(host_port, "hostPort") if host_port is not None else None
        host_ip_value = data.get("hostIP")
        resolved_host_ip = (
            _require_non_empty_text(host_ip_value, "hostIP") if host_ip_value is not None else None
        )
        return cls(container_port=container_port, host_port=resolved_host_port, host_ip=resolved_host_ip)


@dataclass(slots=True)
class VolumeMount:
    name: str
    mount_path: str
    read_only: bool = False

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "VolumeMount":
        data = _require_mapping(mapping, "volumeMount")
        name = _require_non_empty_text(data.get("name"), "volumeMount.name")
        mount_path = _require_non_empty_text(data.get("mountPath"), f"volumeMount.mountPath for {name}")
        read_only = bool(data.get("readOnly", False))
        return cls(name=name, mount_path=mount_path, read_only=read_only)


@dataclass(slots=True)
class VolumeSpec:
    name: str
    source_type: str
    config: Mapping[str, Any]
    options: Mapping[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "VolumeSpec":
        data = _require_mapping(mapping, "volume")
        name = _require_non_empty_text(data.get("name"), "volume.name")
        source_entries = [
            (key, value)
            for key, value in data.items()
            if key != "name" and (value is None or isinstance(value, Mapping))
        ]
        if not source_entries:
            raise ValueError(f"volume {name} must define a volume source")
        if len(source_entries) != 1:
            raise ValueError(f"volume {name} must define exactly one volume source")
        source_type, source_config = source_entries[0]
        if source_config is None:
            config: Mapping[str, Any] = {}
        else:
            config = _require_mapping(source_config, f"volume {name}.{source_type}")
        extra_options = {
            key: value
            for key, value in data.items()
            if key not in {"name", source_type} and not (value is None or isinstance(value, Mapping))
        }
        return cls(name=name, source_type=source_type, config=config, options=extra_options)

    def validate(self) -> None:
        if self.source_type == "hostPath":
            _require_non_empty_text(self.config.get("path"), f"volume {self.name}.hostPath.path")
            if "type" in self.config:
                _require_non_empty_text(self.config["type"], f"volume {self.name}.hostPath.type")
        elif self.source_type == "emptyDir":
            medium = self.config.get("medium")
            if medium is not None:
                _require_non_empty_text(medium, f"volume {self.name}.emptyDir.medium")
        elif self.source_type == "persistentVolumeClaim":
            _require_non_empty_text(
                self.config.get("claimName"), f"volume {self.name}.persistentVolumeClaim.claimName"
            )
        elif self.source_type in {
            "configMap",
            "secret",
            "projected",
            "downwardAPI",
        }:
            # These volume types accept optional configuration payloads; nothing to validate eagerly.
            if self.config:
                _require_mapping(self.config, f"volume {self.name}.{self.source_type}")
        else:  # pragma: no cover - broader Kubernetes compatibility
            _require_mapping(self.config, f"volume {self.name}.{self.source_type}")
        read_only = self.options.get("readOnly")
        if read_only is not None and not isinstance(read_only, bool):
            raise TypeError(f"volume {self.name}.readOnly must be a boolean")


@dataclass(slots=True)
class ContainerSpec:
    name: str
    image: str
    env: tuple[EnvVar, ...] = field(default_factory=tuple)
    ports: tuple[PortMapping, ...] = field(default_factory=tuple)
    security_context: Mapping[str, Any] | None = None
    volume_mounts: tuple[VolumeMount, ...] = field(default_factory=tuple)
    tty: bool = False

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "ContainerSpec":
        data = _require_mapping(mapping, "container")
        name = _require_non_empty_text(data.get("name"), "container.name")
        image = _require_non_empty_text(data.get("image"), f"container {name}.image")
        env = tuple(EnvVar.from_mapping(item) for item in _iter_mappings(data.get("env"), f"container {name}.env"))
        ports = tuple(
            PortMapping.from_mapping(item) for item in _iter_mappings(data.get("ports"), f"container {name}.ports")
        )
        volume_mounts = tuple(
            VolumeMount.from_mapping(item)
            for item in _iter_mappings(data.get("volumeMounts"), f"container {name}.volumeMounts")
        )
        security_context = data.get("securityContext")
        resolved_security_context = (
            _require_mapping(security_context, f"container {name}.securityContext")
            if security_context is not None
            else None
        )
        tty = bool(data.get("tty", False))
        return cls(
            name=name,
            image=image,
            env=env,
            ports=ports,
            security_context=resolved_security_context,
            volume_mounts=volume_mounts,
            tty=tty,
        )

    def validate(self, *, available_volumes: set[str]) -> None:
        env_names: set[str] = set()
        for item in self.env:
            if item.name in env_names:
                raise ValueError(f"Duplicate environment variable {item.name!r} in container {self.name}")
            env_names.add(item.name)
        port_numbers: set[int] = set()
        for port in self.ports:
            if port.container_port in port_numbers:
                raise ValueError(f"Duplicate containerPort {port.container_port} in container {self.name}")
            port_numbers.add(port.container_port)
        mount_names: set[str] = set()
        for mount in self.volume_mounts:
            if mount.name not in available_volumes:
                raise ValueError(
                    f"Container {self.name} references undefined volume {mount.name!r}"
                )
            if mount.name in mount_names:
                raise ValueError(
                    f"Container {self.name} references volume {mount.name!r} multiple times"
                )
            mount_names.add(mount.name)


@dataclass(slots=True)
class K8sConfig:
    api_version: str
    kind: str
    metadata: Mapping[str, Any]
    containers: tuple[ContainerSpec, ...]
    volumes: tuple[VolumeSpec, ...]
    hostname: str | None = None
    raw_spec: Mapping[str, Any] = field(default_factory=dict, repr=False)

    @classmethod
    def from_mapping(cls, mapping: Mapping[str, Any]) -> "K8sConfig":
        data = _require_mapping(mapping, "config")
        api_version = _require_non_empty_text(data.get("apiVersion"), "apiVersion")
        kind = _require_non_empty_text(data.get("kind"), "kind")
        metadata = _require_mapping(data.get("metadata"), "metadata")
        spec_data = _require_mapping(data.get("spec"), "spec")
        containers_raw = _iter_mappings(spec_data.get("containers"), "spec.containers")
        if not containers_raw:
            raise ValueError("spec.containers must define at least one container")
        containers = tuple(ContainerSpec.from_mapping(item) for item in containers_raw)
        volumes = tuple(VolumeSpec.from_mapping(item) for item in _iter_mappings(spec_data.get("volumes"), "spec.volumes"))
        hostname_value = spec_data.get("hostname")
        hostname = _require_non_empty_text(hostname_value, "spec.hostname") if hostname_value is not None else None
        raw_spec = dict(spec_data)
        raw_spec.pop("containers", None)
        raw_spec.pop("volumes", None)
        return cls(
            api_version=api_version,
            kind=kind,
            metadata=metadata,
            containers=containers,
            volumes=volumes,
            hostname=hostname,
            raw_spec=raw_spec,
        )

    def validate(self) -> None:
        _require_non_empty_text(self.metadata.get("name"), "metadata.name")
        volume_names: set[str] = set()
        for volume in self.volumes:
            if volume.name in volume_names:
                raise ValueError(f"Duplicate volume name {volume.name!r}")
            volume.validate()
            volume_names.add(volume.name)
        container_names: set[str] = set()
        for container in self.containers:
            if container.name in container_names:
                raise ValueError(f"Duplicate container name {container.name!r}")
            container.validate(available_volumes=volume_names)
            container_names.add(container.name)

    def as_dict(self) -> dict[str, Any]:
        containers = []
        for container in self.containers:
            container_payload: dict[str, object] = {
                "name": container.name,
                "image": container.image,
            }
            if container.env:
                container_payload["env"] = []
                for env in container.env:
                    env_payload: dict[str, Any] = {"name": env.name}
                    if env.value is not None:
                        env_payload["value"] = env.value
                    elif env.value_from is not None:
                        env_payload["valueFrom"] = dict(env.value_from)
                    container_payload["env"].append(env_payload)
            if container.ports:
                container_payload["ports"] = [
                    {
                        "containerPort": port.container_port,
                        **({"hostPort": port.host_port} if port.host_port is not None else {}),
                        **({"hostIP": port.host_ip} if port.host_ip is not None else {}),
                    }
                    for port in container.ports
                ]
            if container.security_context is not None:
                container_payload["securityContext"] = dict(container.security_context)
            if container.volume_mounts:
                container_payload["volumeMounts"] = [
                    {
                        "name": mount.name,
                        "mountPath": mount.mount_path,
                        **({"readOnly": True} if mount.read_only else {}),
                    }
                    for mount in container.volume_mounts
                ]
            if container.tty:
                container_payload["tty"] = True
            containers.append(container_payload)
        volumes = []
        for volume in self.volumes:
            volume_payload: dict[str, Any] = {
                "name": volume.name,
                volume.source_type: dict(volume.config),
            }
            if volume.options:
                volume_payload.update(dict(volume.options))
            volumes.append(volume_payload)
        payload: dict[str, object] = {
            "apiVersion": self.api_version,
            "kind": self.kind,
            "metadata": dict(self.metadata),
            "spec": {
                **dict(self.raw_spec),
                "containers": containers,
                "volumes": volumes,
            },
        }
        if self.hostname is not None:
            payload["spec"]["hostname"] = self.hostname
        return payload
