"""Client abstractions for uploading assets to the CDN."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Protocol, Sequence

from .assets import CDNAsset
from .config import CDNConfig


class _S3CompatibleClient(Protocol):
    """Protocol describing the methods used from an S3 compatible client."""

    def put_object(self, **kwargs: object) -> Mapping[str, object]:  # pragma: no cover - protocol
        ...


@dataclass(slots=True)
class UploadReport:
    """Outcome for a single uploaded asset."""

    asset: CDNAsset
    success: bool
    response_metadata: Mapping[str, object] | None = None
    error: str | None = None


class CDNUploadError(RuntimeError):
    """Raised when uploading an asset to the CDN fails."""

    def __init__(self, asset: CDNAsset, error: Exception) -> None:
        super().__init__(f"Failed to upload {asset.key}: {error}")
        self.asset = asset
        self.__cause__ = error


class DynamicCDNUploader:
    """Uploads assets to an S3-compatible CDN such as DigitalOcean Spaces."""

    def __init__(self, client: _S3CompatibleClient, config: CDNConfig) -> None:
        self._client = client
        self._config = config

    @property
    def bucket(self) -> str:
        return self._config.bucket

    def upload(
        self,
        assets: Sequence[CDNAsset],
        *,
        fail_fast: bool = True,
    ) -> tuple[UploadReport, ...]:
        """Upload all assets to the configured CDN bucket."""

        reports: list[UploadReport] = []
        for asset in assets:
            try:
                response = self._client.put_object(
                    Bucket=self.bucket,
                    Key=asset.key,
                    Body=asset.path.read_bytes(),
                    ACL="public-read",
                    ContentType=asset.content_type,
                    CacheControl=asset.cache_control,
                )
            except Exception as exc:  # pragma: no cover - surface error paths
                reports.append(
                    UploadReport(asset=asset, success=False, response_metadata=None, error=str(exc))
                )
                if fail_fast:
                    raise CDNUploadError(asset, exc) from exc
            else:
                metadata = response.get("ResponseMetadata") if isinstance(response, Mapping) else None
                reports.append(UploadReport(asset=asset, success=True, response_metadata=metadata))
        return tuple(reports)


__all__ = ["DynamicCDNUploader", "UploadReport", "CDNUploadError"]
