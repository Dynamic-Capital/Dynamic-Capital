# TON Smart Contract Verification Status

This note captures the automated checks that confirm whether the Dynamic Capital
TON contracts remain verifiable before onboarding new integrators.

## How to run the verification sweep

Use the consolidated tooling script to audit the jetton metadata parity and the
core wallet contracts published in DNS records:

```bash
$(bash scripts/deno_bin.sh) run -A dynamic-capital-ton/apps/tools/check-ton-contracts.ts
```

The command performs six groups of checks:

1. **Jetton metadata integrity** – compares the on-chain metadata exposed via
   Tonapi with the repository copy (`contracts/jetton/metadata.json`) and prints
   a diff table if any field
   drifts.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L7-L160】【F:dynamic-capital-ton/contracts/jetton/metadata.json†L1-L36】
2. **Verification flag & Tonapi health** – surfaces the Tonviewer/Tonapi
   verification status and the REST gateway heartbeat so operations immediately
   know whether the upstream API is
   reachable.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L247-L263】
3. **Account heartbeat** – pings the treasury, liquidity pools, and canonical
   wallets declared in `storage/dns-records.txt` to confirm each contract is
   active on-chain before onboarding
   stakeholders.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L177-L246】【F:dynamic-capital-ton/storage/dns-records.txt†L1-L18】
4. **Domain endpoint probes** – performs HTTP checks against the metadata,
   TON Connect manifest, API, and docs URLs registered in DNS to guarantee the
   onboarding collateral is reachable. When TON-native origins return a
   temporary gateway error, the sweep now falls back to the mirrored
   `dynamic-capital.ondigitalocean.app` reverse proxy declared in
   `storage/dns-records.txt` so operators can confirm the HTTPS mirror stays
   live while the `.ton` resolver catches
   up.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L103-L174】【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L265-L333】【F:dynamic-capital-ton/storage/dns-records.txt†L13-L20】
5. **Jetton wallet advisories** – inspects Tonapi holder data and DEX metadata
   to explain any `nonexist` wallet statuses and outline the actions required to
   deploy missing jetton wallets before
   onboarding.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L176-L244】【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L205-L244】
6. **Wallet ownership verification** – calls Toncenter's `get_wallet_data` for
   the STON.fi and DeDust jetton wallets, confirms the owner addresses match the
   DNS resolver payload, and raises actionable advisories if a router upgrade or
   DNS rotation is required before
   onboarding.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L523-L650】【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L781-L885】

Exit codes escalate as follows: `0` (all good), `2` (metadata drift), `3`
(`jetton still unverified),`4`(inactive accounts),`5`(fetch errors),`6`(domain collateral unreachable),`7`(Tonapi REST offline),`8`
(jetton wallet ownership mismatch). CI and runbooks can key off the highest code
to trigger the appropriate
escalation.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L895-L960】

## Operational guidance

- **Onboarding gate:** run the sweep immediately before provisioning new DAO
  signers or liquidity partners. A non-zero exit code should pause onboarding
  until the root cause is resolved.
- **Metadata drift:** if Tonapi reports a different image URL or symbol, update
  the repository copy (`metadata.json`) or republish the hosted JSON so both
  sources match before re-running the
  check.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L62-L110】
- **Unverified flag:** if the jetton remains unverified, follow the escalation
  plan in the Tonviewer runbook and include the latest sweep output in the
  support ticket.【F:docs/onchain/dct-tonviewer-verification.md†L1-L69】
- **Inactive wallets:** coordinate with operations to investigate paused
  accounts. For liquidity pools this typically signals a stuck upgrade or a
  misconfigured router address that must be corrected before integrations go
  live.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L177-L244】 Use
  the remediation hints emitted by the sweep to trigger a bootstrap transfer if
  the DEX jetton wallet has never been deployed (Tonapi reports `nonexist`) or
  to seed initial liquidity when STON.fi flags the asset with `no_liquidity`.
- **Wallet ownership drift:** if exit code `8` fires, align the DNS resolver
  with the on-chain owners exposed by Toncenter before onboarding. Update the
  STON.fi router or DeDust vault addresses in `storage/dns-records.txt`, commit
  the change, and broadcast a resolver update so integrations land on the
  verified wallet
  contracts.【F:dynamic-capital-ton/storage/dns-records.txt†L1-L18】【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L781-L955】
- **Domain collateral:** if any endpoint check fails, publish the missing files
  (metadata JSON, TON Connect manifest, API swagger, docs) before inviting new
  partners so they do not hit 404s during verification. The sweep surfaces both
  the primary `.ton` URL and the DigitalOcean reverse proxy fallback so you can
  verify at least one origin serves the collateral while TON DNS
  propagates.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L265-L333】【F:dynamic-capital-ton/storage/dns-records.txt†L13-L20】
- **Tonapi downtime:** exit code `7` signals Tonapi is unreachable. Pause
  onboarding and re-run the sweep once Tonapi's status endpoint reports the REST
  gateway as healthy to ensure downstream checks are
  reliable.【F:dynamic-capital-ton/apps/tools/check-ton-contracts.ts†L247-L322】

Document the sweep results alongside onboarding paperwork so compliance has a
timestamped proof that the smart contracts were healthy when access was granted.
