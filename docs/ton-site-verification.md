# TON Site Verification Checklist

This checklist captures the repeatable steps for validating the Dynamic Capital
TON Site after DNS or content updates. It combines automated verification (via
`scripts/verify/ton_site.mjs`) with manual gateway and lite server checks so the
release artefacts are auditable.

## 1. Pre-flight information

- Confirm the production domain: `dynamiccapital.ton`.
- Reference the TON DNS bundle committed in
  [`dns/dynamiccapital.ton.json`](../dns/dynamiccapital.ton.json) and ensure the
  `ton_site.lite_servers` array lists the current ingress hosts:
  - Server #1 — `31.57.199.1:5053`
  - Server #2 — `163.5.62.1:5053`
  - Both hosts advertise the public key
    `Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=`.
- Keep the Telegram analytics bot id (`3672406698`) and the TradingView webhook
  token handy for downstream smoke checks.

## 2. Automated verification

Run the Node verifier from the repository root:

```bash
node scripts/verify/ton_site.mjs
```

Verify the output includes:

- `config_present=PASS` and `ton_site_present=PASS`.
- `adnl_format=PASS` and `public_key_valid=PASS`.
- `tonapi_lookup=PASS` **and** `resolver_matches_dns=PASS`.
- `tonsite_gateway_lookup=PASS` along with the `tonsite_gateway_summary` showing
  `root:PASS` and each alias host (for example `www_dynamiccapital_ton:PASS`).

Export the raw output to the release evidence folder (for example
`.out/ton_site.txt`) and attach it to the Supabase `tx_logs` entry.

## 3. Gateway spot checks

1. Open <https://ton.site/dynamiccapital.ton> in a desktop browser. Confirm the
   page loads and that you are redirected to `/lander` when the bundle is
   unavailable (expected behaviour during dry-runs).
2. Repeat for the alias host at <https://ton.site/www.dynamiccapital.ton>.
3. Capture screenshots for both URLs and store them next to the release bundle.

## 4. Lite server validation

1. For each lite server in the DNS config, confirm the listener is reachable:

   ```bash
   nc -vz 31.57.199.1 5053
   nc -vz 163.5.62.1 5053
   ```

2. Record the handshake public key surfaced by the proxy
   (`Ug3YgtwUydgkFaxJdvtYkcsRlJZra7UrA95vOE1ZzW0=`) and ensure it matches the
   value in both the DNS config and the infrastructure runbook.
3. Log latency observations and any anomalies (connection failures, mismatched
   keys) in Supabase `tx_logs` under the `ton_site_verify` event type.

## 5. Post-verification logging

- Update the release runbook with the command output, gateway screenshots, and
  lite server check notes.
- If any step fails, halt the release, escalate in the `#infra-ton` channel, and
  capture remediation steps before retrying the verification sequence.

Following this checklist keeps the TON Site traceable for auditors and
simplifies future rotations of lite servers, ADNL certificates, or gateway
providers.
