"""Encryption engine with rotating keys and contextual integrity checks."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from secrets import token_bytes
from typing import Dict, Iterable, Mapping, MutableMapping, Optional

import hashlib
import hmac

__all__ = [
    "KeyMaterial",
    "EncryptionRequest",
    "EncryptionEnvelope",
    "DynamicEncryptionEngine",
]


# ---------------------------------------------------------------------------
# helper utilities


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalise_key_id(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("key_id must not be empty")
    return cleaned


def _coerce_bytes(value: bytes | str | bytearray | memoryview, *, name: str) -> bytes:
    if isinstance(value, bytes):
        return value
    if isinstance(value, str):
        return value.encode("utf-8")
    if isinstance(value, (bytearray, memoryview)):
        return bytes(value)
    raise TypeError(f"{name} must be bytes-like or str")


def _derive_keystream(secret: bytes, nonce: bytes, length: int) -> bytes:
    if length <= 0:
        return b""
    blocks: list[bytes] = []
    counter = 0
    while len(b"".join(blocks)) < length:
        counter_bytes = counter.to_bytes(8, "big", signed=False)
        digest = hashlib.blake2b(
            digest_size=64,
            key=secret,
            person=b"dynamic-encryption",
        )
        digest.update(nonce)
        digest.update(counter_bytes)
        blocks.append(digest.digest())
        counter += 1
    keystream = b"".join(blocks)
    return keystream[:length]


def _xor_bytes(data: bytes, keystream: bytes) -> bytes:
    return bytes(b ^ k for b, k in zip(data, keystream))


def _compute_tag(secret: bytes, *, nonce: bytes, ciphertext: bytes, associated_data: bytes) -> bytes:
    mac = hmac.new(secret, digestmod="sha256")
    mac.update(len(associated_data).to_bytes(4, "big"))
    mac.update(associated_data)
    mac.update(nonce)
    mac.update(ciphertext)
    return mac.digest()


# ---------------------------------------------------------------------------
# dataclasses


@dataclass(slots=True)
class KeyMaterial:
    """Represents a single symmetric key and its lifecycle controls."""

    key_id: str
    secret: bytes
    created_at: datetime = field(default_factory=_utcnow)
    expires_at: Optional[datetime] = None

    def __post_init__(self) -> None:
        self.key_id = _normalise_key_id(self.key_id)
        self.secret = _coerce_bytes(self.secret, name="secret")
        if not self.secret:
            raise ValueError("secret must not be empty")
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)
        if self.expires_at and self.expires_at.tzinfo is None:
            self.expires_at = self.expires_at.replace(tzinfo=timezone.utc)
        elif self.expires_at:
            self.expires_at = self.expires_at.astimezone(timezone.utc)

    def is_expired(self, *, moment: Optional[datetime] = None) -> bool:
        if self.expires_at is None:
            return False
        checkpoint = moment or _utcnow()
        if checkpoint.tzinfo is None:
            checkpoint = checkpoint.replace(tzinfo=timezone.utc)
        else:
            checkpoint = checkpoint.astimezone(timezone.utc)
        return checkpoint >= self.expires_at

    def remaining_lifetime(self, *, moment: Optional[datetime] = None) -> Optional[timedelta]:
        if self.expires_at is None:
            return None
        checkpoint = moment or _utcnow()
        return self.expires_at - checkpoint


@dataclass(slots=True)
class EncryptionRequest:
    """Normalised inputs required for encryption."""

    payload: bytes
    associated_data: bytes = b""
    nonce: Optional[bytes] = None

    def __post_init__(self) -> None:
        self.payload = _coerce_bytes(self.payload, name="payload")
        self.associated_data = _coerce_bytes(self.associated_data, name="associated_data")
        if self.nonce is not None:
            self.nonce = _coerce_bytes(self.nonce, name="nonce")
            if len(self.nonce) < 12:
                raise ValueError("nonce must be at least 12 bytes to ensure uniqueness")


@dataclass(slots=True)
class EncryptionEnvelope:
    """Encrypted payload packaged with metadata for verification."""

    key_id: str
    nonce: bytes
    ciphertext: bytes
    tag: bytes
    created_at: datetime = field(default_factory=_utcnow)

    def __post_init__(self) -> None:
        self.key_id = _normalise_key_id(self.key_id)
        self.nonce = _coerce_bytes(self.nonce, name="nonce")
        self.ciphertext = _coerce_bytes(self.ciphertext, name="ciphertext")
        self.tag = _coerce_bytes(self.tag, name="tag")
        if self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        else:
            self.created_at = self.created_at.astimezone(timezone.utc)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "key_id": self.key_id,
            "nonce": self.nonce,
            "ciphertext": self.ciphertext,
            "tag": self.tag,
            "created_at": self.created_at,
        }


# ---------------------------------------------------------------------------
# encryption engine


class DynamicEncryptionEngine:
    """Provides authenticated encryption with dynamic key rotation support."""

    def __init__(self, *, keys: Optional[Iterable[KeyMaterial]] = None, default_key_id: Optional[str] = None) -> None:
        self._keys: Dict[str, KeyMaterial] = {}
        if keys:
            for key in keys:
                self.register_key(key)
        self._default_key_id = default_key_id or next(iter(self._keys), None)

    @property
    def default_key_id(self) -> Optional[str]:
        return self._default_key_id

    def register_key(self, key_material: KeyMaterial, *, make_default: bool | None = None) -> None:
        self._keys[key_material.key_id] = key_material
        if make_default or (make_default is None and self._default_key_id is None):
            self._default_key_id = key_material.key_id

    def purge_expired(self, *, moment: Optional[datetime] = None) -> None:
        for key_id in list(self._keys):
            key = self._keys[key_id]
            if key.is_expired(moment=moment):
                del self._keys[key_id]
                if self._default_key_id == key_id:
                    self._default_key_id = next(iter(self._keys), None)

    def _get_key(self, key_id: Optional[str]) -> KeyMaterial:
        resolved_id = key_id or self._default_key_id
        if resolved_id is None:
            raise LookupError("no default key registered")
        try:
            key = self._keys[resolved_id]
        except KeyError as exc:
            raise LookupError(f"unknown key_id: {resolved_id}") from exc
        if key.is_expired():
            raise LookupError(f"key_id {resolved_id} has expired")
        return key

    def encrypt(
        self,
        payload: bytes | str,
        *,
        key_id: Optional[str] = None,
        associated_data: bytes | str | bytearray | memoryview = b"",
        nonce: Optional[bytes | str | bytearray | memoryview] = None,
    ) -> EncryptionEnvelope:
        key = self._get_key(key_id)
        request = EncryptionRequest(
            payload=payload,
            associated_data=associated_data,
            nonce=None if nonce is None else _coerce_bytes(nonce, name="nonce"),
        )
        nonce_bytes = request.nonce or token_bytes(24)
        keystream = _derive_keystream(key.secret, nonce_bytes, len(request.payload))
        ciphertext = _xor_bytes(request.payload, keystream)
        tag = _compute_tag(
            key.secret,
            nonce=nonce_bytes,
            ciphertext=ciphertext,
            associated_data=request.associated_data,
        )
        return EncryptionEnvelope(
            key_id=key.key_id,
            nonce=nonce_bytes,
            ciphertext=ciphertext,
            tag=tag,
        )

    def decrypt(
        self,
        envelope: EncryptionEnvelope,
        *,
        associated_data: bytes | str | bytearray | memoryview = b"",
    ) -> bytes:
        key = self._get_key(envelope.key_id)
        associated = _coerce_bytes(associated_data, name="associated_data")
        expected_tag = _compute_tag(
            key.secret,
            nonce=envelope.nonce,
            ciphertext=envelope.ciphertext,
            associated_data=associated,
        )
        if not hmac.compare_digest(expected_tag, envelope.tag):
            raise ValueError("authentication failed for ciphertext")
        keystream = _derive_keystream(key.secret, envelope.nonce, len(envelope.ciphertext))
        return _xor_bytes(envelope.ciphertext, keystream)

    def decrypt_text(
        self,
        envelope: EncryptionEnvelope,
        *,
        associated_data: bytes | str | bytearray | memoryview = b"",
        encoding: str = "utf-8",
    ) -> str:
        plaintext = self.decrypt(envelope, associated_data=associated_data)
        return plaintext.decode(encoding)

    def export_state(self) -> Mapping[str, object]:
        return {
            "default_key_id": self._default_key_id,
            "keys": {
                key_id: {
                    "created_at": key.created_at,
                    "expires_at": key.expires_at,
                    "has_secret": bool(key.secret),
                }
                for key_id, key in self._keys.items()
            },
        }
