"""Verification helpers for Dynamic Capital DNS domain bundles."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Mapping, Sequence

from .manager import DomainRecord, DynamicDomainManager

__all__ = [
    "DomainConfigCheck",
    "verify_config",
    "verify_directory",
    "summarise_checks",
]


_PLACEHOLDER_TOKENS: tuple[str, ...] = (
    "your-project-ref",
    "pending-",
    "example.com",
)

_RECORD_FIELDS = set(DomainRecord.__dataclass_fields__.keys())


def _coerce_record_payload(payload: Mapping[str, object]) -> Mapping[str, object]:
    coerced: dict[str, object] = {}
    metadata: Mapping[str, object] | None = None

    for key, value in payload.items():
        if key in _RECORD_FIELDS:
            if key == "metadata" and isinstance(value, Mapping):
                metadata = dict(value)
            else:
                coerced[key] = value
        elif key == "note":
            metadata = dict(metadata or {})
            metadata.setdefault("note", value)
    if metadata is not None:
        coerced["metadata"] = metadata
    return coerced


@dataclass(slots=True)
class DomainConfigCheck:
    """Outcome of verifying a single domain configuration file."""

    domain: str
    path: Path
    records: tuple[DomainRecord, ...] = ()
    placeholders: tuple[str, ...] = ()
    ton_site_valid: bool | None = None
    errors: tuple[str, ...] = field(default_factory=tuple)

    @property
    def ok(self) -> bool:
        """Whether the configuration passed validation."""

        return not self.errors

    @property
    def record_count(self) -> int:
        return len(self.records)

    def as_dict(self) -> Mapping[str, object]:
        return {
            "domain": self.domain,
            "path": str(self.path),
            "records": [record.as_dict() for record in self.records],
            "placeholders": list(self.placeholders),
            "ton_site_valid": self.ton_site_valid,
            "errors": list(self.errors),
            "ok": self.ok,
        }


def _load_payload(path: Path) -> Mapping[str, object]:
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:  # pragma: no cover - surfaced via verify_config
        raise ValueError(f"invalid JSON: {exc}") from exc


def _detect_placeholders(record: DomainRecord) -> Sequence[str]:
    hits: list[str] = []
    data = record.data.lower()
    for token in _PLACEHOLDER_TOKENS:
        if token in data:
            hits.append(f"{record.type} {record.name} -> {record.data}")
    return hits


def verify_config(path: Path | str) -> DomainConfigCheck:
    """Verify a single domain configuration JSON file."""

    config_path = Path(path)
    errors: list[str] = []
    placeholders: list[str] = []
    records: list[DomainRecord] = []

    try:
        payload = _load_payload(config_path)
    except ValueError as exc:
        return DomainConfigCheck(
            domain=config_path.stem,
            path=config_path,
            records=(),
            placeholders=(),
            ton_site_valid=None,
            errors=(str(exc),),
        )

    raw_domain = payload.get("domain")
    domain_candidate = str(raw_domain or "").strip().lower()
    if not domain_candidate:
        errors.append("domain missing")
        domain = config_path.stem.lower()
    else:
        domain = domain_candidate

    record_payloads = payload.get("records", [])
    if not isinstance(record_payloads, Sequence):
        errors.append("records must be a list")
        record_payloads = []

    identities: set[tuple[str, str, str]] = set()
    duplicates: list[str] = []

    for index, record_payload in enumerate(record_payloads, start=1):
        if not isinstance(record_payload, Mapping):
            errors.append(f"record {index} is not a mapping")
            continue
        try:
            record = DomainRecord(**_coerce_record_payload(record_payload))
        except Exception as exc:  # pragma: no cover - error captured in tests
            errors.append(f"record {index} invalid: {exc}")
            continue
        if record.identity in identities:
            duplicates.append(f"{record.type} {record.name} {record.data}")
        else:
            identities.add(record.identity)
        records.append(record)
        placeholders.extend(_detect_placeholders(record))

    if duplicates:
        errors.append("duplicate records: " + ", ".join(duplicates))

    ton_site = payload.get("ton_site")
    ton_site_valid: bool | None
    if ton_site is None:
        ton_site_valid = None
    elif not isinstance(ton_site, Mapping):
        ton_site_valid = False
        errors.append("ton_site must be a mapping")
    else:
        adnl = str(ton_site.get("adnl_address", "")).strip()
        public_key = str(ton_site.get("public_key_base64", "")).strip()
        ton_site_valid = bool(adnl and public_key)
        if not ton_site_valid:
            errors.append("ton_site requires adnl_address and public_key_base64")

    if not errors:
        manager = DynamicDomainManager(domain, existing=records)
        plan = manager.plan(records, prune=True)
        if plan.total_changes != 0:
            errors.append(f"unexpected drift: {plan.total_changes} changes detected")

    return DomainConfigCheck(
        domain=domain,
        path=config_path,
        records=tuple(records),
        placeholders=tuple(placeholders),
        ton_site_valid=ton_site_valid,
        errors=tuple(errors),
    )


def verify_directory(directory: Path | str) -> tuple[DomainConfigCheck, ...]:
    """Run verification across every JSON configuration in ``directory``."""

    base = Path(directory)
    if not base.exists():
        raise FileNotFoundError(f"directory '{base}' not found")
    checks = [verify_config(path) for path in sorted(base.glob("*.json"))]
    return tuple(checks)


def summarise_checks(checks: Iterable[DomainConfigCheck]) -> Mapping[str, int]:
    """Return aggregate metrics for a sequence of checks."""

    total = 0
    healthy = 0
    placeholders = 0
    ton_sites_present = 0
    ton_sites_valid = 0
    errors = 0

    for check in checks:
        total += 1
        if check.ok:
            healthy += 1
        else:
            errors += 1
        placeholders += len(check.placeholders)
        if check.ton_site_valid is not None:
            ton_sites_present += 1
            if check.ton_site_valid:
                ton_sites_valid += 1

    return {
        "total": total,
        "healthy": healthy,
        "unhealthy": errors,
        "placeholders": placeholders,
        "ton_sites_present": ton_sites_present,
        "ton_sites_valid": ton_sites_valid,
    }
