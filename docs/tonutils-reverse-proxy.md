# Tonutils Reverse Proxy Installation Guide

Use this guide to provision the official
[Tonutils Reverse Proxy](https://github.com/tonutils/reverse-proxy) so desktop
browsers and Telegram clients can reach the Dynamic Capital TON Site via HTTPS.

## Prerequisites

- Linux, macOS, or Windows host with public IPv4/IPv6 connectivity.
- UDP inbound/outbound allowed on the port exposed in `config.json` (default
  `443`).
- TON wallet (Tonkeeper, MyTonWallet, Tonhub, etc.) authorised to sign the DNS
  linking transaction.
- `curl` (required by the installer; `wget` remains useful for manual fallback
  downloads).

## Quick install via repository script

The repository ships a helper that downloads the correct binary for your
platform and stores it under `tools/bin`.

```bash
node scripts/ton/install-tonutils-reverse-proxy.mjs
```

- The helper resolves the latest GitHub release, confirms the platform-specific
  asset exists, and reports the tag that was installed.
- Pass `--dir` to override the destination directory.
- Use `--force` to reinstall the binary even when one already exists (safe on
  Windows where rename semantics differ).
- Add `--version vX.Y.Z` to pin a specific Git tag; otherwise the script uses
  the `latest` release endpoint.
- Provide a personal token with `--token <gh_token>` (or set
  `GITHUB_TOKEN=<gh_token>`) when running repeatedly to avoid GitHub API rate
  limits.
- Combine `--dry-run` to preview the resolved release, download location, and
  filesystem operations without modifying anything.

Once the binary is installed, start the linking flow. The repository root now
ships a small wrapper that installs the correct binary on demand and then
proxies any arguments through to it. The helper first attempts to reuse the
Node.js installer; if Node.js is unavailable, it falls back to downloading the
Linux amd64 asset directly with `curl`. Running the wrapper with no extra flags
automatically targets the production TON domain (`dynamiccapital.ton`). Override
the domain by setting `TONUTILS_REVERSE_PROXY_DOMAIN` or passing `--domain`
explicitly when relinking. Pass `TONUTILS_REVERSE_PROXY_VERSION=vX.Y.Z` to pin a
specific release when using the wrapper:

```bash
./tonutils-reverse-proxy-linux-amd64
```

If you already have the binary in `tools/bin`, call it directly:

```bash
./tools/bin/tonutils-reverse-proxy --domain dynamiccapital.ton
```

Scan the QR code with your TON wallet (or use the `-tx-url` flag to copy a
`ton://` link) and confirm the transaction. The reverse proxy persists the
linked domain in `config.json`; subsequent restarts do not require the
`--domain` flag.

## Manual download (fallback)

If you prefer to manage the binary manually, download the release that matches
your platform:

- **Linux (amd64):**
  `wget https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-linux-amd64`
- **Linux (arm64):**
  `wget https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-linux-arm64`
- **macOS (Intel):**
  `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-mac-amd64`
- **macOS (Apple):**
  `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-mac-arm64`
- **Windows (x64):**
  `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-windows-x64.exe`

Make the binary executable on Unix hosts:

```bash
chmod +x tonutils-reverse-proxy-*
```

Move the file into your preferred directory (for example `/usr/local/bin` or
`C:\Tools`) and rename it to `tonutils-reverse-proxy` (append `.exe` on Windows)
for consistency with automation scripts.

## Service management (optional)

For persistent deployments create a systemd service:

```ini
[Unit]
Description=Tonutils Reverse Proxy
After=network.target

[Service]
ExecStart=/opt/ton/tonutils-reverse-proxy
WorkingDirectory=/opt/ton
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

1. Copy the binary to `/opt/ton/tonutils-reverse-proxy` and ensure the directory
   contains `config.json`.
2. Save the service file as
   `/etc/systemd/system/tonutils-reverse-proxy.service`.
3. Run
   `sudo systemctl daemon-reload && sudo systemctl enable --now tonutils-reverse-proxy`.
4. Verify the service with `systemctl status tonutils-reverse-proxy` and confirm
   `config.json` tracks the linked domain and ADNL address.

## Verification checklist

1. Resolve `dynamiccapital.ton` via a TON-enabled browser or wallet.
2. Load `https://ton.site/dynamiccapital.ton` to confirm the primary
   Foundation-operated gateway is live. Use the legacy DigitalOcean or Lovable
   proxies only after redeploying them.
3. Run `node scripts/verify/ton_site.mjs` and check the `tonsite_gateway` probe
   passes.
4. Record the ADNL address and transaction hash in Supabase `tx_logs`
   (`kind = 'ton_site_publish'`).
5. Monitor `logs/tonutils-reverse-proxy.log` (or
   `journalctl -u tonutils-reverse-proxy`) for liteserver sync errors and rotate
   the global config if necessary.

## Recommended next steps

- Schedule quarterly rotations of the ADNL certificate alongside TON DNS
  updates.
- Mirror the resulting `config.json` and ADNL address in the secure vault with
  timestamped entries.
- Add the host IP to Cloudflare and Supabase allowlists so health checks succeed
  end-to-end.
