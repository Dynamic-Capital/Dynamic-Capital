"""Operational planning utilities for Supabase Edge Functions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, Mapping, MutableSet, Sequence

__all__ = [
    "EdgeFunctionSpec",
    "EdgeFunctionRunbook",
    "SupabaseEdgeFunctionPlan",
    "SupabaseEdgeFunctionAlgorithm",
]


@dataclass(slots=True)
class EdgeFunctionSpec:
    """Static metadata describing a Supabase Edge Function."""

    name: str
    description: str
    triggers: Sequence[str]
    owners: Sequence[str]
    dependencies: Sequence[str] = field(default_factory=tuple)
    runtime: str = "deno"
    schedule: str | None = None
    env_requirements: Mapping[str, str] = field(default_factory=dict)
    tags: Sequence[str] = field(default_factory=tuple)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the specification."""

        return {
            "name": self.name,
            "description": self.description,
            "triggers": list(self.triggers),
            "owners": list(self.owners),
            "dependencies": list(self.dependencies),
            "runtime": self.runtime,
            "schedule": self.schedule,
            "env_requirements": dict(self.env_requirements),
            "tags": list(self.tags),
        }


@dataclass(slots=True)
class EdgeFunctionRunbook:
    """Operational checklist produced for a specific edge function."""

    name: str
    description: str
    environment: str
    runtime: str
    triggers: Sequence[str]
    owners: Sequence[str]
    dependencies: Sequence[str]
    schedule: str | None
    preflight: Sequence[str]
    deployment: Sequence[str]
    validation: Sequence[str]
    rollback: Sequence[str]
    tags: Sequence[str] = field(default_factory=tuple)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the runbook."""

        return {
            "name": self.name,
            "description": self.description,
            "environment": self.environment,
            "runtime": self.runtime,
            "triggers": list(self.triggers),
            "owners": list(self.owners),
            "dependencies": list(self.dependencies),
            "schedule": self.schedule,
            "preflight": list(self.preflight),
            "deployment": list(self.deployment),
            "validation": list(self.validation),
            "rollback": list(self.rollback),
            "tags": list(self.tags),
            "metadata": dict(self.metadata),
        }


@dataclass(slots=True)
class SupabaseEdgeFunctionPlan:
    """Aggregated operational plan for a set of edge functions."""

    environment: str
    runbooks: Sequence[EdgeFunctionRunbook]
    summary: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Return a serialisable representation of the plan."""

        return {
            "environment": self.environment,
            "summary": self.summary,
            "runbooks": [runbook.to_dict() for runbook in self.runbooks],
            "metadata": dict(self.metadata),
        }


class SupabaseEdgeFunctionAlgorithm:
    """Build structured runbooks for deploying Supabase Edge Functions."""

    def __init__(self, specs: Iterable[EdgeFunctionSpec]):
        self._specs: Dict[str, EdgeFunctionSpec] = {}
        self._ordered_names: list[str] = []
        for spec in specs:
            self.register(spec)
        if not self._specs:
            raise ValueError("at least one edge function specification must be supplied")

    def register(self, spec: EdgeFunctionSpec) -> None:
        """Register a new edge function specification."""

        if spec.name in self._specs:
            raise ValueError(f"edge function {spec.name} is already registered")
        self._specs[spec.name] = spec
        self._ordered_names.append(spec.name)

    def build_plan(
        self,
        *,
        environment: str,
        focus: Sequence[str] | None = None,
        include_dependencies: bool = True,
    ) -> SupabaseEdgeFunctionPlan:
        """Return an operational plan for the requested edge functions."""

        focus_tuple: tuple[str, ...] = tuple(focus or ())
        if focus_tuple:
            missing = [name for name in focus_tuple if name not in self._specs]
            if missing:
                raise KeyError(f"unknown edge function(s): {', '.join(missing)}")
        selected: MutableSet[str] = set(focus_tuple or self._specs)

        if include_dependencies:
            stack = list(selected)
            while stack:
                name = stack.pop()
                spec = self._get_spec(name)
                for dependency in spec.dependencies:
                    if dependency not in self._specs:
                        raise KeyError(f"edge function {name} depends on unknown {dependency}")
                    if dependency not in selected:
                        selected.add(dependency)
                        stack.append(dependency)
        else:
            for name in list(selected):
                spec = self._get_spec(name)
                for dependency in spec.dependencies:
                    if dependency not in self._specs:
                        raise KeyError(f"edge function {name} depends on unknown {dependency}")

        ordering = self._topological_order(selected)
        runbooks = [self._build_runbook(self._specs[name], environment) for name in ordering]

        summary = self._summarise(environment=environment, runbooks=runbooks)
        metadata = {
            "focus": list(focus_tuple),
            "function_names": [runbook.name for runbook in runbooks],
            "owners": {runbook.name: list(runbook.owners) for runbook in runbooks},
        }
        return SupabaseEdgeFunctionPlan(
            environment=environment,
            runbooks=runbooks,
            summary=summary,
            metadata=metadata,
        )

    def _get_spec(self, name: str) -> EdgeFunctionSpec:
        try:
            return self._specs[name]
        except KeyError as error:  # pragma: no cover - defensive guard
            raise KeyError(f"unknown edge function {name}") from error

    def _topological_order(self, names: MutableSet[str]) -> list[str]:
        visited: Dict[str, str] = {}
        order: list[str] = []

        def visit(name: str) -> None:
            state = visited.get(name)
            if state == "temp":
                raise ValueError(f"dependency cycle detected involving {name}")
            if state == "perm":
                return
            visited[name] = "temp"
            spec = self._get_spec(name)
            for dependency in spec.dependencies:
                if dependency in names:
                    visit(dependency)
            visited[name] = "perm"
            order.append(name)

        for name in self._ordered_names:
            if name not in names:
                continue
            visit(name)

        # The DFS appends dependencies first, so filter to the requested names order.
        return [name for name in order if name in names]

    def _build_runbook(self, spec: EdgeFunctionSpec, environment: str) -> EdgeFunctionRunbook:
        preflight = self._build_preflight(spec, environment)
        deployment = self._build_deployment(spec)
        validation = self._build_validation(spec)
        rollback = self._build_rollback(spec)
        metadata = {
            "env_requirements": dict(spec.env_requirements),
        }
        return EdgeFunctionRunbook(
            name=spec.name,
            description=spec.description,
            environment=environment,
            runtime=spec.runtime,
            triggers=tuple(spec.triggers),
            owners=tuple(spec.owners),
            dependencies=tuple(spec.dependencies),
            schedule=spec.schedule,
            preflight=tuple(preflight),
            deployment=tuple(deployment),
            validation=tuple(validation),
            rollback=tuple(rollback),
            tags=tuple(spec.tags),
            metadata=metadata,
        )

    def _build_preflight(self, spec: EdgeFunctionSpec, environment: str) -> list[str]:
        steps = [
            f"Confirm {environment} Supabase project ref and service role credentials are configured.",
            "Review latest git history for breaking changes and linked incidents.",
        ]
        if spec.dependencies:
            steps.append(
                "Verify dependent functions are healthy: " + ", ".join(spec.dependencies) + "."
            )
        if spec.env_requirements:
            formatted = ", ".join(
                f"{key} ({value})" if value else key for key, value in spec.env_requirements.items()
            )
            steps.append(f"Confirm {environment} secrets configured: {formatted}.")
        if spec.schedule:
            steps.append(f"Review scheduler window for {spec.schedule} to avoid conflicts.")
        return steps

    def _build_deployment(self, spec: EdgeFunctionSpec) -> list[str]:
        steps = [
            f"Deploy function via: supabase functions deploy {spec.name} --project-ref $SUPABASE_PROJECT_REF.",
        ]
        if "http" in spec.triggers:
            steps.append(
                f"Publish API documentation update for /functions/v1/{spec.name} if request/response changed."
            )
        if "webhook" in spec.triggers:
            steps.append(
                f"Rotate or validate webhook signing secrets for {spec.name} consumers."
            )
        if "cron" in spec.triggers or spec.schedule:
            steps.append(
                f"Ensure cron schedule is registered via: supabase cron upsert {spec.name}."
            )
        if spec.tags:
            steps.append("Notify subscribers about deployment tags: " + ", ".join(spec.tags) + ".")
        return steps

    def _build_validation(self, spec: EdgeFunctionSpec) -> list[str]:
        steps = [
            f"Stream logs with supabase functions logs {spec.name} --project-ref $SUPABASE_PROJECT_REF for 10m post-deploy.",
        ]
        if "http" in spec.triggers:
            steps.append(
                f"Execute smoke test HTTP call to /functions/v1/{spec.name} and confirm 2xx response."
            )
        if "webhook" in spec.triggers:
            steps.append(
                f"Replay latest webhook fixture through {spec.name} and verify downstream acknowledgements."
            )
        if "cron" in spec.triggers or spec.schedule:
            steps.append(
                f"Validate scheduler metrics reflect a successful invocation of {spec.name}."
            )
        steps.append(
            "Document results and update Supabase Edge Function dashboard status."
        )
        return steps

    def _build_rollback(self, spec: EdgeFunctionSpec) -> list[str]:
        steps = [
            f"Redeploy previous stable build for {spec.name} from the release artifact store.",
            f"Disable triggers (cron/webhook) for {spec.name} if errors persist.",
        ]
        if spec.dependencies:
            steps.append(
                "Notify owners of dependent functions: " + ", ".join(spec.dependencies) + "."
            )
        steps.append("Capture incident report and backfill missed events if required.")
        return steps

    def _summarise(self, *, environment: str, runbooks: Sequence[EdgeFunctionRunbook]) -> str:
        if not runbooks:
            return f"No edge functions selected for {environment} deployment"
        names = ", ".join(runbook.name for runbook in runbooks)
        return f"{len(runbooks)} edge function(s) ready for {environment}: {names}"
