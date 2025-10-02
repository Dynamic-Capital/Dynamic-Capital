# TONCLI Local Setup Guide

This guide captures the steps required to install `toncli`, satisfy its runtime
dependencies, and generate a configuration that points at the Dynamic Capital
network descriptors. Follow these instructions on fresh environments (CI agents
or local workstations) before running any TON contract tooling.

## Prerequisites

- Python 3.12 or newer available on the `PATH`.
- Access to the TON toolchain binaries (`func`, `fift`, and `lite-client`). These
  must expose a `-V` flag that prints the standard "build information" string.
  Package managers maintained by the TON community or reproducible build
  artifacts published by Dynamic Capital are both acceptable sources.

## Installation steps

1. **Install the Python packages.** `toncli` currently depends on the legacy
   `pkg_resources` loader and an older `bitstring` API. Install the packages in
   this order to avoid import errors:

   ```bash
   pip install 'bitstring<4' setuptools toncli
   ```

   The command installs `toncli` alongside a compatible `bitstring` release and
   ensures `pkg_resources` is available for the CLI's version command.

   To run the DNS payload helper included in this repository, install the
   supplementary Python dependency bundle as well:

   ```bash
   pip install -r dns/requirements-toncli.txt
   ```

2. **Provide stub binaries (optional for CI smoke tests).** In environments where
   the real TON binaries are unavailable, create lightweight wrappers that emit
   valid version strings so `toncli` can complete its first-run checks:

   ```bash
   cat <<'SH' | sudo tee /usr/local/bin/func >/dev/null
   #!/bin/sh
   echo "TON Compiler build information: [func 1.0.0, commit abcdef]"
   SH
   sudo chmod +x /usr/local/bin/func

   cat <<'SH' | sudo tee /usr/local/bin/fift >/dev/null
   #!/bin/sh
   echo "Fift Interpreter build information: [fift 1.0.0, commit abcdef]"
   SH
   sudo chmod +x /usr/local/bin/fift

   cat <<'SH' | sudo tee /usr/local/bin/lite-client >/dev/null
   #!/bin/sh
   echo "Lite Client build information: [lite-client 1.0.0, commit abcdef]"
   SH
   sudo chmod +x /usr/local/bin/lite-client
   ```

   Replace these wrappers with the genuine binaries for production workflows.

3. **Generate the configuration file.** Copy
   [`dynamic-capital-ton/toncli.config.example.ini`](../dynamic-capital-ton/toncli.config.example.ini)
   to `~/.config/toncli/config.ini` and edit the executable paths if your
   binaries live outside `/usr/local/bin`.

4. **Verify the installation.** Run `toncli -v` to confirm the CLI boots and
   prints the installed version. The first invocation will copy the standard
   library files into `~/.config/toncli/` and emit output similar to:

   ```bash
   $ toncli -v
   INFO: v0.0.43
   ```

   If you see import errors about `bitstring.BitString` or `pkg_resources`,
   reinstall the dependencies with `pip install 'bitstring<4' setuptools
   toncli` to pull in the compatible versions.

5. **Generate the TON Site ADNL (optional).** When onboarding a fresh
   environment, derive the TON Site ADNL and Ed25519 key pair with:

   ```bash
   npm run ton:generate-adnl
   ```

   Store the printed JSON securely and update
   [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) as described in
   [`dns/toncli-adnl-setup.md`](../dns/toncli-adnl-setup.md) before publishing
   DNS updates.

## Configuration reference

The example configuration sticks to the TON Foundation's published global
configuration snapshots so developers inherit the same defaults as upstream
tooling. Update the file whenever the project rotates to a new snapshot or
introduces a private RPC endpoint.

- `mainnet` and `testnet` default to
  `https://ton-blockchain.github.io/global.config.json` and
  `https://ton-blockchain.github.io/testnet-global.config.json`. Swap these URLs
  for a GitHub raw link or an internal mirror if Dynamic Capital needs to pin a
  specific revision.
- `toncenter_mainnet` and `toncenter_testnet` preserve the public RPC defaults;
  override them if Dynamic Capital provisions private RPC endpoints.
- The `[executable]` section records absolute paths to the `func`, `fift`, and
  `lite-client` binaries so `toncli` can launch them without additional
  environment variables.

## Troubleshooting

- **`ImportError: cannot import name 'BitString'`** – reinstall `bitstring` with
  `pip install 'bitstring<4'` to restore the legacy API that `toncli` expects.
- **`ModuleNotFoundError: No module named 'pkg_resources'`** – ensure
  `setuptools` is installed.
- **Repeated prompts for executable paths** – confirm the paths in
  `~/.config/toncli/config.ini` point to binaries that print the standard "build
  information" banner when invoked with `-V`.
