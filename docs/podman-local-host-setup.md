# Podman Local Host Configuration

Configure Podman machines so containers can reach services that run on the
Windows host using familiar Docker-style aliases. The automation mirrors the
built-in `host.containers.internal` entry to additional hostnames such as
`host.docker.internal` and `gateway.docker.internal`.

## Prerequisites

- Podman Desktop (or Podman CLI) installed and available on the `PATH`.
- The target machine (for example `podman-machine-default`) has been initialized
  with `podman machine init`.
- PowerShell or a Unix-compatible shell to execute the commands below.

## Quick setup

Run the helper script to apply the aliases automatically:

```bash
node scripts/podman/configure-local-host.mjs
```

The script:

1. Starts the specified machine if it is not already running.
2. Resolves `host.containers.internal` to capture the Windows host IP.
3. Adds `host.docker.internal` and `gateway.docker.internal` entries inside
   `/etc/hosts` on the Podman VM, replacing outdated mappings when necessary.
4. Prints the resulting hostname → IP pairs for confirmation.

### Custom options

- `--connection <name>` — Configure a machine other than the default.
- `--source <hostname>` — Mirror a different source hostname if you maintain a
  custom entry for the host.
- `--alias <hostname>` — Add extra aliases. Repeat the flag to apply multiple.
- `--clear-default-aliases` — Remove the standard aliases before adding your own
  set with `--alias`.

Example:

```bash
node scripts/podman/configure-local-host.mjs --connection dev --alias registry.internal --alias telemetry.local
```

## Manual verification

Confirm the aliases resolve correctly from inside the machine:

```bash
podman machine ssh podman-machine-default getent hosts host.docker.internal
podman machine ssh podman-machine-default getent hosts gateway.docker.internal
```

The commands should return the same IP address reported for
`host.containers.internal`.

## Troubleshooting

- **`podman` not found** — Add the Podman CLI to your `PATH` or install Podman
  Desktop.
- **Machine fails to start** — Run `podman machine list` to confirm the machine
  exists, then retry `podman machine start <name>`.
- **Aliases still missing** — Inspect `/etc/hosts` via
  `podman machine ssh <name> sudo cat /etc/hosts` to confirm the entries were
  appended. Rerun the helper with elevated permissions if required.
