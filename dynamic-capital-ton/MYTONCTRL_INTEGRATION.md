# MyTonCtrl Integration Guide

## Overview

[MyTonCtrl](https://github.com/ton-blockchain/mytonctrl) is the official console toolkit for provisioning and
operating TON blockchain nodes. It ships with installers for validator, liteserver, and collator roles and wraps
core TON binaries with a REPL-driven management experience. Dynamic Capital can reuse the upstream automation to
bootstrap hardened infrastructure for liquidity routing, DNS, and governance services.

## Supported Platforms

The upstream project validates MyTonCtrl on modern Ubuntu and Debian releases and recommends Ubuntu LTS builds for
production fleets:

- Ubuntu 20.04/22.04/24.04 LTS
- Debian 11/12 (Debian 10 is marked deprecated and Debian 13 is currently unsupported)

Co-locate TON validators on Ubuntu 22.04 LTS to align with the rest of Dynamic Capital's observability stack and
hardened baseline images.

## Installation Modes

MyTonCtrl exposes three primary install modes that determine which TON components are compiled and which services
are launched:

- **`liteserver`** — standalone lite server for API workloads (ideal for read-heavy analytics traffic).
- **`validator`** — full validator stack with election participation enabled (can also serve lite queries).
- **`collator`** — block collator role for validators that outsource the consensus step.

Dynamic Capital should default to `validator` when provisioning high-availability mainnet nodes and fall back to
`liteserver` for auxiliary analytics machines.

## Installation Workflow

1. Fetch the upstream installer script:
   ```bash
   wget https://raw.githubusercontent.com/ton-blockchain/mytonctrl/master/scripts/install.sh
   ```
2. Execute the script with the target mode (requires `sudo` or `su` privileges to install system packages):
   ```bash
   sudo bash install.sh -m validator
   ```
   Use `--help` to inspect additional switches such as `--env-file` for non-interactive deployments.
3. Supply optional environment overrides for network ports or validator console access:
   - `VALIDATOR_CONSOLE_PORT`
   - `LITESERVER_PORT`
   - `VALIDATOR_PORT`
4. Launch the MyTonCtrl console once installation completes:
   ```bash
   mytonctrl
   ```

For air-gapped configuration reviews, run the installer with `--print-env` to execute in dry-run mode and capture the
exact commands that would be executed.

## Telemetry Controls

Telemetry is enabled by default and publishes validator statistics to `toncenter.com` for anomaly detection.
Disable it during install with `-t` or after provisioning from the console:

```bash
sudo bash install.sh -m validator -t
# or within the shell
MyTonCtrl> set sendTelemetry false
```

Dynamic Capital should disable telemetry on regulated infrastructure unless a formal DPA covers the upstream
collection endpoint.

## Integration Checklist

- [ ] Mirror the installer into the internal artifact registry to guarantee reproducibility.
- [ ] Codify MyTonCtrl provisioning in Terraform/Ansible with explicit port overrides.
- [ ] Integrate service health into the existing Prometheus/Grafana stack.
- [ ] Enforce telemetry opt-out in configuration management.
- [ ] Document operational handoffs (log locations, backup flow, upgrade cadence).

## References

- Upstream documentation: <https://docs.ton.org/v3/documentation/nodes/mytonctrl/overview>
- Node roles overview: <https://docs.ton.org/v3/guidelines/nodes/overview>
