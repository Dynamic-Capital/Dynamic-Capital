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
- `curl` or `wget` for manual installs if you prefer not to use the automation
  script.

## Quick install via repository script

The repository ships a helper that downloads the correct binary for your
platform and stores it under `tools/bin`.

```bash
node scripts/ton/install-tonutils-reverse-proxy.mjs
```

- Pass `--dir` to override the destination directory.
- Use `--force` to overwrite an existing binary.
- Add `--version vX.Y.Z` to pin a specific Git tag (defaults to the latest
  release).
- Combine `--dry-run` to preview the actions without modifying the filesystem.

Once the binary is installed, start the linking flow:

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

| Platform      | Command                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Linux (amd64) | `wget https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-linux-amd64`         |
| Linux (arm64) | `wget https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-linux-arm64`         |
| macOS (Intel) | `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-mac-amd64`       |
| macOS (Apple) | `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-mac-arm64`       |
| Windows (x64) | `curl -LO https://github.com/tonutils/reverse-proxy/releases/latest/download/tonutils-reverse-proxy-windows-x64.exe` |

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
2. Load
   `https://ton-gateway.dynamic-capital.ondigitalocean.app/dynamiccapital.ton`
   to confirm the reverse proxy fallback path is live.
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
