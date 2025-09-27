"""Configuration helpers for CDN operations."""

from __future__ import annotations

from dataclasses import dataclass
import os
from typing import Mapping

from .purge import parse_purge_paths
from .spaces import resolve_spaces_endpoint


def _read_env(source: Mapping[str, str], key: str) -> str | None:
    value = source.get(key)
    if value is None:
        return None
    text = str(value).strip()
    return text or None


@dataclass(slots=True, frozen=True)
class CDNConfig:
    """Normalised configuration required to interact with the CDN."""

    bucket: str
    region: str
    access_key: str
    secret_key: str
    endpoint: str
    endpoint_id: str | None = None
    purge_paths: tuple[str, ...] = ()
    digitalocean_token: str | None = None
    user_agent: str = "dynamic-cdn/1.0"

    @classmethod
    def from_env(cls, env: Mapping[str, str] | None = None) -> "CDNConfig":
        source: Mapping[str, str] = env or os.environ

        bucket = _read_env(source, "CDN_BUCKET")
        access_key = _read_env(source, "CDN_ACCESS_KEY")
        secret_key = _read_env(source, "CDN_SECRET_KEY")

        if not bucket or not access_key or not secret_key:
            raise ValueError(
                "CDN_BUCKET, CDN_ACCESS_KEY, and CDN_SECRET_KEY must be provided to configure CDN uploads."
            )

        region = _read_env(source, "CDN_REGION") or "nyc3"
        endpoint = resolve_spaces_endpoint(
            _read_env(source, "CDN_ENDPOINT"), region=region, bucket=bucket
        )

        purge_paths = parse_purge_paths(_read_env(source, "CDN_PURGE_PATHS"))
        token = _read_env(source, "DIGITALOCEAN_TOKEN")
        endpoint_id = _read_env(source, "CDN_ENDPOINT_ID")

        return cls(
            bucket=bucket,
            region=region,
            access_key=access_key,
            secret_key=secret_key,
            endpoint=endpoint,
            endpoint_id=endpoint_id,
            purge_paths=purge_paths,
            digitalocean_token=token,
        )

    @property
    def has_purge_credentials(self) -> bool:
        return bool(self.digitalocean_token and self.endpoint_id)

    @property
    def should_purge(self) -> bool:
        return self.has_purge_credentials and bool(self.purge_paths)


__all__ = ["CDNConfig"]
