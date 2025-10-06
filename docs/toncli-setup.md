# TONCLI Local Setup Guide

This guide captures the steps required to install `toncli`, satisfy its runtime
dependencies, and generate a configuration that points at the Dynamic Capital
network descriptors. Follow these instructions on fresh environments (CI agents
or local workstations) before running any TON contract tooling.

## Prerequisites

- Python 3.12 or newer available on the `PATH`.
- Ability to install Debian packages (for `libsodium`) and unpack AppImage
  archives extracted from TON's release bundles.
- Network access to download the official TON toolchain release assets.

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

2. **Install the TON binaries.** Download the latest TON release bundle and
   extract the AppImage payloads to obtain native ELF binaries that satisfy the
   `-V` handshake expected by `toncli`:

   ```bash
   export TON_RELEASE=v2025.07
   mkdir -p /tmp/ton-toolchain && cd /tmp/ton-toolchain
   curl -L -O "https://github.com/ton-blockchain/ton/releases/download/${TON_RELEASE}/ton-linux-x86_64.zip"
   unzip ton-linux-x86_64.zip "func" "fift" "lite-client"

   for bin in func fift lite-client; do
     chmod +x "$bin"
     "./$bin" --appimage-extract >/dev/null 2>&1
     sudo install -m 0755 squashfs-root/usr/bin/$bin /usr/local/bin/$bin
     rm -rf squashfs-root "$bin"
   done
   ```

   The command copies the extracted binaries to `/usr/local/bin`. Validate the
   installation by checking the version banner for each executable:

   ```bash
   func -V
   fift -V
   lite-client -V
   ```

   Each command should print a "build information" tuple for commit
   `cac968f7…` (or the hash associated with the downloaded release).

3. **Install runtime libraries.** The extracted binaries depend on
   `libsodium`. Install it with:

   ```bash
   sudo apt-get update && sudo apt-get install -y libsodium23
   ```

4. **Generate the configuration file.** Copy
   [`dynamic-capital-ton/toncli.config.example.ini`](../dynamic-capital-ton/toncli.config.example.ini)
   to `~/.config/toncli/config.ini` and edit the executable paths if your
   binaries live outside `/usr/local/bin`.

5. **Verify the installation.** Run `toncli -v` to confirm the CLI boots and
   prints the installed version. The first invocation will copy the standard
   library files into `~/.config/toncli/` and emit output similar to:

   ```bash
   $ toncli -v
   INFO: v0.0.43
   ```

   If you see import errors about `bitstring.BitString` or `pkg_resources`,
   reinstall the dependencies with
   `pip install 'bitstring<4' setuptools
   toncli` to pull in the compatible
   versions.

6. **Generate the TON Site ADNL (optional).** When onboarding a fresh
   environment, derive the TON Site ADNL and Ed25519 key pair with:

   ```bash
   npm run ton:generate-adnl
   ```

   Store the printed JSON securely and update
   [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) as described
   in [`dns/toncli-adnl-setup.md`](../dns/toncli-adnl-setup.md) before
   publishing DNS updates.

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
  information" banner when invoked with `-V`, and reinstall the binaries if the
  extraction step was skipped.
