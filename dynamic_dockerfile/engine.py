"""Dynamic Dockerfile engine with feature-aware composition."""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from typing import Dict, Iterable, Mapping, MutableMapping, Sequence, Tuple

__all__ = [
    "StageInstruction",
    "DockerStageBlueprint",
    "FeatureRecipe",
    "DockerfileContext",
    "DockerfileArtifact",
    "DynamicDockerfileEngine",
]


# ---------------------------------------------------------------------------
# normalisation helpers


def _normalise_runtime(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("runtime must not be empty")
    return cleaned


def _normalise_image(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("image reference must not be empty")
    return cleaned


def _normalise_image_pair(value: str | Sequence[str]) -> Tuple[str, str]:
    if isinstance(value, str):
        image = _normalise_image(value)
        return (image, image)
    images = tuple(_normalise_image(item) for item in value)
    if not images:
        raise ValueError("image mapping must not be empty")
    if len(images) == 1:
        return (images[0], images[0])
    if len(images) == 2:
        return (images[0], images[1])
    raise ValueError("image mapping must contain at most two items")


def _normalise_path(value: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("path must not be empty")
    return cleaned


def _normalise_unique(values: Sequence[str] | None, *, transform=None) -> Tuple[str, ...]:
    if not values:
        return ()
    ordered: list[str] = []
    seen: set[str] = set()
    for item in values:
        cleaned = item.strip()
        if not cleaned:
            continue
        canonical = transform(cleaned) if transform else cleaned
        if canonical in seen:
            continue
        seen.add(canonical)
        ordered.append(canonical if transform else cleaned)
    return tuple(ordered)


def _normalise_feature_name(value: str) -> str:
    cleaned = value.strip().lower()
    if not cleaned:
        raise ValueError("feature name must not be empty")
    return cleaned


def _normalise_exec(arguments: Sequence[str] | None) -> Tuple[str, ...] | None:
    if arguments is None:
        return None
    ordered = _normalise_unique(arguments)
    if not ordered:
        return None
    return ordered


def _normalise_environment(values: Mapping[str, str] | None) -> Tuple[Tuple[str, str], ...]:
    if not values:
        return ()
    pairs: list[Tuple[str, str]] = []
    for key, value in values.items():
        cleaned_key = key.strip()
        if not cleaned_key:
            raise ValueError("environment variable name must not be empty")
        pairs.append((cleaned_key, str(value)))
    return tuple(pairs)


def _normalise_artifacts(
    artifacts: Sequence[tuple[str, str]] | None,
    *,
    default_path: str,
) -> Tuple[Tuple[str, str], ...]:
    if not artifacts:
        return ((_normalise_path(default_path), _normalise_path(default_path)),)
    normalised: list[Tuple[str, str]] = []
    for source, destination in artifacts:
        normalised.append((_normalise_path(source), _normalise_path(destination)))
    return tuple(normalised)


def _format_exec(arguments: Sequence[str]) -> str:
    if not arguments:
        raise ValueError("exec form requires at least one argument")
    return json.dumps(list(arguments))


# ---------------------------------------------------------------------------
# dataclasses representing Dockerfile primitives


@dataclass(slots=True, frozen=True)
class StageInstruction:
    """Represents a single Dockerfile instruction."""

    keyword: str
    arguments: Tuple[str, ...] = field(default_factory=tuple)
    multiline: bool = False
    joiner: str = "&&"
    comment: str | None = None

    def __post_init__(self) -> None:
        keyword = self.keyword.strip().upper()
        if not keyword:
            raise ValueError("instruction keyword must not be empty")
        object.__setattr__(self, "keyword", keyword)
        object.__setattr__(self, "arguments", tuple(self.arguments))

    def render(self) -> str:
        if self.multiline and self.arguments:
            first, *rest = self.arguments
            lines = [first]
            for arg in rest:
                prefix = f"{self.joiner.strip()} " if self.joiner.strip() else ""
                lines.append(f"{prefix}{arg}")
            body = " \\\n    ".join(lines)
        else:
            body = " ".join(self.arguments)
        statement = f"{self.keyword} {body}".rstrip()
        if self.comment:
            statement = f"{statement}  # {self.comment.strip()}"
        return statement

    @classmethod
    def run(cls, commands: Sequence[str], *, comment: str | None = None) -> "StageInstruction":
        steps = _normalise_unique(commands)
        if not steps:
            raise ValueError("RUN instruction requires commands")
        multiline = len(steps) > 1
        return cls("RUN", tuple(steps), multiline=multiline, joiner="&&", comment=comment)

    @classmethod
    def copy(
        cls,
        source: str,
        destination: str,
        *,
        from_stage: str | None = None,
        chown: str | None = None,
        comment: str | None = None,
    ) -> "StageInstruction":
        args: list[str] = []
        if from_stage:
            args.append(f"--from={from_stage}")
        if chown:
            args.append(f"--chown={chown}")
        args.append(_normalise_path(source))
        args.append(_normalise_path(destination))
        return cls("COPY", tuple(args), comment=comment)

    @classmethod
    def workdir(cls, path: str) -> "StageInstruction":
        return cls("WORKDIR", (_normalise_path(path),))

    @classmethod
    def env(cls, pairs: Mapping[str, str] | Sequence[tuple[str, str]]) -> "StageInstruction":
        if isinstance(pairs, Mapping):
            entries = list(pairs.items())
        else:
            entries = list(pairs)
        if not entries:
            raise ValueError("ENV instruction requires values")
        args: list[str] = []
        for key, value in entries:
            cleaned_key = key.strip()
            if not cleaned_key:
                raise ValueError("environment variable name must not be empty")
            args.append(f"{cleaned_key}={str(value)}")
        return cls("ENV", tuple(args))

    @classmethod
    def label(cls, pairs: Mapping[str, str] | Sequence[tuple[str, str]]) -> "StageInstruction":
        if isinstance(pairs, Mapping):
            entries = list(pairs.items())
        else:
            entries = list(pairs)
        if not entries:
            raise ValueError("LABEL instruction requires values")
        args: list[str] = []
        for key, value in entries:
            cleaned_key = key.strip()
            if not cleaned_key:
                raise ValueError("label key must not be empty")
            args.append(f"{cleaned_key}={str(value)}")
        return cls("LABEL", tuple(args))

    @classmethod
    def entrypoint(cls, arguments: Sequence[str]) -> "StageInstruction":
        exec_args = _normalise_exec(arguments)
        if not exec_args:
            raise ValueError("ENTRYPOINT requires at least one argument")
        return cls("ENTRYPOINT", (_format_exec(exec_args),))

    @classmethod
    def cmd(cls, arguments: Sequence[str]) -> "StageInstruction":
        exec_args = _normalise_exec(arguments)
        if not exec_args:
            raise ValueError("CMD requires at least one argument")
        return cls("CMD", (_format_exec(exec_args),))

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "keyword": self.keyword,
            "arguments": list(self.arguments),
            "multiline": self.multiline,
            "comment": self.comment,
        }


@dataclass(slots=True)
class DockerStageBlueprint:
    """Represents a stage within a Dockerfile."""

    base_image: str
    name: str | None = None
    summary: str | None = None
    instructions: list[StageInstruction] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.base_image = _normalise_image(self.base_image)
        self.name = self.name.strip() or None if self.name else None
        if self.summary:
            self.summary = self.summary.strip() or None

    def add_instruction(self, instruction: StageInstruction) -> None:
        self.instructions.append(instruction)

    def extend(self, instructions: Iterable[StageInstruction]) -> None:
        for instruction in instructions:
            self.add_instruction(instruction)

    def render(self) -> str:
        header = f"FROM {self.base_image}"
        if self.name:
            header += f" AS {self.name}"
        lines = [header]
        for instruction in self.instructions:
            lines.append(instruction.render())
        return "\n".join(lines)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "base_image": self.base_image,
            "name": self.name,
            "summary": self.summary,
            "instruction_count": len(self.instructions),
        }


@dataclass(slots=True, frozen=True)
class FeatureRecipe:
    """Describes optional feature instructions injected into the Dockerfile."""

    description: str
    builder: Tuple[StageInstruction, ...] = field(default_factory=tuple)
    runtime: Tuple[StageInstruction, ...] = field(default_factory=tuple)
    metadata: Mapping[str, object] | None = None

    def __post_init__(self) -> None:
        if not self.description.strip():
            raise ValueError("feature description must not be empty")
        object.__setattr__(self, "description", self.description.strip())
        object.__setattr__(self, "builder", tuple(self.builder))
        object.__setattr__(self, "runtime", tuple(self.runtime))

    def describe(self) -> MutableMapping[str, object]:
        payload: MutableMapping[str, object] = {"description": self.description}
        if self.metadata:
            payload.update(dict(self.metadata))
        payload["builder_instructions"] = len(self.builder)
        payload["runtime_instructions"] = len(self.runtime)
        return payload


@dataclass(slots=True)
class DockerfileContext:
    """Runtime context for Dockerfile composition."""

    runtime: str
    workdir: str = "/workspace/app"
    multistage: bool = True
    builder_image: str | None = None
    runtime_image: str | None = None
    system_packages: Tuple[str, ...] | Sequence[str] = ()
    application_packages: Tuple[str, ...] | Sequence[str] = ()
    environment: Mapping[str, str] | None = None
    entrypoint: Sequence[str] | None = None
    cmd: Sequence[str] | None = None
    artifacts: Sequence[tuple[str, str]] | None = None
    features: Sequence[str] = ()

    def __post_init__(self) -> None:
        self.runtime = _normalise_runtime(self.runtime)
        self.workdir = _normalise_path(self.workdir)
        self.system_packages = _normalise_unique(self.system_packages)
        self.application_packages = _normalise_unique(self.application_packages)
        self.environment = _normalise_environment(self.environment)
        self.entrypoint = _normalise_exec(self.entrypoint)
        self.cmd = _normalise_exec(self.cmd)
        self.artifacts = _normalise_artifacts(self.artifacts, default_path=self.workdir)
        self.features = _normalise_unique(self.features, transform=lambda value: value.lower())
        if self.builder_image:
            self.builder_image = _normalise_image(self.builder_image)
        if self.runtime_image:
            self.runtime_image = _normalise_image(self.runtime_image)

    def as_dict(self) -> MutableMapping[str, object]:
        return {
            "runtime": self.runtime,
            "workdir": self.workdir,
            "multistage": self.multistage,
            "builder_image": self.builder_image,
            "runtime_image": self.runtime_image,
            "system_packages": list(self.system_packages),
            "application_packages": list(self.application_packages),
            "environment": {key: value for key, value in self.environment},
            "entrypoint": list(self.entrypoint) if self.entrypoint else None,
            "cmd": list(self.cmd) if self.cmd else None,
            "artifacts": [list(item) for item in self.artifacts],
            "features": [feature.lower() for feature in self.features],
        }


@dataclass(slots=True)
class DockerfileArtifact:
    """Rendered Dockerfile content plus supporting metadata."""

    content: str
    metadata: Mapping[str, object]

    def write_to(self, path: str) -> None:
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(self.content)

    def as_dict(self) -> MutableMapping[str, object]:
        return {"content": self.content, "metadata": dict(self.metadata)}


# ---------------------------------------------------------------------------
# dynamic engine


def _default_features() -> Dict[str, FeatureRecipe]:
    return {
        "poetry": FeatureRecipe(
            description="Installs Poetry and resolves dependencies at build time.",
            builder=(
                StageInstruction.run(["pip install --no-cache-dir poetry"], comment="Install Poetry"),
                StageInstruction.run(
                    ["poetry install --no-interaction --no-ansi"],
                    comment="Install project dependencies",
                ),
            ),
            metadata={"category": "python"},
        ),
        "watchfiles": FeatureRecipe(
            description="Configures watchfiles auto-reload in development stages.",
            runtime=(
                StageInstruction.env({"WATCHFILES_FORCE_POLLING": "true"}),
            ),
            metadata={"category": "developer-experience"},
        ),
    }


class DynamicDockerfileEngine:
    """Synthesises Dockerfiles using runtime heuristics and feature toggles."""

    DEFAULT_BASE_IMAGES: Mapping[str, tuple[str, str]] = {
        "python": ("python:3.11-slim", "python:3.11-slim"),
        "node": ("node:20-bullseye", "node:20-alpine"),
        "go": ("golang:1.21-bullseye", "gcr.io/distroless/base-debian11"),
    }

    def __init__(self, *, base_images: Mapping[str, str | Sequence[str]] | None = None) -> None:
        self._base_images: Dict[str, tuple[str, str]] = {
            runtime: _normalise_image_pair(images)
            for runtime, images in self.DEFAULT_BASE_IMAGES.items()
        }
        if base_images:
            for runtime, images in base_images.items():
                self._base_images[_normalise_runtime(runtime)] = _normalise_image_pair(images)
        self._feature_registry: Dict[str, FeatureRecipe] = _default_features()

    @property
    def available_features(self) -> tuple[str, ...]:
        return tuple(sorted(self._feature_registry))

    def register_feature(
        self,
        name: str,
        recipe: FeatureRecipe,
        *,
        override: bool = False,
    ) -> None:
        key = _normalise_feature_name(name)
        if not override and key in self._feature_registry:
            raise ValueError(f"feature '{key}' already registered")
        self._feature_registry[key] = recipe

    def remove_feature(self, name: str) -> None:
        key = _normalise_feature_name(name)
        self._feature_registry.pop(key, None)

    def compose(self, context: DockerfileContext) -> DockerfileArtifact:
        builder_image, runtime_image = self._resolve_images(context)
        stages: list[DockerStageBlueprint] = []

        builder_summary = "Build dependencies" if context.multistage else "Application stage"
        builder_stage = DockerStageBlueprint(
            base_image=builder_image,
            name="builder" if context.multistage else None,
            summary=builder_summary,
        )
        builder_stage.add_instruction(StageInstruction.workdir(context.workdir))
        builder_stage.add_instruction(StageInstruction.copy(".", ".", comment="Application sources"))

        if context.system_packages:
            system_commands = [
                "apt-get update",
                "apt-get install -y --no-install-recommends "
                + " ".join(context.system_packages),
                "rm -rf /var/lib/apt/lists/*",
            ]
            builder_stage.add_instruction(
                StageInstruction.run(system_commands, comment="System packages"),
            )

        self._apply_runtime_packages(context, builder_stage)

        feature_metadata: Dict[str, MutableMapping[str, object]] = {}

        runtime_stage: DockerStageBlueprint | None = None
        if context.multistage:
            runtime_stage = DockerStageBlueprint(
                base_image=runtime_image,
                name=None,
                summary="Runtime image",
            )
            runtime_stage.add_instruction(StageInstruction.workdir(context.workdir))
            for source, destination in context.artifacts:
                runtime_stage.add_instruction(
                    StageInstruction.copy(
                        source,
                        destination,
                        from_stage="builder",
                        comment="Promote build artifacts",
                    )
                )
        else:
            runtime_stage = None

        for feature_name in context.features:
            key = _normalise_feature_name(feature_name)
            recipe = self._feature_registry.get(key)
            if recipe is None:
                raise KeyError(f"feature '{key}' is not registered")
            builder_stage.extend(recipe.builder)
            target_stage = runtime_stage if runtime_stage is not None else builder_stage
            target_stage.extend(recipe.runtime)
            feature_metadata[key] = recipe.describe()

        target_for_env = runtime_stage if runtime_stage is not None else builder_stage
        if context.environment:
            target_for_env.add_instruction(StageInstruction.env(context.environment))

        if context.entrypoint:
            target_for_env.add_instruction(StageInstruction.entrypoint(context.entrypoint))
        if context.cmd:
            target_for_env.add_instruction(StageInstruction.cmd(context.cmd))

        stages.append(builder_stage)
        if runtime_stage is not None:
            stages.append(runtime_stage)

        content_lines: list[str] = []
        for stage in stages:
            if content_lines:
                content_lines.append("")
            content_lines.append(stage.render())
        rendered = "\n".join(content_lines).rstrip() + "\n"

        metadata: Dict[str, object] = {
            "context": context.as_dict(),
            "features": feature_metadata,
            "stages": [stage.as_dict() for stage in stages],
        }
        return DockerfileArtifact(rendered, metadata)

    # ------------------------------------------------------------------
    # helpers

    def _resolve_images(self, context: DockerfileContext) -> tuple[str, str]:
        builder_image = context.builder_image
        runtime_image = context.runtime_image
        defaults = self._base_images.get(context.runtime)
        if context.multistage:
            if builder_image is None:
                if defaults is None:
                    raise KeyError(
                        f"no base images configured for runtime '{context.runtime}'"
                    )
                builder_image = defaults[0]
            if runtime_image is None:
                if defaults is None:
                    runtime_image = builder_image
                else:
                    candidate = defaults[1]
                    runtime_image = candidate if candidate else builder_image
        else:
            if runtime_image is None:
                if defaults is not None:
                    candidate = defaults[1] if len(defaults) > 1 else defaults[0]
                    runtime_image = candidate or defaults[0]
                elif builder_image is not None:
                    runtime_image = builder_image
                else:
                    raise KeyError(
                        f"no base images configured for runtime '{context.runtime}'"
                    )
            if builder_image is None:
                builder_image = runtime_image
        return builder_image, runtime_image

    def _apply_runtime_packages(
        self,
        context: DockerfileContext,
        stage: DockerStageBlueprint,
    ) -> None:
        if not context.application_packages:
            return
        packages = " ".join(context.application_packages)
        if context.runtime == "python":
            command = f"pip install --no-cache-dir {packages}"
        elif context.runtime == "node":
            command = f"npm install --global {packages}"
        elif context.runtime == "go":
            command = f"go install {packages}"
        else:
            command = f"echo 'install {packages}'"
        stage.add_instruction(
            StageInstruction.run([command], comment="Runtime dependencies"),
        )
