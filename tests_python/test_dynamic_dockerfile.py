from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from dynamic_dockerfile import (  # noqa: E402  - imported after sys.path mutation
    DockerfileContext,
    DynamicDockerfileEngine,
    FeatureRecipe,
    StageInstruction,
)


def test_dynamic_dockerfile_multistage_feature_application() -> None:
    engine = DynamicDockerfileEngine()
    engine.register_feature(
        "telemetry",
        FeatureRecipe(
            description="Adds telemetry runtime instrumentation.",
            builder=(
                StageInstruction.run(
                    ["pip install --no-cache-dir opentelemetry-sdk"],
                    comment="Telemetry libraries",
                ),
            ),
            runtime=(
                StageInstruction.env(
                    {"OTEL_EXPORTER_OTLP_ENDPOINT": "https://telemetry.example.com"}
                ),
                StageInstruction.label({"com.dynamic.telemetry": "enabled"}),
            ),
            metadata={"tier": "gold"},
        ),
    )

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
    assert "pip install --no-cache-dir fastapi uvicorn[standard]" in artifact.content
    assert "ENV PYTHONUNBUFFERED=1" in artifact.content
    assert "LABEL com.dynamic.telemetry=enabled" in artifact.content
    assert "ENTRYPOINT [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\"]" in artifact.content
    assert artifact.metadata["features"]["telemetry"]["description"] == (
        "Adds telemetry runtime instrumentation."
    )
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

    assert "FROM node:20-alpine" in artifact.content
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


def test_register_feature_requires_override_for_duplicates() -> None:
    engine = DynamicDockerfileEngine()
    recipe = FeatureRecipe(description="Adds linting support.")

    engine.register_feature("lint", recipe)

    with pytest.raises(ValueError):
        engine.register_feature("lint", recipe)

    engine.register_feature("lint", recipe, override=True)
    assert "lint" in engine.available_features
