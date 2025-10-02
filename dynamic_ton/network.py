"""Network configuration helpers for Dynamic Capital's TON deployments."""

from __future__ import annotations

import base64
import binascii
import ipaddress
from dataclasses import dataclass, field
from typing import Iterable, Sequence

__all__ = [
    "TonLiteserver",
    "TON_MAINNET_LITESERVERS",
    "build_tonlib_liteservers",
]


def _normalise_ipv4(host: str) -> ipaddress.IPv4Address:
    if not isinstance(host, str):  # pragma: no cover - defensive
        raise TypeError("host must be a string")
    text = host.strip()
    if not text:
        raise ValueError("host must not be empty")
    try:
        return ipaddress.IPv4Address(text)
    except ipaddress.AddressValueError as exc:  # pragma: no cover - defensive
        raise ValueError("host must be a valid IPv4 address") from exc


def _normalise_port(port: int) -> int:
    try:
        numeric = int(port)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ValueError("port must be an integer") from exc
    if not (0 < numeric < 65536):
        raise ValueError("port must be between 1 and 65535")
    return numeric


def _normalise_public_key(key: str) -> str:
    if not isinstance(key, str):  # pragma: no cover - defensive
        raise TypeError("public_key_base64 must be a string")
    text = key.strip()
    if not text:
        raise ValueError("public_key_base64 must not be empty")
    try:
        decoded = base64.b64decode(text, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("public_key_base64 must be valid base64") from exc
    if len(decoded) != 32:
        raise ValueError("public_key_base64 must decode to 32 bytes")
    return text


def _ipv4_to_signed_int(address: ipaddress.IPv4Address) -> int:
    value = int(address)
    if value >= 2**31:
        value -= 2**32
    return value


@dataclass(frozen=True, slots=True)
class TonLiteserver:
    """Represents a TON lite server endpoint."""

    host: str
    port: int
    public_key_base64: str
    _address: ipaddress.IPv4Address = field(init=False, repr=False)

    def __post_init__(self) -> None:
        address = _normalise_ipv4(self.host)
        object.__setattr__(self, "host", str(address))
        object.__setattr__(self, "port", _normalise_port(self.port))
        object.__setattr__(
            self,
            "public_key_base64",
            _normalise_public_key(self.public_key_base64),
        )
        object.__setattr__(self, "_address", address)

    @property
    def address(self) -> ipaddress.IPv4Address:
        return self._address

    def to_tonlib_dict(self) -> dict[str, object]:
        """Serialise the lite server into the structure expected by tonlib."""

        return {
            "ip": _ipv4_to_signed_int(self.address),
            "port": self.port,
            "id": {
                "@type": "pub.ed25519",
                "key": self.public_key_base64,
            },
        }


_DEFAULT_PUBLIC_KEY = "Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0="

TON_MAINNET_LITESERVERS: tuple[TonLiteserver, ...] = (
    TonLiteserver(host="31.57.199.1", port=5053, public_key_base64=_DEFAULT_PUBLIC_KEY),
    TonLiteserver(host="163.5.62.1", port=5053, public_key_base64=_DEFAULT_PUBLIC_KEY),
)


def build_tonlib_liteservers(
    liteservers: Sequence[TonLiteserver] | None = None,
) -> list[dict[str, object]]:
    """Create a deduplicated tonlib-ready lite server list.

    Args:
        liteservers: Custom lite servers to serialise. Defaults to the curated
            mainnet set.

    Returns:
        A list of dictionaries suitable for tonlib configuration files.
    """

    servers: Iterable[TonLiteserver]
    if liteservers is None:
        servers = TON_MAINNET_LITESERVERS
    else:
        servers = tuple(liteservers)
        if not servers:
            raise ValueError("at least one lite server must be provided")

    serialised: list[dict[str, object]] = []
    seen: set[tuple[int, int, str]] = set()
    for server in servers:
        if not isinstance(server, TonLiteserver):  # pragma: no cover - defensive
            raise TypeError("liteservers must be TonLiteserver instances")
        record = server.to_tonlib_dict()
        identity = (record["ip"], record["port"], server.public_key_base64)
        if identity in seen:
            continue
        seen.add(identity)
        serialised.append(record)
    return serialised
