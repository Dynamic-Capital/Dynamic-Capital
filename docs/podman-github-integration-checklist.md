# Podman GitHub Integration Checklist

This checklist audits and operationalizes the workflow for connecting a cloned
GitHub repository to a Podman machine running on Windows via the
`podman-machine-default` named pipe (`npipe://\\.\pipe\podman-machine-default`).
Use it when onboarding a new project or hardening local development.

## Automation helper

- Run `npm run checklists -- --checklist podman-github` to execute the scripted
  machine validation sequence.
- Pass `-- --checklist podman-github --include-optional` to combine the helper
  with any optional tasks you add locally.
- Use `node scripts/checklists/podman-machine-verify.mjs --help` for
  connection-specific flags such as `--connection <name>` or `--skip-start`.

## Audit summary

| Area                     | Current status                                                                     | Follow-up                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Podman machine lifecycle | Documented `podman machine start` sequence.                                        | Add optional `podman machine inspect` health check.                       |
| Connection registration  | Captures `podman system connection add` usage with default selection verification. | Include scripted check for `podman system connection ls`.                 |
| Repository workflow      | Covers cloning, building, and running containers with bind mounts.                 | Track Windows path nuances and PowerShell execution policy prerequisites. |
| Compose compatibility    | Notes `podman-compose` availability for Docker Compose files.                      | Evaluate parity with Docker Desktop features used by the project.         |

## Pre-flight validation

- [ ] Confirm Podman is installed at the latest stable release on Windows.
- [ ] Start the machine and ensure it reports `Running`:
  - `podman machine start`
  - `podman machine list --format "{{.Name}}\t{{.Running}}\t{{.LastUp}}"`
  - `podman machine inspect podman-machine-default --format '{{.LastUp}}'`
- [ ] Register the default connection if missing:
  - `podman system connection add --default podman-machine-default "npipe://\\.\pipe\podman-machine-default"`
    - The CLI also accepts the POSIX-style URI
      `npipe://./pipe/podman-machine-default` if you prefer forward slashes.
  - `podman system connection ls --format "{{.Name}}\t{{if .Default}}(default){{end}}"`
- [ ] Verify the machine is reachable:
  - `podman info`
- [ ] Configure local host aliases so containers can reach Windows services:
  - `node scripts/podman/configure-local-host.mjs`
  - `podman machine ssh podman-machine-default getent hosts host.docker.internal`
  - `podman machine ssh podman-machine-default getent hosts gateway.docker.internal`

### Quick PowerShell verification script

Run this after a cold boot to validate the machine state and the default
connection in a single pass.

```powershell
$connectionName = "podman-machine-default"

podman machine start $connectionName | Out-Null
$machine = podman machine inspect $connectionName | ConvertFrom-Json
$connection = podman system connection ls --format '{{json .}}' | ConvertFrom-Json | Where-Object { $_.Name -eq $connectionName }

Write-Host "Machine state:`t$($machine.LastUp) (running: $($machine.LastUp -ne $null))"
Write-Host "Connection default:`t$($connection.Default)"
```

## Repository preparation

- [ ] Clone the target GitHub repository or pull the latest changes.
- [ ] Review project-specific container requirements (Dockerfile, scripts,
      compose files).
- [ ] Configure any `.env` files using documented templates (do **not** commit
      secrets).
- [ ] Ensure the working tree lives on an NTFS drive (Podman automatically
      shares `C:`) or configure additional shared paths via
      `podman machine set --rootful --now`.

## Image build and runtime checks

- [ ] Build the container image:
  - `podman build -t <image-name> .`
  - `podman images --filter reference=<image-name>`
- [ ] Run an interactive container with bind-mounted source:
  - `podman run --rm -it -v ${PWD}:/app -w /app <image-name> <command>`
  - `podman volume ls`
- [ ] Confirm file permissions map correctly between Windows host and Podman VM.
- [ ] Persist any containerized dependencies (volumes, secrets) using
      Podman-native tooling.

## Compose and automation (optional)

- [ ] If the project includes `docker-compose.yml`, install `podman-compose`.
- [ ] Run `podman-compose up --build` and document any deviations from Docker
      Desktop output.
- [ ] Capture logs and follow-up items for cross-platform quirks.

## Documentation handoff

- [ ] Record completion notes in the project wiki or onboarding doc.
- [ ] Open issues for remaining follow-ups highlighted in the audit summary
      table.
- [ ] Share the checklist results with collaborators to confirm environment
      parity.

## Troubleshooting cues

- [ ] Connection fails with `permission denied`: reset pipe access with
      `podman machine stop`, `podman machine rm`, then recreate using
      `podman machine init --now`.
- [ ] Bind mounts show as empty directories: confirm the path casing matches
      Windows conventions and rerun `podman machine ssh -- mount` to inspect the
      shared folder mapping.
- [ ] Compose services cannot reach each other: compare `podman network ls`
      output against expected bridge names and recreate the network if drifted.
