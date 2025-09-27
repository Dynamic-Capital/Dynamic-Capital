"""Helpers for DigitalOcean Spaces endpoints."""

from __future__ import annotations

from urllib.parse import urlparse
import warnings


def resolve_spaces_endpoint(
    endpoint: str | None,
    *,
    region: str,
    bucket: str | None = None,
) -> str:
    """Normalise a Spaces API endpoint suitable for uploads.

    Follows the same heuristics as the JavaScript upload helper to guard
    against accidentally targeting a CDN vanity domain instead of the S3 API.
    """

    fallback = f"https://{region}.digitaloceanspaces.com"
    if endpoint is None:
        return fallback

    normalized = endpoint.strip()
    if not normalized:
        return fallback

    if not normalized.lower().startswith(("http://", "https://")):
        normalized = f"https://{normalized}"

    try:
        parsed = urlparse(normalized)
    except ValueError:
        warnings.warn(
            "CDN_ENDPOINT is not a valid URL. Falling back to the regional Spaces endpoint.",
            RuntimeWarning,
            stacklevel=2,
        )
        return fallback

    if parsed.path and parsed.path != "/":
        warnings.warn(
            "Ignoring path component on CDN_ENDPOINT. Using only the origin for uploads.",
            RuntimeWarning,
            stacklevel=2,
        )

    host = (parsed.hostname or "").lower()
    if "digitaloceanspaces.com" not in host:
        warnings.warn(
            "CDN_ENDPOINT does not reference the DigitalOcean Spaces API. Using regional endpoint instead.",
            RuntimeWarning,
            stacklevel=2,
        )
        return fallback

    if bucket and host.startswith(f"{bucket.lower()}."):
        warnings.warn(
            "CDN_ENDPOINT references the bucket domain. Falling back to the regional endpoint to avoid signed URL issues.",
            RuntimeWarning,
            stacklevel=2,
        )
        return fallback

    scheme = parsed.scheme or "https"
    if parsed.port:
        return f"{scheme}://{host}:{parsed.port}"
    return f"{scheme}://{host}"


__all__ = ["resolve_spaces_endpoint"]
