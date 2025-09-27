from __future__ import annotations

import io
import json
from pathlib import Path
from typing import Any
from urllib import error as urllib_error

import pytest

from dynamic_cdn import (
    CDNConfig,
    CDNCachePurgeError,
    CDNUploadError,
    DynamicCDNUploader,
    build_asset_manifest,
    parse_purge_paths,
    purge_cdn_cache,
    resolve_spaces_endpoint,
)


def test_resolve_spaces_endpoint_warns_and_falls_back(monkeypatch: pytest.MonkeyPatch) -> None:
    warnings: list[str] = []

    monkeypatch.setattr("warnings.warn", lambda msg, *args, **kwargs: warnings.append(str(msg)))

    endpoint = resolve_spaces_endpoint("https://example.com/cdn", region="nyc3", bucket="static")

    assert endpoint == "https://nyc3.digitaloceanspaces.com"
    assert warnings, "expected at least one warning when falling back"


def test_build_manifest(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<html></html>")
    (tmp_path / "app.1234abcd.js").write_text("console.log('ok');")

    manifest = build_asset_manifest(tmp_path)

    keys = [asset.key for asset in manifest]
    assert keys == ["app.1234abcd.js", "index.html"]

    html_asset = next(asset for asset in manifest if asset.key == "index.html")
    assert html_asset.content_type.startswith("text/html")
    assert html_asset.cache_control == "public, max-age=0, must-revalidate"

    js_asset = next(asset for asset in manifest if asset.key.endswith(".js"))
    assert js_asset.cache_control == "public, max-age=31536000, immutable"


def test_dynamic_cdn_uploader_success(tmp_path: Path) -> None:
    (tmp_path / "asset.txt").write_text("payload")
    manifest = build_asset_manifest(tmp_path)
    config = CDNConfig(
        bucket="my-space",
        region="nyc3",
        access_key="key",
        secret_key="secret",
        endpoint="https://nyc3.digitaloceanspaces.com",
    )

    class FakeClient:
        def __init__(self) -> None:
            self.calls: list[dict[str, Any]] = []

        def put_object(self, **kwargs: Any) -> dict[str, Any]:
            self.calls.append(kwargs)
            return {"ResponseMetadata": {"HTTPStatusCode": 200}}

    client = FakeClient()
    uploader = DynamicCDNUploader(client, config)

    reports = uploader.upload(manifest)

    assert isinstance(reports, tuple)
    assert len(reports) == 1
    report = reports[0]
    assert report.success is True
    assert report.response_metadata == {"HTTPStatusCode": 200}
    assert client.calls[0]["Bucket"] == "my-space"


def test_dynamic_cdn_uploader_failure(tmp_path: Path) -> None:
    (tmp_path / "asset.txt").write_text("payload")
    manifest = build_asset_manifest(tmp_path)
    config = CDNConfig(
        bucket="my-space",
        region="nyc3",
        access_key="key",
        secret_key="secret",
        endpoint="https://nyc3.digitaloceanspaces.com",
    )

    class FailingClient:
        def put_object(self, **kwargs: Any) -> dict[str, Any]:
            raise RuntimeError("boom")

    uploader = DynamicCDNUploader(FailingClient(), config)

    with pytest.raises(CDNUploadError):
        uploader.upload(manifest, fail_fast=True)

    reports = uploader.upload(manifest, fail_fast=False)
    assert reports[0].success is False
    assert reports[0].error == "boom"


def test_parse_purge_paths() -> None:
    assert parse_purge_paths("/index.html,asset.js, *") == ("/index.html", "/asset.js", "*")


def test_purge_cdn_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    class FakeResponse:
        status = 204

        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, exc_type, exc, tb) -> None:
            return None

    def fake_urlopen(req: Any, timeout: float) -> FakeResponse:
        captured["url"] = req.full_url
        captured["body"] = json.loads(req.data.decode("utf-8"))
        captured["headers"] = dict(req.headers)
        assert timeout == 30.0
        return FakeResponse()

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    purge_cdn_cache("endpoint", "token", ["/index.html"])

    assert captured["url"].endswith("/endpoint/cache")
    assert captured["body"] == {"files": ["/index.html"]}
    assert captured["headers"]["Authorization"] == "Bearer token"


def test_purge_cdn_cache_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(req: Any, timeout: float) -> None:
        fp = io.BytesIO(json.dumps({"message": "bad"}).encode("utf-8"))
        raise urllib_error.HTTPError(req.full_url, 500, "error", {}, fp)

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)

    with pytest.raises(CDNCachePurgeError) as excinfo:
        purge_cdn_cache("endpoint", "token", ["/index.html"])

    assert "bad" in str(excinfo.value)
