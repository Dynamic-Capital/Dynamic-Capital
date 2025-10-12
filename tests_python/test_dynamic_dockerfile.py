from pathlib import Path
import subprocess
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_dockerfile import (  # noqa: E402  - imported after sys.path mutation
    DockerfileContext,
    DynamicDockerfileEngine,
    FeatureRecipe,
)


def test_dynamic_dockerfile_multistage_feature_application() -> None:
    engine = DynamicDockerfileEngine()
    assert "telemetry" in engine.available_features

    context = DockerfileContext(
        runtime="python",
        workdir="/opt/app",
        multistage=True,
        system_packages=("curl", "git"),
        application_packages=("fastapi", "uvicorn[standard]"),
        environment={"PYTHONUNBUFFERED": "1"},
        entrypoint=("uvicorn", "main:app", "--host", "0.0.0.0"),
        features=("telemetry",),
    )

    artifact = engine.compose(context)

    assert "FROM python:3.11-slim AS builder" in artifact.content
    assert "RUN apt-get update \\\n" in artifact.content
    assert "pip install --no-cache-dir opentelemetry-api opentelemetry-sdk" in artifact.content
    assert "npm install --global @opentelemetry/api @opentelemetry/sdk-node" in artifact.content
    assert "pip install --no-cache-dir fastapi uvicorn[standard]" in artifact.content
    assert "ENV PYTHONUNBUFFERED=1" in artifact.content
    assert "ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317" in artifact.content
    assert "OTEL_EXPORTER_OTLP_PROTOCOL=grpc" in artifact.content
    assert "OTEL_SERVICE_NAME=dynamic-service" in artifact.content
    assert "OTEL_METRIC_EXPORT_INTERVAL=60000" in artifact.content
    assert "LABEL com.dynamic.telemetry=enabled" in artifact.content
    assert "com.dynamic.telemetry.stack=opentelemetry" in artifact.content
    assert "ENTRYPOINT [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\"]" in artifact.content
    telemetry_metadata = artifact.metadata["features"]["telemetry"]
    assert telemetry_metadata["description"] == (
        "Enables OpenTelemetry instrumentation and default exporters."
    )
    assert telemetry_metadata["category"] == "observability"
    assert telemetry_metadata["default_endpoint"] == "http://otel-collector:4317"
    assert telemetry_metadata["builder_instructions"] == 1
    assert telemetry_metadata["runtime_instructions"] == 2
    assert telemetry_metadata["environment"] == {
        "OTEL_EXPORTER_OTLP_ENDPOINT": "http://otel-collector:4317",
        "OTEL_EXPORTER_OTLP_PROTOCOL": "grpc",
        "OTEL_SERVICE_NAME": "dynamic-service",
        "OTEL_METRIC_EXPORT_INTERVAL": "60000",
    }
    assert telemetry_metadata["packages"] == {
        "python": (
            "opentelemetry-api",
            "opentelemetry-sdk",
            "opentelemetry-exporter-otlp",
            "opentelemetry-instrumentation",
        ),
        "node": (
            "@opentelemetry/api",
            "@opentelemetry/sdk-node",
            "@opentelemetry/exporter-trace-otlp-proto",
            "@opentelemetry/exporter-metrics-otlp-proto",
        ),
    }
    telemetry_feature_description = engine.describe_feature("telemetry")
    assert telemetry_feature_description["environment"] == telemetry_metadata["environment"]
    assert telemetry_feature_description["packages"] == telemetry_metadata["packages"]
    assert "telemetry" in engine.describe_features()
    assert artifact.metadata["context"]["features"] == ["telemetry"]
    assert artifact.metadata["stages"][0]["name"] == "builder"
    assert artifact.metadata["stages"][1]["name"] is None


def test_dynamic_dockerfile_single_stage_node() -> None:
    engine = DynamicDockerfileEngine()

    context = DockerfileContext(
        runtime="node",
        multistage=False,
        workdir="/srv/service",
        application_packages=("pnpm",),
        cmd=("node", "server.js"),
    )

    artifact = engine.compose(context)

    expected_runtime_image = DynamicDockerfileEngine.DEFAULT_BASE_IMAGES["node"][1]
    assert f"FROM {expected_runtime_image}" in artifact.content
    assert "COPY . ." in artifact.content
    assert "RUN npm install --global pnpm" in artifact.content
    assert "CMD [\"node\", \"server.js\"]" in artifact.content
    assert artifact.metadata["context"]["multistage"] is False
    assert artifact.metadata["stages"][0]["name"] is None


def test_dynamic_dockerfile_unknown_feature() -> None:
    engine = DynamicDockerfileEngine()
    context = DockerfileContext(runtime="python", features=("unknown",))

    with pytest.raises(KeyError):
        engine.compose(context)

    with pytest.raises(KeyError):
        engine.describe_feature("unknown")


def test_register_feature_requires_override_for_duplicates() -> None:
    engine = DynamicDockerfileEngine()
    recipe = FeatureRecipe(description="Adds linting support.")

    engine.register_feature("lint", recipe)

    with pytest.raises(ValueError):
        engine.register_feature("lint", recipe)

    engine.register_feature("lint", recipe, override=True)
    assert "lint" in engine.available_features


def test_dockerfile_artifact_build_invokes_cli(monkeypatch) -> None:
    engine = DynamicDockerfileEngine()
    context = DockerfileContext(runtime="python", multistage=False)
    artifact = engine.compose(context)

    captured: dict[str, object] = {}

    def fake_run(cmd, *, input=None, check=False):
        captured["cmd"] = cmd
        captured["input"] = input
        captured["check"] = check
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = artifact.build_image(
        "dynamic:test",
        context_dir="/tmp/project",
        docker_cli="nerdctl",
        build_args={"FOO": "bar"},
        labels={"com.example": "enabled"},
        additional_flags=["--no-cache"],
    )

    assert isinstance(result, subprocess.CompletedProcess)
    assert captured["cmd"] == [
        "nerdctl",
        "build",
        "--tag",
        "dynamic:test",
        "--build-arg",
        "FOO=bar",
        "--label",
        "com.example=enabled",
        "--no-cache",
        "-f",
        "-",
        "/tmp/project",
    ]
    assert captured["input"] == artifact.content.encode("utf-8")
    assert captured["check"] is True
