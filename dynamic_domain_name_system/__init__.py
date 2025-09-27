"""Dynamic DNS orchestration primitives for Dynamic Capital."""

from .system import (
    DNSRecord,
    DynamicDomainNameSystem,
    DynamicDNSError,
    RecordNotFoundError,
    Resolution,
    ZoneNotFoundError,
    ZoneSnapshot,
)

__all__ = [
    "DNSRecord",
    "DynamicDomainNameSystem",
    "DynamicDNSError",
    "RecordNotFoundError",
    "Resolution",
    "ZoneNotFoundError",
    "ZoneSnapshot",
]
