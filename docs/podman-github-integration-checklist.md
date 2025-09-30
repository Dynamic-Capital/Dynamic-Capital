# Podman GitHub Integration Checklist

This checklist audits and operationalizes the workflow for connecting a cloned
GitHub repository to a Podman machine running on Windows via the
`podman-machine-default` named pipe (`npipe://./pipe/podman-machine-default`).
Use it when onboarding a new project or hardening local development.

## Audit summary

| Area | Current status | Follow-up |
| ---- | -------------- | --------- |
| Podman machine lifecycle | Documented `podman machine start` sequence. | Add optional `podman machine inspect` health check. |
| Connection registration | Captures `podman system connection add` usage with default selection verification. | Include scripted check for `podman system connection ls`. |
| Repository workflow | Covers cloning, building, and running containers with bind mounts. | Track Windows path nuances and PowerShell execution policy prerequisites. |
| Compose compatibility | Notes `podman-compose` availability for Docker Compose files. | Evaluate parity with Docker Desktop features used by the project. |

## Pre-flight validation

- [ ] Confirm Podman is installed at the latest stable release on Windows.
- [ ] Start the machine and ensure it reports `Running`:
  - `podman machine start`
  - `podman machine inspect podman-machine-default --format '{{.LastUp}}'`
- [ ] Register the default connection if missing:
  - `podman system connection add --default podman-machine-default npipe://./pipe/podman-machine-default`
  - `podman system connection ls`
- [ ] Verify the machine is reachable:
  - `podman info`

## Repository preparation

- [ ] Clone the target GitHub repository or pull the latest changes.
- [ ] Review project-specific container requirements (Dockerfile, scripts, compose files).
- [ ] Configure any `.env` files using documented templates (do **not** commit secrets).

## Image build and runtime checks

- [ ] Build the container image:
  - `podman build -t <image-name> .`
- [ ] Run an interactive container with bind-mounted source:
  - `podman run --rm -it -v ${PWD}:/app -w /app <image-name> <command>`
- [ ] Confirm file permissions map correctly between Windows host and Podman VM.
- [ ] Persist any containerized dependencies (volumes, secrets) using Podman-native tooling.

## Compose and automation (optional)

- [ ] If the project includes `docker-compose.yml`, install `podman-compose`.
- [ ] Run `podman-compose up --build` and document any deviations from Docker Desktop output.
- [ ] Capture logs and follow-up items for cross-platform quirks.

## Documentation handoff

- [ ] Record completion notes in the project wiki or onboarding doc.
- [ ] Open issues for remaining follow-ups highlighted in the audit summary table.
- [ ] Share the checklist results with collaborators to confirm environment parity.
