# Operations Playbooks

Operational artefacts ensure the MAS runs safely with clear observability, runbooks, and resilience drills.

- `dashboards/` — Grafana JSON exports referenced by ArgoCD (e.g., `mas-overview.json`).
- `runbooks/` — incident guides (HALT, DLQ replay, schema drift) linked from agent canvases.
- `slo/` (pending) — formal SLO definitions aligned with per-agent commitments.
- `chaos/` (pending) — Gremlin/Litmus plans targeting back-to-back agent dependencies.

Before promoting a release, validate dashboards ingest new metrics, confirm runbooks reflect latest canvases, and schedule chaos drills for the updated interfaces.

