"""DNS domain orchestration utilities for Dynamic Capital."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Iterable, Mapping, MutableMapping

__all__ = [
    "DomainChange",
    "DomainChangePlan",
    "DomainChangeType",
    "DomainRecord",
    "DynamicDomainManager",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _normalise_domain(value: str) -> str:
    domain = str(value).strip().lower()
    if not domain:
        raise ValueError("domain must be a non-empty string")
    return domain


def _normalise_type(value: str) -> str:
    record_type = str(value).strip().upper()
    if not record_type:
        raise ValueError("record type must be provided")
    return record_type


def _normalise_name(value: str) -> str:
    name = str(value).strip()
    if not name or name == "@":
        return "@"
    return name.lower()


def _normalise_data(record_type: str, value: str) -> str:
    data = str(value).strip()
    if not data:
        raise ValueError("record data must be provided")
    if record_type in {"CNAME", "MX", "NS"}:
        return data.rstrip(".").lower()
    return data


def _coerce_optional_int(value: object, *, minimum: int | None = None) -> int | None:
    if value is None:
        return None
    try:
        integer = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive guardrail
        raise TypeError("value must be numeric") from exc
    if minimum is not None and integer < minimum:
        raise ValueError(f"value must be >= {minimum}")
    return integer


def _coerce_ttl(value: object | None, *, default: int = 3600) -> int:
    if value is None:
        return default
    ttl = _coerce_optional_int(value, minimum=1)
    if ttl is None:  # pragma: no cover - defensive guardrail
        return default
    return ttl


def _coerce_bool(value: object, *, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y"}:
            return True
        if lowered in {"false", "0", "no", "n"}:
            return False
        raise ValueError("boolean string must be true/false/yes/no/1/0")
    if isinstance(value, (int, float)):
        return bool(value)
    raise TypeError("value is not coercible to bool")


def _normalise_tag(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalise_metadata(metadata: Mapping[str, object] | None) -> Mapping[str, object] | None:
    if metadata is None:
        return None
    if not isinstance(metadata, Mapping):  # pragma: no cover - defensive guardrail
        raise TypeError("metadata must be a mapping")
    return dict(metadata)


# ---------------------------------------------------------------------------
# core dataclasses


@dataclass(slots=True)
class DomainRecord:
    """Normalised representation of a DNS record."""

    type: str
    name: str
    data: str
    ttl: int = 3600
    priority: int | None = None
    weight: int | None = None
    port: int | None = None
    flags: int | None = None
    tag: str | None = None
    identifier: str | int | None = None
    managed: bool = False
    metadata: Mapping[str, object] | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        self.type = _normalise_type(self.type)
        self.name = _normalise_name(self.name)
        self.data = _normalise_data(self.type, self.data)
        self.ttl = _coerce_ttl(self.ttl)
        self.priority = _coerce_optional_int(self.priority, minimum=0)
        self.weight = _coerce_optional_int(self.weight, minimum=0)
        self.port = _coerce_optional_int(self.port, minimum=0)
        self.flags = _coerce_optional_int(self.flags, minimum=0)
        self.tag = _normalise_tag(self.tag)
        self.managed = _coerce_bool(self.managed, default=False)
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def identity(self) -> tuple[str, str, str]:
        """Stable identity for diffing (type, name, data)."""

        return (self.type, self.name, self.data)

    def diff(self, other: "DomainRecord") -> MutableMapping[str, tuple[object, object]]:
        """Return field-level differences vs. ``other``."""

        differences: dict[str, tuple[object, object]] = {}
        for field_name in ("ttl", "priority", "weight", "port", "flags", "tag"):
            if getattr(self, field_name) != getattr(other, field_name):
                differences[field_name] = (getattr(other, field_name), getattr(self, field_name))
        return differences

    def as_dict(self) -> MutableMapping[str, object]:
        """Serialise the record for logging or JSON output."""

        payload: MutableMapping[str, object] = {
            "type": self.type,
            "name": self.name,
            "data": self.data,
            "ttl": self.ttl,
            "priority": self.priority,
            "weight": self.weight,
            "port": self.port,
            "flags": self.flags,
            "tag": self.tag,
            "identifier": self.identifier,
            "managed": self.managed,
        }
        if self.metadata is not None:
            payload["metadata"] = dict(self.metadata)
        return payload


class DomainChangeType(str, Enum):
    """Type of DNS change to enact."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"


@dataclass(slots=True)
class DomainChange:
    """Single planned change."""

    action: DomainChangeType
    record: DomainRecord
    existing: DomainRecord | None = None
    differences: Mapping[str, tuple[object, object]] | None = None

    def as_dict(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {
            "action": self.action.value,
            "record": self.record.as_dict(),
        }
        if self.existing is not None:
            payload["existing"] = self.existing.as_dict()
        if self.differences:
            payload["differences"] = {
                key: {"current": current, "desired": desired}
                for key, (current, desired) in self.differences.items()
            }
        return payload


@dataclass(slots=True)
class DomainChangePlan:
    """Grouped DNS changes for a domain."""

    domain: str
    creates: tuple[DomainChange, ...] = ()
    updates: tuple[DomainChange, ...] = ()
    deletes: tuple[DomainChange, ...] = ()

    @property
    def total_changes(self) -> int:
        return len(self.creates) + len(self.updates) + len(self.deletes)

    def is_empty(self) -> bool:
        return self.total_changes == 0

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "domain": self.domain,
            "creates": [change.as_dict() for change in self.creates],
            "updates": [change.as_dict() for change in self.updates],
            "deletes": [change.as_dict() for change in self.deletes],
            "total": self.total_changes,
        }


# ---------------------------------------------------------------------------
# planner


class DynamicDomainManager:
    """Compute DNS change plans against the desired configuration."""

    def __init__(
        self,
        domain: str,
        *,
        existing: Iterable[DomainRecord | Mapping[str, object]] | None = None,
    ) -> None:
        self.domain = _normalise_domain(domain)
        self._existing: list[DomainRecord] = []
        if existing:
            for record in existing:
                self.add_existing(record)

    def add_existing(self, record: DomainRecord | Mapping[str, object]) -> DomainRecord:
        coerced = self._coerce_record(record, managed_default=False)
        self._existing.append(coerced)
        return coerced

    def plan(
        self,
        desired: Iterable[DomainRecord | Mapping[str, object]] | None,
        *,
        prune: bool = False,
    ) -> DomainChangePlan:
        desired_records = [self._coerce_record(record, managed_default=True) for record in desired or ()]
        existing_by_identity = {record.identity: record for record in self._existing}
        desired_by_identity = {record.identity: record for record in desired_records}

        creates: list[DomainChange] = []
        updates: list[DomainChange] = []

        for identity, record in desired_by_identity.items():
            existing = existing_by_identity.get(identity)
            if existing is None:
                creates.append(
                    DomainChange(
                        action=DomainChangeType.CREATE,
                        record=record,
                        differences=None,
                    )
                )
                continue
            differences = record.diff(existing)
            if differences:
                updates.append(
                    DomainChange(
                        action=DomainChangeType.UPDATE,
                        record=record,
                        existing=existing,
                        differences=differences,
                    )
                )

        deletes: list[DomainChange] = []
        if prune:
            for identity, record in existing_by_identity.items():
                if identity not in desired_by_identity and record.managed:
                    deletes.append(
                        DomainChange(
                            action=DomainChangeType.DELETE,
                            record=record,
                            existing=record,
                            differences=None,
                        )
                    )

        creates = sorted(creates, key=lambda change: change.record.identity)
        updates = sorted(updates, key=lambda change: change.record.identity)
        deletes = sorted(deletes, key=lambda change: change.record.identity)

        return DomainChangePlan(
            domain=self.domain,
            creates=tuple(creates),
            updates=tuple(updates),
            deletes=tuple(deletes),
        )

    def _coerce_record(
        self,
        record: DomainRecord | Mapping[str, object],
        *,
        managed_default: bool,
    ) -> DomainRecord:
        if isinstance(record, DomainRecord):
            if managed_default and not record.managed:
                # Rebuild to flip the managed flag while retaining normalisation.
                payload = record.as_dict()
                payload["managed"] = True
                return DomainRecord(**payload)
            return record
        payload = dict(record)
        payload.setdefault("managed", managed_default)
        return DomainRecord(**payload)
